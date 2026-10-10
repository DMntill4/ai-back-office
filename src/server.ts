import Fastify from "fastify";
import cors from "@fastify/cors";
import { runAgentLoop } from "./agent/loop";
import { db } from "./db/client";
import { randomUUID } from "node:crypto";

const server = Fastify({ logger: true });
server.register(cors);

server.post("/api/chat", async (request, reply) => {
  const { message, caseId: providedCaseId } = request.body as any;
  const caseId = providedCaseId || `chat_${randomUUID()}`;

  // Registramos el caso si no existe para que loop.ts lo pueda leer
  await db.insert(require("./db/schema").cases).values({
    id: caseId,
    title: "Chat Frontend (API)",
    description: message,
    status: "en_proceso",
    priority: "normal",
  }).onConflictDoNothing();

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
        iterations: result.totalSteps
      }
    });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: "Agent error" });
  }
});

import { getPendingApprovals, resolveApproval, getSupplierPerformance } from "./services/inventoryService";

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
    console.log("Servidor HTTP corriendo en http://localhost:3001");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
