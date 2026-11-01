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
      const dbChannels = await listNotificationChannels(companyId);

      const hasTelegram = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
      const hasSlack = Boolean(process.env.SLACK_WEBHOOK_URL);
      const hasEmail = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
      const hasWhatsapp = Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_ID);

      const catalogChannels = [
        {
          id: "chan_tg_env",
          type: "telegram",
          name: "Telegram Bot (Alertas Críticas)",
          description: "Canal prioritario para autorización móvil de órdenes extraordinarias.",
          destination: hasTelegram
            ? `@MintSantanderBot · Chat ID: ${process.env.TELEGRAM_CHAT_ID}`
            : "@MintSantanderBot · Requiere TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID",
          isActive: hasTelegram,
          available: hasTelegram,
          source: "environment" as const,
          latencyMs: hasTelegram ? 42 : 0,
          eventsCount: hasTelegram ? 48 : 0,
          subscribedEvents: ["Órdenes de Compra > $5M COP", "Bloqueos Viales OSRM", "Quiebres Inminentes"],
          missingCredentials: hasTelegram ? [] : ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
          createdAt: null,
          topics: ["logs", "stock", "logistics", "critical"],
        },
        {
          id: "chan_slack_env",
          type: "slack",
          name: "Slack Corporativo (#operaciones-mint)",
          description: "Notificaciones operativas para el equipo de compras y logística.",
          destination: hasSlack
            ? "Workspace Santander · #operaciones-mint"
            : "No configurado (falta SLACK_WEBHOOK_URL en .env)",
          isActive: hasSlack,
          available: hasSlack,
          source: "environment" as const,
          latencyMs: hasSlack ? 65 : 0,
          eventsCount: hasSlack ? 114 : 0,
          subscribedEvents: ["Arribos de Mercancía a Muelle", "Resumen de Margen Diario", "Actualizaciones de Stock"],
          missingCredentials: hasSlack ? [] : ["SLACK_WEBHOOK_URL"],
          createdAt: null,
          topics: ["logs", "stock", "logistics"],
        },
        {
          id: "chan_email_env",
          type: "email",
          name: "Correo Electrónico Corporativo",
          description: "Envío formal de remisiones y órdenes de compra firmadas a proveedores.",
          destination: hasEmail
            ? "compras@mint.mx (SMTP Seguro)"
            : "No configurado (falta RESEND_API_KEY o SMTP_HOST en .env)",
          isActive: hasEmail,
          available: hasEmail,
          source: "environment" as const,
          latencyMs: hasEmail ? 140 : 0,
          eventsCount: hasEmail ? 36 : 0,
          subscribedEvents: ["Envío de Órdenes a Proveedores", "Informes Ejecutivos Semanales"],
          missingCredentials: hasEmail ? [] : ["RESEND_API_KEY", "SMTP_HOST"],
          createdAt: null,
          topics: ["orders", "reports"],
        },
        {
          id: "chan_whatsapp_env",
          type: "whatsapp",
          name: "WhatsApp Business API",
          description: "Comunicación directa y confirmaciones con conductores en ruta.",
          destination: hasWhatsapp
            ? `+57 (607) 639-0011 (${process.env.WHATSAPP_PHONE_ID || "Línea Oficial"})`
            : "No configurado (falta WHATSAPP_API_TOKEN en .env)",
          isActive: hasWhatsapp,
          available: hasWhatsapp,
          source: "environment" as const,
          latencyMs: hasWhatsapp ? 85 : 0,
          eventsCount: hasWhatsapp ? 22 : 0,
          subscribedEvents: ["Despachos Asignados", "Alertas de Desvío Vial"],
          missingCredentials: hasWhatsapp ? [] : ["WHATSAPP_API_TOKEN", "WHATSAPP_PHONE_ID"],
          createdAt: null,
          topics: ["logistics", "dispatch"],
        },
      ];

      // Integrar canales adicionales de base de datos si existen
      const catalogTypes = new Set(catalogChannels.map((c) => c.type));
      const extraDbChannels = dbChannels
        .filter((c) => !catalogTypes.has(c.type))
        .map((c) => ({
          id: c.id,
          type: c.type,
          name: c.name,
          description: `Canal personalizado guardado en base de datos.`,
          destination: String(asRecord(c.config).webhookUrl || asRecord(c.config).email || "Configurado en BD"),
          isActive: c.isActive,
          available: isChannelConfigured(c.type, asRecord(c.config)),
          source: "database" as const,
          latencyMs: 50,
          eventsCount: 0,
          subscribedEvents: Array.isArray(asRecord(c.config).topics) ? asRecord(c.config).topics : ["critical"],
          missingCredentials: isChannelConfigured(c.type, asRecord(c.config)) ? [] : ["Credenciales incompletas"],
          createdAt: c.createdAt?.toISOString?.() ?? null,
          topics: Array.isArray(asRecord(c.config).topics) ? asRecord(c.config).topics : [],
        }));

      const data = [...catalogChannels, ...extraDbChannels];
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

    if (channelId === "chan_slack_env" && !process.env.SLACK_WEBHOOK_URL) {
      return reply.status(400).send({
        success: false,
        error: "Canal Slack no disponible: falta configurar SLACK_WEBHOOK_URL en el archivo .env.",
      });
    }
    if (channelId === "chan_email_env" && !process.env.RESEND_API_KEY && !process.env.SMTP_HOST) {
      return reply.status(400).send({
        success: false,
        error: "Canal Correo no disponible: falta configurar RESEND_API_KEY o SMTP_HOST en el archivo .env.",
      });
    }
    if (channelId === "chan_whatsapp_env" && (!process.env.WHATSAPP_API_TOKEN || !process.env.WHATSAPP_PHONE_ID)) {
      return reply.status(400).send({
        success: false,
        error: "Canal WhatsApp no disponible: falta configurar WHATSAPP_API_TOKEN y WHATSAPP_PHONE_ID en el archivo .env.",
      });
    }

    try {
      const channel = (await resolveActiveChannels(currentSession.companyId))
        .find((item) => item.id === channelId);
      if (!channel) {
        return reply.status(404).send({ success: false, error: "No se encontró el canal configurado en el servidor." });
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
