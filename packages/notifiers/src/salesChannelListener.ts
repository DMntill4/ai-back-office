import { db, products, inventory, mintSalesOrders } from "@mint/core";
import { eq, and } from "drizzle-orm";
import { executeAjustarStock } from "@mint/core";
import { runBackOfficeHarness, type HarnessExecutionResult } from "@mint/core";
import { dispatchDecisionNotification } from "./channelManager";
import { type ChannelType } from "./types";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";

export interface IncomingSaleEvent {
  messageId?: string; // ID del mensaje original del canal (Telegram, Discord, Slack o Webhook)
  idempotencyKey?: string; // Clave única de idempotencia
  channel: ChannelType | "pos" | "webhook" | "web";
  senderId: string; // Identificador del emisor
  senderName?: string;
  sku: string;
  quantity: number;
  unitPriceMxn?: number;
  customerName?: string;
  customerEmail?: string;
  shippingAddress?: string;
  paymentStatus?: "paid" | "pending" | "refunded";
  companyId?: string;
  signature?: string; // Firma HMAC SHA-256
  rawPayload?: string;
  webhookSecret?: string;
  authorizedSenders?: string[]; // Lista blanca de IDs autorizados
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
  customerName: string;
  shippingAddress: string;
  totalAmount: number;
  paymentStatus: string;
  signatureVerified: boolean;
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
const inFlightSalesStore = new Map<string, Promise<SaleExecutionResult>>();

function cleanupExpiredIdempotencyKeys() {
  const cutoff = Date.now() - 72 * 60 * 60 * 1000;
  for (const [key, val] of processedSalesStore.entries()) {
    if (val.timestamp < cutoff) processedSalesStore.delete(key);
  }
}

/**
 * Valida la firma criptográfica HMAC-SHA256 del webhook
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const hmac = createHmac("sha256", secret);
    const digest = Buffer.from(hmac.update(payload).digest("hex"), "utf8");
    const sigBuffer = Buffer.from(signature.replace(/^sha256=/, ""), "utf8");
    if (digest.length !== sigBuffer.length) return false;
    return timingSafeEqual(digest, sigBuffer);
  } catch {
    return false;
  }
}

/**
 * Reintentos con Backoff Exponencial y detección de modo degradado
 */
export async function executeWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 200,
): Promise<{ result?: T; degradedMode: boolean; error?: string }> {
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, degradedMode: false };
    } catch (err: any) {
      if (attempt === maxRetries) {
        return { degradedMode: true, error: err.message };
      }
      await new Promise((res) => setTimeout(res, delay));
      delay *= 2;
    }
  }
  return { degradedMode: true, error: "Reintentos agotados" };
}

/**
 * Procesa y ejecuta automáticamente una venta registrada desde canales externos o webhooks.
 * Con garantías de seguridad de la Tarea 1.1:
 * 1. Validación de firma HMAC criptográfica.
 * 2. Idempotencia estricta en memoria y en PostgreSQL (mint_sales_orders).
 * 3. Guarda comprador, destino, monto, productos y cantidades, fecha, estado de pago y envío.
 * 4. Descuenta el inventario real en las tablas de MINT sin tocar tablas del cliente sin permiso.
 * 5. Si el stock cae bajo el mínimo de seguridad, dispara orquestación multi-agente de compra.
 */
export async function processIncomingSale(event: IncomingSaleEvent): Promise<SaleExecutionResult> {
  const companyId = event.companyId || "comp_default";
  const deduplicationKey = event.idempotencyKey || event.messageId;
  const compositeKey = deduplicationKey ? `${companyId}:${event.channel}:${deduplicationKey}` : null;

  if (compositeKey) {
    const inFlight = inFlightSalesStore.get(compositeKey);
    if (inFlight) {
      const winner = await inFlight;
      return {
        ...winner,
        isDuplicate: true,
      };
    }
  }

  const execution = executeProcessIncomingSale(event, companyId);
  if (compositeKey) {
    inFlightSalesStore.set(compositeKey, execution);
  }

  try {
    return await execution;
  } finally {
    if (compositeKey) {
      inFlightSalesStore.delete(compositeKey);
    }
  }
}

