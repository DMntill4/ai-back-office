import {
  db,
  notificationChannels,
  notificationLog,
  decisions,
} from "@mint/core";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { TelegramAdapter } from "./adapters/telegramAdapter";
import { SlackAdapter } from "./adapters/slackAdapter";
import { GmailAdapter } from "./adapters/gmailAdapter";
import { generateApprovalToken } from "./tokenService";
import { type ChannelType, type NotifierAdapter, type NotificationPayload, type SendResult } from "./types";

const adapters: Record<ChannelType, NotifierAdapter> = {
  telegram: new TelegramAdapter(),
  slack: new SlackAdapter(),
  gmail: new GmailAdapter(),
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

  const payload: NotificationPayload = {
    companyId,
    decisionId,
    title: dec.title,
    description: dec.policyReason || "Propuesta de compra lista para aprobación",
    costMxn: costNumber,
    proposingAgent: dec.proposingAgent,
    severity: costNumber > 50000 ? "CRITICAL" : "WARNING",
    evidenceSummary: `Costo: $${costNumber.toLocaleString("es-MX")} MXN. Razón: ${dec.policyReason || "Supera umbral autónomo."}`,
    approveToken: approveTokenObj.token,
    rejectToken: rejectTokenObj.token,
  };

  // 2. Obtener canales configurados
  let channels = await listNotificationChannels(companyId);

  // Si no hay canales registrados en BD, usar los adaptadores con configuración por defecto
  if (channels.length === 0) {
    channels = [
      {
        id: "chan_tg_default",
        companyId,
        type: "telegram",
        name: "Telegram Bot Oficial",
        config: {},
        isActive: true,
        quietHoursStart: null,
        quietHoursEnd: null,
        createdAt: new Date(),
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

    // 3. Registrar en bitácora de notificaciones
    await db.insert(notificationLog).values({
      id: `nlog_${randomUUID().slice(0, 8)}`,
      companyId,
      channelId: channel.id,
      decisionId,
      severity: payload.severity,
      status: "SENT",
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
