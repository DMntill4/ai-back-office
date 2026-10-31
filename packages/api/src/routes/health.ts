import { FastifyInstance } from "fastify";
import { checkDatabaseHealth } from "@mint/core";

export async function healthRoutes(fastify: FastifyInstance) {
  // 1. Healthcheck general
  fastify.get("/health", async () => {
    return {
      status: "ok",
      service: "@mint/api",
      version: "2.5.0",
      timestamp: new Date().toISOString(),
    };
  });

  // 2. Estado de conexión con PostgreSQL / Supabase
  fastify.get("/api/db/status", async () => {
    const health = await checkDatabaseHealth();
    return {
      success: true,
      data: {
        connected: health.connected,
        provider: "PostgreSQL 16 (Drizzle ORM)",
        database: "ai_back_office",
        timestamp: new Date().toISOString(),
        tablesCount: health.tablesCount,
        tables: health.tables,
        error: health.error,
      },
    };
  });

}
