import { db } from "../db/client";
import { users, companies } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "operator" | "auditor" | "viewer";
  companyId: string;
  companyName: string;
  createdAt: string;
}

export async function listTeamMembers(companyId: string): Promise<TeamMember[]> {
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      companyId: users.companyId,
      companyName: companies.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(companies, eq(users.companyId, companies.id))
    .where(eq(users.companyId, companyId))
    .orderBy(users.createdAt);

  return members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role as any,
    companyId: m.companyId,
    companyName: m.companyName,
    createdAt: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString(),
  }));
}

export async function inviteTeamMember(params: {
  companyId: string;
  email: string;
  name: string;
  role?: "owner" | "operator" | "auditor" | "viewer";
}): Promise<{ success: boolean; member?: TeamMember; message: string }> {
  const role = params.role || "operator";
  const email = params.email.trim().toLowerCase();

  // Verificar si ya existe usuario con ese correo
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return {
      success: false,
      message: `El correo '${email}' ya está registrado en el sistema.`,
    };
  }

  // Verificar que la empresa exista
  const company = await db.select().from(companies).where(eq(companies.id, params.companyId)).limit(1);
  if (company.length === 0) {
    return {
      success: false,
      message: `La empresa con ID '${params.companyId}' no existe.`,
    };
  }

  const newId = `usr_${randomUUID().slice(0, 8)}`;
  await db.insert(users).values({
    id: newId,
    companyId: params.companyId,
    email,
    name: params.name.trim(),
    role,
    setupCompleted: true,
  });

  return {
    success: true,
    message: `Miembro '${params.name}' invitado con éxito a ${company[0].name} con rol ${role.toUpperCase()}.`,
    member: {
      id: newId,
      name: params.name.trim(),
      email,
      role,
      companyId: params.companyId,
      companyName: company[0].name,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function updateTeamMemberRole(params: {
  companyId: string;
  userId: string;
  newRole: "owner" | "operator" | "auditor" | "viewer";
}): Promise<{ success: boolean; message: string }> {
  const result = await db
    .update(users)
    .set({ role: params.newRole })
    .where(and(eq(users.id, params.userId), eq(users.companyId, params.companyId)));

  return {
    success: true,
    message: `Rol actualizado a ${params.newRole.toUpperCase()} para el usuario ${params.userId}.`,
  };
}

export async function removeTeamMember(params: {
  companyId: string;
  userId: string;
}): Promise<{ success: boolean; message: string }> {
  // Asegurar que no se elimine el último propietario de la empresa
  const owners = await db
    .select()
    .from(users)
    .where(and(eq(users.companyId, params.companyId), eq(users.role, "owner")));

  const target = await db
    .select()
    .from(users)
    .where(and(eq(users.id, params.userId), eq(users.companyId, params.companyId)))
    .limit(1);

  if (target.length === 0) {
    return { success: false, message: `Usuario '${params.userId}' no encontrado en la empresa.` };
  }

  if (target[0].role === "owner" && owners.length <= 1) {
    return {
      success: false,
      message: "No puedes eliminar al único propietario (owner) de la organización.",
    };
  }

  await db
    .delete(users)
    .where(and(eq(users.id, params.userId), eq(users.companyId, params.companyId)));

  return {
    success: true,
    message: `Miembro '${target[0].name}' (${target[0].email}) eliminado de la organización.`,
  };
}
