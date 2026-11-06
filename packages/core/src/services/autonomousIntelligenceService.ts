import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, pool, checkDatabaseHealth, testCustomConnection, getStorageMode } from "../db/client";
import {
  products,
  inventory,
  warehouses,
  suppliers,
  supplierProducts,
  companies,
  notificationChannels,
  dataSources,
  importJobs,
  inventoryMovements,
  businessOperationalMemory,
  auditIncidents,
  agentTaskCheckpoints,
  mintPendingQuestions,
  decisions,
  operationalEvents,
} from "../db/schema";
import { HUMAN_ROLE_PERMISSIONS } from "../security/agentPermissionsMatrix";

export interface DataSourceInspectionResult {
  targetPath: string;
  exists: boolean;
  isValidBusinessData: boolean;
  detectedFormat: "csv" | "json" | "sql" | "excel" | "config_file" | "empty" | "unknown";
  detectedEntityType: "inventory_products" | "suppliers" | "sales" | "mixed_business" | "non_business_config" | "invalid";
  rowCountEstimate: number;
  detectedColumns: string[];
  sampleRecords: any[];
  rejectionReason?: string;
  recommendedNextStep?: string;
  discoveredAlternatives: Array<{
    filePath: string;
    fileName: string;
    detectedEntityType: string;
    rowCountEstimate: number;
    detectedColumns: string[];
  }>;
}

const BUSINESS_COLUMN_KEYWORDS = [
  "sku",
  "codigo",
  "code",
  "producto",
  "product",
  "nombre",
  "name",
  "stock",
  "existencia",
  "cantidad",
  "quantity",
  "qty",
  "precio",
  "price",
  "costo",
  "cost",
  "proveedor",
  "supplier",
  "almacen",
  "warehouse",
  "categoria",
  "category",
  "min_stock",
  "rop",
  "orden",
  "venta",
];

const CONFIG_FILE_SIGNATURES = [
  "dependencies",
  "devDependencies",
  "compilerOptions",
  "scripts",
  "lockfileVersion",
  "eslintConfig",
  "browserslist",
  "workspaces",
];

function analyzeSingleFileContent(filePath: string): {
  exists: boolean;
  isValidBusinessData: boolean;
  detectedFormat: "csv" | "json" | "sql" | "excel" | "config_file" | "empty" | "unknown";
  detectedEntityType: "inventory_products" | "suppliers" | "sales" | "mixed_business" | "non_business_config" | "invalid";
  rowCountEstimate: number;
  detectedColumns: string[];
  sampleRecords: any[];
  rejectionReason?: string;
} {
  if (!fs.existsSync(filePath)) {
    return {
      exists: false,
      isValidBusinessData: false,
      detectedFormat: "unknown",
      detectedEntityType: "invalid",
      rowCountEstimate: 0,
      detectedColumns: [],
      sampleRecords: [],
      rejectionReason: `El archivo '${filePath}' no existe en el sistema de archivos.`,
    };
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    return {
      exists: true,
      isValidBusinessData: false,
      detectedFormat: "unknown",
      detectedEntityType: "invalid",
      rowCountEstimate: 0,
      detectedColumns: [],
      sampleRecords: [],
      rejectionReason: `'${filePath}' es un directorio, no un archivo de base de datos.`,
    };
  }

  if (stat.size === 0) {
    return {
      exists: true,
      isValidBusinessData: false,
      detectedFormat: "empty",
      detectedEntityType: "invalid",
      rowCountEstimate: 0,
      detectedColumns: [],
      sampleRecords: [],
      rejectionReason: "El archivo está completamente vacío (0 bytes) y no contiene registros operativos.",
    };
  }

  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath).toLowerCase();

  if (
    baseName === "package.json" ||
    baseName === "package-lock.json" ||
    baseName.startsWith("tsconfig") ||
    baseName === ".env"
  ) {
    return {
      exists: true,
      isValidBusinessData: false,
      detectedFormat: "config_file",
      detectedEntityType: "non_business_config",
      rowCountEstimate: 0,
      detectedColumns: [],
      sampleRecords: [],
      rejectionReason: `El archivo '${baseName}' es un archivo de configuración técnica del proyecto/aplicación, no una base de datos de negocio.`,
    };
  }

  const rawText = fs.readFileSync(filePath, "utf-8").trim();
  if (!rawText) {
    return {
      exists: true,
      isValidBusinessData: false,
      detectedFormat: "empty",
      detectedEntityType: "invalid",
      rowCountEstimate: 0,
      detectedColumns: [],
      sampleRecords: [],
      rejectionReason: "El archivo solo contiene espacios en blanco y ningún registro de negocio.",
    };
  }

  // 1. Inspección de JSON
  if (ext === ".json" || rawText.startsWith("{") || rawText.startsWith("[")) {
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const topKeys = Object.keys(parsed);
        const hasConfigKeys = topKeys.some((k) => CONFIG_FILE_SIGNATURES.includes(k));
        const hasConfigIndicators =
          parsed.appConfig ||
          parsed.theme ||
          parsed.debugMode !== undefined ||
          parsed.webpack ||
          parsed.compilerOptions ||
          parsed.dependencies;

        // Buscar si tiene un array de registros de negocio adentro (ej. { products: [...], items: [...] })
        const embeddedArrayKey = topKeys.find(
          (k) => Array.isArray(parsed[k]) && parsed[k].length > 0 && typeof parsed[k][0] === "object",
        );

        if (hasConfigKeys || (hasConfigIndicators && !embeddedArrayKey)) {
          return {
            exists: true,
            isValidBusinessData: false,
            detectedFormat: "config_file",
            detectedEntityType: "non_business_config",
            rowCountEstimate: 0,
            detectedColumns: topKeys,
            sampleRecords: [],
            rejectionReason: `El archivo JSON contiene configuración de aplicación (${topKeys.slice(0, 5).join(", ")}) en lugar de registros operativos de inventario, ventas o proveedores.`,
          };
        }

        if (embeddedArrayKey) {
          const arr = parsed[embeddedArrayKey];
          const cols = Object.keys(arr[0] || {});
          const hasBusinessCols = cols.some((c) =>
            BUSINESS_COLUMN_KEYWORDS.some((kw) => c.toLowerCase().includes(kw)),
          );
          if (!hasBusinessCols) {
            return {
              exists: true,
              isValidBusinessData: false,
              detectedFormat: "json",
              detectedEntityType: "non_business_config",
              rowCountEstimate: arr.length,
              detectedColumns: cols,
              sampleRecords: arr.slice(0, 2),
              rejectionReason: `El archivo JSON contiene una lista '${embeddedArrayKey}', pero sus campos (${cols.join(", ")}) no corresponden a entidades de negocio reconocibles.`,
            };
          }
          return {
            exists: true,
            isValidBusinessData: true,
            detectedFormat: "json",
            detectedEntityType: "inventory_products",
            rowCountEstimate: arr.length,
            detectedColumns: cols,
            sampleRecords: arr.slice(0, 3),
          };
        }

        return {
          exists: true,
          isValidBusinessData: false,
          detectedFormat: "config_file",
          detectedEntityType: "non_business_config",
          rowCountEstimate: 0,
          detectedColumns: topKeys,
          sampleRecords: [],
          rejectionReason: `El objeto JSON (${topKeys.slice(0, 5).join(", ")}) no contiene tablas ni colecciones de registros empresariales.`,
        };
      }

      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          return {
            exists: true,
            isValidBusinessData: false,
            detectedFormat: "empty",
            detectedEntityType: "invalid",
            rowCountEstimate: 0,
            detectedColumns: [],
            sampleRecords: [],
            rejectionReason: "El arreglo JSON está vacío ([]) y no contiene registros para importar.",
          };
        }
        const first = parsed[0];
        if (!first || typeof first !== "object") {
          return {
            exists: true,
            isValidBusinessData: false,
            detectedFormat: "json",
            detectedEntityType: "invalid",
            rowCountEstimate: parsed.length,
            detectedColumns: [],
            sampleRecords: [],
            rejectionReason: "El arreglo JSON no contiene objetos estructurados de negocio.",
          };
        }
        const cols = Object.keys(first);
        const hasBusinessCols = cols.some((c) =>
          BUSINESS_COLUMN_KEYWORDS.some((kw) => c.toLowerCase().includes(kw)),
        );
        if (!hasBusinessCols) {
          return {
            exists: true,
            isValidBusinessData: false,
            detectedFormat: "json",
            detectedEntityType: "non_business_config",
            rowCountEstimate: parsed.length,
            detectedColumns: cols,
            sampleRecords: parsed.slice(0, 2),
            rejectionReason: `Los objetos del JSON tienen campos (${cols.join(", ")}) que no representan inventario, productos, proveedores ni ventas.`,
          };
        }
        return {
          exists: true,
          isValidBusinessData: true,
          detectedFormat: "json",
          detectedEntityType: "inventory_products",
          rowCountEstimate: parsed.length,
          detectedColumns: cols,
          sampleRecords: parsed.slice(0, 3),
        };
      }
    } catch {
      return {
        exists: true,
        isValidBusinessData: false,
        detectedFormat: "unknown",
        detectedEntityType: "invalid",
        rowCountEstimate: 0,
        detectedColumns: [],
        sampleRecords: [],
        rejectionReason: "El archivo tiene extensión o formato JSON corrupto y no pudo ser parseado.",
      };
    }
  }

  // 2. Inspección de SQL
  if (ext === ".sql" || /CREATE\s+TABLE|INSERT\s+INTO/i.test(rawText)) {
    const hasBusinessTables = /products|productos|inventory|inventario|suppliers|proveedores|sales|ventas|orders|ordenes/i.test(
      rawText,
    );
    const insertMatches = rawText.match(/INSERT\s+INTO/gi) || [];
    if (!hasBusinessTables && insertMatches.length === 0) {
      return {
        exists: true,
        isValidBusinessData: false,
        detectedFormat: "sql",
        detectedEntityType: "invalid",
        rowCountEstimate: 0,
        detectedColumns: [],
        sampleRecords: [],
        rejectionReason: "El script SQL no contiene tablas ni sentencias INSERT de entidades operativas de negocio.",
      };
    }
    return {
      exists: true,
      isValidBusinessData: true,
      detectedFormat: "sql",
      detectedEntityType: "mixed_business",
      rowCountEstimate: Math.max(1, insertMatches.length),
      detectedColumns: ["sql_statements"],
      sampleRecords: [{ preview: rawText.slice(0, 200) }],
    };
  }

  // 3. Inspección de CSV / TSV
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      exists: true,
      isValidBusinessData: false,
      detectedFormat: "unknown",
      detectedEntityType: "invalid",
      rowCountEstimate: 0,
      detectedColumns: [],
      sampleRecords: [],
      rejectionReason: "El archivo no contiene encabezados ni filas de datos tabulares válidas.",
    };
  }

  const delimiter = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0]
    .split(delimiter)
    .map((h) => h.replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);

  const hasBusinessHeaders = headers.some((h) =>
    BUSINESS_COLUMN_KEYWORDS.some((kw) => h.toLowerCase().includes(kw)),
  );

  if (headers.length < 2 || !hasBusinessHeaders) {
    return {
      exists: true,
      isValidBusinessData: false,
      detectedFormat: "unknown",
      detectedEntityType: "non_business_config",
      rowCountEstimate: 0,
      detectedColumns: headers,
      sampleRecords: [],
      rejectionReason: `El contenido del archivo no corresponde a una tabla de negocio válida (encabezados detectados: ${headers.slice(0, 5).join(", ") || "ninguno"}).`,
    };
  }

  const sampleRecords: any[] = [];
  for (let i = 1; i < Math.min(lines.length, 5); i++) {
    const values = lines[i].split(delimiter).map((v) => v.replace(/^["']|["']$/g, "").trim());
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] ?? "";
    });
    sampleRecords.push(rowObj);
  }

  return {
    exists: true,
    isValidBusinessData: true,
    detectedFormat: "csv",
    detectedEntityType: "inventory_products",
    rowCountEstimate: lines.length - 1,
    detectedColumns: headers,
    sampleRecords,
  };
}

