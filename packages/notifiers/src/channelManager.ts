import {
  db,
  notificationChannels,
  notificationLog,
  decisions,
  companies,
  operationalEvents,
  users,
  suppliers,
  products,
} from "@mint/core";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { TelegramAdapter } from "./adapters/telegramAdapter";
import { SlackAdapter } from "./adapters/slackAdapter";
import { GmailAdapter } from "./adapters/gmailAdapter";
import { DiscordAdapter } from "./adapters/discordAdapter";
import { WebhookAdapter } from "./adapters/webhookAdapter";
import { generateApprovalToken } from "./tokenService";
import { type ChannelType, type NotifierAdapter, type NotificationPayload, type SendResult, type NotificationSeverity } from "./types";

const adapters: Record<ChannelType, NotifierAdapter> = {
  telegram: new TelegramAdapter(),
  slack: new SlackAdapter(),
  gmail: new GmailAdapter(),
  discord: new DiscordAdapter(),
  webhook: new WebhookAdapter(),
};

export async function addNotificationChannel(params: {
  companyId: string;
  type: ChannelType;
  name: string;
  config: Record<string, any>;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}) {
  const channelId = `chan_${params.type}_${randomUUID().slice(0, 8)}`;

  await db.insert(notificationChannels).values({
    id: channelId,
    companyId: params.companyId,
    type: params.type,
    name: params.name,
    config: params.config,
    quietHoursStart: params.quietHoursStart,
    quietHoursEnd: params.quietHoursEnd,
    isActive: true,
  });

  return { channelId, ...params };
}

export async function listNotificationChannels(companyId: string) {
  return db
    .select()
    .from(notificationChannels)
    .where(eq(notificationChannels.companyId, companyId));
}

async function resolveActiveChannels(companyId: string) {
  let channels = await listNotificationChannels(companyId);

  if (channels.length === 0) {
    const envChannels: typeof channels = [];
    if (process.env.DISCORD_WEBHOOK_URL) {
      envChannels.push({
        id: "chan_discord_env",
        companyId,
        type: "discord",
        name: "Discord Webhook (ENV)",
        config: { webhookUrl: process.env.DISCORD_WEBHOOK_URL },
        isActive: true,
        quietHoursStart: null,
        quietHoursEnd: null,
        createdAt: new Date(),
      });
    }
    if (process.env.SLACK_WEBHOOK_URL) {
      envChannels.push({
        id: "chan_slack_env",
        companyId,
        type: "slack",
        name: "Slack Webhook (ENV)",
        config: { webhookUrl: process.env.SLACK_WEBHOOK_URL },
        isActive: true,
        quietHoursStart: null,
        quietHoursEnd: null,
        createdAt: new Date(),
      });
    }
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      envChannels.push({
        id: "chan_tg_env",
        companyId,
        type: "telegram",
        name: "Telegram Bot (ENV)",
        config: { botToken: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID },
        isActive: true,
        quietHoursStart: null,
        quietHoursEnd: null,
        createdAt: new Date(),
      });
    }
    if (process.env.GENERIC_WEBHOOK_URL || process.env.WEBHOOK_URL) {
      envChannels.push({
        id: "chan_webhook_env",
        companyId,
        type: "webhook",
        name: "Webhook Externo (ENV)",
        config: { webhookUrl: process.env.GENERIC_WEBHOOK_URL || process.env.WEBHOOK_URL },
        isActive: true,
        quietHoursStart: null,
        quietHoursEnd: null,
        createdAt: new Date(),
      });
    }
    channels = envChannels;
  }

  return channels;
}

/**
 * Registra y propaga un evento de auditoría de decisión autónoma
 */
