import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as net from "node:net";
import {
  executeAjustarStock,
  db,
  companies,
  products,
  inventory,
  decisions,
} from "@mint/core";
import { writeBackStockUpdateToSource } from "@mint/ingest";
import { eq, and } from "drizzle-orm";

async function isPostgresReachable(port = 5432, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(timeoutMs);
    s.once("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.once("timeout", () => {
      s.destroy();
      resolve(false);
    });
    s.once("error", () => {
      s.destroy();
      resolve(false);
    });
    s.connect(port, "127.0.0.1");
  });
}

describe("Anti-Tampering Stock Shield & Bi-Directional Write-Back", () => {
  const testCompanyId = "comp_tamper_test";
  const testProdId = "prod_sensor_shield_01";
  const testSku = "SKU-SHIELD-100";
  const testCsvPath = path.resolve(process.cwd(), "tests/fixtures/shield_test_inventory.csv");
  let pgActive = false;

  beforeAll(async () => {
    pgActive = await isPostgresReachable();

    // 1. Setup a test real-source CSV on disk
    const fixtureDir = path.dirname(testCsvPath);
    if (!fs.existsSync(fixtureDir)) {
      fs.mkdirSync(fixtureDir, { recursive: true });
    }
    const initialCsvContent = [
      "SKU,Nombre,Stock,Minimo",
      `${testSku},Sensor de Monitoreo Critico,50,20`,
    ].join("\n") + "\n";
    fs.writeFileSync(testCsvPath, initialCsvContent, "utf-8");

    // 2. Setup company and test product in database if Postgres is live
    if (pgActive) {
      try {
        await db.insert(companies).values({
          id: testCompanyId,
          name: "Shield Logistics S.A.",
          currency: "USD",
        }).onConflictDoNothing();

        await db.insert(products).values({
          id: testProdId,
          companyId: testCompanyId,
          name: "Sensor de Monitoreo Critico",
          sku: testSku,
          minStock: 20,
          origin: "real",
        }).onConflictDoNothing();

        await db.insert(inventory).values({
          id: `inv_shield_${Date.now()}`,
          companyId: testCompanyId,
          productId: testProdId,
          warehouseId: "alm_central",
          stock: 50,
        }).onConflictDoNothing();
      } catch {
        pgActive = false;
      }
    }
  });

  afterAll(() => {
    if (fs.existsSync(testCsvPath)) {
      fs.unlinkSync(testCsvPath);
    }
  });

  it("Escudo 0: Validaciones numericas basicas rechazan valores invalidos", async () => {
    const resZero = await executeAjustarStock(
      { producto_id: testProdId, cantidad_delta: 0 },
      { companyId: testCompanyId, userRole: "owner" },
    );
    expect(resZero.isSuccess).toBe(false);
    expect(resZero.message).toContain("no puede ser cero");

    const resNan = await executeAjustarStock(
      { producto_id: testProdId, cantidad_delta: NaN },
      { companyId: testCompanyId, userRole: "owner" },
    );
    expect(resNan.isSuccess).toBe(false);
    expect(resNan.message).toContain("numero finito valido");
  });

  it("Escudo 1: Rol viewer o driver es bloqueado directamente por RBAC sin tocar base de datos", async () => {
    const resViewer = await executeAjustarStock(
      {
        producto_id: testProdId,
        cantidad_delta: 25,
        motivo: "Intento de aumento por espectador",
      },
      { companyId: testCompanyId, userRole: "viewer" },
    );

    expect(resViewer.isSuccess).toBe(false);
    if (!resViewer.isSuccess) {
      expect(resViewer.code).toBe("DENIED_INSUFFICIENT_PERMISSIONS");
    }

    const resDriver = await executeAjustarStock(
      {
        producto_id: testProdId,
        cantidad_delta: -5,
        motivo: "Descarga de mercancia",
      },
      { companyId: testCompanyId, userRole: "driver" },
    );

    expect(resDriver.isSuccess).toBe(false);
    if (!resDriver.isSuccess) {
      expect(resDriver.code).toBe("DENIED_INSUFFICIENT_PERMISSIONS");
    }
  });

  it("Write-Back Engine: Modifica exitosamente el archivo CSV fisico del cliente en disco", async () => {
    const wbRes = await writeBackStockUpdateToSource({
      companyId: testCompanyId,
      productId: testProdId,
      sku: testSku,
      newStock: 85,
      sourceUriOrPath: testCsvPath,
    });

    expect(wbRes.success).toBe(true);
    expect(wbRes.updatedSources.length).toBeGreaterThan(0);

    const updatedCsv = fs.readFileSync(testCsvPath, "utf-8");
    expect(updatedCsv).toContain(`${testSku},Sensor de Monitoreo Critico,85,20`);
  });

  it("Integracion PostgreSQL (si activo): Operador es bloqueado de inflar stock (+100) y turnado a /inbox", async () => {
    if (!pgActive) return;

    const resOperator = await executeAjustarStock(
      {
        producto_id: testProdId,
        cantidad_delta: 100,
        motivo: "Empleado dice 'oye ponme 100 de stock'",
      },
      { companyId: testCompanyId, userRole: "operator" },
    );

    expect(resOperator.isSuccess).toBe(false);
    if (!resOperator.isSuccess) {
      expect(resOperator.requiresApproval).toBe(true);
      expect(resOperator.message).toContain("POLITICA DE SEGURIDAD EMPRESARIAL");
      expect(resOperator.message).toContain("/inbox");
      expect(resOperator.decisionId).toBeDefined();
    }

    const invRow = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.productId, testProdId), eq(inventory.companyId, testCompanyId)))
      .limit(1);
    expect(invRow[0].stock).toBe(50);
  });
});