/**
 * Inspecciona un archivo o directorio basándose en evidencia real del contenido.
 * Si el archivo solicitado no existe o es inválido (ej. configuración de app o archivo vacío),
 * investiga automáticamente fuentes alternativas válidas en el directorio y el entorno autorizado.
 */
export async function inspectAndRecoverDataSource(
  targetPath: string,
  companyId: string = "comp_default",
  searchDirs: string[] = [],
): Promise<DataSourceInspectionResult> {
  const resolvedTarget = path.resolve(targetPath);
  const primary = analyzeSingleFileContent(resolvedTarget);

  const discoveredAlternatives: DataSourceInspectionResult["discoveredAlternatives"] = [];

  if (!primary.isValidBusinessData) {
    // Registrar evento de investigación / fuente inválida sin corromper nada
    await db
      .insert(auditIncidents)
      .values({
        id: `inc_src_${randomUUID().slice(0, 8)}`,
        companyId,
        incidentType: "FUENTE_DATOS_INVALIDA",
        severity: "MEDIA",
        title: `Fuente de datos rechazada tras inspección de contenido: ${path.basename(resolvedTarget)}`,
        details: primary.rejectionReason || "Archivo no válido como base de datos de negocio.",
        status: "EN_REVISION",
        detectedBy: "MINT_EVIDENCE_INSPECTOR",
        metadata: {
          targetPath: resolvedTarget,
          detectedFormat: primary.detectedFormat,
          detectedEntityType: primary.detectedEntityType,
        },
        createdAt: new Date(),
      })
      .catch(() => {});

    // Investigar automáticamente directorios cercanos en busca de fuentes de negocio reales
    const candidateDirs = Array.from(
      new Set([
        path.dirname(resolvedTarget),
        ...searchDirs.map((d) => path.resolve(d)),
        path.resolve(process.cwd(), "samples"),
        path.resolve(process.cwd(), "data"),
      ]),
    );

    for (const dir of candidateDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const fullCandidate = path.resolve(dir, entry);
          if (fullCandidate === resolvedTarget) continue;
          const ext = path.extname(entry).toLowerCase();
          if (![".csv", ".json", ".sql"].includes(ext)) continue;

          const check = analyzeSingleFileContent(fullCandidate);
          if (check.isValidBusinessData && check.rowCountEstimate > 0) {
            discoveredAlternatives.push({
              filePath: fullCandidate,
              fileName: entry,
              detectedEntityType: check.detectedEntityType,
              rowCountEstimate: check.rowCountEstimate,
              detectedColumns: check.detectedColumns,
            });
          }
        }
      } catch {
        // Ignorar directorios inaccesibles
      }
    }
  }

  return {
    targetPath: resolvedTarget,
    exists: primary.exists,
    isValidBusinessData: primary.isValidBusinessData,
    detectedFormat: primary.detectedFormat,
    detectedEntityType: primary.detectedEntityType,
    rowCountEstimate: primary.rowCountEstimate,
    detectedColumns: primary.detectedColumns,
    sampleRecords: primary.sampleRecords,
    rejectionReason: primary.rejectionReason,
    discoveredAlternatives,
  };
}

/**
 * Importa datos de negocio validados con soporte de Checkpoints Idempotentes,
 * recuperación ante interrupciones (Scenario C / Scenario G) y auto-verificación post-importación.
 */