export async function dispatchAuditEvent(params: {
  companyId: string;
  phase: "OBSERVE" | "DECIDE" | "EXECUTE" | "VERIFY";
  detail: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const { companyId, phase, detail, metadata } = params;
  try {
    await db.insert(operationalEvents).values({
      id: `audit_${Date.now()}_${randomUUID().slice(0, 6)}`,
      companyId,
      eventType: `AUDIT_${phase}`,
      severity: phase === "EXECUTE" ? "HIGH" : "INFO",
      status: "RESOLVED",
      title: `[${phase}] ${detail.slice(0, 80)}`,
      description: detail,
      payload: metadata || {},
    });
  } catch {
    // Registro no bloqueante
  }
}

/**
 * Envía una notificación de decisión PENDIENTE con botones interactivos y tokens firmados
 */
export async function dispatchDecisionNotification(
  decisionId: string,
  companyId: string = "comp_default",
): Promise<SendResult[]> {
  const decList = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.companyId, companyId)))
    .limit(1);

  if (decList.length === 0) {
    throw new Error(`Decisión "${decisionId}" no encontrada.`);
  }

  const dec = decList[0];
  const costNumber = Number(dec.costMxn);

  let currency = "USD";
  try {
    const compList = await db
      .select({ currency: companies.currency })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    if (compList[0]?.currency) {
      currency = compList[0].currency;
    }
  } catch {
    // Mantener USD si falla consulta
  }

  // 1. Generar tokens firmados de aprobación y rechazo
  const approveTokenObj = generateApprovalToken({
    decisionId,
    action: "approve",
    companyId,
    ttlMinutes: 60,
  });

  const rejectTokenObj = generateApprovalToken({
    decisionId,
    action: "reject",
    companyId,
    ttlMinutes: 60,
  });

  const formattedCost = `$${costNumber.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

  const payload: NotificationPayload = {
    companyId,
    decisionId,
    kind: "DECISION_APPROVAL",
    title: dec.title,
    description: dec.policyReason || "Propuesta de compra lista para aprobación",
    costMxn: costNumber,
    currency,
    proposingAgent: dec.proposingAgent,
    severity: costNumber > 50000 ? "CRITICAL" : "WARNING",
    evidenceSummary: `Costo: ${formattedCost}. Razón: ${dec.policyReason || "Supera umbral autónomo."}`,
    approveToken: approveTokenObj.token,
    rejectToken: rejectTokenObj.token,
  };

  const channels = await resolveActiveChannels(companyId);

  if (channels.length === 0) {
    return [
      {
        success: false,
        channelType: "discord",
        messageId: `unconfigured_${Date.now()}`,
        error: "Sin canales de notificación activos. Configura uno con '/channels add' o exporta DISCORD_WEBHOOK_URL en .env.",
      },
    ];
  }

  const results: SendResult[] = [];

  for (const channel of channels) {
    if (!channel.isActive) continue;

    const adapter = adapters[channel.type as ChannelType];
    if (!adapter) continue;

    const sendRes = await adapter.send(payload, channel.config as Record<string, any>);
    results.push(sendRes);

    await db.insert(notificationLog).values({
      id: `nlog_${randomUUID().slice(0, 8)}`,
      companyId,
      channelId: channel.id.startsWith("chan_") && !channel.id.endsWith("_env") ? channel.id : null,
      decisionId,
      severity: payload.severity,
      status: sendRes.success ? "SENT" : "FAILED",
      messageId: sendRes.messageId,
      signedToken: approveTokenObj.token,
      tokenExpiresAt: approveTokenObj.expiresAt,
      isUsed: false,
      payload: { kind: "DECISION_APPROVAL", sendResult: sendRes },
    });

    if (!sendRes.success) {
      try {
        const { enqueueOutboxItem } = await import("./outboxQueueService");
        enqueueOutboxItem({
          companyId,
          channelType: channel.type as ChannelType,
          channelConfig: channel.config as Record<string, any>,
          payload,
          error: sendRes.error,
        });
      } catch {}
    }
  }

  return results;
}

/**
 * Despacha la Ficha de Dispersión de Pago / Orden de Compra Autorizada a los canales
 * configurados (priorizando aquellos suscritos a 'payments'/'finance' o generales) y al personal
 * con rol 'finance', 'admin' u 'owner' responsable de controlar y ejecutar los pagos.
 */
export async function dispatchPaymentOrderNotification(params: {
  decisionId: string;
  companyId: string;
  orderId: string;
  trackingNumber?: string;
  approvedBy: string;
}): Promise<{
  results: SendResult[];
  notifiedPersonnel: Array<{ name: string; email: string; role: string }>;
}> {
  const { decisionId, companyId, orderId, trackingNumber, approvedBy } = params;

  const [dec] = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.companyId, companyId)))
    .limit(1);

  if (!dec) {
    return { results: [], notifiedPersonnel: [] };
  }

  const evidence = (dec.evidencePayload as any) || {};
  const costNumber = Number(dec.costMxn);

  // 1. Obtener divisa de la empresa
  let currency = "USD";
  try {
    const [comp] = await db
      .select({ currency: companies.currency })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    if (comp?.currency) currency = comp.currency;
  } catch {}

  // 2. Obtener datos completos del proveedor y producto en la BD
  const supplierId = evidence.supplierId || "prov_unknown";
  let supplierName = evidence.supplierName || supplierId;
  let supplierEmail: string | undefined;
  let supplierPhone: string | undefined;
  let supplierTaxId: string | undefined;

  try {
    const [supp] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);
    if (supp) {
      supplierName = supp.name || supplierName;
      supplierEmail = supp.email || undefined;
      supplierPhone = supp.phone || undefined;
      supplierTaxId = supp.taxId || undefined;
      var supplierBankName = (supp as any).bankName || undefined;
      var supplierBankAccount = (supp as any).bankAccountNumber || undefined;
      var supplierBankClabe = (supp as any).bankClabe || undefined;
    }
  } catch {}

  let productName = evidence.productName || evidence.productId || "Producto";
  let sku = evidence.sku;
  if (evidence.productId && (!evidence.productName || !evidence.sku)) {
    try {
      const [prod] = await db
        .select()
        .from(products)
        .where(eq(products.id, evidence.productId))
        .limit(1);
      if (prod) {
        productName = prod.name;
        sku = prod.sku;
      }
    } catch {}
  }

  // 3. Buscar personal responsable de pagos en la organización (roles: finance, admin, owner)
  let financePersonnel: Array<{ name: string; email: string; role: string }> = [];
  try {
    const companyUsers = await db
      .select()
      .from(users)
      .where(eq(users.companyId, companyId));

    const financeOnly = companyUsers.filter((u) => u.role === "finance");
    const fallbackApprovers = companyUsers.filter(
      (u) => u.role === "finance" || u.role === "admin" || u.role === "owner",
    );
    const targetUsers = financeOnly.length > 0 ? financeOnly : fallbackApprovers;

    financePersonnel = targetUsers.map((u) => ({
      name: u.name,
      email: u.email,
      role: u.role,
    }));
  } catch {}

  const quantity = Number(evidence.quantity || 10);
  const unitPrice = evidence.unitPrice || (costNumber / Math.max(1, quantity)).toFixed(2);
  const formattedCost = `$${costNumber.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

  const payload: NotificationPayload = {
    companyId,
    decisionId,
    kind: "PAYMENT_DISPERSION",
    title: `Orden de Compra ${orderId} Aprobada — Dispersión de Pago`,
    description: `Orden autorizada por ${approvedBy}. Favor de procesar pago a proveedor ${supplierName}.`,
    costMxn: costNumber,
    currency,
    proposingAgent: dec.proposingAgent,
    severity: "INFO",
    evidenceSummary: `La recomendación ${decisionId} fue aprobada por ${approvedBy}. Se emitió la Orden de Compra ${orderId} por ${formattedCost} a favor de ${supplierName}. Queda asignada a Tesorería/Pagos para dispersión.`,
    paymentDetails: {
      orderId,
      trackingNumber,
      supplierId,
      supplierName,
      supplierEmail,
      supplierPhone,
      supplierTaxId,
      bankName: supplierBankName,
      bankAccountNumber: supplierBankAccount,
      bankClabe: supplierBankClabe,
      productName,
      sku,
      quantity,
      unitPrice,
      approvedBy,
      financeAssignees: financePersonnel,
    },
  };

  const channels = await resolveActiveChannels(companyId);
  const results: SendResult[] = [];

  for (const channel of channels) {
    if (!channel.isActive) continue;

    const adapter = adapters[channel.type as ChannelType];
    if (!adapter) continue;

    const channelConfig = { ...((channel.config as Record<string, any>) || {}) };
    if (channel.type === "gmail" && financePersonnel.length > 0) {
      channelConfig.extraEmails = financePersonnel.map((p) => p.email);
    }

    const sendRes = await adapter.send(payload, channelConfig);
    results.push(sendRes);

    try {
      await db.insert(notificationLog).values({
        id: `nlog_pay_${randomUUID().slice(0, 8)}`,
        companyId,
        channelId: channel.id.startsWith("chan_") && !channel.id.endsWith("_env") ? channel.id : null,
        decisionId,
        severity: "INFO",
        status: sendRes.success ? "SENT" : "FAILED",
        messageId: sendRes.messageId,
        isUsed: true,
        payload: {
          kind: "PAYMENT_DISPERSION",
          orderId,
          trackingNumber,
          approvedBy,
          notifiedPersonnel: financePersonnel,
          sendResult: sendRes,
        },
      });
    } catch {}
  }

  return {
    results,
    notifiedPersonnel: financePersonnel,
  };
}

