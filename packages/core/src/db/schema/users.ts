import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { companies } from "./business";

// Roles locales dentro de la base de datos de la empresa cargada (companyId):
// - owner: Dueño/propietario de la empresa, control total, umbrales y carga de datos.
// - admin: Administrador local del negocio dentro de la empresa cargada (no es un admin global).
// - supervisor: Supervisor de operaciones del negocio, autorización HITL y gestión operativa.
// - operator: Operador de inventario, despacho, recepción y seguimiento.
// - client: Cliente o destinatario registrado en la empresa (consulta de sus pedidos).
// - driver: Conductor / transportista asignado a rutas de entrega.
// - auditor: Auditor / supervisor HITL para validación de decisiones y eventos inmutables.
// - finance: Control de tesorería, dispersión y pagos a proveedores.
// - viewer: Consultor con acceso de solo lectura a métricas e inventario.
//
// NOTA ARQUITECTONICA: Todos los usuarios pertenecen estrictamente a una empresa especifica
// mediante 'company_id'. No existe ningun 'admin global' ni usuarios con privilegios globales.
export const users = pgTable("users", {
  id: text("id").primaryKey(), // ej: 'usr_abc123' o uuid
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  role: text("role", {
    enum: [
      "owner",
      "admin",
      "supervisor",
      "operator",
      "driver",
      "viewer",
      "auditor",
      "finance",
      "client",
    ],
  })
    .notNull()
    .default("owner"),
  setupCompleted: boolean("setup_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