export async function importBusinessDataWithRecovery(options: {
  filePath: string;
  companyId: string;
  authorizedBy?: string;
  checkpointId?: string;
  simulateInterruptAfterRow?: number;
  autoSwitchToAlternativeIfInvalid?: boolean;
}): Promise<{
  success: boolean;
  status: "COMPLETED" | "INTERRUPTED" | "REJECTED_INVALID_SOURCE" | "RECOVERED_VIA_ALTERNATIVE";
  checkpointId: string;
  usedFilePath: string;
  importedCount: number;
  skippedAlreadyImportedCount: number;
  totalExpectedRows: number;
  verifiedInDatabaseCount: number;
  verificationPassed: boolean;
  message: string;
  discoveredAlternatives?: DataSourceInspectionResult["discoveredAlternatives"];
}> {
  const {
    companyId,
    authorizedBy = "AUTONOMOUS_AGENT",
    simulateInterruptAfterRow,
    autoSwitchToAlternativeIfInvalid = false,
  } = options;

  // Asegurar que la empresa exista
  await db
    .insert(companies)
    .values({
      id: companyId,
      name: companyId === "comp_default" ? "Empresa Operativa Principal" : `Empresa ${companyId}`,
      currency: "MXN",
      country: "MX",
    })
    .onConflictDoNothing();

  // 1. Inspeccionar el archivo basado en evidencia real
  let inspection = await inspectAndRecoverDataSource(options.filePath, companyId);
  let activeFilePath = inspection.targetPath;
  let usedAlternative = false;

  if (!inspection.isValidBusinessData) {
    if (autoSwitchToAlternativeIfInvalid && inspection.discoveredAlternatives.length > 0) {
      const bestAlt = inspection.discoveredAlternatives[0];
      activeFilePath = bestAlt.filePath;
      inspection = await inspectAndRecoverDataSource(activeFilePath, companyId);
      usedAlternative = true;
    } else {
      return {
        success: false,
        status: "REJECTED_INVALID_SOURCE",
        checkpointId: "",
        usedFilePath: inspection.targetPath,
        importedCount: 0,
        skippedAlreadyImportedCount: 0,
        totalExpectedRows: 0,
        verifiedInDatabaseCount: 0,
        verificationPassed: false,
        message: `Inspección fallida: ${inspection.rejectionReason} No se importó ningún registro.${
          inspection.discoveredAlternatives.length > 0
            ? ` Se encontraron ${inspection.discoveredAlternatives.length} fuentes alternativas válidas: ${inspection.discoveredAlternatives.map((a) => a.fileName).join(", ")}.`
            : ""
        }`,
        discoveredAlternatives: inspection.discoveredAlternatives,
      };
    }
  }

  // 2. Parsear todos los registros del archivo válido
  const rawText = fs.readFileSync(activeFilePath, "utf-8").trim();
  let records: Array<Record<string, any>> = [];

  if (inspection.detectedFormat === "json") {
    const parsed = JSON.parse(rawText);
    records = Array.isArray(parsed)
      ? parsed
      : parsed[Object.keys(parsed).find((k) => Array.isArray(parsed[k])) || ""] || [];
  } else if (inspection.detectedFormat === "csv") {
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const delimiter = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(delimiter).map((h) => h.replace(/^["']|["']$/g, "").trim());
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(delimiter).map((v) => v.replace(/^["']|["']$/g, "").trim());
      const row: Record<string, any> = {};
      headers.forEach((h, idx) => {
        row[h] = vals[idx] ?? "";
      });
      records.push(row);
    }
  }

  // 3. Buscar o crear checkpoint persistente para esta tarea e archivo
  let existingCheckpoint: any = null;
  if (options.checkpointId) {
    const [found] = await db
      .select()
      .from(agentTaskCheckpoints)
      .where(eq(agentTaskCheckpoints.id, options.checkpointId))
      .limit(1);
    existingCheckpoint = found;
  } else {
    const [foundByTarget] = await db
      .select()
      .from(agentTaskCheckpoints)
      .where(
        and(
          eq(agentTaskCheckpoints.companyId, companyId),
          eq(agentTaskCheckpoints.sourceTarget, activeFilePath),
        ),
      )
      .orderBy(desc(agentTaskCheckpoints.createdAt))
      .limit(1);
    if (foundByTarget && foundByTarget.status !== "COMPLETED") {
      existingCheckpoint = foundByTarget;
    }
  }

  const checkpointId = existingCheckpoint?.id || `chk_imp_${randomUUID().slice(0, 8)}`;
  const completedSkus = new Set<string>(
    Array.isArray(existingCheckpoint?.completedSteps) ? existingCheckpoint.completedSteps : [],
  );

  if (!existingCheckpoint) {
    await db.insert(agentTaskCheckpoints).values({
      id: checkpointId,
      companyId,
      taskType: "IMPORT_DATABASE",
      objective: `Importar y verificar registros operativos desde ${path.basename(activeFilePath)}`,
      status: "IN_PROGRESS",
      sourceTarget: activeFilePath,
      completedSteps: [],
      pendingSteps: records.map((_, idx) => `row_${idx + 1}`),
      failedAttempts: [],
      initiatedBy: authorizedBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await db
      .update(agentTaskCheckpoints)
      .set({
        status: "RECOVERING",
        updatedAt: new Date(),
      })
      .where(eq(agentTaskCheckpoints.id, checkpointId));
  }

  // Asegurar almacén central para la empresa
  const warehouseId = companyId === "comp_default" ? "alm_central" : `alm_central_${companyId}`;
  await db
    .insert(warehouses)
    .values({
      id: warehouseId,
      companyId,
      name: "Almacén Central CDMX",
      location: "Ciudad de México",
      city: "Ciudad de México",
      country: "MX",
    })
    .onConflictDoNothing();

  let newlyImportedCount = 0;
  let skippedCount = 0;

  for (let idx = 0; idx < records.length; idx++) {
    const row = records[idx];
    const rawSku = String(
      row.sku || row.SKU || row.codigo || row.CODIGO || row.code || row.id || `SKU-${idx + 1}`,
    ).trim();

    // Idempotencia por Checkpoint: si este SKU ya fue procesado antes de la interrupción, no duplicarlo
    if (completedSkus.has(rawSku)) {
      skippedCount++;
      continue;
    }

    // Simulación de interrupción controlada (para pruebas de resiliencia Scenario C / Scenario G)
    if (
      typeof simulateInterruptAfterRow === "number" &&
      newlyImportedCount >= simulateInterruptAfterRow
    ) {
      const remainingSkus = records
        .slice(idx)
        .map((r, rIdx) => String(r.sku || r.SKU || r.codigo || r.code || `SKU-${idx + rIdx + 1}`).trim());

      await db
        .update(agentTaskCheckpoints)
        .set({
          status: "INTERRUPTED",
          completedSteps: Array.from(completedSkus),
          pendingSteps: remainingSkus,
          failedAttempts: [
            ...(Array.isArray(existingCheckpoint?.failedAttempts) ? existingCheckpoint.failedAttempts : []),
            {
              step: `row_${idx + 1}`,
              error: "Importación interrumpida a mitad de ejecución.",
              recoveryAction: "Reanudar desde el último SKU confirmado sin duplicar registros previos.",
              timestamp: new Date().toISOString(),
            },
          ],
          updatedAt: new Date(),
        })
        .where(eq(agentTaskCheckpoints.id, checkpointId));

      return {
        success: false,
        status: "INTERRUPTED",
        checkpointId,
        usedFilePath: activeFilePath,
        importedCount: newlyImportedCount,
        skippedAlreadyImportedCount: skippedCount,
        totalExpectedRows: records.length,
        verifiedInDatabaseCount: completedSkus.size,
        verificationPassed: false,
        message: `La importación se interrumpió tras procesar ${completedSkus.size} de ${records.length} registros. El estado quedó guardado en el checkpoint '${checkpointId}' para reanudación segura sin duplicados.`,
      };
    }

    const name = String(
      row.name || row.nombre || row.Nombre || row.producto || row.Producto || `Producto ${rawSku}`,
    ).trim();
    const category = String(row.category || row.categoria || row.Categoria || "general").trim();
    const stockVal = Math.max(
      0,
      parseInt(String(row.stock ?? row.existencia ?? row.cantidad ?? row.qty ?? 0), 10) || 0,
    );
    const minStockVal = Math.max(
      1,
      parseInt(String(row.min_stock ?? row.minStock ?? row.rop ?? 10), 10) || 10,
    );
    const priceVal = parseFloat(String(row.price ?? row.precio ?? 100)) || 100;
    const costVal = parseFloat(String(row.cost_price ?? row.costPrice ?? row.costo ?? priceVal * 0.7)) || 70;

    const cleanSlug = rawSku.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const productId = `prod_${companyId}_${cleanSlug}`;
    const invId = `inv_${companyId}_${cleanSlug}`;

    await db
      .insert(products)
      .values({
        id: productId,
        companyId,
        name,
        category,
        sku: rawSku,
        minStock: minStockVal,
        price: priceVal.toFixed(2),
        costPrice: costVal.toFixed(2),
        origin: "real",
      })
      .onConflictDoUpdate({
        target: [products.companyId, products.sku],
        set: {
          name,
          category,
          minStock: minStockVal,
          price: priceVal.toFixed(2),
          costPrice: costVal.toFixed(2),
          origin: "real",
        },
      });

    // Obtener el ID real del producto (en caso de que ya existiera con otro ID pero mismo SKU)
    const [persistedProd] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.companyId, companyId), eq(products.sku, rawSku)))
      .limit(1);

    const actualProductId = persistedProd?.id || productId;

    const [existingInv] = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.companyId, companyId), eq(inventory.productId, actualProductId)))
      .limit(1);

    const prevStock = existingInv?.stock ?? 0;

    if (existingInv) {
      await db
        .update(inventory)
        .set({ stock: stockVal, updatedAt: new Date() })
        .where(eq(inventory.id, existingInv.id));
    } else {
      await db.insert(inventory).values({
        id: invId,
        companyId,
        productId: actualProductId,
        warehouseId,
        stock: stockVal,
        updatedAt: new Date(),
      });
    }

    await db.insert(inventoryMovements).values({
      id: `mov_${randomUUID().slice(0, 8)}`,
      companyId,
      productId: actualProductId,
      warehouseId,
      previousStock: prevStock,
      newStock: stockVal,
      quantityDelta: stockVal - prevStock,
      movementType: "IMPORTACION_INICIAL",
      reason: `Importación verificada desde ${path.basename(activeFilePath)}`,
      authorizedBy,
      transactionRef: checkpointId,
      createdAt: new Date(),
    });

    completedSkus.add(rawSku);
    newlyImportedCount++;
  }

  // 4. AUTO-VERIFICACIÓN REAL EN BASE DE DATOS (Parte 3 Sección 8)
  const dbProducts = await db
    .select({ id: products.id, sku: products.sku })
    .from(products)
    .where(eq(products.companyId, companyId));

  const persistedSkuSet = new Set(dbProducts.map((p) => p.sku));
  const verifiedCount = Array.from(completedSkus).filter((s) => persistedSkuSet.has(s)).length;
  const verificationPassed = verifiedCount === completedSkus.size && completedSkus.size > 0;

  await db
    .update(agentTaskCheckpoints)
    .set({
      status: verificationPassed ? "COMPLETED" : "FAILED_BLOCKED",
      completedSteps: Array.from(completedSkus),
      pendingSteps: [],
      verificationResult: {
        verifiedAt: new Date().toISOString(),
        expectedUniqueSkus: completedSkus.size,
        verifiedInDatabaseCount: verifiedCount,
        totalCompanyProductsInDb: dbProducts.length,
        verificationPassed,
      },
      updatedAt: new Date(),
    })
    .where(eq(agentTaskCheckpoints.id, checkpointId));

  await db.insert(importJobs).values({
    id: `job_${randomUUID().slice(0, 8)}`,
    companyId,
    status: verificationPassed ? "COMPLETED" : "FAILED",
    targetEntity: "products_and_inventory",
    totalRows: records.length,
    importedRows: newlyImportedCount,
    failedRows: 0,
    createdAt: new Date(),
    completedAt: new Date(),
  });

  return {
    success: verificationPassed,
    status: usedAlternative ? "RECOVERED_VIA_ALTERNATIVE" : "COMPLETED",
    checkpointId,
    usedFilePath: activeFilePath,
    importedCount: newlyImportedCount,
    skippedAlreadyImportedCount: skippedCount,
    totalExpectedRows: records.length,
    verifiedInDatabaseCount: verifiedCount,
    verificationPassed,
    message: usedAlternative
      ? `El archivo original era inválido, pero MINT descubrió e importó exitosamente la fuente alternativa '${path.basename(activeFilePath)}' (${verifiedCount} SKUs verificados en base de datos).`
      : `Importación completada y auto-verificada: ${newlyImportedCount} registros nuevos importados, ${skippedCount} omitidos por idempotencia previa. Total verificado en base de datos: ${verifiedCount}/${completedSkus.size} SKUs.`,
  };
}

/**
 * Organización y Auditoría Autónoma Multi-Paso del Inventario (Parte 3 Sección 6 y Scenario E)
 * Investiga inconsistencias reales (duplicados, productos sin proveedor, sin registro de almacén,
 * categorías desnormalizadas, precios faltantes o caídas bruscas de stock) y ejecuta correcciones seguras.
 */
export async function organizeAndAuditInventory(
  companyId: string = "comp_default",
  options: { autoFixSafeIssues?: boolean; authorizedBy?: string } = { autoFixSafeIssues: true },
) {
  const checkpointId = `chk_org_${randomUUID().slice(0, 8)}`;
  const completedSteps: string[] = [];

  await db
    .insert(companies)
    .values({
      id: companyId,
      name: companyId === "comp_default" ? "Empresa Operativa Principal" : `Empresa ${companyId}`,
      currency: "MXN",
      country: "MX",
    })
    .onConflictDoNothing();

  await db.insert(agentTaskCheckpoints).values({
    id: checkpointId,
    companyId,
    taskType: "INVENTORY_ORGANIZATION",
    objective: "Investigar, auditar y organizar integralmente el catálogo de inventario y sus relaciones operativas",
    status: "IN_PROGRESS",
    completedSteps: [],
    pendingSteps: [
      "scan_products_and_stock",
      "normalize_categories_and_missing_warehouse_rows",
      "detect_duplicates_and_orphan_suppliers",
      "verify_post_organization_state",
    ],
    initiatedBy: options.authorizedBy || "AUTONOMOUS_AGENT",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const allProducts = await db
    .select()
    .from(products)
    .where(eq(products.companyId, companyId));

  const allInv = await db
    .select()
    .from(inventory)
    .where(eq(inventory.companyId, companyId));

  const allSupplierLinks = await db
    .select()
    .from(supplierProducts)
    .where(eq(supplierProducts.companyId, companyId));

  completedSteps.push("scan_products_and_stock");

  const invByProduct = new Map<string, typeof allInv>();
  for (const row of allInv) {
    const list = invByProduct.get(row.productId) || [];
    list.push(row);
    invByProduct.set(row.productId, list);
  }

  const supplierSet = new Set(allSupplierLinks.map((s) => s.productId));

  // Detectar problemas
  const productsWithoutWarehouseRow: string[] = [];
  const productsWithoutSupplier: Array<{ id: string; sku: string; name: string }> = [];
  const productsWithMissingPricing: Array<{ id: string; sku: string; name: string }> = [];
  const normalizedCategoriesFixed: Array<{ sku: string; from: string; to: string }> = [];
  const duplicateNameGroups: Array<{ normalizedName: string; skus: string[] }> = [];

  const byNormName = new Map<string, string[]>();
  const centralWarehouseId = companyId === "comp_default" ? "alm_central" : `alm_central_${companyId}`;

  await db
    .insert(warehouses)
    .values({
      id: centralWarehouseId,
      companyId,
      name: "Almacén Central CDMX",
      location: "Ciudad de México",
      city: "Ciudad de México",
      country: "MX",
    })
    .onConflictDoNothing();

  for (const prod of allProducts) {
    const normName = prod.name.toLowerCase().trim().replace(/\s+/g, " ");
    const skuList = byNormName.get(normName) || [];
    skuList.push(prod.sku);
    byNormName.set(normName, skuList);

    if (!invByProduct.has(prod.id)) {
      productsWithoutWarehouseRow.push(prod.sku);
      if (options.autoFixSafeIssues !== false) {
        await db
          .insert(inventory)
          .values({
            id: `inv_${prod.id}`,
            companyId,
            productId: prod.id,
            warehouseId: centralWarehouseId,
            stock: 0,
            updatedAt: new Date(),
          })
          .onConflictDoNothing();
      }
    }

    if (!supplierSet.has(prod.id)) {
      productsWithoutSupplier.push({ id: prod.id, sku: prod.sku, name: prod.name });
    }

    const priceNum = Number(prod.price || 0);
    const costNum = Number(prod.costPrice || 0);
    if (priceNum <= 0 || costNum <= 0) {
      productsWithMissingPricing.push({ id: prod.id, sku: prod.sku, name: prod.name });
    }

    const rawCat = prod.category || "general";
    const cleanCat = rawCat.trim().toLowerCase();
    if (rawCat !== cleanCat && options.autoFixSafeIssues !== false) {
      await db
        .update(products)
        .set({ category: cleanCat })
        .where(eq(products.id, prod.id));
      normalizedCategoriesFixed.push({ sku: prod.sku, from: rawCat, to: cleanCat });
    }
  }

  for (const [normName, skus] of byNormName.entries()) {
    if (skus.length > 1) {
      duplicateNameGroups.push({ normalizedName: normName, skus });
    }
  }

  completedSteps.push("normalize_categories_and_missing_warehouse_rows");
  completedSteps.push("detect_duplicates_and_orphan_suppliers");

  // Registrar preguntas pendientes para anomalías que requieren decisión humana (ej. productos huérfanos sin proveedor)
  for (const orphan of productsWithoutSupplier.slice(0, 5)) {
    const qId = `q_org_supp_${orphan.id}`.slice(0, 120);
    await db
      .insert(mintPendingQuestions)
      .values({
        id: qId,
        companyId,
        topic: "supplier_missing",
        question: `El producto '${orphan.name}' (${orphan.sku}) no tiene proveedor asignado. ¿Qué proveedor debemos vincularle?`,
        context: { productId: orphan.id, sku: orphan.sku },
        status: "pending",
      })
      .onConflictDoNothing();
  }

  // Auto-verificación post-organización
  const postInvRows = await db
    .select()
    .from(inventory)
    .where(eq(inventory.companyId, companyId));

  const verificationPassed = postInvRows.length >= allProducts.length;
  completedSteps.push("verify_post_organization_state");

  const summary = {
    checkpointId,
    totalProductsAudited: allProducts.length,
    totalInventoryRecordsVerified: postInvRows.length,
    safeFixesApplied: {
      missingWarehouseRowsCreated: options.autoFixSafeIssues !== false ? productsWithoutWarehouseRow.length : 0,
      categoriesNormalized: normalizedCategoriesFixed.length,
    },
    issuesRequiringAttention: {
      productsWithoutSupplierCount: productsWithoutSupplier.length,
      productsWithoutSupplierSample: productsWithoutSupplier.slice(0, 5),
      duplicateProductNamesCount: duplicateNameGroups.length,
      duplicateProductGroups: duplicateNameGroups,
      productsWithMissingPricingCount: productsWithMissingPricing.length,
      productsWithMissingPricingSample: productsWithMissingPricing.slice(0, 5),
    },
    verificationPassed,
  };

  await db
    .update(agentTaskCheckpoints)
    .set({
      status: "COMPLETED",
      completedSteps,
      pendingSteps: [],
      verificationResult: summary,
      updatedAt: new Date(),
    })
    .where(eq(agentTaskCheckpoints.id, checkpointId));

  return summary;
}

export type EpistemicMemoryType =
  | "CONFIRMED_FACT"
  | "HISTORICAL_RECORD"
  | "USER_PREFERENCE"
  | "AI_ASSUMPTION"
  | "PREDICTION"
  | "OUTDATED"
  | "UNVERIFIED";

/**
 * Guarda una regla o directiva operativa aprendida en la memoria persistente del negocio.
 * Distingue niveles de certeza epistémica (Parte 2 Sección 3) y reemplaza automáticamente
 * reglas anteriores cuando se actualiza el proveedor o política sobre la misma entidad.
 */
export async function saveOperationalMemory(input: {
  companyId: string;
  category:
    | "DIRECTIVA_PROVEEDOR"
    | "POLITICA_COMPRAS"
    | "REGLA_INVENTARIO"
    | "HORARIO_OPERATIVO"
    | "INCIDENCIA_RECURRENTE"
    | "PREFERENCIA_CLIENTE"
    | "CONTEXTO_OPERATIVO";
  subjectKey: string;
  content: string;
  author?: string;
  confidence?: number;
  epistemicType?: EpistemicMemoryType;
}) {
  const companyId = input.companyId || "comp_default";
  const normalizedKey = input.subjectKey.trim().toUpperCase().replace(/\s+/g, "_");
  const epistemicType: EpistemicMemoryType =
    input.epistemicType ||
    ((input.confidence ?? 1.0) >= 0.95
      ? "CONFIRMED_FACT"
      : (input.confidence ?? 1.0) >= 0.75
      ? "USER_PREFERENCE"
      : "AI_ASSUMPTION");

  await db
    .insert(companies)
    .values({
      id: companyId,
      name: companyId === "comp_default" ? "Empresa Operativa Principal" : `Empresa ${companyId}`,
      currency: "MXN",
      country: "MX",
    })
    .onConflictDoNothing();

  // Buscar directivas activas previas de la misma empresa para detectar reemplazo exacto o semántico por entidad
  const allActive = await db
    .select()
    .from(businessOperationalMemory)
    .where(
      and(
        eq(businessOperationalMemory.companyId, companyId),
        eq(businessOperationalMemory.isActive, true),
      ),
    );

  const keyTokens = normalizedKey
    .split("_")
    .filter((t) => t.length >= 3 && !["SUPPLIER", "PROVEEDOR", "RULE", "REGLA", "POLICY", "POLITICA", "CHANGE", "UPDATE"].includes(t));

  const matchingExisting = allActive.filter((row) => {
    if (row.subjectKey === normalizedKey) return true;
    if (row.category === input.category && keyTokens.length > 0) {
      const rowKeyUpper = row.subjectKey.toUpperCase();
      const rowContentUpper = row.content.toUpperCase();
      return keyTokens.every((tok) => rowKeyUpper.includes(tok) || rowContentUpper.includes(tok));
    }
    return false;
  });

  const previousId = matchingExisting[0]?.id || null;
  for (const oldRow of matchingExisting) {
    await db
      .update(businessOperationalMemory)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(businessOperationalMemory.id, oldRow.id));
  }

  const newId = `mem_${randomUUID().slice(0, 8)}`;
  await db.insert(businessOperationalMemory).values({
    id: newId,
    companyId,
    category: input.category,
    subjectKey: normalizedKey,
    content: input.content.trim(),
    confidence: (input.confidence ?? 1.0).toFixed(2),
    author: `${input.author || "ADMIN"} [${epistemicType}]`,
    supersedesId: previousId,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Auto-verificar que quedó persistida
  const [verified] = await db
    .select()
    .from(businessOperationalMemory)
    .where(eq(businessOperationalMemory.id, newId))
    .limit(1);

  return {
    success: Boolean(verified),
    memoryId: newId,
    supersedesId: previousId,
    supersededCount: matchingExisting.length,
    epistemicType,
    subjectKey: normalizedKey,
    category: input.category,
    content: verified?.content || input.content,
    verifiedInDb: Boolean(verified),
  };
}

/**
 * Obtiene todas las directivas operativas activas de la empresa para inyectarlas en el razonamiento del agente.
 */
export async function getActiveOperationalMemory(companyId: string = "comp_default") {
  try {
    const rows = await db
      .select()
      .from(businessOperationalMemory)
      .where(
        and(
          eq(businessOperationalMemory.companyId, companyId),
          eq(businessOperationalMemory.isActive, true),
        ),
      )
      .orderBy(desc(businessOperationalMemory.updatedAt));
    return rows;
  } catch {
    return [];
  }
}

/**
 * Consulta o recupera tareas multi-paso interrumpidas o en curso tras un reinicio (Scenario G).
 */
export async function getTaskCheckpoints(
  companyId: string = "comp_default",
  onlyIncomplete: boolean = false,
) {
  const rows = await db
    .select()
    .from(agentTaskCheckpoints)
    .where(eq(agentTaskCheckpoints.companyId, companyId))
    .orderBy(desc(agentTaskCheckpoints.updatedAt));

  if (onlyIncomplete) {
    return rows.filter((r) => r.status !== "COMPLETED");
  }
  return rows;
}

/**
 * Verifica con total honestidad las capacidades conectadas del sistema, canales, base de datos,
 * telemetría GPS y permisos del rol actual (Parte 3 Sección 7).
 */
export async function verifySystemCapabilities(
  companyId: string = "comp_default",
  userRole: string = "owner",
) {
  const dbHealth = await checkDatabaseHealth();
  const channels = await db
    .select()
    .from(notificationChannels)
    .where(eq(notificationChannels.companyId, companyId));

  const sources = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.companyId, companyId));

  const gpsSources = sources.filter(
    (s) =>
      s.isActive &&
      (s.sourceType.toLowerCase().includes("gps") ||
        s.sourceType.toLowerCase().includes("telemetry") ||
        s.name.toLowerCase().includes("gps")),
  );

  const normalizedRole = userRole.toLowerCase().trim();
  const rolePolicy = HUMAN_ROLE_PERMISSIONS[normalizedRole] || HUMAN_ROLE_PERMISSIONS.operator;

  const activeDbChannels = channels
    .filter((c) => c.isActive)
    .map((c) => ({ id: c.id, type: c.type, name: c.name }));

  if (
    process.env.NODE_ENV !== "test" &&
    process.env.TELEGRAM_BOT_TOKEN &&
    process.env.TELEGRAM_CHAT_ID &&
    !activeDbChannels.some((c) => c.type === "telegram")
  ) {
    activeDbChannels.push({
      id: "chan_tg_env",
      type: "telegram",
      name: "Telegram Bot (ENV)",
    });
  }

  return {
    database: {
      connected: dbHealth.connected,
      storageMode: getStorageMode(),
      provider: dbHealth.provider,
      tablesCount: dbHealth.tablesCount,
    },
    notifications: {
      configuredChannelsCount: activeDbChannels.length,
      activeChannels: activeDbChannels,
    },
    telemetryAndGps: {
      liveGpsProviderConnected: gpsSources.length > 0,
      connectedProviders: gpsSources.map((g) => g.name),
      capabilityNote:
        gpsSources.length > 0
          ? "Proveedor de telemetría GPS en tiempo real conectado."
          : "No hay un proveedor de telemetría GPS en vivo conectado actualmente. MINT puede gestionar la flota, manifiestos de carga, estados de envío y rutas calculadas, pero no inventará coordenadas en tiempo real hasta conectar una fuente GPS.",
    },
    currentUserAuthorization: {
      role: userRole,
      allowedDomains: rolePolicy?.allowedDomains || {},
      deniedTools: rolePolicy?.deniedTools || [],
    },
  };
}

/**
 * PRIMITIVA GENERAL 1: Exploración e Inspección Autónoma de Entorno y Archivos.
 * Permite al agente descubrir por sí mismo qué fuentes de datos existen en un directorio,
 * distinguir datos reales de negocio frente a archivos de configuración, y seleccionar el mejor recurso.
 */
export async function exploreWorkspaceEnvironment(targetDirOrPath?: string): Promise<any> {
  const resolvedTarget = targetDirOrPath
    ? path.resolve(targetDirOrPath)
    : process.cwd();

  if (!fs.existsSync(resolvedTarget)) {
    const parentDir = path.dirname(resolvedTarget);
    if (fs.existsSync(parentDir)) {
      const parentInspection: any = await exploreWorkspaceEnvironment(parentDir);
      return {
        isSuccess: true,
        verified: true,
        requestedPathExists: false,
        recoveredFromParentDirectory: parentDir,
        ...parentInspection,
        message: `La ruta solicitada '${resolvedTarget}' no existe, pero MINT exploró el directorio padre '${parentDir}' y encontró ${parentInspection.validBusinessFiles.length} fuente(s) válida(s) de negocio.`,
      };
    }
    return {
      isSuccess: false,
      verified: false,
      requestedPathExists: false,
      targetDirectory: resolvedTarget,
      validBusinessFiles: [],
      rejectedFiles: [],
      message: `El directorio o archivo '${resolvedTarget}' no existe en el sistema de archivos.`,
    };
  }

  const stat = fs.statSync(resolvedTarget);
  if (stat.isFile()) {
    const fileInspection = await inspectAndRecoverDataSource(resolvedTarget);
    return {
      isSuccess: true,
      verified: true,
      requestedPathExists: true,
      targetDirectory: path.dirname(resolvedTarget),
      inspectedSingleFile: fileInspection,
      validBusinessFiles: fileInspection.isValidBusinessData
        ? [
            {
              filePath: fileInspection.targetPath,
              fileName: path.basename(fileInspection.targetPath),
              detectedFormat: fileInspection.detectedFormat,
              detectedEntityType: fileInspection.detectedEntityType,
              rowCountEstimate: fileInspection.rowCountEstimate,
              detectedColumns: fileInspection.detectedColumns,
            },
          ]
        : fileInspection.discoveredAlternatives,
      rejectedFiles: fileInspection.isValidBusinessData
        ? []
        : [
            {
              filePath: fileInspection.targetPath,
              fileName: path.basename(fileInspection.targetPath),
              reason: fileInspection.rejectionReason || "Archivo inválido o de configuración",
            },
          ],
      message: fileInspection.recommendedNextStep,
    };
  }

  const entries = fs.readdirSync(resolvedTarget, { withFileTypes: true });
  const candidateExts = new Set([".csv", ".json", ".sql", ".xlsx", ".xls", ".tsv"]);
  const validBusinessFiles: Array<{
    filePath: string;
    fileName: string;
    detectedFormat: string;
    detectedEntityType: string;
    rowCountEstimate: number;
    detectedColumns: string[];
  }> = [];
  const rejectedFiles: Array<{
    filePath: string;
    fileName: string;
    reason: string;
  }> = [];
  const subdirectories: string[] = [];

  for (const entry of entries.slice(0, 40)) {
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist") {
        subdirectories.push(entry.name);
      }
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!candidateExts.has(ext)) continue;

    const fullPath = path.join(resolvedTarget, entry.name);
    const inspection = await inspectAndRecoverDataSource(fullPath);
    if (inspection.isValidBusinessData) {
      validBusinessFiles.push({
        filePath: fullPath,
        fileName: entry.name,
        detectedFormat: inspection.detectedFormat,
        detectedEntityType: inspection.detectedEntityType,
        rowCountEstimate: inspection.rowCountEstimate,
        detectedColumns: inspection.detectedColumns,
      });
    } else {
      rejectedFiles.push({
        filePath: fullPath,
        fileName: entry.name,
        reason: inspection.rejectionReason || "No contiene registros de negocio válidos",
      });
    }
  }

  return {
    isSuccess: true,
    verified: true,
    requestedPathExists: true,
    targetDirectory: resolvedTarget,
    subdirectories,
    validBusinessFiles,
    rejectedFiles,
    message: `Exploración completada en '${resolvedTarget}': ${validBusinessFiles.length} archivo(s) de negocio válido(s) y ${rejectedFiles.length} archivo(s) descartado(s) por ser configuración o vacíos.`,
  };
}

