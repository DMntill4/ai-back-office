import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import {
  processFileChange,
  pauseDaemon,
  resumeDaemon,
  readDaemonState,
  tickOnce,
  generateDailyPlan,
  scanStockDeficits,
  scanDelayedShipments,
} from "@mint/daemon";
import { db, cases, decisions, products, inventory, suppliers, supplierProducts } from "@mint/core";
import { eq } from "drizzle-orm";

describe("Fase F4: Daemon de Monitoreo Autónomo y Watcher (@mint/daemon)", () => {
  const companyId = "comp_default";
  const fixtureCsv = path.resolve(__dirname, "fixtures/daemon_incoming_stock.csv");

  beforeAll(async () => {
    // Asegurar proveedor homologado para los productos del CSV
    await db
      .insert(suppliers)
      .values({
        id: "prov_daemon_supplier",
        companyId,
        name: "Distribuidora Industrial del Bajío",
        email: "ventas@bajioind.mx",
        phone: "+52 442 111 2233",
      })
      .onConflictDoNothing();

    // Asociar producto con proveedor en catálogo
    await db
      .insert(products)
      .values({
        id: "prod_mint_rob_900",
        companyId,
        sku: "MINT-ROB-900",
        name: "Brazo Robótico Articulado 6-Ejes",
        category: "Robótica",
        minStock: 5,
        origin: "real",
      })
      .onConflictDoNothing();

    await db
      .insert(supplierProducts)
      .values({
        id: `sp_daemon_${Date.now()}`,
        companyId,
        supplierId: "prov_daemon_supplier",
        productId: "prod_mint_rob_900",
        unitPrice: "8500.00",
        minOrderQuantity: 1,
        leadTimeDays: 5,
      })
      .onConflictDoNothing();
  });

  it(
    "1. El daemon detecta un cambio en archivo CSV y abre un caso operativo de forma autónoma",
    async () => {
      const res = await processFileChange(fixtureCsv, companyId);

    expect(res.success).toBe(true);
    expect(res.fileName).toBe("daemon_incoming_stock.csv");
    expect(res.importedRows).toBeGreaterThanOrEqual(1);
    expect(res.caseId).toBeDefined();

    // Verificar que el caso fue efectivamente persistido en la base de datos PostgreSQL
    const savedCase = await db
      .select()
      .from(cases)
      .where(eq(cases.id, res.caseId!))
      .limit(1);

    expect(savedCase).toHaveLength(1);
    expect(savedCase[0].title).toContain("daemon_incoming_stock.csv");
    expect(savedCase[0].companyId).toBe(companyId);
    expect(savedCase[0].status).toBe("en_proceso");

    // Verificar que generó decisión para el caso
    const savedDecision = await db
      .select()
      .from(decisions)
      .where(eq(decisions.caseId, res.caseId!))
      .limit(1);

    expect(savedDecision).toHaveLength(1);
    expect(savedDecision[0].companyId).toBe(companyId);
  }, 30000);

  it("2. Interruptor de emergencia: pause() bloquea la ejecución autónoma y resume() la reactiva", async () => {
    // 2.1 Pausar
    const pausedState = pauseDaemon();
    expect(pausedState.isPaused).toBe(true);

    const tickWhilePaused = await tickOnce(companyId);
    expect(tickWhilePaused.isPaused).toBe(true);
    expect(tickWhilePaused.stockDeficitsTriggered).toBe(0);
    expect(tickWhilePaused.shipmentDelaysTriggered).toBe(0);

    // 2.2 Reanudar
    const resumedState = resumeDaemon();
    expect(resumedState.isPaused).toBe(false);

    const stateInDisk = readDaemonState();
    expect(stateInDisk.isPaused).toBe(false);
  });

  it("3. Disparadores periódicos: scanStockDeficits y generateDailyPlan", async () => {
    const triggeredDeficits = await scanStockDeficits(companyId);
    expect(typeof triggeredDeficits).toBe("number");

    const triggeredDelays = await scanDelayedShipments(companyId);
    expect(typeof triggeredDelays).toBe("number");

    const dailyPlan = await generateDailyPlan(companyId);
    expect(dailyPlan.companyId).toBe(companyId);
    expect(dailyPlan.generatedAt).toBeDefined();
    expect(typeof dailyPlan.activeCasesCount).toBe("number");
    expect(typeof dailyPlan.pendingDecisionsCount).toBe("number");
    expect(Array.isArray(dailyPlan.decisions)).toBe(true);
  }, 90000);
});
