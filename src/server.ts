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