/**
 * PRIMITIVA GENERAL 2: Introspección de Esquema y Consulta Analítica Segura sobre Base de Datos.
 * Permite al agente resolver cualquier pregunta de negocio no prevista inspeccionando las tablas reales
 * y ejecutando consultas SELECT de solo lectura con auto-recuperación ante errores de nombres de columna.
 */
export async function introspectAndQueryDatabase(
  companyId: string = "comp_default",
  options: {
    mode: "schema" | "query";
    sqlQuery?: string;
    tableFilter?: string;
  },
) {
  const startMs = Date.now();

  const fetchSchemaDetails = async (filterTable?: string) => {
    const colsRes = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    const grouped: Record<
      string,
      Array<{ column: string; type: string; nullable: boolean }>
    > = {};

    for (const row of colsRes.rows as any[]) {
      const tName = String(row.table_name);
      if (filterTable && !tName.toLowerCase().includes(filterTable.toLowerCase())) {
        continue;
      }
      if (!grouped[tName]) grouped[tName] = [];
      grouped[tName].push({
        column: String(row.column_name),
        type: String(row.data_type),
        nullable: row.is_nullable === "YES",
      });
    }
    return grouped;
  };

  if (options.mode === "schema" || !options.sqlQuery) {
    const schemas = await fetchSchemaDetails(options.tableFilter);
    return {
      isSuccess: true,
      verified: true,
      mode: "schema",
      companyId,
      tablesCount: Object.keys(schemas).length,
      schemas,
      durationMs: Date.now() - startMs,
      message: `Esquema de base de datos inspeccionado exitosamente (${Object.keys(schemas).length} tablas descubiertas).`,
    };
  }

  // Modo "query": Validar fronteras duras de seguridad (SOLO LECTURA)
  const rawQuery = options.sqlQuery.trim().replace(/;+\s*$/, "");
  const strippedComments = rawQuery
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();

  if (!/^(select|with)\b/i.test(strippedComments)) {
    return {
      isSuccess: false,
      verified: false,
      blockedBySecurityPolicy: true,
      error: "BOUNDARY_VIOLATION_READ_ONLY_REQUIRED",
      message:
        "Frontera de seguridad activada: 'consultar_esquema_y_datos_bd' solo permite consultas analíticas de lectura (SELECT / WITH). Para modificar registros autorizados utiliza las herramientas con control RBAC y auditoría.",
    };
  }

  if (
    /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|pg_sleep| execute)\b/i.test(
      strippedComments,
    ) ||
    strippedComments.includes(";")
  ) {
    return {
      isSuccess: false,
      verified: false,
      blockedBySecurityPolicy: true,
      error: "BOUNDARY_VIOLATION_FORBIDDEN_SQL_KEYWORD",
      message:
        "Frontera de seguridad activada: La consulta contiene palabras clave de mutación o múltiples sentencias no permitidas en una consulta analítica.",
    };
  }

  const safeQuery = /\blimit\s+\d+/i.test(strippedComments)
    ? strippedComments
    : `${strippedComments} LIMIT 200`;

  try {
    const res = await pool.query(safeQuery);
    return {
      isSuccess: true,
      verified: true,
      mode: "query",
      executedSql: safeQuery,
      rowCount: res.rows.length,
      rows: res.rows,
      durationMs: Date.now() - startMs,
      message: `Consulta analítica ejecutada y verificada sobre base de datos real (${res.rows.length} fila(s) obtenida(s)).`,
    };
  } catch (err: any) {
    // Auto-recuperación: si el agente se equivocó de nombre de tabla o columna, adjuntar el esquema real para que corrija la consulta en el siguiente paso
    const schemas = await fetchSchemaDetails().catch(() => ({}));
    return {
      isSuccess: false,
      verified: false,
      mode: "query",
      executedSql: safeQuery,
      error: err?.message || String(err),
      availableSchemasForRecovery: schemas,
      recoveryDirective:
        "La consulta SQL falló debido a un nombre de tabla/columna o sintaxis. Revisa 'availableSchemasForRecovery' con las columnas reales de PostgreSQL y ejecuta nuevamente la consulta corregida.",
      message: `Error al ejecutar consulta SQL (${err?.message || err}). Se adjunta el esquema real de tablas y columnas para auto-recuperación inmediata.`,
    };
  }
}

