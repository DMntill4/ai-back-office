import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { hasPermission } from "@mint/core";
import { apiDaemonRunner } from "../daemon/daemonRunner";
import { currentSession } from "./auth";

export async function daemonRoutes(fastify: FastifyInstance) {
  // 1. Estado del daemon en el proceso de la API
  fastify.get("/api/daemon", async () => {
    return {
      success: true,
      daemon: apiDaemonRunner.getStatus(),
    };
  });

  fastify.get("/api/daemon/status", async () => {
    return {
      success: true,
      daemon: apiDaemonRunner.getStatus(),
    };
  });

  // 2. Pausar ciclo de auditoría (restringido a owner/admin)
  fastify.post("/api/daemon/pause", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const callerRole = body.userRole || currentSession.role || "viewer";
    if (!hasPermission(callerRole, "configure_bot")) {
      return reply.status(403).send({
        success: false,
        error: `ACCESO DENEGADO: El rol '${callerRole}' no puede pausar el monitoreo autónomo.`,
      });
    }
    const updated = await apiDaemonRunner.pause();
    return { success: true, daemon: updated };
  });

  // 3. Reanudar ciclo de auditoría
  fastify.post("/api/daemon/resume", async () => {
    const updated = await apiDaemonRunner.resume();
    return { success: true, daemon: updated };
  });

  // 4. Forzar ciclo inmediato
  fastify.post("/api/daemon/tick", async () => {
    const summary = await apiDaemonRunner.tick();
    return { success: true, tick: summary, daemon: apiDaemonRunner.getStatus() };
  });
}
