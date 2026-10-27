import { FastifyInstance } from "fastify";
import { apiDaemonRunner } from "../daemon/daemonRunner";

export async function daemonRoutes(fastify: FastifyInstance) {
  // 1. Estado del daemon en el proceso de la API
  fastify.get("/api/daemon/status", async () => {
    return {
      success: true,
      daemon: apiDaemonRunner.getStatus(),
    };
  });

  // 2. Pausar ciclo de auditoría
  fastify.post("/api/daemon/pause", async () => {
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
