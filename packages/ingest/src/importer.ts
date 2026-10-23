import { db } from "@mint/core";
import { products, inventory, dataSources, importJobs } from "@mint/core";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export interface ImportOptions {
  companyId: string;
  sourceName: string;
  sourceType: "csv" | "excel" | "postgres_readonly";
  uriOrPath: string;
  mappings: Record<string, string>; // targetField -> sourceHeader
  rows: Array<Record<string, string>>;
}

export interface ImportSummary {
  success: boolean;
  jobId: string;
  dataSourceId: string;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errors: Array<{ row: number; error: string; data: any }>;
}

export async function executeImport(options: ImportOptions): Promise<ImportSummary> {
  const { companyId, sourceName, sourceType, uriOrPath, mappings, rows } = options;

  const dataSourceId = `src_${randomUUID().slice(0, 8)}`;
  const jobId = `job_imp_${randomUUID().slice(0, 8)}`;

  // 1. Registrar fuente de datos
  await db
    .insert(dataSources)
    .values({
      id: dataSourceId,
      companyId,
      name: sourceName,
      sourceType,
      uriOrPath,
      config: { mappings },
      lastSyncedAt: new Date(),
    })
    .onConflictDoNothing();

  // 2. Registrar trabajo de importación
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

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const rowNum = i + 1;

    try {
      // Extraer campos mapeados
      const sku = (rawRow[mappings.sku] || "").trim();
      const name = (rawRow[mappings.name] || "").trim();
      const stockRaw = rawRow[mappings.stock] || "0";
      const minStockRaw = mappings.minStock ? rawRow[mappings.minStock] || "10" : "10";
      const category = mappings.category ? (rawRow[mappings.category] || "general").trim() : "general";

      // Validaciones obligatorias
      if (!sku) {
        throw new Error("El campo 'sku' es requerido y está vacío.");
      }
      if (!name) {
        throw new Error("El campo 'name' es requerido y está vacío.");
      }

      const stock = parseInt(stockRaw.replace(/[^0-9-]/g, ""), 10);
      if (isNaN(stock) || stock < 0) {
        throw new Error(`Stock inválido: "${stockRaw}". Debe ser un número mayor o igual a 0.`);
      }

      const minStock = parseInt(minStockRaw.replace(/[^0-9]/g, ""), 10) || 10;

      // 3. Upsert en products con origin = 'real'
      const productId = `prod_${sku.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;

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

      // 4. Upsert en inventory
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

  const failedCount = errors.length;
  const isSuccess = importedCount > 0;

  // 5. Actualizar estado del trabajo
  await db
    .update(importJobs)
    .set({
      status: isSuccess ? "COMPLETED" : "FAILED",
      importedRows: importedCount,
      failedRows: failedCount,
      errorsPayload: errors,
      completedAt: new Date(),
    })
    .where(eq(importJobs.id, jobId));

  return {
    success: isSuccess,
    jobId,
    dataSourceId,
    totalRows: rows.length,
    importedRows: importedCount,
    failedRows: failedCount,
    errors,
  };
}
