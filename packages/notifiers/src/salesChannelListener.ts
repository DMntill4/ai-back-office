import { db, products, inventory } from "@mint/core";
import { eq, and } from "drizzle-orm";
import { executeAjustarStock } from "@mint/core";
import { runBackOfficeHarness, type HarnessExecutionResult } from "@mint/core";
import { dispatchDecisionNotification } from "./channelManager";
import { type ChannelType } from "./types";

export interface IncomingSaleEvent {
  channel: ChannelType | "pos" | "webhook";
  sku: string;
  quantity: number;
  unitPriceMxn?: number;
  customerName?: string;
  companyId?: string;
}

export interface SaleExecutionResult {
  success: boolean;
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

/**
 * Procesa y ejecuta automáticamente una venta registrada desde canales externos (Telegram, Slack, Discord o POS).
 * 1. Descuenta el inventario real en PostgreSQL.
 * 2. Si el stock cae por debajo del umbral de seguridad, activa el harness multi-agente de compras.
 * 3. Si califica para auto-ejecución, emite la orden de compra; si excede el umbral, despacha alerta interactiva al canal.
 */
export async function processIncomingSale(event: IncomingSaleEvent): Promise<SaleExecutionResult> {
  const companyId = event.companyId || "comp_default";
  const saleId = `sale_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // 1. Buscar producto por SKU
  const found = await db
    .select()
    .from(products)
    .where(and(eq(products.sku, event.sku), eq(products.companyId, companyId)))
    .limit(1);

  if (found.length === 0) {
    throw new Error(`Producto con SKU '${event.sku}' no encontrado en el catálogo de la empresa '${companyId}'.`);
  }

  const product = found[0];

  // 2. Ajustar inventario descontando la cantidad vendida
  const adjustResult = await executeAjustarStock(
    {
      producto_id: product.id,
      cantidad_delta: -event.quantity,
      motivo: `Venta ejecutada desde canal ${event.channel.toUpperCase()} ${event.customerName ? `(Cliente: ${event.customerName})` : ""}`,
    },
    { companyId }
  );

  if (!adjustResult.isSuccess || !adjustResult.data) {
    throw new Error(adjustResult.message || "Error al descontar existencias de inventario.");
  }

  const { previousStock, newStock, minStock, isBelowMinimum } = adjustResult.data;

  let replenishmentDecision: SaleExecutionResult["replenishmentDecision"];

  // 3. Si el stock cayó por debajo del mínimo de seguridad, disparar respuesta autónoma
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

        // Si requiere aprobación humana (HITL), notificar a los canales configurados
        if (sc.policyDecision === "pending_approval") {
          await dispatchDecisionNotification(sc.proposal.id, companyId).catch(() => null);
          replenishmentDecision.notifiedChannel = event.channel;
        }
      }
    } catch (err: any) {
      console.warn(`[SALES CHANNEL] Advertencia en orquestación de reabastecimiento: ${err.message}`);
    }
  }

  // 4. Formatear comprobante de venta para el canal
  const replenishmentText = replenishmentDecision
    ? `\n🤖 *ACCIÓN AUTÓNOMA DE REABASTECIMIENTO:*` +
      `\n   • Estado: ${replenishmentDecision.policyDecision === "auto_executed" ? "✅ Orden de compra emitida automáticamente" : "⏳ Escalado a bandeja HITL para firma"}` +
      `\n   • Costo reposición: $${replenishmentDecision.costMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN` +
      `\n   • Detalle: ${replenishmentDecision.reason}`
    : `\n📦 *Estado de existencias:* Seguro (> ${minStock} u).`;

  const receipt = `
🛒 *VENTA EJECUTADA EN SISTEMA [Canal: ${event.channel.toUpperCase()}]*
• ID Venta: \`${saleId}\`
• Producto: *${product.name}* (SKU: \`${product.sku}\`)
• Cantidad Vendida: *${event.quantity} u*
• Stock Anterior: ${previousStock} u ➔ *Stock Restante: ${newStock} u*
${replenishmentText}
`.trim();

  return {
    success: true,
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
}
