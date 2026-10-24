import { db, products, inventory } from "@mint/core";
import { eq, and } from "drizzle-orm";
import { executeAjustarStock } from "@mint/core";
import { runBackOfficeHarness, type HarnessExecutionResult } from "@mint/core";
import { dispatchDecisionNotification } from "./channelManager";
import { type ChannelType } from "./types";

export interface IncomingSaleEvent {
  messageId?: string; // ID del mensaje original del canal (Telegram, Discord, Slack)
  idempotencyKey?: string; // Clave única de idempotencia
  channel: ChannelType | "pos" | "webhook";
  senderId: string; // Identificador del emisor (ej: telegram user_id, discord user_id)
  senderName?: string;
  sku: string;
  quantity: number;
  unitPriceMxn?: number;
  customerName?: string;
  companyId?: string;
  authorizedSenders?: string[]; // Lista blanca de IDs autorizados para registrar ventas
}

export interface SaleExecutionResult {
  success: boolean;
  isDuplicate?: boolean;
  saleId: string;
  productId: string;
  productName: string;
  sku: string;
  quantitySold: number;
  previousStock: number;
  remainingStock: number;
  minStock: number;
  isStockDeficit: boolean;
  replenishmentDecision?: {
    harnessId: string;
    decisionId?: string;
    actionType: string;
    costMxn: number;
    policyDecision: string;
    reason: string;
    notifiedChannel?: string;
  };
  channelReceipt: string;
}

// Almacén en memoria de idempotencia para transacciones de ventas (expira en 72h)
const processedSalesStore = new Map<string, { result: SaleExecutionResult; timestamp: number }>();

function cleanupExpiredIdempotencyKeys() {
  const cutoff = Date.now() - 72 * 60 * 60 * 1000;
  for (const [key, val] of processedSalesStore.entries()) {
    if (val.timestamp < cutoff) processedSalesStore.delete(key);
  }
}

/**
 * Procesa y ejecuta automáticamente una venta registrada desde canales externos (Telegram, Slack, Discord o POS).
 * Con garantías de seguridad:
 * 1. Control de acceso: Valida que el emisor (senderId) esté en la lista blanca autorizada.
 * 2. Idempotencia estricta: Previene que reintentos de red del bot ejecuten la venta dos veces.
 * 3. Descuenta el inventario real en PostgreSQL.
 * 4. Si el stock cae bajo el mínimo de seguridad, dispara orquestación multi-agente de compra.
 */
