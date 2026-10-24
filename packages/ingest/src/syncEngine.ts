import * as fs from "node:fs";
import { db } from "@mint/core";
import { products, inventory, dataSources, importJobs } from "@mint/core";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { proposeColumnMapping, MappingResult } from "./columnMapper";
import { sanitizeCell, sanitizeRow } from "./sanitizer";

export type SourceStatus =
  | "HEALTHY"
  | "DRIFTED"
  | "ERROR"
  | "PAUSED"
  | "PAUSED_MASS_DELETION";

export interface SyncEngineOptions {
  companyId: string;
  sourceName: string;
  sourceType: "csv" | "excel" | "postgres_readonly" | "sqlite";
  uriOrPath: string;
  currentHeaders: string[];
  rows: Array<Record<string, any>>;
  explicitMappings?: Record<string, string>;
  forceAcceptDrift?: boolean;
  maxDeletionRateThreshold?: number; // e.g. 0.20 (20%)
  allowMassDeletion?: boolean; // Permite override explícito
  requireTwoPhaseDeletion?: boolean; // Requiere confirmar en 2 lecturas consecutivas (default: true)
  allowImmediateDeletion?: boolean; // Fuerza borrado en primera lectura si es deliberado
  originMtime?: Date | string | null; // Fecha de modificación de la fuente de origen
  maxStalenessHours?: number; // Umbral de frescura personalizado para esta fuente
}

export interface DriftInfo {
  detected: boolean;
  reason?: string;
  missingMappedHeaders?: string[];
  newHeaders?: string[];
  proposedMapping?: MappingResult;
}

export interface MassDeletionAnomalyInfo {
  detected: boolean;
  previousCount: number;
  missingCount: number;
  deletionRate: number;
  sampleMissingSkus: string[];
  reason: string;
}

export interface SyncResult {
  success: boolean;
  dataSourceId: string;
  jobId: string;
  status: SourceStatus;
  isInitialSync: boolean;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  deletedRows: number;
  pendingDeletionRows: number;
  drift?: DriftInfo;
  massDeletionAnomaly?: MassDeletionAnomalyInfo;
  quarantineWarnings?: string[];
  errors: Array<{ row: number; error: string; data: any }>;
  qualityWarning?: string;
}

/**
 * Motor de sincronización resiliente:
 * - Idempotencia por (companyId, uriOrPath)
 * - Detección de Schema Drift y congelamiento de fuente
 * - Circuito de protección contra borrados masivos (>20% del catálogo)
 * - Confirmación de borrado en 2 lecturas consecutivas (Two-Phase Deletion)
 * - Registro de fecha de origen (mtime) y umbral de frescura personalizado
 * - Detección de contenido sospechoso en cuarentena sin corromper datos legítimos
 */
