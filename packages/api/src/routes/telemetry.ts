import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { wsTelemetryHub } from "../telemetry/wsHub";
import { telemetryPublisher } from "@mint/core";

export const telemetryRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // 1. Endpoint WebSocket Nativo para Streaming en Tiempo Real
  server.get(
    "/ws/telemetry",
    { websocket: true },
    (socket /* WebSocket.WebSocket */, req) => {
      wsTelemetryHub.registerClient(socket);
    }
  );

  // 2. Historial de Eventos Recientes
  server.get("/api/telemetry/history", async (req, reply) => {
    const events = telemetryPublisher.getRecentEvents(50);
    return reply.send({
      success: true,
      count: events.length,
      events,
    });
  });

  // 2.1 Resumen FinOps: consumo acumulado de tokens y costo USD por tarea
  server.get("/api/telemetry/costs", async (req, reply) => {
    const events = telemetryPublisher.getRecentEvents(250);
    const costEvents = events.filter((e) => e.action === "meter" && e.cost);

    const byTask = new Map<
      string,
      {
        taskId: string;
        tokens: number;
        costUsd: number;
        promptTokens: number;
        completionTokens: number;
        model: string;
        lastAt: number;
      }
    >();
    let totalTokens = 0;
    let totalCostUsd = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    for (const ev of costEvents) {
      const c = ev.cost!;
      totalTokens += c.tokens || 0;
      totalCostUsd += c.costUsd || 0;
      totalPromptTokens += c.promptTokens || 0;
      totalCompletionTokens += c.completionTokens || 0;
      const prev = byTask.get(c.taskId);
      byTask.set(c.taskId, {
        taskId: c.taskId,
        tokens: (prev?.tokens || 0) + (c.tokens || 0),
        costUsd: (prev?.costUsd || 0) + (c.costUsd || 0),
        promptTokens: (prev?.promptTokens || 0) + (c.promptTokens || 0),
        completionTokens: (prev?.completionTokens || 0) + (c.completionTokens || 0),
        model: c.model || prev?.model || "unknown",
        lastAt: ev.timestamp,
      });
    }

    return reply.send({
      success: true,
      session: {
        totalTokens,
        totalCostUsd: Number(totalCostUsd.toFixed(6)),
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        taskCount: byTask.size,
      },
      tasks: Array.from(byTask.values()).sort((a, b) => b.lastAt - a.lastAt),
    });
  });

}