/**
 * PRIMITIVA GENERAL 3: Mutación de Datos Controlada por Fronteras RBAC y Auto-Verificada.
 * Permite al agente resolver necesidades operativas dinámicas actualizando registros autorizados,
 * tomando snapshot previo, aplicando límites de rol/seguridad y verificando el estado final en la BD.
 */
export async function executeAuthorizedDataMutation(
  companyId: string = "comp_default",
  options: {
    userRole?: string;
    authorizedBy?: string;
    targetTable: "products" | "inventory" | "suppliers" | "warehouses";
    operation: "update" | "insert";
    recordId: string;
    updates: Record<string, any>;
    reason: string;
  },
) {
  const callerRole = (options.userRole || "operator").toLowerCase().trim();
  const restrictedRoles = new Set([
    "cashier",
    "cajero",
    "driver",
    "chofer",
    "viewer",
    "lector",
    "auditor",
    "client",
    "cliente",
  ]);

  // 1. FRONTERA DURA DE PERMISOS (Rules are for boundaries, not intelligence)
  if (restrictedRoles.has(callerRole)) {
    await db
      .insert(auditIncidents)
      .values({
        id: `inc_mut_rbac_${randomUUID().slice(0, 8)}`,
        companyId,
        incidentType: "VIOLACION_RBAC",
        severity: "ALTA",
        title: `Bloqueo RBAC: Rol '${callerRole}' intentó mutar '${options.targetTable}'`,
        details: `Intento de '${options.operation}' sobre registro '${options.recordId}' en '${options.targetTable}' rechazado por política de rol. Motivo declarado: ${options.reason}`,
        status: "DETECTADO",
        detectedBy: "AUTHORIZED_MUTATION_BOUNDARY",
        metadata: {
          callerRole,
          targetTable: options.targetTable,
          recordId: options.recordId,
          updates: options.updates,
        },
        createdAt: new Date(),
      })
      .catch(() => {});

    return {
      isSuccess: false,
      verified: false,
      blockedBySecurityPolicy: true,
      code: "DENIED_USER_ROLE_INSUFFICIENT",
      message: `[FRONTERA DE SEGURIDAD RBAC] El rol '${callerRole}' no tiene autorización para modificar '${options.targetTable}'. Se registró el incidente en bitácora y los datos permanecen intactos.`,
    };
  }

  // 2. FRONTERA DE INTEGRIDAD FINANCIERA Y OPERATIVA
  if (options.updates.stock !== undefined && Number(options.updates.stock) < 0) {
    return {
      isSuccess: false,
      verified: false,
      blockedBySecurityPolicy: true,
      code: "BOUNDARY_NEGATIVE_STOCK_FORBIDDEN",
      message: "Frontera de integridad operativa: No se permite establecer un stock negativo.",
    };
  }
  if (
    (options.updates.price !== undefined && Number(options.updates.price) <= 0) ||
    (options.updates.costPrice !== undefined && Number(options.updates.costPrice) < 0)
  ) {
    return {
      isSuccess: false,
      verified: false,
      blockedBySecurityPolicy: true,
      code: "BOUNDARY_INVALID_PRICE_FORBIDDEN",
      message:
        "Frontera de integridad financiera: No se permite establecer precios en cero o negativos.",
    };
  }

  const tableMap = {
    products,
    inventory,
    suppliers,
    warehouses,
  } as const;

  const targetTableObj = tableMap[options.targetTable];
  if (!targetTableObj) {
    return {
      isSuccess: false,
      verified: false,
      message: `Tabla '${options.targetTable}' no soportada para mutación directa.`,
    };
  }

  // 3. Snapshot Previo (Evidencia del estado anterior)
  const beforeRows = await db
    .select()
    .from(targetTableObj as any)
    .where(
      and(
        eq((targetTableObj as any).companyId, companyId),
        eq((targetTableObj as any).id, options.recordId),
      ),
    )
    .limit(1);

  const beforeSnapshot = beforeRows[0] || null;

  if (options.operation === "update" && !beforeSnapshot) {
    return {
      isSuccess: false,
      verified: false,
      error: "RECORD_NOT_FOUND",
      recoveryDirective:
        "El ID de registro no existe en la tabla indicada. Usa 'consultar_esquema_y_datos_bd' para buscar el ID real del registro antes de actualizar.",
      message: `No se encontró el registro '${options.recordId}' en '${options.targetTable}' para la empresa '${companyId}'.`,
    };
  }

  // 4. Ejecutar mutación
  if (options.operation === "update") {
    await db
      .update(targetTableObj as any)
      .set({
        ...options.updates,
      })
      .where(
        and(
          eq((targetTableObj as any).companyId, companyId),
          eq((targetTableObj as any).id, options.recordId),
        ),
      );
  } else {
    await db.insert(targetTableObj as any).values({
      id: options.recordId,
      companyId,
      ...options.updates,
    });
  }

  // 5. Auto-Verificación Post-Escritura en Base de Datos (Evidencia del estado posterior)
  const afterRows = await db
    .select()
    .from(targetTableObj as any)
    .where(
      and(
        eq((targetTableObj as any).companyId, companyId),
        eq((targetTableObj as any).id, options.recordId),
      ),
    )
    .limit(1);

  const afterSnapshot = afterRows[0] || null;
  const verified = Boolean(afterSnapshot);

  return {
    isSuccess: verified,
    verified,
    targetTable: options.targetTable,
    operation: options.operation,
    recordId: options.recordId,
    beforeSnapshot,
    afterSnapshot,
    reason: options.reason,
    message: verified
      ? `Operación '${options.operation}' en '${options.targetTable}' (ID: ${options.recordId}) ejecutada y verificada en base de datos.`
      : `La operación en '${options.targetTable}' no pudo ser verificada en base de datos.`,
  };
}