async function executeProcessIncomingSale(
  event: IncomingSaleEvent,
  companyId: string,
): Promise<SaleExecutionResult> {

  // 1. Control de Firma Criptográfica si es webhook o si se proveyó firma
  let signatureVerified = false;
  if (event.signature && event.rawPayload) {
    const secret = event.webhookSecret || process.env.WEBHOOK_SECRET || "mint_default_webhook_secret";
    const isValid = verifyWebhookSignature(event.rawPayload, event.signature, secret);
    if (!isValid) {
      throw new Error("ACCESO DENEGADO: Firma HMAC SHA-256 de webhook inválida o manipulada.");
    }
    signatureVerified = true;
  }

  // 2. Control de Acceso y Validación de Identidad del Emisor
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

  // 3. Garantía de Idempotencia: Verificar si el mensaje ya fue procesado en memoria o en PostgreSQL
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

    // Verificar en BD mint_sales_orders
    const dbExisting = await db
      .select()
      .from(mintSalesOrders)
      .where(eq(mintSalesOrders.idempotencyKey, deduplicationKey))
      .limit(1);

    if (dbExisting.length > 0) {
      const row = dbExisting[0];
      return {
        success: true,
        isDuplicate: true,
        saleId: row.id,
        productId: (row.itemsPayload as any)?.[0]?.productId || "prod_unknown",
        productName: (row.itemsPayload as any)?.[0]?.name || "Producto",
        sku: (row.itemsPayload as any)?.[0]?.sku || event.sku,
        quantitySold: (row.itemsPayload as any)?.[0]?.quantity || event.quantity,
        previousStock: 0,
        remainingStock: 0,
        minStock: 0,
        isStockDeficit: false,
        customerName: row.customerName,
        shippingAddress: row.shippingAddress,
        totalAmount: parseFloat(row.totalAmount?.toString() || "0"),
        paymentStatus: row.paymentStatus,
        signatureVerified: row.signatureVerified,
        channelReceipt: `Venta duplicada ya registrada previamente con ID ${row.id}.`,
      };
    }
  }

  // 4. Buscar producto por SKU en el catálogo de MINT
  const found = await db
    .select()
    .from(products)
    .where(and(eq(products.sku, event.sku), eq(products.companyId, companyId)))
    .limit(1);

  if (found.length === 0) {
    throw new Error(`Producto con SKU '${event.sku}' no encontrado en el catálogo de la empresa '${companyId}'.`);
  }

  const product = found[0];
  const saleId = `sale_${randomUUID().slice(0, 8)}`;
  const customerName = event.customerName || event.senderName || "Cliente Web Final";
  const shippingAddress = event.shippingAddress || "Entrega en domicilio registrado del cliente";
  const paymentStatus = event.paymentStatus || "paid";

  // 5. Ajustar inventario descontando la cantidad vendida en las tablas de MINT (nunca toca tablas del cliente)
  const adjustResult = await executeAjustarStock(
    {
      producto_id: product.id,
      cantidad_delta: -event.quantity,
      motivo: `Venta ejecutada desde canal ${event.channel.toUpperCase()} por ${customerName}`,
    },
    { companyId }
  );

  if (!adjustResult.isSuccess || !adjustResult.data) {
    throw new Error(adjustResult.message || "Error al descontar existencias de inventario.");
  }

  const { previousStock, newStock, minStock, isBelowMinimum } = adjustResult.data;

  // 6. Registrar la venta con metadatos completos en mint_sales_orders
  const unitPrice = event.unitPriceMxn || 100;
  const totalAmount = Number((unitPrice * event.quantity).toFixed(2));

  try {
    await db.insert(mintSalesOrders).values({
      id: saleId,
      companyId,
      externalOrderId: deduplicationKey || saleId,
      customerName,
      customerEmail: event.customerEmail || null,
      shippingAddress,
      totalAmount: totalAmount.toString(),
      currency: "USD",
      channel: event.channel,
      paymentStatus,
      shippingStatus: "pending",
      idempotencyKey: deduplicationKey || null,
      signatureVerified,
      itemsPayload: [
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity: event.quantity,
          unitPrice,
        },
      ],
    });
  } catch (dbErr: any) {
    const isUniqueViolation =
      dbErr?.code === "23505" ||
      String(dbErr?.message).includes("unique") ||
      String(dbErr?.message).includes("duplicate key");
    if (isUniqueViolation && deduplicationKey) {
      await executeAjustarStock(
        {
          producto_id: product.id,
          cantidad_delta: event.quantity,
          motivo: `Reversión automática por venta duplicada concurrente [${deduplicationKey}]`,
        },
        { companyId }
      ).catch(() => null);

      const existingWinner = await db
        .select()
        .from(mintSalesOrders)
        .where(eq(mintSalesOrders.idempotencyKey, deduplicationKey))
        .limit(1);

      if (existingWinner.length > 0) {
        const row = existingWinner[0];
        return {
          success: true,
          isDuplicate: true,
          saleId: row.id,
          productId: (row.itemsPayload as any)?.[0]?.productId || product.id,
          productName: (row.itemsPayload as any)?.[0]?.name || product.name,
          sku: (row.itemsPayload as any)?.[0]?.sku || event.sku,
          quantitySold: (row.itemsPayload as any)?.[0]?.quantity || event.quantity,
          previousStock,
          remainingStock: previousStock,
          minStock,
          isStockDeficit: false,
          customerName: row.customerName,
          shippingAddress: row.shippingAddress,
          totalAmount: parseFloat(row.totalAmount?.toString() || "0"),
          paymentStatus: row.paymentStatus,
          signatureVerified: row.signatureVerified,
          channelReceipt: `Venta duplicada detectada concurrentemente. Ya registrada previamente con ID ${row.id}.`,
        };
      }
    }
    throw dbErr;
  }

  let replenishmentDecision: SaleExecutionResult["replenishmentDecision"];

  // 7. Si el stock cayó por debajo del mínimo de seguridad, disparar respuesta autónoma
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

  // 8. Formatear comprobante de venta para el canal
  let currency = "USD";
  try {
    const { companies } = await import("@mint/core");
    const [c] = await db.select({ currency: companies.currency }).from(companies).where(eq(companies.id, companyId)).limit(1);
    if (c?.currency) currency = c.currency;
  } catch {}

  const replenishmentText = replenishmentDecision
    ? `\n[AGENTE] *ACCIÓN AUTÓNOMA DE REABASTECIMIENTO:*` +
      `\n   • Estado: ${replenishmentDecision.policyDecision === "auto_executed" ? "[OK] Orden emitida automáticamente" : "[PENDIENTE] Escalado a bandeja HITL para firma"}` +
      `\n   • Costo reposición: $${replenishmentDecision.costMxn.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}` +
      `\n   • Detalle: ${replenishmentDecision.reason}`
    : `\n[PAQUETE] *Estado de existencias:* Seguro (> ${minStock} u).`;

  const receipt = `
[VENTA] *VENTA REGISTRADA [Canal: ${event.channel.toUpperCase()}]*
• ID Venta: \`${saleId}\`
• Cliente: *${customerName}*
• Destino: *${shippingAddress}*
• Producto: *${product.name}* (SKU: \`${product.sku}\`)
• Cantidad: *${event.quantity} u*  | Total: *$${totalAmount.toFixed(2)} ${currency}* [Pago: ${paymentStatus.toUpperCase()}]
• Stock Anterior: ${previousStock} u ➔ *Stock Restante: ${newStock} u*
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
    customerName,
    shippingAddress,
    totalAmount,
    paymentStatus,
    signatureVerified,
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
