import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "../db/client";
import { products, suppliers, inventory, warehouses, companies, mintQuarantineRecords } from "../db/schema";
import { eq, sql } from "drizzle-orm";

export interface UniversalImportResult {
  success: boolean;
  filePath: string;
  sourceType: string;
  importedProducts: number;
  importedSuppliers: number;
  importedWarehouses: number;
  importedInventory: number;
  importedSales: number;
  quarantinedCount: number;
  warnings: string[];
  detectedCurrency?: string;
  detectedCity?: string;
}

/**
 * Servicio Universal de Importación Tolerante a Fallos de MINT
 * Soporta: CSV, TSV, XLSX, XLS, JSON, SQLITE, DB, SQL
 * Principios:
 * 1. Cero caídas ante datos defectuosos, corruptos o incompletos.
 * 2. Neutralización preventiva de inyecciones de fórmulas y prompt injections.
 * 3. Detección fáctica de entidades (productos, inventario, proveedores, flota).
 */
export async function importUniversalDataFile(
  companyId: string,
  filePath: string,
  options: { sheetName?: string; tableName?: string } = {}
): Promise<UniversalImportResult> {
  const {
    parseCsvFile,
    parseExcelFile,
    listExcelSheets,
    queryReadOnlySqlite,
    listSqliteTables,
    sanitizeRow,
    inspectSuspiciousPatterns,
    extractProductsFromSqlFile,
    extractSuppliersFromSqlFile,
  } = await import("@mint/ingest");

  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: "${filePath}"`);
  }

  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath);
  const result: UniversalImportResult = {
    success: true,
    filePath,
    sourceType: ext,
    importedProducts: 0,
    importedSuppliers: 0,
    importedWarehouses: 0,
    importedInventory: 0,
    importedSales: 0,
    quarantinedCount: 0,
    warnings: [],
  };

  // Asegurar existencia de empresa para claves foráneas
  try {
    await db
      .insert(companies)
      .values({
        id: companyId,
        name: companyId,
      })
      .onConflictDoNothing();
  } catch {}

  let rows: Array<Record<string, any>> = [];

  // 1. Lectura según formato
  try {
    if (ext === ".csv" || ext === ".tsv") {
      const parsed = parseCsvFile(filePath);
      rows = parsed.rows;
    } else if (ext === ".xlsx" || ext === ".xls") {
      const parsed = parseExcelFile(filePath, options.sheetName);
      rows = parsed.rows;
    } else if (ext === ".json") {
      const rawText = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(rawText);
      rows = Array.isArray(parsed) ? parsed : parsed.items || parsed.data || parsed.products || [parsed];
    } else if (ext === ".sqlite" || ext === ".db" || ext === ".sqlite3") {
      const tables = listSqliteTables(filePath);
      const targetTable = options.tableName || tables[0];
      if (targetTable) {
        const queryRes = queryReadOnlySqlite({ filePath, tableName: targetTable, limit: 10000 });
        rows = queryRes.rows;
      }
    } else if (ext === ".sql") {
      // Extracción especializada desde volcados SQL
      const sqlProducts = extractProductsFromSqlFile(filePath);
      const sqlSuppliers = extractSuppliersFromSqlFile(filePath);

      for (const item of sqlProducts) {
        const prodId = `prod_${companyId}_${item.sku.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
        await db
          .insert(products)
          .values({
            id: prodId,
            companyId,
            sku: item.sku,
            name: item.name,
            category: item.category,
            minStock: item.minStock,
            price: String(item.price || 0),
            origin: "real",
          })
          .onConflictDoNothing();
        result.importedProducts++;
      }

      for (const supp of sqlSuppliers) {
        const suppId = `supp_${companyId}_${supp.name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20)}`;
        await db
          .insert(suppliers)
          .values({
            id: suppId,
            companyId,
            name: supp.name,
            email: supp.email || null,
            city: supp.city || null,
            origin: "real",
          })
          .onConflictDoNothing();
        result.importedSuppliers++;
      }

      return result;
    }
  } catch (err: any) {
    result.warnings.push(`Error al parsear el archivo: ${err.message}`);
    return result;
  }

  if (rows.length === 0) {
    result.warnings.push("El archivo no contiene filas de datos legibles.");
    return result;
  }

  // 2. Sanitización y Detección de Inyecciones
  const cleanRows: Array<Record<string, string>> = [];
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const { row: clean, suspiciousWarnings } = sanitizeRow(raw);

    if (suspiciousWarnings.length > 0) {
      result.quarantinedCount++;
      await db
        .insert(mintQuarantineRecords)
        .values({
          id: `quar_${companyId}_${Date.now()}_${i}`,
          companyId,
          entityType: "untrusted_upload",
          sourceTable: baseName,
          recordIdentifier: String(raw.id || raw.sku || `fila_${i + 1}`),
          violationType: "injection_attempt",
          reason: suspiciousWarnings.join("; "),
          severity: "CRITICAL",
          rawPayload: raw,
          status: "quarantined",
        })
        .catch(() => {});
      result.warnings.push(`Fila ${i + 1}: Patrones sospechosos detectados y aislados en cuarentena.`);
    }

    cleanRows.push(clean);
  }

  // 3. Reconocimiento de Entidades
  const sampleHeaders = Object.keys(cleanRows[0] || {}).map((h) => h.toLowerCase());

  // A. ¿Contiene Productos / Catálogo?
  const hasSku = sampleHeaders.some((h) => /(sku|codigo|c[oó]digo|item_?id|ref|referencia|^id$)/i.test(h));
  const hasName = sampleHeaders.some((h) => /(nombre|name|producto|product|descripcion|descripci[oó]n|item)/i.test(h));
  const hasStock = sampleHeaders.some((h) => /(stock|existencia|cantidad|qty|inventario)/i.test(h));
  const hasSupplier = sampleHeaders.some((h) => /(proveedor|supplier|vendor|distribuidor)/i.test(h));

  if (hasSku || hasName) {
    for (let i = 0; i < cleanRows.length; i++) {
      const row = cleanRows[i];

      // Hallar claves
      let rawSku = "";
      let rawName = "";
      let rawCategory = "General";
      let rawPrice = "0";
      let rawCost = "0";
      let rawStock = 0;
      let rawMinStock = 5;

      for (const [k, v] of Object.entries(row)) {
        const lower = k.toLowerCase();
        if (/(sku|codigo|c[oó]digo|item_?id|ref|referencia|^id$)/i.test(lower) && !rawSku) {
          rawSku = v;
        } else if (/(nombre|name|producto|product|item)/i.test(lower) && !rawName) {
          rawName = v;
        } else if (/(categoria|categor[ií]a|category|rubro)/i.test(lower)) {
          rawCategory = v;
        } else if (/(precio|price|pvp|venta)/i.test(lower)) {
          rawPrice = v.replace(/[^0-9.]/g, "") || "0";
        } else if (/(costo|cost|cost_?price|compra)/i.test(lower)) {
          rawCost = v.replace(/[^0-9.]/g, "") || "0";
        } else if (/(stock|existencia|cantidad|qty)/i.test(lower)) {
          rawStock = parseInt(v.replace(/[^0-9-]/g, "") || "0", 10);
        } else if (/(min|minimo|m[ií]nimo|reorder)/i.test(lower)) {
          rawMinStock = parseInt(v.replace(/[^0-9]/g, "") || "5", 10);
        }
      }

      if (!rawSku && !rawName) continue;
      const skuFinal = rawSku || `SKU-${i + 1}`;
      const nameFinal = rawName || `Producto ${skuFinal}`;
      const prodId = `prod_${companyId}_${skuFinal.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;

      // Insertar producto
      await db
        .insert(products)
        .values({
          id: prodId,
          companyId,
          sku: skuFinal,
          name: nameFinal,
          category: rawCategory,
          price: rawPrice,
          costPrice: rawCost,
          minStock: rawMinStock,
          origin: "real",
        })
        .onConflictDoNothing();
      result.importedProducts++;

      // Si viene con existencias, registrar en inventario
      if (hasStock) {
        await db
          .insert(inventory)
          .values({
            id: `inv_${companyId}_${prodId}`,
            companyId,
            productId: prodId,
            warehouseId: `alm_central_${companyId}`,
            stock: rawStock,
          })
          .onConflictDoNothing();
        result.importedInventory++;
      }
    }
  }

  // B. ¿Contiene Proveedores?
  if (hasSupplier && !hasSku) {
    for (let i = 0; i < cleanRows.length; i++) {
      const row = cleanRows[i];
      let suppName = "";
      let suppEmail: string | null = null;
      let suppPhone: string | null = null;
      let suppCity: string | null = null;

      for (const [k, v] of Object.entries(row)) {
        const lower = k.toLowerCase();
        if (/(nombre|name|proveedor|supplier|razon)/i.test(lower) && !suppName) {
          suppName = v;
        } else if (/(email|correo|mail)/i.test(lower)) {
          suppEmail = v;
        } else if (/(telefono|tel[eé]fono|phone|celular|movil)/i.test(lower)) {
          suppPhone = v;
        } else if (/(ciudad|city|sede|ubicacion)/i.test(lower)) {
          suppCity = v;
        }
      }

      if (!suppName) continue;
      const suppId = `supp_${companyId}_${suppName.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20)}`;
      await db
        .insert(suppliers)
        .values({
          id: suppId,
          companyId,
          name: suppName,
          email: suppEmail,
          phone: suppPhone,
          city: suppCity,
          origin: "real",
        })
        .onConflictDoNothing();
      result.importedSuppliers++;
    }
  }

  return result;
}