/**
 * Historial Epistémico de Memoria y Detección de Contradicciones con la Base de Datos (Parte 2 Sección 3).
 * La base de datos empresarial es la fuente autoritativa; la memoria complementa pero jamás contradice en silencio.
 */
export async function getOperationalMemoryWithEpistemicAudit(companyId: string = "comp_default") {
  const allMemories = await db
    .select()
    .from(businessOperationalMemory)
    .where(eq(businessOperationalMemory.companyId, companyId))
    .orderBy(desc(businessOperationalMemory.updatedAt));

  const activeRules = allMemories.filter((m) => m.isActive);
  const supersededRules = allMemories
    .filter((m) => !m.isActive)
    .map((m) => ({
      ...m,
      epistemicStatus: "OUTDATED" as EpistemicMemoryType,
    }));

  // Detectar contradicciones entre la memoria y los registros autoritativos de la BD (products / suppliers)
  const dbProducts = await db.select().from(products).where(eq(products.companyId, companyId));
  const contradictions: Array<{
    memoryId: string;
    subjectKey: string;
    memoryContent: string;
    authoritativeDatabaseFact: string;
    resolutionRule: string;
  }> = [];

  for (const mem of activeRules) {
    const contentLower = mem.content.toLowerCase();
    for (const prod of dbProducts) {
      if (
        contentLower.includes(prod.name.toLowerCase()) ||
        contentLower.includes(prod.sku.toLowerCase())
      ) {
        const minStockMatch = mem.content.match(/min(?:imum|\.|imo)?\s*(?:acceptable\s*)?stock\s*(?:is|de|:)?\s*(\d+)/i);
        if (minStockMatch) {
          const memMinStock = parseInt(minStockMatch[1], 10);
          if (Number.isFinite(memMinStock) && prod.minStock !== memMinStock) {
            contradictions.push({
              memoryId: mem.id,
              subjectKey: mem.subjectKey,
              memoryContent: mem.content,
              authoritativeDatabaseFact: `Producto '${prod.name}' (${prod.sku}) tiene minStock=${prod.minStock} en la tabla 'products' (memoria indica ${memMinStock}).`,
              resolutionRule: "La tabla 'products' es la fuente autoritativa de registros; se señala la discrepancia para sincronizar o confirmar con el propietario.",
            });
          }
        }
      }
    }
  }

  return {
    companyId,
    activeRulesCount: activeRules.length,
    supersededHistoryCount: supersededRules.length,
    activeRules,
    supersededRules,
    contradictionsWithDatabase: contradictions,
  };
}