/**
 * Prueba de conexión a un canal de notificación
 */
export async function testNotificationChannel(
  channelType: ChannelType,
  config: Record<string, any> = {},
): Promise<SendResult> {
  const adapter = adapters[channelType];
  if (!adapter) {
    throw new Error(`Canal de notificación no soportado: ${channelType}`);
  }

  const dummyPayload: NotificationPayload = {
    companyId: "comp_default",
    decisionId: "dec_test_ping",
    title: "Prueba de Canal de Notificación Mint",
    description: "Este es un mensaje de verificación para confirmar la conectividad.",
    costMxn: 0,
    proposingAgent: "compras_agent",
    severity: "INFO",
    evidenceSummary: "Ping de prueba desde 'mint notify test'.",
    approveToken: "dummy_approve_token_123",
    rejectToken: "dummy_reject_token_123",
  };

  return adapter.send(dummyPayload, config);
}

/**
 * Despacha eventos de movimiento de stock, ventas, discrepancias o alertas criticas
 * a los canales de logs y notificaciones configurados en la empresa (incluyendo Webhooks).
 */
export async function dispatchStockLogNotification(params: {
  companyId: string;
  type: "STOCK_UPDATE" | "STOCK_CRITICAL" | "DISCREPANCY" | "RAPID_MOVEMENT" | "SALE";
  title: string;
  description: string;
  productId?: string;
  productName?: string;
  sku?: string;
  quantityDelta?: number;
  previousStock?: number;
  newStock?: number;
  minStock?: number;
  metadata?: Record<string, any>;
  severity?: NotificationSeverity;
}): Promise<SendResult[]> {
  const { companyId, type, title, description, metadata, severity = "INFO" } = params;

  try {
    await db.insert(operationalEvents).values({
      id: `opev_${randomUUID().slice(0, 8)}`,
      companyId,
      eventType: type,
      severity,
      status: "PENDING",
      title: `[${type}] ${title}`,
      description,
      payload: { ...params, timestamp: new Date().toISOString() },
    });
  } catch {}

  const channels = await resolveActiveChannels(companyId);
  const results: SendResult[] = [];

  const payload: NotificationPayload = {
    companyId,
    decisionId: `log_${Date.now()}`,
    kind: "GENERAL_ALERT",
    title: `[${type}] ${title}`,
    description,
    costMxn: 0,
    proposingAgent: "inventory_monitor",
    severity,
    evidenceSummary: description,
    metadata: {
      type,
      productId: params.productId,
      productName: params.productName,
      sku: params.sku,
      quantityDelta: params.quantityDelta,
      previousStock: params.previousStock,
      newStock: params.newStock,
      minStock: params.minStock,
      ...(metadata || {}),
    },
  };

  for (const channel of channels) {
    if (!channel.isActive) continue;

    const cfg = (channel.config as Record<string, any>) || {};
    const topics: string[] = Array.isArray(cfg.topics) ? cfg.topics : ["todos"];
    const matchesTopic =
      topics.includes("todos") ||
      topics.includes("stock") ||
      topics.includes("logs") ||
      (severity === "CRITICAL" && topics.includes("critical"));

    if (!matchesTopic) continue;

    const adapter = adapters[channel.type as ChannelType];
    if (!adapter) continue;

    try {
      const sendRes = await adapter.send(payload, cfg);
      results.push(sendRes);

      await db.insert(notificationLog).values({
        id: `nlog_${randomUUID().slice(0, 8)}`,
        companyId,
        channelId: channel.id.startsWith("chan_") && !channel.id.endsWith("_env") ? channel.id : null,
        decisionId: payload.decisionId,
        severity,
        status: sendRes.success ? "SENT" : "FAILED",
        messageId: sendRes.messageId,
        payload: { kind: "GENERAL_ALERT", type, sendResult: sendRes },
      });
    } catch (err: any) {
      results.push({
        success: false,
        channelType: channel.type as ChannelType,
        error: err.message,
      });
    }
  }

  return results;
}

