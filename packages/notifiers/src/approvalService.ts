import {
  db,
  decisions,
  cases,
  purchaseOrders,
  executeAndVerifyDecision,
  notificationLog,
} from "@mint/core";
import { eq, and } from "drizzle-orm";
import { verifyApprovalToken } from "./tokenService";
import { type RemoteApprovalResult } from "./types";

/**
 * Procesa la aprobación o rechazo remoto de una decisión mediante un token firmado
 * (ejecutado desde Telegram inline buttons, Slack Block Kit o enlace firmado de Gmail)
 */
export async function processRemoteApproval(params: {
  signedToken: string;
  approverName: string;
  channel: "telegram" | "slack" | "gmail";
}): Promise<RemoteApprovalResult> {
  const { signedToken, approverName, channel } = params;

  // 1. Validar criptográficamente el token y su expiración
  const tokenPayload = verifyApprovalToken(signedToken);
  const { decisionId, action, companyId } = tokenPayload;

  // 2. Garantizar idempotencia y un solo uso en la base de datos
  const existingLogs = await db
    .select()
    .from(notificationLog)
    .where(and(eq(notificationLog.signedToken, signedToken), eq(notificationLog.companyId, companyId)));

  if (existingLogs.some((l) => l.isUsed)) {
    throw new Error(
      `El token ya fue utilizado previamente. Las aprobaciones son de un solo uso e idempotentes.`,
    );
  }

  // 3. Consultar la decisión original en la base de datos
  const decList = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.companyId, companyId)))
    .limit(1);

  if (decList.length === 0) {
    throw new Error(`Decisión con ID "${decisionId}" no encontrada en la empresa.`);
  }

  const decision = decList[0];

  // 4. Si la acción es RECHAZO
  if (action === "reject") {
    await db
      .update(decisions)
      .set({
        policyDecision: "rejected",
        approvedBy: `${approverName} [vía ${channel}]`,
        feedback: `Rechazado remotamente vía ${channel}`,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(decisions.id, decisionId));

    await db
      .update(notificationLog)
      .set({ status: "REJECTED", isUsed: true })
      .where(and(eq(notificationLog.signedToken, signedToken), eq(notificationLog.companyId, companyId)));

    return {
      success: true,
      decisionId,
      action: "rejected",
      approver: approverName,
      channel,
      auditMessage: `Decisión ${decisionId} RECHAZADA exitosamente por ${approverName} desde ${channel}.`,
    };
  }

  // 5. Si la acción es APROBACIÓN: Ejecutar la decisión y verificar resultado real
  const execution = await executeAndVerifyDecision(decisionId, `${approverName} [vía ${channel}]`);

  // 6. Marcar el token como usado en todos los registros de notification_log para este token
  if (existingLogs.length > 0) {
    await db
      .update(notificationLog)
      .set({ status: "APPROVED", isUsed: true })
      .where(and(eq(notificationLog.signedToken, signedToken), eq(notificationLog.companyId, companyId)));
  } else {
    // Si no existía registro previo, registrar la bitácora
    await db.insert(notificationLog).values({
      id: `nlog_${Date.now()}`,
      companyId,
      decisionId,
      severity: "CRITICAL",
      status: "APPROVED",
      signedToken,
      isUsed: true,
      payload: { approverName, channel, executedAt: new Date() },
    });
  }

  // 7. Buscar la orden de compra real generada en PostgreSQL
  let executedOrder: any;
  if (execution.orderId) {
    const po = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, execution.orderId))
      .limit(1);

    if (po.length > 0) {
      executedOrder = {
        orderId: po[0].id,
        totalAmount: po[0].totalAmount,
        supplierId: po[0].supplierId,
        status: po[0].status,
      };
    }
  }

  return {
    success: true,
    decisionId,
    action: "approved",
    executedOrder,
    approver: approverName,
    channel,
    auditMessage: `Decisión ${decisionId} APROBADA por ${approverName} vía ${channel}. Orden creada: ${execution.orderId || "N/A"}. Auditoría verificada.`,
  };
}
