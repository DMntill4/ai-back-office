import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  loginUser,
  registerUser,
  ROLE_PERMISSIONS,
  revokeTeamMemberAccess,
  transferOrganizationOwnership,
  db,
  companies,
  users,
  auditIncidents,
} from "@mint/core";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export interface SessionState {
  companyId: string;
  companyName: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  currency: string;
  setupCompleted: boolean;
}

// Estado de sesión inicial sin asumir ninguna empresa ficticia configurada (Parte 2 Sección 4)
export let currentSession: SessionState = {
  companyId: "comp_default",
  companyName: "SIN ORGANIZACIÓN CONFIGURADA (Onboarding Pendiente)",
  userId: "usr_unconfigured",
  userName: "Operador Local",
  userEmail: "onboarding@mint.local",
  role: "owner",
  currency: "MXN",
  setupCompleted: false,
};

export async function authRoutes(fastify: FastifyInstance) {
  // 1. Iniciar sesión con verificación estricta de credenciales (CERO bypass de contraseña)
  fastify.post("/api/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const email = (body.email || "").trim();
    const password = body.password;

    if (!email) {
      return reply.status(400).send({
        success: false,
        error: "Se requiere correo electrónico para iniciar sesión.",
      });
    }

    const result = await loginUser({ email, password });
    if (result.success && result.user) {
      currentSession = {
        companyId: result.user.companyId,
        companyName: result.user.companyName,
        userId: result.user.id,
        userName: result.user.name,
        userEmail: result.user.email,
        role: result.user.role,
        currency: "MXN",
        setupCompleted: result.user.setupCompleted,
      };
      return {
        success: true,
        token: result.token,
        user: result.user,
      };
    }

    return reply.status(401).send({
      success: false,
      error: result.error || "Credenciales inválidas o acceso revocado.",
    });
  });

  // 2. Registro de nueva empresa y operador
  fastify.post("/api/auth/register", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    if (!body.name || !body.email || !body.companyName) {
      return reply.status(400).send({
        success: false,
        error: "Nombre, correo y nombre de empresa son requeridos.",
      });
    }

    try {
      const res = await registerUser({
        name: body.name,
        email: body.email,
        password: body.password,
        companyName: body.companyName,
        role: body.role || "owner",
      });
      if (res.success && res.user) {
        currentSession = {
          companyId: res.user.companyId,
          companyName: res.user.companyName,
          userId: res.user.id,
          userName: res.user.name,
          userEmail: res.user.email,
          role: res.user.role,
          currency: "COP",
          setupCompleted: false,
        };
      }
      return res;
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 3. Obtener sesión activa
  fastify.get("/api/session", async () => {
    let allCompanies: Array<{ id: string; name: string }> = [];
    try {
      const comps = await db.select().from(companies);
      if (comps.length > 0) {
        allCompanies = comps.map((c) => ({ id: c.id, name: c.name }));
      }
    } catch {}

    if (allCompanies.length === 0) {
      allCompanies = [{ id: currentSession.companyId, name: currentSession.companyName }];
    }

    return {
      success: true,
      session: currentSession,
      companies: allCompanies,
    };
  });

  // 4. Cambiar empresa o sesión activa (con protección contra escalamiento de privilegios)
  fastify.post("/api/session", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};

    // Impedir que un rol no privilegiado se auto-escale a owner/admin/supervisor
    const currentRoleNorm = (currentSession.role || "viewer").toLowerCase();
    const requestedRoleNorm = body.role ? String(body.role).toLowerCase() : null;
    const isPrivilegedCurrent = currentRoleNorm === "owner" || currentRoleNorm === "admin";

    if (requestedRoleNorm && requestedRoleNorm !== currentRoleNorm && !isPrivilegedCurrent) {
      await db
        .insert(auditIncidents)
        .values({
          id: `inc_esc_${randomUUID().slice(0, 8)}`,
          companyId: currentSession.companyId,
          incidentType: "VIOLACION_RBAC",
          severity: "CRITICA",
          title: `Intento de escalamiento de privilegios bloqueado (${currentRoleNorm} -> ${requestedRoleNorm})`,
          details: `El usuario '${currentSession.userEmail}' con rol '${currentRoleNorm}' intentó cambiar su rol de sesión a '${requestedRoleNorm}' sin autorización.`,
          status: "DETECTADO",
          createdAt: new Date(),
        })
        .catch(() => {});

      return reply.status(403).send({
        success: false,
        error: `ESCALAMIENTO DE PRIVILEGIOS BLOQUEADO: El rol actual '${currentRoleNorm}' no tiene autoridad para cambiar su propio rol a '${requestedRoleNorm}'.`,
      });
    }

    if (body.companyId) {
      // Si hay un usuario autenticado real, verificar aislamiento multi-organización
      if (currentSession.userId && currentSession.userId !== "usr_unconfigured" && !isPrivilegedCurrent) {
        const [membership] = await db
          .select()
          .from(users)
          .where(and(eq(users.id, currentSession.userId), eq(users.companyId, body.companyId)))
          .limit(1);
        if (!membership) {
          return reply.status(403).send({
            success: false,
            error: `AISLAMIENTO MULTI-ORGANIZACIÓN: El usuario '${currentSession.userEmail}' no pertenece a la organización '${body.companyId}'.`,
          });
        }
      }
      currentSession.companyId = body.companyId;
      if (body.companyName) {
        currentSession.companyName = body.companyName;
      }
    }
    if (requestedRoleNorm) {
      currentSession.role = requestedRoleNorm;
    }
    return { success: true, session: currentSession };
  });

  // 5. Revocar acceso de empleado (Parte 2 Sección 1 y 10)
  fastify.post("/api/auth/revoke", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const res = await revokeTeamMemberAccess({
      companyId: body.companyId || currentSession.companyId,
      targetUserId: body.targetUserId,
      actorRole: body.actorRole || currentSession.role,
      reason: body.reason,
    });
    if (!res.success) {
      return reply.status(403).send(res);
    }
    return res;
  });

  // 6. Transferir propiedad de la organización (Parte 2 Sección 1 y 10)
  fastify.post("/api/auth/transfer-ownership", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const res = await transferOrganizationOwnership({
      companyId: body.companyId || currentSession.companyId,
      currentOwnerUserId: body.currentOwnerUserId || currentSession.userId,
      newOwnerUserId: body.newOwnerUserId,
    });
    if (!res.success) {
      return reply.status(403).send(res);
    }
    return res;
  });

  // 7. Roles y permisos del sistema
  fastify.get("/api/auth/roles", async () => {
    return {
      success: true,
      roles: ROLE_PERMISSIONS,
    };
  });
}
