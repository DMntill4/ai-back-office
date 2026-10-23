import { db } from "@mint/core";
import { products, inventory, dataSources, importJobs } from "@mint/core";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { proposeColumnMapping, MappingResult } from "./columnMapper";
import { sanitizeCell, sanitizeRow } from "./sanitizer";

export type SourceStatus = "HEALTHY" | "DRIFTED" | "ERROR" | "PAUSED";

export interface SyncEngineOptions {
  companyId: string;
  sourceName: string;
  sourceType: "csv" | "excel" | "postgres_readonly" | "sqlite";
  uriOrPath: string;
  currentHeaders: string[];
  rows: Array<Record<string, any>>;
  explicitMappings?: Record<string, string>;
  forceAcceptDrift?: boolean;
}

export interface DriftInfo {
  detected: boolean;
  reason?: string;
  missingMappedHeaders?: string[];
  newHeaders?: string[];
  proposedMapping?: MappingResult;
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
  drift?: DriftInfo;
  errors: Array<{ row: number; error: string; data: any }>;
  qualityWarning?: string;
}

/**
 * Motor de sincronización resiliente:
 * - Idempotencia por (companyId, uriOrPath)
 * - Detección de Schema Drift y congelamiento de fuente
 * - Detección de registros eliminados en la fuente de origen
 * - Aislamiento de filas corruptas sin abortar lote
 * - Supresión de avalanchas en carga inicial
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
  } = options;

  const jobId = `job_sync_${randomUUID().slice(0, 8)}`;

  // 1. Buscar o crear la fuente de datos (Garantía de idempotencia)
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
      syncCount: 0,
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
  }

  // 2. Determinar o verificar mapeo de columnas
  let mappings = explicitMappings || activeConfig.mappings || {};

  // Si no hay mapeos previos, proponerlos automáticamente
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
        errors: [{ row: 0, error: errorMsg, data: {} }],
        drift: { detected: false },
      };
    }
    mappings = proposal.mappings;
  }

  // 3. Verificación de Schema Drift
  // Comprobar si las columnas mapeadas siguen existiendo en currentHeaders
  const missingHeaders: string[] = [];
  for (const [targetField, sourceHeader] of Object.entries(mappings)) {
    if (sourceHeader && !currentHeaders.includes(sourceHeader as string)) {
      missingHeaders.push(sourceHeader as string);
    }
  }

  if (missingHeaders.length > 0 && !forceAcceptDrift) {
    // DRIFT DETECTADO: Pausar fuente para proteger datos
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

    // Registrar fallo de job por drift
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
      drift: driftDetails,
      errors: [{ row: 0, error: driftReason, data: driftDetails }],
    };
  }

  // Si se fuerza la aceptación del drift, actualizar los mapeos con la nueva propuesta
  if (missingHeaders.length > 0 && forceAcceptDrift) {
    const proposal = proposeColumnMapping(currentHeaders);
    mappings = proposal.mappings;
  }

  // 4. Iniciar trabajo de importación
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
  let importedCount = 0;
  const currentSyncSkus: string[] = [];

  // 5. Procesamiento fila por fila con sanitización y aislamiento de errores
  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const sanitized = sanitizeRow(rawRow);
    const rowNum = i + 1;

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

  // 6. Detección de elementos eliminados en la fuente de origen
  const previousSkus: string[] = activeConfig.activeSkus || [];
  let deletedCount = 0;

  if (previousSkus.length > 0) {
    const currentSkuSet = new Set(currentSyncSkus);
    const removedSkus = previousSkus.filter((sku) => !currentSkuSet.has(sku));

    for (const removedSku of removedSkus) {
      deletedCount++;
      const prodId = `prod_${removedSku.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
      // Poner en 0 el stock del inventario para reflejar que la fuente ya no lo contiene
      await db
        .update(inventory)
        .set({ stock: 0, updatedAt: new Date() })
        .where(and(eq(inventory.productId, prodId), eq(inventory.companyId, companyId)));
    }
  }

  // 7. Evaluar calidad de datos
  let qualityWarning: string | undefined;
  const failureRate = rows.length > 0 ? errors.length / rows.length : 0;
  if (failureRate > 0.1) {
    qualityWarning = `Alerta de calidad de datos: ${Math.round(failureRate * 100)}% de filas fallaron validación (${errors.length}/${rows.length}).`;
  }

  const isSuccess = importedCount > 0 || (rows.length === 0 && errors.length === 0);

  // 8. Actualizar DataSource y Job
  const now = new Date();
  await db
    .update(dataSources)
    .set({
      config: {
        ...activeConfig,
        status: isSuccess ? "HEALTHY" : "ERROR",
        headers: currentHeaders,
        mappings,
        activeSkus: currentSyncSkus,
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
    errors,
    qualityWarning,
  };
}
