import { FastifyInstance } from "fastify";
import { checkDatabaseHealth, db, users, companies } from "@mint/core";
import { eq } from "drizzle-orm";
import { currentSession } from "./auth";

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

  // 3. Miembros del equipo (RBAC)
  fastify.get("/api/team", async () => {
    try {
      const allUsers = await db
        .select()
        .from(users)
        .where(eq(users.companyId, currentSession.companyId));

      return {
        success: true,
        team: allUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
        })),
      };
    } catch {
      return {
        success: true,
        team: [
          {
            id: currentSession.userId,
            name: currentSession.userName,
            email: currentSession.userEmail,
            role: currentSession.role,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }
  });
}
