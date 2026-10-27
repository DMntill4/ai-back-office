import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  listNotificationChannels,
  addNotificationChannel,
  testNotificationChannel,
} from "@mint/notifiers";
import { currentSession } from "./auth";

export async function channelsRoutes(fastify: FastifyInstance) {
  // 1. Listar canales de notificación
  fastify.get("/api/channels", async (request: FastifyRequest) => {
    const query = (request.query as any) || {};
    const companyId = query.companyId || currentSession.companyId;

    try {
      const channels = await listNotificationChannels(companyId);
      return { success: true, channels };
    } catch {
      return { success: true, channels: [] };
    }
  });

  // 2. Crear canal de notificación
  fastify.post("/api/channels", async (request: FastifyRequest, reply: FastifyReply) => {
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
    const body = (request.body as any) || {};
    const { type, config, topic } = body;

    if (!type || !config) {
      return reply.status(400).send({ success: false, error: "Tipo y configuración requeridos." });
    }

    try {
      const res = await testNotificationChannel(type, {
        ...config,
        testTopic: topic || "Alerta de Prueba Consola de Operaciones",
      });
      return { success: true, result: res };
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
}
