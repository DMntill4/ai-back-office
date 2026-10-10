import Fastify from "fastify";
import cors from "@fastify/cors";
import { runAgentLoop } from "./agent/loop";
import { db } from "./db/client";
import { randomUUID } from "node:crypto";
import { getActiveProactiveAlerts, runProactiveAuditCycle } from "./worker/proactiveMonitor";
import { getPendingApprovals, resolveApproval, getSupplierPerformance } from "./services/inventoryService";

const server = Fastify({ logger: true });
server.register(cors);

// Health check endpoint
server.get("/health", async () => {
  return { status: "ok", service: "mint-ai-back-office", timestamp: new Date().toISOString() };
});

// Endpoint principal de chat para conectividad con el Frontend personalizado
server.post("/api/chat", async (request, reply) => {
  const body = (request.body as any) || {};
  const message = body.message;
  if (!message || typeof message !== "string") {
    return reply.status(400).send({ success: false, error: "El parámetro 'message' es obligatorio." });
  }

  const caseId = body.caseId || `chat_${randomUUID()}`;

  try {
    await db
      .insert(require("./db/schema").cases)
      .values({
        id: caseId,
        title: "Chat Frontend (API)",
        description: message,
        status: "en_proceso",
        priority: "normal",
      })
      .onConflictDoNothing();
  } catch {
    // Fallback silencioso si Postgres no está conectado
  }

  try {
    const result = await runAgentLoop(caseId);

    return reply.send({
      success: true,
      caseId,
      response: result.summary,
      status: result.status,
      metrics: {
        totalCostUsd: result.totalCost,
        totalTokens: result.totalTokens,
        iterations: result.totalSteps,
      },
    });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: "Agent error", details: (error as Error).message });
  }
});

// Endpoints del Motor Proactivo listo en Standby para el Frontend del Usuario
server.get("/api/v1/alerts/proactive", async () => {
  const alerts = getActiveProactiveAlerts();
  return {
    success: true,
    total: alerts.length,
    alerts,
  };
});

server.post("/api/v1/alerts/trigger-audit", async () => {
  const newAlerts = await runProactiveAuditCycle();
  return {
    success: true,
    alertasGeneradas: newAlerts.length,
    alertas: newAlerts,
  };
});

server.get("/api/dashboard", async (request, reply) => {
  const performance = await getSupplierPerformance();
  return reply.send({
    success: true,
    data: {
      performance,
      dailyReport: {
        totalOrders: 156,
        automated: 142,
        pendingReview: 14,
        savings: 1840,
        spend: 4.20
      }
    }
  });
});

server.get("/api/approvals", async (request, reply) => {
  const pending = await getPendingApprovals();
  return reply.send({
    success: true,
    data: pending
  });
});

server.post("/api/approvals/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { action } = request.body as { action: "aprobado" | "rechazado" };
  const result = await resolveApproval(id, action);
  
  if (!result.success) {
    return reply.status(404).send(result);
  }

  // Si aprueban una orden de más de $10,000, podemos emitir una notificación
  // Aquí podríamos emitir el evento a WebSocket o hacer algo
  
  return reply.send(result);
});

const start = async () => {
  try {
    await server.listen({ port: 3001, host: "0.0.0.0" });
    console.log("🚀 Servidor HTTP MINT corriendo en http://localhost:3001");
    console.log("📡 Endpoints proactivos listos en Standby para Frontend personalizado:");
    console.log("   - POST /api/chat");
    console.log("   - GET  /api/v1/alerts/proactive");
    console.log("   - POST /api/v1/alerts/trigger-audit");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
