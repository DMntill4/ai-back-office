import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  products,
  inventory,
  suppliers,
  supplierProducts,
  purchaseOrders,
  decisions,
  cases,
  notificationChannels,
  notificationLog,
} from "@mint/core";
import {
  TelegramAdapter,
  generateApprovalToken,
  processRemoteApproval,
  dispatchDecisionNotification,
  addNotificationChannel,
} from "@mint/notifiers";
import { eq } from "drizzle-orm";

describe("Fase F5: Notificaciones y Aprobación Remota por Telegram (@mint/notifiers)", () => {
  const companyId = "comp_default";
  const productId = "prod_st200";
  const supplierId = "prov_acme";
  const decisionId = `dec_remote_tg_${Date.now()}`;
  const caseId = `case_remote_tg_${Date.now()}`;

  beforeAll(async () => {
    // 1. Asegurar caso en base de datos
    await db
      .insert(cases)
      .values({
        id: caseId,
        companyId,
        title: "Caso de Reposición Urgente vía Telegram",
        description: "Demora de transporte y stock en nivel crítico.",
        status: "en_proceso",
        priority: "urgente",
      })
      .onConflictDoNothing();

    // 2. Asegurar proveedor y catálogo
    await db
      .insert(suppliers)
      .values({
        id: supplierId,
        companyId,
        name: "Acme Industrial S.A. de C.V.",
        email: "pedidos@acme.mx",
        phone: "+52 55 9876 5432",
      })
      .onConflictDoNothing();

    await db
      .insert(products)
      .values({
        id: productId,
        companyId,
        sku: "SKU-ST200",
        name: "Sensor Térmico ST-200",
        category: "Sensores",
        minStock: 10,
        origin: "real",
      })
      .onConflictDoNothing();

    await db
      .insert(supplierProducts)
      .values({
        id: `sp_tg_${Date.now()}`,
        companyId,
        supplierId,
        productId,
        unitPrice: "240.00",
        minOrderQuantity: 5,
        leadTimeDays: 2,
      })
      .onConflictDoNothing();

    // 3. Crear propuesta en tabla decisions con policyDecision = 'pending_approval'
    await db
      .insert(decisions)
      .values({
        id: decisionId,
        companyId,
        caseId,
        actionType: "crear_orden_compra",
        proposingAgent: "compras_agent",
        title: "Compra urgente: 15u de Sensor Térmico ST-200",
        costMxn: "3600.00",
        riskScore: "0.150",
        reversible: false,
        evidencePayload: {
          productId,
          productName: "Sensor Térmico ST-200",
          quantity: 15,
          unitPrice: 240,
          supplierId,
          supplierName: "Acme Industrial S.A. de C.V.",
        },
        riskPayload: {
          riskScore: 0.15,
          redFlags: [],
          supplierVerified: true,
          isDuplicate: false,
        },
        policyDecision: "pending_approval",
        policyReason: "Requiere confirmación humana HITL.",
      })
      .onConflictDoNothing();
  });

  it("1. Genera y envía notificación por Telegram con botones interactivos y token firmado", async () => {
    // Registrar canal de Telegram
    await addNotificationChannel({
      companyId,
      type: "telegram",
      name: "Canal Operaciones Logísticas Telegram",
      config: { botToken: "simulated_tg_token", chatId: "99887766" },
    });

    const dispatchResults = await dispatchDecisionNotification(decisionId, companyId);
    expect(dispatchResults.length).toBeGreaterThanOrEqual(1);

    const tgResult = dispatchResults.find((r) => r.channelType === "telegram");
    expect(tgResult).toBeDefined();
    expect(tgResult!.success).toBe(true);
    expect(tgResult!.details?.buttons).toHaveLength(2);
    expect(tgResult!.details?.buttons[0].text).toContain("Aprobar");
    expect(tgResult!.details?.buttons[1].text).toContain("Rechazar");

    // Verificar registro en notification_log
    const logEntries = await db
      .select()
      .from(notificationLog)
      .where(eq(notificationLog.decisionId, decisionId));

    expect(logEntries.length).toBeGreaterThanOrEqual(1);
    expect(logEntries[0].signedToken).toBeDefined();
    expect(logEntries[0].isUsed).toBe(false);
    expect(logEntries[0].status).toBe("SENT");
  });

  it("2. Aceptación clave: Aprobar la compra desde Telegram ejecuta la orden real en PostgreSQL y queda auditada", async () => {
    // Obtener el token firmado de aprobación generado
    const logEntry = await db
      .select()
      .from(notificationLog)
      .where(eq(notificationLog.decisionId, decisionId))
      .limit(1);

    const signedToken = logEntry[0].signedToken!;

    // Simular el click del usuario en Telegram: botón 'Aprobar'
    const approvalResult = await processRemoteApproval({
      signedToken,
      approverName: "Laura Directora de Cadena de Suministro (@laura_mint)",
      channel: "telegram",
    });

    expect(approvalResult.success).toBe(true);
    expect(approvalResult.action).toBe("approved");
    expect(approvalResult.channel).toBe("telegram");
    expect(approvalResult.executedOrder).toBeDefined();

    const createdOrderId = approvalResult.executedOrder!.orderId;
    expect(createdOrderId).toMatch(/^po_/);

    // 2.1 Verificar que la orden de compra existe en la base de datos PostgreSQL
    const poInDb = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, createdOrderId))
      .limit(1);

    expect(poInDb).toHaveLength(1);
    expect(poInDb[0].productId).toBe(productId);
    expect(poInDb[0].supplierId).toBe(supplierId);
    expect(poInDb[0].status).toBe("abierta");
    expect(Number(poInDb[0].totalAmount)).toBe(3600);

    // 2.2 Verificar auditoría en la tabla decisions
    const updatedDecision = await db
      .select()
      .from(decisions)
      .where(eq(decisions.id, decisionId))
      .limit(1);

    expect(updatedDecision[0].policyDecision).toBe("approved");
    expect(updatedDecision[0].approvedBy).toContain("Laura Directora");
    expect(updatedDecision[0].approvedBy).toContain("[vía telegram]");
    expect(updatedDecision[0].executedAt).toBeDefined();
    expect(updatedDecision[0].verifiedAt).toBeDefined();

    // 2.3 Verificar que el token quedó marcado como usado
    const updatedLog = await db
      .select()
      .from(notificationLog)
      .where(eq(notificationLog.signedToken, signedToken))
      .limit(1);

    expect(updatedLog[0].isUsed).toBe(true);
    expect(updatedLog[0].status).toBe("APPROVED");
  });

  it("3. Idempotencia y seguridad: un token ya usado es rechazado ante intentos repetidos", async () => {
    const logEntry = await db
      .select()
      .from(notificationLog)
      .where(eq(notificationLog.decisionId, decisionId))
      .limit(1);

    const signedToken = logEntry[0].signedToken!;

    // Replay attack o click repetido
    await expect(
      processRemoteApproval({
        signedToken,
        approverName: "Otro Usuario",
        channel: "telegram",
      }),
    ).rejects.toThrow(/El token ya fue utilizado previamente/);
  });
});