export async function processIncomingSale(event: IncomingSaleEvent): Promise<SaleExecutionResult> {
  const companyId = event.companyId || "comp_default";

  // 1. Control de Acceso y Validación de Identidad del Emisor
  if (!event.senderId || typeof event.senderId !== "string" || event.senderId.trim() === "") {
    throw new Error("Identidad de emisor obligatoria: 'senderId' no puede estar vacío.");
  }

  const envAuthorized = process.env.AUTHORIZED_SALES_SENDERS
    ? process.env.AUTHORIZED_SALES_SENDERS.split(",").map((s) => s.trim())
    : [];
  const whitelist = event.authorizedSenders || (envAuthorized.length > 0 ? envAuthorized : null);

  if (whitelist && whitelist.length > 0 && !whitelist.includes(event.senderId)) {
    throw new Error(
      `ACCESO DENEGADO: El usuario emisor "${event.senderId}" (${event.senderName || "anónimo"}) no está autorizado para registrar ventas en la empresa "${companyId}".`
    );
  }

  // 2. Garantía de Idempotencia: Verificar si el mensaje ya fue procesado
  const deduplicationKey = event.idempotencyKey || event.messageId;
  if (deduplicationKey) {
    cleanupExpiredIdempotencyKeys();
    const compositeKey = `${companyId}:${event.channel}:${deduplicationKey}`;
    const cached = processedSalesStore.get(compositeKey);
    if (cached) {
      return {
        ...cached.result,
        isDuplicate: true,
      };
    }
  }

  // 3. Buscar producto por SKU
  const found = await db
    .select()
    .from(products)
    .where(and(eq(products.sku, event.sku), eq(products.companyId, companyId)))
    .limit(1);

  if (found.length === 0) {
    throw new Error(`Producto con SKU '${event.sku}' no encontrado en el catálogo de la empresa '${companyId}'.`);
  }

  const product = found[0];
  const saleId = `sale_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // 4. Ajustar inventario descontando la cantidad vendida
  const adjustResult = await executeAjustarStock(
    {
      producto_id: product.id,
      cantidad_delta: -event.quantity,
      motivo: `Venta ejecutada desde canal ${event.channel.toUpperCase()} por usuario ${event.senderName || event.senderId}`,
    },
    { companyId }
  );

  if (!adjustResult.isSuccess || !adjustResult.data) {
    throw new Error(adjustResult.message || "Error al descontar existencias de inventario.");
  }

  const { previousStock, newStock, minStock, isBelowMinimum } = adjustResult.data;

  let replenishmentDecision: SaleExecutionResult["replenishmentDecision"];

  // 5. Si el stock cayó por debajo del mínimo de seguridad, disparar respuesta autónoma
  if (isBelowMinimum) {
    try {
      const harnessResult: HarnessExecutionResult = await runBackOfficeHarness({
        companyId,
        productId: product.id,
        eventType: "STOCK_CRITICAL",
        severity: "CRITICAL",
      });

      if (harnessResult.recommendedScenario) {
        const sc = harnessResult.recommendedScenario;
        replenishmentDecision = {
          harnessId: harnessResult.harnessId,
          decisionId: sc.proposal.id,
          actionType: sc.proposal.actionType,
          costMxn: sc.totalCostMxn,
          policyDecision: sc.policyDecision,
          reason: sc.title,
        };

        if (sc.policyDecision === "pending_approval") {
          await dispatchDecisionNotification(sc.proposal.id, companyId).catch(() => null);
          replenishmentDecision.notifiedChannel = event.channel;
        }
      }
    } catch (err: any) {
      console.warn(`[SALES CHANNEL] Advertencia en orquestación de reabastecimiento: ${err.message}`);
    }
  }

  // 6. Formatear comprobante de venta para el canal
  const replenishmentText = replenishmentDecision
    ? `\n*[ACCIÓN AUTÓNOMA DE REABASTECIMIENTO]*` +
      `\n   • Estado: ${replenishmentDecision.policyDecision === "auto_executed" ? "[OK] Orden de compra emitida automáticamente" : "[PENDIENTE] Escalado a bandeja HITL para firma"}` +
      `\n   • Costo reposición: $${replenishmentDecision.costMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN` +
      `\n   • Detalle: ${replenishmentDecision.reason}`
    : `\n*Estado de existencias:* Seguro (> ${minStock} u).`;

  const receipt = `
*[VENTA EJECUTADA EN SISTEMA [Canal: ${event.channel.toUpperCase()}]]*
• ID Venta: \`${saleId}\`
• Operador: *${event.senderName || event.senderId}*
• Producto: *${product.name}* (SKU: \`${product.sku}\`)
• Cantidad Vendida: *${event.quantity} u*
• Stock Anterior: ${previousStock} u -> *Stock Restante: ${newStock} u*
${replenishmentText}
`.trim();

  const finalResult: SaleExecutionResult = {
    success: true,
    isDuplicate: false,
    saleId,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    quantitySold: event.quantity,
    previousStock,
    remainingStock: newStock,
    minStock,
    isStockDeficit: isBelowMinimum,
    replenishmentDecision,
    channelReceipt: receipt,
  };

  // Guardar en caché de idempotencia si se proveyó clave
  if (deduplicationKey) {
    const compositeKey = `${companyId}:${event.channel}:${deduplicationKey}`;
    processedSalesStore.set(compositeKey, {
      result: finalResult,
      timestamp: Date.now(),
    });
  }

  return finalResult;
}
