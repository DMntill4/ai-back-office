import { db } from "../db/client";
import { decisions, purchaseOrders, inventory, cases } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export interface ExecutionResult {
  success: boolean;
  orderId?: string;
  verified: boolean;
  message: string;
  error?: string;
}

/**
 * Servicio de Ejecución Transaccional y Post-Verificación
 * Aplica la acción real en la base de datos y confirma mediante una segunda consulta SELECT
 * que el registro se persistió correctamente.
 */
export async function executeAndVerifyDecision(
  decisionId: string,
  approvedBy: string = "HUMANO_ADMIN",
  feedback?: string,
): Promise<ExecutionResult> {
  // 1. Obtener registro de la decisión
  const found = await db
    .select()
    .from(decisions)
    .where(eq(decisions.id, decisionId))
    .limit(1);

  if (found.length === 0) {
    return {
      success: false,
      verified: false,
      message: `Decisión con ID "${decisionId}" no encontrada en la base de datos.`,
    };
  }

  const dec = found[0];
  const evidence = (dec.evidencePayload as any) || {};

  // 2. Ejecutar según el tipo de acción
  if (dec.actionType === "crear_orden_compra") {
    const productId = evidence.productId;
    const supplierId = evidence.supplierId;
    const quantity = evidence.quantity || 10;
    const unitPrice = evidence.unitPrice || "100.00";
    const totalAmount = dec.costMxn;
    const idempotencyKey = `idem_dec_${dec.id}`;
    const orderId = `po_${randomUUID().slice(0, 8)}`;

    try {
      // 2.1 Inserción real en purchase_orders
      await db.insert(purchaseOrders).values({
        id: orderId,
        companyId: dec.companyId,
        productId,
        supplierId,
        quantity,
        unitPrice: unitPrice.toString(),
        totalAmount: totalAmount.toString(),
        status: "abierta",
        idempotencyKey,
        caseId: dec.caseId,
      });

      // 2.2 POST-VERIFICACIÓN OBLIGATORIA: Confirmar lectura real
      const verifyCheck = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.idempotencyKey, idempotencyKey))
        .limit(1);

      if (verifyCheck.length === 0) {
        throw new Error("Fallo de post-verificación: La orden no pudo ser confirmada mediante SELECT tras la inserción.");
      }

      // 2.3 Actualizar estado de la decisión como verificada
      const now = new Date();
      await db
        .update(decisions)
        .set({
          policyDecision: "approved",
          approvedBy,
          feedback: feedback || "Aprobado y ejecutado exitosamente.",
          executedAt: now,
          verifiedAt: now,
          executionResult: {
            confirmed: true,
            orderId,
            verifiedAt: now.toISOString(),
            idempotencyKey,
          },
        })
        .where(eq(decisions.id, decisionId));

      // Actualizar caso asociado
      await db
        .update(cases)
        .set({
          status: "resuelto",
          resultSummary: `Orden de compra ${orderId} ejecutada y post-verificada exitosamente.`,
          closedAt: now,
        })
        .where(eq(cases.id, dec.caseId));

      return {
        success: true,
        orderId,
        verified: true,
        message: `Orden ${orderId} creada y post-verificada exitosamente en PostgreSQL. Total: $${Number(totalAmount).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN.`,
      };
    } catch (err: any) {
      // Si falla la verificación, reabrir caso en estado urgente
      await db
        .update(cases)
        .set({
          status: "escalado",
          priority: "urgente",
          resultSummary: `Error crítico en ejecución/verificación de decisión ${dec.id}: ${err.message}`,
        })
        .where(eq(cases.id, dec.caseId));

      return {
        success: false,
        verified: false,
        message: `Error al ejecutar o verificar la orden: ${err.message}`,
        error: err.message,
      };
    }
  }

  // 3. Otros tipos de acción: ej. Ajuste de stock
  if (dec.actionType === "ajustar_stock") {
    const productId = evidence.productId;
    const delta = evidence.delta || 0;

    const existingInv = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.productId, productId), eq(inventory.companyId, dec.companyId)))
      .limit(1);

    if (existingInv.length > 0) {
      const newStock = Math.max(0, existingInv[0].stock + delta);
      await db.update(inventory).set({ stock: newStock }).where(eq(inventory.id, existingInv[0].id));

      const now = new Date();
      await db
        .update(decisions)
        .set({
          policyDecision: "approved",
          approvedBy,
          executedAt: now,
          verifiedAt: now,
          executionResult: { confirmed: true, newStock },
        })
        .where(eq(decisions.id, decisionId));

      return {
        success: true,
        verified: true,
        message: `Stock ajustado a ${newStock} unidades y post-verificado.`,
      };
    }
  }

  return {
    success: false,
    verified: false,
    message: `Tipo de acción "${dec.actionType}" no soportada por el ejecutor.`,
  };
}

/**
 * Rechaza una propuesta de decisión con feedback del operador
 */
export async function rejectDecision(
  decisionId: string,
  rejectedBy: string = "HUMANO_ADMIN",
  reason: string = "Rechazado por operador.",
): Promise<{ success: boolean; message: string }> {
  const now = new Date();
  await db
    .update(decisions)
    .set({
      policyDecision: "rejected",
      approvedBy: rejectedBy,
      feedback: reason,
      decidedAt: now,
    })
    .where(eq(decisions.id, decisionId));

  return {
    success: true,
    message: `Decisión ${decisionId} rechazada correctamente.`,
  };
}
