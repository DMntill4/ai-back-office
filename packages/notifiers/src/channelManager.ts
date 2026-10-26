import {
  db,
  notificationChannels,
  notificationLog,
  decisions,
  companies,
  operationalEvents,
} from "@mint/core";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { TelegramAdapter } from "./adapters/telegramAdapter";
import { SlackAdapter } from "./adapters/slackAdapter";
import { GmailAdapter } from "./adapters/gmailAdapter";
import { DiscordAdapter } from "./adapters/discordAdapter";
import { generateApprovalToken } from "./tokenService";
import { type ChannelType, type NotifierAdapter, type NotificationPayload, type SendResult } from "./types";

const adapters: Record<ChannelType, NotifierAdapter> = {
  telegram: new TelegramAdapter(),
  slack: new SlackAdapter(),
  gmail: new GmailAdapter(),
  discord: new DiscordAdapter(),
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
 * Envía una notificación de decisión con botones interactivos y tokens firmados
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

  // Obtener divisa real de la empresa
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

  // 2. Obtener canales configurados
  let channels = await listNotificationChannels(companyId);

  // Si no hay canales en BD, verificar variables de entorno antes de fallar
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

    if (envChannels.length === 0) {
      // Sin canales configurados: retornar informe transparente en lugar de simular o inventar
      return [
        {
          success: false,
          channelType: "discord",
          messageId: `unconfigured_${Date.now()}`,
          error: "Sin canales de notificación activos. Configura uno con '/channels add' o exporta DISCORD_WEBHOOK_URL en .env.",
        },
      ];
    }

    channels = envChannels;
  }

  const results: SendResult[] = [];

  for (const channel of channels) {
    if (!channel.isActive) continue;

    const adapter = adapters[channel.type as ChannelType];
    if (!adapter) continue;

    const sendRes = await adapter.send(payload, channel.config as Record<string, any>);
    results.push(sendRes);

    // 3. Registrar en bitácora inmutable de notificaciones
    await db.insert(notificationLog).values({
      id: `nlog_${randomUUID().slice(0, 8)}`,
      companyId,
      channelId: channel.id,
      decisionId,
      severity: payload.severity,
      status: sendRes.success ? "SENT" : "FAILED",
      messageId: sendRes.messageId,
      signedToken: approveTokenObj.token,
      tokenExpiresAt: approveTokenObj.expiresAt,
      isUsed: false,
      payload: { sendResult: sendRes },
    });
  }

  return results;
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
    costMxn: 12500,
    proposingAgent: "compras_agent",
    severity: "INFO",
    evidenceSummary: "Ping de prueba desde 'mint notify test'.",
    approveToken: "dummy_approve_token_123",
    rejectToken: "dummy_reject_token_123",
  };

  return adapter.send(dummyPayload, config);
}