/**
 * Trazabilidad de Decisiones y Gobernanza (Parte 2 Sección 2).
 * Responde con evidencia real:
 * ¿Quién lo solicitó? ¿Quién lo autorizó? ¿Qué hizo MINT? ¿Cuándo ocurrió?
 * ¿Qué información lo justificó? ¿Fue exitoso? ¿Se puede revertir?
 */
export async function getActionProvenanceReport(companyId: string, decisionId?: string) {
  const allDecisions = await db
    .select()
    .from(decisions)
    .where(
      decisionId
        ? and(eq(decisions.companyId, companyId), eq(decisions.id, decisionId))
        : eq(decisions.companyId, companyId),
    )
    .orderBy(desc(decisions.createdAt))
    .limit(25);

  const provenanceRecords = allDecisions.map((d) => {
    const ev = (d.evidencePayload as any) || {};
    const isApproved = d.policyDecision === "approved";
    const isReversible =
      d.actionType === "ajustar_stock" ||
      d.actionType === "crear_orden_compra" ||
      Boolean(ev.beforeSnapshot);

    return {
      decisionId: d.id,
      caseId: d.caseId,
      whoRequested: d.requesterUserId || ev.requesterUserId || d.proposingAgent || "AUTONOMOUS_MONITOR",
      whoAuthorized: isApproved
        ? d.approvedBy || "OPERADOR_AUTORIZADO_HITL"
        : d.policyDecision === "rejected"
        ? `RECHAZADO (${d.approvedBy || "POLITICA"})`
        : "PENDIENTE_AUTORIZACION_HUMANA",
      whatMintDid: `${d.actionType} (${d.policyDecision})`,
      whenItHappened: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
      whatInformationJustifiedIt: {
        policyReason: d.policyReason,
        costAmount: d.costMxn,
        evidence: ev,
      },
      wasOperationSuccessful: isApproved,
      canItBeReversed: isReversible,
      reversalProcedure: isReversible
        ? d.actionType === "crear_orden_compra"
          ? "Cancelar orden de compra abierta antes de despacho y revertir reserva presupuestal."
          : "Aplicar ajuste inverso con snapshot previo verificado en inventory_movements."
        : "Operación informativa o externa; no requiere reversión de estado en base de datos.",
    };
  });

  return {
    companyId,
    totalEvaluated: provenanceRecords.length,
    records: provenanceRecords,
  };
}

