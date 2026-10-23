import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import { parseCsvFile, proposeColumnMapping, executeImport } from "@mint/ingest";
import { db, products, inventory, dataSources, importJobs } from "@mint/core";
import { eq } from "drizzle-orm";

describe("Motor de Ingesta Asistida y Tolerante a Fallos (@mint/ingest)", () => {
  const fixturePath = path.resolve(__dirname, "fixtures/sample_inventory.csv");
  const testCompanyId = "comp_default";

  it("1. parseCsvFile debe parsear encabezados y filas correctamente", () => {
    const parsed = parseCsvFile(fixturePath);
    expect(parsed.headers).toEqual([
      "Codigo_SKU",
      "Nombre_Producto",
      "Existencias",
      "Stock_Minimo",
      "Categoria",
    ]);
    expect(parsed.totalRows).toBe(5);
    expect(parsed.rows[0]["Codigo_SKU"]).toBe("MINT-VAL-001");
  });

  it("2. proposeColumnMapping debe detectar campos objetivo con confianza alta", () => {
    const headers = [
      "Codigo_SKU",
      "Nombre_Producto",
      "Existencias",
      "Stock_Minimo",
      "Categoria",
    ];
    const mapping = proposeColumnMapping(headers);

    expect(mapping.confidence).toBeGreaterThanOrEqual(0.8);
    expect(mapping.missingRequired).toHaveLength(0);
    expect(mapping.mappings.sku).toBe("Codigo_SKU");
    expect(mapping.mappings.name).toBe("Nombre_Producto");
    expect(mapping.mappings.stock).toBe("Existencias");
    expect(mapping.mappings.minStock).toBe("Stock_Minimo");
    expect(mapping.mappings.category).toBe("Categoria");
  });

  it("3. executeImport debe importar filas válidas con origin='real' y aislar la fila errónea sin abortar", async () => {
    const parsed = parseCsvFile(fixturePath);
    const mapping = proposeColumnMapping(parsed.headers);

    const summary = await executeImport({
      companyId: testCompanyId,
      sourceName: "Inventario Planta Norte CSV",
      sourceType: "csv",
      uriOrPath: fixturePath,
      mappings: mapping.mappings,
      rows: parsed.rows,
    });

    expect(summary.success).toBe(true);
    expect(summary.totalRows).toBe(5);
    expect(summary.importedRows).toBe(4);
    expect(summary.failedRows).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0].row).toBe(3); // Fila errónea MINT-ERR-003 (-10 stock)

    // Verificar en base de datos real
    const importedProduct = await db
      .select()
      .from(products)
      .where(eq(products.sku, "MINT-VAL-001"))
      .limit(1);

    expect(importedProduct).toHaveLength(1);
    expect(importedProduct[0].name).toBe("Válvula Reguladora de Presión Industrial");
    expect(importedProduct[0].origin).toBe("real");
    expect(importedProduct[0].companyId).toBe(testCompanyId);

    // Verificar inventario asociado
    const importedInv = await db
      .select()
      .from(inventory)
      .where(eq(inventory.productId, importedProduct[0].id))
      .limit(1);

    expect(importedInv).toHaveLength(1);
    expect(importedInv[0].stock).toBe(45);

    // Verificar registro de job
    const jobRecord = await db
      .select()
      .from(importJobs)
      .where(eq(importJobs.id, summary.jobId))
      .limit(1);

    expect(jobRecord).toHaveLength(1);
    expect(jobRecord[0].status).toBe("COMPLETED");
    expect(jobRecord[0].importedRows).toBe(4);
    expect(jobRecord[0].failedRows).toBe(1);
  });
});
