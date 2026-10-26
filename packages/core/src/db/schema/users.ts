import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { companies } from "./business";

// Roles del sistema:
// - owner: Control total, customización del bot, umbrales y carga de BD SQL.
// - operator: Consultas de stock, órdenes de compra y seguimiento de envíos.
// - auditor: Aprobación Human-in-the-Loop, auditoría de logs inmutables y anomalías.
// - viewer: Solo lectura de dashboards, existencias y métricas.
export const users = pgTable("users", {
  id: text("id").primaryKey(), // ej: 'usr_abc123' o uuid
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  role: text("role", {
    enum: ["owner", "admin", "operator", "driver", "viewer", "auditor"],
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