export async function syncDataSource(options: SyncEngineOptions): Promise<SyncResult> {
  const {
    companyId,
    sourceName,
    sourceType,
    uriOrPath,
    currentHeaders,
    rows,
    explicitMappings,
    forceAcceptDrift = false,
    maxDeletionRateThreshold = 0.20,
    allowMassDeletion = false,
    requireTwoPhaseDeletion = true,
    allowImmediateDeletion = false,
  } = options;

  const jobId = `job_sync_${randomUUID().slice(0, 8)}`;

  // 1. Extraer mtime de origen si es un archivo local
  let originMtime: string | null = null;
  if (options.originMtime) {
    originMtime = new Date(options.originMtime).toISOString();
  } else if (fs.existsSync(uriOrPath)) {
    try {
      originMtime = fs.statSync(uriOrPath).mtime.toISOString();
    } catch {
      // Omitir si no se puede leer stat
    }
  }

  // 2. Buscar o crear la fuente de datos (Garantía de idempotencia)
  const existingSources = await db
    .select()
    .from(dataSources)
    .where(and(eq(dataSources.companyId, companyId), eq(dataSources.uriOrPath, uriOrPath)))
    .limit(1);

  let dataSource = existingSources[0];
  let isInitialSync = false;
  let dataSourceId: string;
  let activeConfig: Record<string, any> = {};

  if (!dataSource) {
    isInitialSync = true;
    dataSourceId = `src_${randomUUID().slice(0, 8)}`;
    activeConfig = {
      status: "HEALTHY",
      headers: currentHeaders,
      mappings: explicitMappings || {},
      activeSkus: [],
      pendingDeletions: {},
      syncCount: 0,
      originMtime,
      maxStalenessHours: options.maxStalenessHours || 24,
    };

    await db.insert(dataSources).values({
      id: dataSourceId,
      companyId,
      name: sourceName,
      sourceType,
      uriOrPath,
      config: activeConfig,
      isActive: true,
      lastSyncedAt: null,
    });
  } else {
    dataSourceId = dataSource.id;
    activeConfig = (dataSource.config as Record<string, any>) || {};
    isInitialSync = !dataSource.lastSyncedAt;
    if (originMtime) activeConfig.originMtime = originMtime;
    if (options.maxStalenessHours) activeConfig.maxStalenessHours = options.maxStalenessHours;
  }

  // 3. Determinar o verificar mapeo de columnas
  let mappings = explicitMappings || activeConfig.mappings || {};

  if (Object.keys(mappings).length === 0) {
    const proposal = proposeColumnMapping(currentHeaders);
    if (proposal.missingRequired.length > 0) {
      const errorMsg = `No se pueden mapear columnas requeridas: ${proposal.missingRequired.join(", ")}`;
      await db
        .update(dataSources)
        .set({
          config: {
            ...activeConfig,
            status: "ERROR",
            lastError: errorMsg,
          },
        })
        .where(eq(dataSources.id, dataSourceId));

      return {
        success: false,
        dataSourceId,
        jobId,
        status: "ERROR",
        isInitialSync,
        totalRows: rows.length,
        importedRows: 0,
        failedRows: rows.length,
        deletedRows: 0,
        pendingDeletionRows: 0,
        errors: [{ row: 0, error: errorMsg, data: {} }],
        drift: { detected: false },
      };
    }
    mappings = proposal.mappings;
  }

  // 4. Verificación de Schema Drift
  const missingHeaders: string[] = [];
  for (const [targetField, sourceHeader] of Object.entries(mappings)) {
    if (sourceHeader && !currentHeaders.includes(sourceHeader as string)) {
      missingHeaders.push(sourceHeader as string);
    }
  }

  if (missingHeaders.length > 0 && !forceAcceptDrift) {
    const proposal = proposeColumnMapping(currentHeaders);
    const driftReason = `Encabezados esperados desaparecidos en la fuente: ${missingHeaders.join(", ")}`;

    const driftDetails: DriftInfo = {
      detected: true,
      reason: driftReason,
      missingMappedHeaders: missingHeaders,
      newHeaders: currentHeaders.filter((h) => !Object.values(mappings).includes(h)),
      proposedMapping: proposal,
    };

    await db
      .update(dataSources)
      .set({
        config: {
          ...activeConfig,
          status: "DRIFTED",
          driftDetails,
          lastError: driftReason,
        },
      })
      .where(eq(dataSources.id, dataSourceId));

    await db.insert(importJobs).values({
      id: jobId,
      companyId,
      dataSourceId,
      status: "FAILED",
      targetEntity: "products_inventory",
      totalRows: rows.length,
      importedRows: 0,
      failedRows: rows.length,
      columnMapping: mappings,
      errorsPayload: [{ error: driftReason, drift: driftDetails }],
    });

    return {
      success: false,
      dataSourceId,
      jobId,
      status: "DRIFTED",
      isInitialSync,
      totalRows: rows.length,
      importedRows: 0,
      failedRows: rows.length,
      deletedRows: 0,
      pendingDeletionRows: 0,
      drift: driftDetails,
      errors: [{ row: 0, error: driftReason, data: driftDetails }],
    };
  }

  if (missingHeaders.length > 0 && forceAcceptDrift) {
    const proposal = proposeColumnMapping(currentHeaders);
    mappings = proposal.mappings;
  }

  // 5. Iniciar trabajo de importación
  await db.insert(importJobs).values({
    id: jobId,
    companyId,
    dataSourceId,
    status: "PROCESSING",
    targetEntity: "products_inventory",
    totalRows: rows.length,
    columnMapping: mappings,
  });

  const errors: Array<{ row: number; error: string; data: any }> = [];
  const allQuarantineWarnings: string[] = [];
  let importedCount = 0;
  const currentSyncSkus: string[] = [];

  // 6. Procesamiento fila por fila con sanitización y cuarentena de anomalías
  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const { row: sanitized, suspiciousWarnings } = sanitizeRow(rawRow);
    const rowNum = i + 1;

    if (suspiciousWarnings.length > 0) {
      allQuarantineWarnings.push(`Fila #${rowNum}: ${suspiciousWarnings.join("; ")}`);
    }

    try {
      const sku = (sanitized[mappings.sku] || "").trim();
      const name = (sanitized[mappings.name] || "").trim();
      const stockRaw = sanitized[mappings.stock] || "0";
      const minStockRaw = mappings.minStock ? sanitized[mappings.minStock] || "10" : "10";
      const category = mappings.category ? (sanitized[mappings.category] || "general").trim() : "general";

      if (!sku) throw new Error("El campo 'sku' es requerido y está vacío.");
      if (!name) throw new Error("El campo 'name' es requerido y está vacío.");

      const stock = parseInt(stockRaw.replace(/[^0-9-]/g, ""), 10);
      if (isNaN(stock) || stock < 0) {
        throw new Error(`Stock inválido: "${stockRaw}". Debe ser un número entero >= 0.`);
      }

      const minStock = parseInt(minStockRaw.replace(/[^0-9]/g, ""), 10) || 10;
      currentSyncSkus.push(sku);

      const productId = `prod_${sku.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;

      // Upsert producto
      await db
        .insert(products)
        .values({
          id: productId,
          companyId,
          sku,
          name,
          category,
          minStock,
          origin: "real",
        })
        .onConflictDoUpdate({
          target: [products.companyId, products.sku],
          set: {
            name,
            category,
            minStock,
            origin: "real",
          },
        });

      // Upsert inventario
      const existingInv = await db
        .select()
        .from(inventory)
        .where(and(eq(inventory.productId, productId), eq(inventory.companyId, companyId)))
        .limit(1);

      if (existingInv.length > 0) {
        await db
          .update(inventory)
          .set({ stock, updatedAt: new Date() })
          .where(eq(inventory.id, existingInv[0].id));
      } else {
        await db.insert(inventory).values({
          id: `inv_${Date.now()}_${i}`,
          companyId,
          productId,
          warehouseId: "alm_central",
          stock,
        });
      }

      importedCount++;
    } catch (err: any) {
      errors.push({
        row: rowNum,
        error: err.message,
        data: rawRow,
      });
    }
  }

  // 7. Detección de elementos eliminados con Circuito contra Borrados Masivos y Confirmación en 2 Fases
  const previousSkus: string[] = activeConfig.activeSkus || [];
  const pendingDeletions: Record<string, number> = activeConfig.pendingDeletions || {};
  let deletedCount = 0;
  let pendingDeletionCount = 0;

  if (previousSkus.length > 0) {
    const currentSkuSet = new Set(currentSyncSkus);
    const removedSkus = previousSkus.filter((sku) => !currentSkuSet.has(sku));
    const missingRatio = removedSkus.length / previousSkus.length;

    // A. Tope de Borrado Masivo (Circuit Breaker)
    // Si el catálogo previo tiene al menos 5 ítems y desaparecen más de maxDeletionRate (default 20%),
    // pausar la fuente sin alterar el inventario de ningún ítem.
    if (previousSkus.length >= 5 && missingRatio > maxDeletionRateThreshold && !allowMassDeletion) {
      const anomalyReason = `PROTECCIÓN CONTRA BORRADO MASIVO: Desapareció el ${(missingRatio * 100).toFixed(0)}% del catálogo (${removedSkus.length}/${previousSkus.length}) en la fuente. Posible exportación truncada o filtrada. Sincronización pausada sin alterar stock.`;

      const anomalyInfo: MassDeletionAnomalyInfo = {
        detected: true,
        previousCount: previousSkus.length,
        missingCount: removedSkus.length,
        deletionRate: missingRatio,
        sampleMissingSkus: removedSkus.slice(0, 5),
        reason: anomalyReason,
      };

      await db
        .update(dataSources)
        .set({
          config: {
            ...activeConfig,
            status: "PAUSED_MASS_DELETION",
            lastMassDeletionAnomaly: anomalyInfo,
            lastError: anomalyReason,
          },
        })
        .where(eq(dataSources.id, dataSourceId));

      return {
        success: false,
        dataSourceId,
        jobId,
        status: "PAUSED_MASS_DELETION",
        isInitialSync,
        totalRows: rows.length,
        importedRows: importedCount,
        failedRows: errors.length,
        deletedRows: 0,
        pendingDeletionRows: 0,
        massDeletionAnomaly: anomalyInfo,
        errors: [{ row: 0, error: anomalyReason, data: anomalyInfo }],
        qualityWarning: anomalyReason,
      };
    }

    // B. Confirmación de Borrado en 2 Fases (Two-Phase Deletion Confirmation)
    const effectiveRequireTwoPhase = requireTwoPhaseDeletion && !allowImmediateDeletion;
    const updatedPendingDeletions: Record<string, number> = { ...pendingDeletions };

    for (const removedSku of removedSkus) {
      const consecutiveMissing = (updatedPendingDeletions[removedSku] || 0) + 1;
      const prodId = `prod_${removedSku.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;

      if (!effectiveRequireTwoPhase || consecutiveMissing >= 2 || allowMassDeletion) {
        // Confirmado en 2 lecturas consecutivas o con flag explícito: ejecutar borrado lógico (stock = 0)
        deletedCount++;
        delete updatedPendingDeletions[removedSku];

        await db
          .update(inventory)
          .set({ stock: 0, updatedAt: new Date() })
          .where(and(eq(inventory.productId, prodId), eq(inventory.companyId, companyId)));
      } else {
        // Primera ausencia: registrar en período de gracia (pending_deletion) sin alterar existencias
        pendingDeletionCount++;
        updatedPendingDeletions[removedSku] = consecutiveMissing;
      }
    }

    // Si algún SKU en pendingDeletions volvió a aparecer en esta sincronización, se cancela su borrado pendiente
    for (const sku of currentSyncSkus) {
      delete updatedPendingDeletions[sku];
    }

    activeConfig.pendingDeletions = updatedPendingDeletions;
  }

  // 8. Evaluar calidad de datos y advertencias
  let qualityWarning: string | undefined;
  const failureRate = rows.length > 0 ? errors.length / rows.length : 0;
  if (failureRate > 0.1) {
    qualityWarning = `Alerta de calidad de datos: ${Math.round(failureRate * 100)}% de filas fallaron validación (${errors.length}/${rows.length}).`;
  }
  if (allQuarantineWarnings.length > 0) {
    const qMsg = `${allQuarantineWarnings.length} celda(s) con patrones sospechosos aisladas en auditoría.`;
    qualityWarning = qualityWarning ? `${qualityWarning} ${qMsg}` : qMsg;
  }

  const isSuccess = importedCount > 0 || (rows.length === 0 && errors.length === 0);

  // 9. Actualizar DataSource y Job
  const now = new Date();
  const retainedActiveSkus = Array.from(
    new Set([...currentSyncSkus, ...Object.keys(activeConfig.pendingDeletions || {})])
  );

  await db
    .update(dataSources)
    .set({
      config: {
        ...activeConfig,
        status: isSuccess ? "HEALTHY" : "ERROR",
        headers: currentHeaders,
        mappings,
        activeSkus: retainedActiveSkus,
        syncCount: ((activeConfig.syncCount as number) || 0) + 1,
        lastError: errors.length > 0 ? `${errors.length} filas con error` : null,
      },
      lastSyncedAt: isSuccess ? now : dataSource?.lastSyncedAt,
    })
    .where(eq(dataSources.id, dataSourceId));

  await db
    .update(importJobs)
    .set({
      status: isSuccess ? "COMPLETED" : "FAILED",
      importedRows: importedCount,
      failedRows: errors.length,
      errorsPayload: errors,
      completedAt: now,
    })
    .where(eq(importJobs.id, jobId));

  return {
    success: isSuccess,
    dataSourceId,
    jobId,
    status: isSuccess ? "HEALTHY" : "ERROR",
    isInitialSync,
    totalRows: rows.length,
    importedRows: importedCount,
    failedRows: errors.length,
    deletedRows: deletedCount,
    pendingDeletionRows: pendingDeletionCount,
    quarantineWarnings: allQuarantineWarnings.length > 0 ? allQuarantineWarnings : undefined,
    errors,
    qualityWarning,
  };
}
