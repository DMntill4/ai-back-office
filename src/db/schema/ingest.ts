import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { companies } from "./business";

// 1. Fuentes de Datos Conectadas
export const dataSources = pgTable("data_sources", {
  id: text("id").primaryKey(), // ej: src_csv_almacen_norte
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  name: text("name").notNull(),
  sourceType: varchar("source_type", { length: 32 }).notNull(), // 'csv', 'excel', 'postgres_readonly'
  uriOrPath: text("uri_or_path").notNull(),
  config: jsonb("config").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 2. Trabajos de Importación de Datos
export const importJobs = pgTable("import_jobs", {
  id: text("id").primaryKey(), // ej: job_imp_998
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  dataSourceId: text("data_source_id").references(() => dataSources.id, {
    onDelete: "set null",
  }),
  status: varchar("status", { length: 32 }).notNull().default("PENDING"), // 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
  targetEntity: varchar("target_entity", { length: 64 }).notNull(), // 'products_inventory', 'suppliers', 'shipments'
  totalRows: integer("total_rows").notNull().default(0),
  importedRows: integer("imported_rows").notNull().default(0),
  failedRows: integer("failed_rows").notNull().default(0),
  columnMapping: jsonb("column_mapping").notNull().default({}),
  errorsPayload: jsonb("errors_payload").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// 3. Plantillas de Mapeo de Columnas Reutilizables
export const importTemplates = pgTable("import_templates", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  name: text("name").notNull(),
  targetEntity: varchar("target_entity", { length: 64 }).notNull(),
  mappings: jsonb("mappings").notNull(),
  sampleHeaders: jsonb("sample_headers").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