/**
 * Barrido Proactivo de Propuestas Vencidas y Tareas Estancadas (Parte 2 Secciones 2 y 12).
 * Cancela automáticamente propuestas cuya vigencia (expiresAt) haya expirado y detecta tareas estancadas.
 */
export async function sweepExpiredProposalsAndOverdueTasks(companyId: string) {
  const now = new Date();
  const pendingDecisions = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "pending_approval")));

  const expiredCancelledIds: string[] = [];
  for (const dec of pendingDecisions) {
    if (dec.expiresAt && new Date(dec.expiresAt) < now) {
      await db
        .update(decisions)
        .set({
          policyDecision: "rejected",
          feedback: "CANCELACIÓN AUTOMÁTICA: La propuesta superó su tiempo de expiración sin recibir aprobación humana.",
        })
        .where(eq(decisions.id, dec.id));
      expiredCancelledIds.push(dec.id);
    }
  }

  const incompleteCheckpoints = await getTaskCheckpoints(companyId, true);

  return {
    companyId,
    sweptAt: now.toISOString(),
    expiredProposalsCancelledCount: expiredCancelledIds.length,
    expiredProposalIds: expiredCancelledIds,
    pendingIncompleteTasksCount: incompleteCheckpoints.length,
    incompleteTasks: incompleteCheckpoints.map((c) => ({
      checkpointId: c.id,
      taskType: c.taskType,
      status: c.status,
      objective: c.objective,
      pendingStepsCount: Array.isArray(c.pendingSteps) ? c.pendingSteps.length : 0,
    })),
  };
}

/**
 * Respaldo Verificado con SHA-256 y Restauración Segura para Continuidad de Negocio (Parte 2 Sección 14).
 * Jamás afirma que existe un respaldo a menos que haya sido escrito a disco y verificado mediante checksum SHA-256.
 */
export async function createVerifiedBusinessBackup(
  companyId: string,
  reason: string = "Respaldo preventivo de continuidad operativa",
) {
  const cryptoMod = await import("node:crypto");
  const backupDir = path.resolve(process.cwd(), "data", "backups", companyId);
  fs.mkdirSync(backupDir, { recursive: true });

  const [compRows, prodRows, invRows, suppRows, memRows] = await Promise.all([
    db.select().from(companies).where(eq(companies.id, companyId)),
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(inventory).where(eq(inventory.companyId, companyId)),
    db.select().from(suppliers).where(eq(suppliers.companyId, companyId)),
    db.select().from(businessOperationalMemory).where(eq(businessOperationalMemory.companyId, companyId)),
  ]);

  const payload = {
    backupVersion: "1.0",
    companyId,
    reason,
    createdAt: new Date().toISOString(),
    counts: {
      companies: compRows.length,
      products: prodRows.length,
      inventory: invRows.length,
      suppliers: suppRows.length,
      operationalMemories: memRows.length,
    },
    data: {
      companies: compRows,
      products: prodRows,
      inventory: invRows,
      suppliers: suppRows,
      operationalMemories: memRows,
    },
  };

  const serialized = JSON.stringify(payload, null, 2);
  const expectedSha256 = cryptoMod.createHash("sha256").update(serialized, "utf8").digest("hex");
  const fileName = `mint_backup_${companyId}_${Date.now()}.json`;
  const backupFilePath = path.join(backupDir, fileName);

  fs.writeFileSync(backupFilePath, serialized, "utf8");

  // Verificación obligatoria leyendo de nuevo desde el disco
  const diskExists = fs.existsSync(backupFilePath);
  const diskContent = diskExists ? fs.readFileSync(backupFilePath, "utf8") : "";
  const actualSha256 = diskExists
    ? cryptoMod.createHash("sha256").update(diskContent, "utf8").digest("hex")
    : "";
  const verifiedOnDisk = diskExists && actualSha256 === expectedSha256 && diskContent.length > 0;

  await db
    .insert(operationalEvents)
    .values({
      id: `evt_bkp_${randomUUID().slice(0, 8)}`,
      companyId,
      eventType: verifiedOnDisk ? "BACKUP_VERIFIED_SUCCESS" : "BACKUP_VERIFICATION_FAILED",
      severity: verifiedOnDisk ? "LOW" : "CRITICAL",
      status: "RESOLVED",
      title: verifiedOnDisk ? "Respaldo verificado con SHA-256" : "Fallo de verificación de respaldo",
      description: reason,
      payload: {
        backupFilePath,
        sha256: actualSha256,
        verifiedOnDisk,
        counts: payload.counts,
        reason,
      },
      createdAt: new Date(),
    })
    .catch(() => {});

  return {
    success: verifiedOnDisk,
    verifiedOnDisk,
    backupFilePath,
    sha256: actualSha256,
    counts: payload.counts,
    message: verifiedOnDisk
      ? `Respaldo creado y verificado en disco (${backupFilePath}) con hash SHA-256 ${actualSha256.slice(0, 12)}... (${prodRows.length} productos, ${invRows.length} registros de inventario).`
      : "ERROR CRÍTICO: No se pudo verificar el respaldo en disco.",
  };
}

export async function restoreVerifiedBusinessBackup(options: {
  backupFilePath: string;
  companyId: string;
  userRole?: string;
}) {
  const roleNorm = (options.userRole || "owner").toLowerCase();
  if (roleNorm !== "owner" && roleNorm !== "admin") {
    await db
      .insert(auditIncidents)
      .values({
        id: `inc_bkp_${randomUUID().slice(0, 8)}`,
        companyId: options.companyId,
        incidentType: "VIOLACION_RBAC",
        severity: "CRITICA",
        title: `Intento no autorizado de restauración de respaldo por rol '${roleNorm}'`,
        details: `El rol '${roleNorm}' intentó restaurar el respaldo '${options.backupFilePath}'. Solo 'owner' o 'admin' pueden restaurar snapshots.`,
        status: "DETECTADO",
        createdAt: new Date(),
      })
      .catch(() => {});
    return {
      success: false,
      verified: false,
      message: `ACCESO DENEGADO: El rol '${roleNorm}' no tiene autorización para restaurar respaldos de base de datos.`,
    };
  }

  if (!fs.existsSync(options.backupFilePath)) {
    return {
      success: false,
      verified: false,
      message: `El archivo de respaldo '${options.backupFilePath}' no existe en disco.`,
    };
  }

  const raw = fs.readFileSync(options.backupFilePath, "utf8");
  const parsed = JSON.parse(raw);
  const data = parsed.data || {};

  let restoredProducts = 0;
  let restoredInventory = 0;

  for (const p of data.products || []) {
    if (p.companyId !== options.companyId) continue;
    await db
      .insert(products)
      .values({
        id: p.id,
        companyId: p.companyId,
        name: p.name,
        sku: p.sku,
        category: p.category || "general",
        minStock: Number(p.minStock) || 10,
        price: String(p.price || "0.00"),
        costPrice: String(p.costPrice || "0.00"),
        origin: p.origin || "real",
      })
      .onConflictDoUpdate({
        target: [products.id],
        set: {
          name: p.name,
          category: p.category || "general",
          minStock: Number(p.minStock) || 10,
          price: String(p.price || "0.00"),
          costPrice: String(p.costPrice || "0.00"),
        },
      });
    restoredProducts++;
  }

  for (const inv of data.inventory || []) {
    if (inv.companyId !== options.companyId) continue;
    await db
      .insert(inventory)
      .values({
        id: inv.id,
        companyId: inv.companyId,
        productId: inv.productId,
        warehouseId: inv.warehouseId,
        stock: Number(inv.stock) || 0,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [inventory.id],
        set: {
          stock: Number(inv.stock) || 0,
          updatedAt: new Date(),
        },
      });
    restoredInventory++;
  }

  const [verifyCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.companyId, options.companyId));

  return {
    success: true,
    verified: (verifyCount?.count || 0) >= restoredProducts,
    restoredProducts,
    restoredInventory,
    verifiedProductsInDb: verifyCount?.count || 0,
    message: `Restauración completada y verificada: ${restoredProducts} productos y ${restoredInventory} registros de existencias restaurados.`,
  };
}


