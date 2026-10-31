import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  db,
  users,
  inviteTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  ROLE_PERMISSIONS,
  type UserRole,
} from "@mint/core";
import { eq } from "drizzle-orm";
import { currentSession } from "./auth";

function canManageTeam(reply: FastifyReply): boolean {
  if (ROLE_PERMISSIONS[currentSession.role as UserRole]?.canManageTeam) return true;
  reply.code(403);
  return false;
}

export async function teamRoutes(fastify: FastifyInstance) {
  fastify.get("/api/team", async (request, reply) => {
    if (!canManageTeam(reply)) {
      return { success: false, data: [], message: "No tienes permiso para consultar el equipo." };
    }

    try {
      const members = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          hasPassword: users.passwordHash,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.companyId, currentSession.companyId))
        .orderBy(users.createdAt);

      return {
        success: true,
        count: members.length,
        data: members.map((member) => {
          const permissions = ROLE_PERMISSIONS[member.role as UserRole];
          return {
            ...member,
            hasPassword: Boolean(member.hasPassword),
            permissions: Object.entries(permissions ?? {})
              .filter(([key, enabled]) => key.startsWith("can") && enabled)
              .map(([key]) => key),
          };
        }),
      };
    } catch (error) {
      request.log.error({ err: error }, "Failed to query team members");
      reply.code(503);
      return {
        success: false,
        data: [],
        message: "No fue posible consultar los usuarios del equipo en la base de datos.",
      };
    }
  });

  fastify.post("/api/team", async (request, reply) => {
    if (!canManageTeam(reply)) {
      return { success: false, message: "No tienes permiso para agregar usuarios al equipo." };
    }

    const body = (request.body as Record<string, unknown>) || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = typeof body.role === "string" ? body.role : "operator";

    if (!name || !email || !password) {
      return reply.code(400).send({ success: false, message: "Nombre, correo y contraseña son obligatorios." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply.code(400).send({ success: false, message: "Ingresa un correo electrónico válido." });
    }
    if (password.length < 12) {
      return reply.code(400).send({ success: false, message: "La contraseña inicial debe tener al menos 12 caracteres." });
    }
    if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) {
      return reply.code(400).send({ success: false, message: "El rol seleccionado no es válido." });
    }
    if ((role === "owner" || role === "admin") && currentSession.role !== "owner") {
      return reply.code(403).send({ success: false, message: "Solo el propietario puede crear administradores o propietarios." });
    }

    try {
      const result = await inviteTeamMember({
        companyId: currentSession.companyId,
        email,
        name,
        password,
        role: role as UserRole,
      });
      if (!result.success) return reply.code(409).send(result);
      return reply.code(201).send(result);
    } catch (error) {
      request.log.error({ err: error }, "Failed to create team member");
      return reply.code(503).send({
        success: false,
        message: "No fue posible crear el usuario en la base de datos.",
      });
    }
  });

  fastify.patch("/api/team/:id/role", async (request, reply) => {
    if (!canManageTeam(reply)) {
      return { success: false, message: "No tienes permiso para modificar roles." };
    }

    const { id } = request.params as { id: string };
    const { role } = (request.body as { role?: unknown }) || {};
    if (id === currentSession.userId) {
      return reply.code(400).send({ success: false, message: "No puedes cambiar tu propio rol desde esta pantalla." });
    }
    if (typeof role !== "string" || !Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) {
      return reply.code(400).send({ success: false, message: "El rol seleccionado no es válido." });
    }
    if (
      (role === "owner" || role === "admin") &&
      currentSession.role !== "owner"
    ) {
      return reply.code(403).send({ success: false, message: "Solo el propietario puede asignar roles de propietario o administrador." });
    }

    try {
      const result = await updateTeamMemberRole({
        companyId: currentSession.companyId,
        userId: id,
        newRole: role as UserRole,
      });
      return reply.code(result.success ? 200 : 409).send(result);
    } catch (error) {
      request.log.error({ err: error }, "Failed to update team member role");
      return reply.code(503).send({ success: false, message: "No fue posible actualizar el rol." });
    }
  });

  fastify.delete("/api/team/:id", async (request, reply) => {
    if (!canManageTeam(reply)) {
      return { success: false, message: "No tienes permiso para eliminar usuarios del equipo." };
    }

    const { id } = request.params as { id: string };
    if (id === currentSession.userId) {
      return reply.code(400).send({ success: false, message: "No puedes eliminar tu propio acceso." });
    }

    try {
      const [target] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (target?.role === "owner" && currentSession.role !== "owner") {
        return reply.code(403).send({ success: false, message: "Solo el propietario puede eliminar otro acceso de propietario." });
      }
      const result = await removeTeamMember({ companyId: currentSession.companyId, userId: id });
      return reply.code(result.success ? 200 : 409).send(result);
    } catch (error) {
      request.log.error({ err: error }, "Failed to remove team member");
      return reply.code(503).send({ success: false, message: "No fue posible eliminar el usuario." });
    }
  });
}
