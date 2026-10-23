import { describe, it, expect } from "vitest";
import * as path from "node:path";
import {
  saveSession,
  getSession,
  deleteSession,
} from "../packages/cli/src/keychain";
import {
  parseCsvFile,
  proposeColumnMapping,
  executeImport,
} from "@mint/ingest";
import {
  coordinateOperationalEvent,
  db,
  products,
  inventory,
  suppliers,
  supplierProducts,
  purchaseOrders,
  decisions,
  cases,
} from "@mint/core";
import {
  generateDailyPlan,
  pauseDaemon,
  resumeDaemon,
  tickOnce,
} from "@mint/daemon";
import {
  generateApprovalToken,
  processRemoteApproval,
  dispatchDecisionNotification,
} from "@mint/notifiers";
import { eq, and } from "drizzle-orm";

describe("Fase F6: Flujo Integral E2E de Mint CLI y Coordinador Autónomo", () => {
  const companyId = "comp_default";
  const userEmail = "admin@mint.io";

  it("1. Autenticación y Keychain Cifrado AES-256", async () => {
    await saveSession({
      token: "jwt_e2e_test_token_signature",
      userId: "usr_admin_01",
      email: userEmail,
      name: "Admin Mint",
      companyId,
      companyName: "Mint Default Logistics Corp",
      role: "admin",
      savedAt: new Date().toISOString(),
    });

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.companyId).toBe(companyId);
    expect(session?.email).toBe(userEmail);
  });

  it("2. Ingesta de Datos Reales asistida por columnas", async () => {
    const csvPath = path.resolve(__dirname, "fixtures/sample_inventory.csv");
    const parsed = parseCsvFile(csvPath);
    const mapping = proposeColumnMapping(parsed.headers);

    const summary = await executeImport({
      companyId,
      sourceName: "E2E Feed Inventario",
      sourceType: "csv",
      uriOrPath: csvPath,
      mappings: mapping.mappings,
      rows: parsed.rows,
    });

    expect(summary.success).toBe(true);
    expect(summary.importedRows).toBe(4);
    expect(summary.failedRows).toBe(1); // 1 defectuoso aislado
  });

  it("3. Orquestación Multi-Agente y Guardrails de Políticas (dry-run)", async () => {
    // Asegurar catálogo con SKU único por ejecución para no activar la regla anti-duplicados de 72h
    const runTimestamp = Date.now();
    const prodId = `prod_e2e_${runTimestamp}`;
    const sku = `SKU-E2E-${runTimestamp}`;
    const suppId = "prov_acme";

    await db
      .insert(products)
      .values({
        id: prodId,
        companyId,
        sku,
        name: "Sensor de Nivel de Tanque E2E",
        category: "Sensores",
        minStock: 25,
        origin: "real",
      })
      .onConflictDoNothing();

    await db
      .insert(inventory)
      .values({
        id: "inv_e2e_01",
        companyId,
        productId: prodId,
        warehouseId: "alm_central",
        stock: 4,
      })
      .onConflictDoUpdate({
        target: [inventory.id],
        set: { stock: 4 },
      });

    await db
      .insert(supplierProducts)
      .values({
        id: `sp_e2e_${Date.now()}`,
        companyId,
        supplierId: suppId,
        productId: prodId,
        unitPrice: "420.00",
        minOrderQuantity: 5,
        leadTimeDays: 2,
      })
      .onConflictDoNothing();

    const coordResult = await coordinateOperationalEvent({
      eventType: "STOCK_CRITICAL_E2E",
      companyId,
      productId: prodId,
      title: "Desabasto detectado en sensor de nivel",
      autonomyLevel: "dry-run",
    });

    expect(coordResult.success).toBe(true);
    expect(coordResult.proposal?.proposingAgent).toBe("compras_agent");
    expect(coordResult.policyResult?.requiresHitl).toBe(true);

    // 4. Aprobación Remota con Token Firmado (simulando Telegram)
    const tokenObj = generateApprovalToken({
      decisionId: coordResult.decisionId!,
      action: "approve",
      companyId,
      ttlMinutes: 30,
    });

    const approvalRes = await processRemoteApproval({
      signedToken: tokenObj.token,
      approverName: "Dirección de Operaciones (@director_ops)",
      channel: "telegram",
    });

    expect(approvalRes.success).toBe(true);
    expect(approvalRes.action).toBe("approved");
    expect(approvalRes.executedOrder?.orderId).toBeDefined();

    // Verificar en BD la orden de compra real
    const orderInDb = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, approvalRes.executedOrder!.orderId))
      .limit(1);

    expect(orderInDb).toHaveLength(1);
    expect(orderInDb[0].productId).toBe(prodId);
  });

  it("4. Ciclo de Vida del Daemon e Interruptor de Emergencia", async () => {
    // Probar pausa de emergencia
    const paused = pauseDaemon();
    expect(paused.isPaused).toBe(true);

    const tick = await tickOnce(companyId);
    expect(tick.isPaused).toBe(true);
    expect(tick.stockDeficitsTriggered).toBe(0);

    // Reanudar
    const resumed = resumeDaemon();
    expect(resumed.isPaused).toBe(false);

    // Plan Diario
    const plan = await generateDailyPlan(companyId);
    expect(plan.companyId).toBe(companyId);
    expect(typeof plan.activeCasesCount).toBe("number");
  });
});
