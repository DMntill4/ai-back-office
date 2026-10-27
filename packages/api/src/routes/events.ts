import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { runFullOperationalEventScan } from "@mint/core";
import { sseHub } from "../events/sseHub";
import { currentSession } from "./auth";

export async function eventsRoutes(fastify: FastifyInstance) {
  // 1. Canal de Streaming en Vivo (Server-Sent Events)
  fastify.get("/api/events/stream", async (request: FastifyRequest, reply: FastifyReply) => {
    sseHub.registerClient(request, reply);
  });

  // 2. Últimos eventos en memoria (Polling fallback o carga inicial)
  fastify.get("/api/events/live", async (request: FastifyRequest) => {
    const query = (request.query as any) || {};
    const limit = Number(query.limit) || 30;

    return {
      success: true,
      activeClients: sseHub.getActiveClientsCount(),
      events: sseHub.getRecentHistory(limit),
    };
  });

  // 3. Disparar escaneo operativo manual (Scan)
  fastify.post("/api/events/scan", async (request: FastifyRequest) => {
    const body = (request.body as any) || {};
    const companyId = body.companyId || currentSession.companyId;

    sseHub.broadcast({
      type: "scan_started",
      agent: "Motor de Ingesta y Vigilancia",
      action: "scan",
      details: "Iniciando escaneo relacional exhaustivo de existencias y guías logísticas...",
      payload: { companyId },
    });

    try {
      const scanResult = await runFullOperationalEventScan(companyId);

      sseHub.broadcast({
        type: "scan_completed",
        agent: "Motor de Ingesta y Vigilancia",
        action: "scan_results",
        details: `Escaneo completado. Quiebres: ${scanResult.stockDeficitsFound}, Envíos demorados: ${scanResult.delayedShipmentsFound}`,
        resultSummary: `${scanResult.processedDecisions.length} propuestas generadas en /inbox`,
        payload: scanResult,
      });

      return {
        success: true,
        ...scanResult,
      };
    } catch (err: any) {
      return {
        success: false,
        stockDeficitsFound: 0,
        delayedShipmentsFound: 0,
        eventsTriggered: 0,
        processedDecisions: [],
        error: err.message,
      };
    }
  });
}
