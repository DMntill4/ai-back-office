import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { companies } from "./business";

// 1. Casos recibidos y gestionados por el agente
export const cases = pgTable("cases", {
  id: text("id").primaryKey(), // ej: case_abc123 o uuid
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status", {
    enum: ["recibido", "en_proceso", "resuelto", "escalado"],
  })
    .notNull()
    .default("recibido"),
  priority: text("priority", {
    enum: ["baja", "media", "alta", "urgente"],
  })
    .notNull()
    .default("media"),
  inputData: jsonb("input_data").default({}), // correo, ticket, payload original
  resultSummary: text("result_summary"), // resumen de resolución o motivo de escalado
  resolutionReason: text("resolution_reason"),
  totalCost: decimal("total_cost", { precision: 10, scale: 6 }).default("0"), // Dinero siempre en decimal
  totalTokens: integer("total_tokens").default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

// 2. Línea de tiempo inmutable de eventos por caso (Append-only)
export const caseEvents = pgTable("case_events", {
  id: text("id").primaryKey(),
  caseId: text("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  eventType: text("event_type").notNull(), // 'recibido', 'pensamiento', 'herramienta_ejecutada', etc.
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 3. Registro detallado de cada llamada a Grok / LLM (tokens, tiempo y costo)
export const llmCalls = pgTable("llm_calls", {
  id: text("id").primaryKey(),
  caseId: text("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  cachedTokens: integer("cached_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  latencyMs: integer("latency_ms").notNull(),
  cost: decimal("cost", { precision: 10, scale: 6 }).notNull().default("0"), // Costo medido en decimal
  finishReason: varchar("finish_reason", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 4. Registro de ejecución y verificación de herramientas
export const toolCalls = pgTable("tool_calls", {
  id: text("id").primaryKey(),
  caseId: text("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  toolName: varchar("tool_name", { length: 100 }).notNull(),
  inputArgs: jsonb("input_args").notNull().default({}),
  outputResult: jsonb("output_result"),
  isSuccess: boolean("is_success").notNull().default(true),
  errorMessage: text("error_message"),
  verified: boolean("verified").notNull().default(false), // Verificación post-escritura
  verificationDetails: text("verification_details"),
  durationMs: integer("duration_ms").notNull().default(0),
  idempotencyKey: varchar("idempotency_key", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 5. Claves de idempotencia para prevenir acciones duplicadas
export const idempotencyKeys = pgTable("idempotency_keys", {
  key: varchar("key", { length: 255 }).primaryKey(),
  caseId: text("case_id").references(() => cases.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(),
  requestHash: varchar("request_hash", { length: 255 }),
  response: jsonb("response").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 6. Solicitudes de aprobación humana ante acciones que superan límites de compra
export const approvals = pgTable("approvals", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  caseId: text("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  actionType: varchar("action_type", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // Importe en decimal
  currency: varchar("currency", { length: 10 }).notNull().default("MXN"),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["pendiente", "aprobado", "rechazado"] })
    .notNull()
    .default("pendiente"),
  requestedAt: timestamp("requested_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedBy: varchar("decided_by", { length: 100 }),
});
