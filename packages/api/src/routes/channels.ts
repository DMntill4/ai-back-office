import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  listNotificationChannels,
  addNotificationChannel,
  testNotificationChannel,
  resolveActiveChannels,
  deduplicateNotificationChannels,
} from "@mint/notifiers";
import { db, notificationChannels, ROLE_PERMISSIONS, type UserRole } from "@mint/core";
import { and, eq } from "drizzle-orm";
import { currentSession } from "./auth";
import type { ChannelType } from "@mint/notifiers";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
}

function isChannelConfigured(type: string, config: Record<string, unknown>): boolean {
  switch (type) {
    case "telegram":
      return Boolean(config.botToken && config.chatId);
    case "slack":
    case "discord":
    case "webhook":
      try {
        return ["https:", "http:"].includes(new URL(String(config.webhookUrl ?? "")).protocol);
      } catch {
        return false;
      }
    case "gmail":
      return Boolean(config.email || process.env.RESEND_API_KEY || process.env.SMTP_HOST);
    default:
      return false;
  }
}

function canManageChannels(reply: FastifyReply): boolean {
  if (ROLE_PERMISSIONS[currentSession.role as UserRole]?.canManageChannels) return true;
  reply.code(403);
  return false;
}

export async function channelsRoutes(fastify: FastifyInstance) {
  // 1. Listar canales de notificación
  fastify.get("/api/channels", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.query as any) || {};
    const companyId = query.companyId || currentSession.companyId;

    try {
      const channels = await listNotificationChannels(companyId);
      const envChannels = [];
      if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        envChannels.push({
          id: "chan_tg_env",
          type: "telegram",
          name: "Telegram Bot (entorno)",
          isActive: true,
          source: "environment",
          config: {
            botToken: process.env.TELEGRAM_BOT_TOKEN,
            chatId: process.env.TELEGRAM_CHAT_ID,
            topics: ["logs", "stock", "logistics", "critical"],
          },
          createdAt: null,
        });
      }
      if (process.env.SLACK_WEBHOOK_URL) {
        envChannels.push({
          id: "chan_slack_env",
          type: "slack",
          name: "Slack Webhook (entorno)",
          isActive: true,
          source: "environment",
          config: {
            webhookUrl: process.env.SLACK_WEBHOOK_URL,
            topics: ["logs", "stock", "logistics", "critical"],
          },
          createdAt: null,
        });
      }
      if (process.env.DISCORD_WEBHOOK_URL) {
        envChannels.push({
          id: "chan_discord_env",
          type: "discord",
          name: "Discord Webhook (entorno)",
          isActive: true,
          source: "environment",
          config: {
            webhookUrl: process.env.DISCORD_WEBHOOK_URL,
            topics: ["logs", "stock", "logistics", "critical"],
          },
          createdAt: null,
        });
      }

      const environmentTypes = new Set(envChannels.map((channel) => channel.type));
      const effectiveChannels = deduplicateNotificationChannels([
        ...envChannels,
        ...channels.filter((channel) => !environmentTypes.has(channel.type)),
      ]);
      const data = effectiveChannels.map((channel) => ({
        id: channel.id,
        type: channel.type,
        name: channel.name,
        isActive: channel.isActive,
        source: "source" in channel ? channel.source : "database",
        available: isChannelConfigured(channel.type, asRecord(channel.config)),
        createdAt: channel.createdAt?.toISOString?.() ?? null,
        topics: Array.isArray(asRecord(channel.config).topics) ? asRecord(channel.config).topics : [],
      }));
      return { success: true, count: data.length, data };
    } catch (error) {
      request.log.error({ err: error }, "Failed to query notification channels");
      reply.code(503);
      return {
        success: false,
        count: 0,
        data: [],
        message: "No fue posible consultar los canales configurados.",
      };
    }
  });

  fastify.patch("/api/channels/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!canManageChannels(reply)) {
      return { success: false, message: "No tienes permiso para modificar los canales de notificación." };
    }
    const { id } = request.params as { id: string };
    const { enabled } = (request.body as { enabled?: unknown }) || {};
    if (typeof enabled !== "boolean") {
      return reply.code(400).send({ success: false, message: "El estado enabled debe ser booleano." });
    }
    if (id.endsWith("_env")) {
      return reply.code(409).send({
        success: false,
        message: "Este canal se administra desde las variables de entorno del servidor.",
      });
    }

    try {
      const [updated] = await db
        .update(notificationChannels)
        .set({ isActive: enabled })
        .where(and(
          eq(notificationChannels.id, id),
          eq(notificationChannels.companyId, currentSession.companyId),
        ))
        .returning({ id: notificationChannels.id });
      if (!updated) {
        return reply.code(404).send({ success: false, message: "No se encontró el canal para esta empresa." });
      }
      return { success: true, data: { id, enabled } };
    } catch (error) {
      request.log.error({ err: error }, "Failed to update notification channel");
      return reply.code(503).send({ success: false, message: "No fue posible guardar el estado del canal." });
    }
  });

  // 2. Crear canal de notificación
  fastify.post("/api/channels", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!canManageChannels(reply)) {
      return reply.code(403).send({ success: false, error: "No tienes permiso para crear canales de notificación." });
    }
    const body = (request.body as any) || {};
    const companyId = body.companyId || currentSession.companyId;
    const { type, name, webhookUrl, botToken, chatId, topics } = body;

    if (!type || !name) {
      return reply.status(400).send({
        success: false,
        error: "Tipo y nombre descriptivo del canal son obligatorios.",
      });
    }

    const config: Record<string, any> = {
      topics: topics || ["logs", "stock", "logistics", "critical"],
    };

    if (type === "discord" || type === "slack") {
      if (!webhookUrl) {
        return reply.status(400).send({ success: false, error: "Webhook URL es requerido." });
      }
      config.webhookUrl = webhookUrl;
    } else if (type === "telegram") {
      if (!botToken || !chatId) {
        return reply.status(400).send({ success: false, error: "Bot Token y Chat ID son requeridos para Telegram." });
      }
      config.botToken = botToken;
      config.chatId = chatId;
    }

    try {
      const created = await addNotificationChannel({
        companyId,
        type,
        name,
        config,
      });
      return { success: true, channel: created };
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 3. Probar envío de notificación
  fastify.post("/api/channels/test", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!canManageChannels(reply)) {
      return reply.code(403).send({ success: false, error: "No tienes permiso para probar canales de notificación." });
    }
    const body = (request.body as any) || {};
    const { channelId, topic } = body;
    if (typeof channelId !== "string" || !channelId) {
      return reply.status(400).send({ success: false, error: "Selecciona un canal configurado para probar." });
    }

    try {
      const channel = (await resolveActiveChannels(currentSession.companyId))
        .find((item) => item.id === channelId);
      if (!channel) {
        return reply.status(404).send({ success: false, error: "No se encontró el canal configurado." });
      }
      if (!channel.isActive) {
        return reply.status(409).send({ success: false, error: "El canal está desactivado." });
      }

      const res = await testNotificationChannel(channel.type as ChannelType, {
        ...(channel.config as Record<string, unknown>),
        testTopic: topic || "Alerta de prueba desde Mint",
      });
      return { success: true, result: res };
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
}
