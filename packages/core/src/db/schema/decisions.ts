import {
  pgTable,
  text,
  varchar,
  decimal,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { companies } from "./business";
import { cases } from "./agent";

// 1. Tabla inmutable de Decisiones y Propuestas Multi-Agente
export const decisions = pgTable("decisions", {
  id: text("id").primaryKey(), // ej: dec_9921_stock_valve
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  caseId: text("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  actionType: varchar("action_type", { length: 64 }).notNull(), // 'crear_orden_compra', 'reasignar_envio', 'ajustar_stock', 'cancelar_orden'
  proposingAgent: varchar("proposing_agent", { length: 64 }).notNull(), // 'compras_agent', 'inventario_agent', 'transporte_agent', 'coordinador'
  title: text("title").notNull(),
  costMxn: decimal("cost_mxn", { precision: 12, scale: 2 }).notNull().default("0"),
  riskScore: decimal("risk_score", { precision: 4, scale: 3 }).notNull().default("0"),
  reversible: boolean("reversible").notNull().default(false),
  evidencePayload: jsonb("evidence_payload").notNull().default({}),
  riskPayload: jsonb("risk_payload").notNull().default({}),
  policyDecision: text("policy_decision", {
    enum: ["auto_executed", "pending_approval", "approved", "rejected", "blocked"],
  })
    .notNull()
    .default("pending_approval"),
  policyReason: text("policy_reason"),
  approvedBy: varchar("approved_by", { length: 100 }),
  requesterUserId: varchar("requester_user_id", { length: 100 }),
  supervisorNotified: boolean("supervisor_notified").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  feedback: text("feedback"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  executionResult: jsonb("execution_result"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 2. Cola de Eventos Operativos Reales (Event Ingestion)
export const operationalEvents = pgTable("operational_events", {
  id: text("id").primaryKey(), // ej: ev_stock_prod_st200
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  eventType: varchar("event_type", { length: 64 }).notNull(), // 'STOCK_CRITICAL', 'SHIPMENT_DELAY', 'PRICE_ANOMALY', 'DAILY_BRIEFING'
  severity: varchar("severity", { length: 16 }).notNull().default("MEDIUM"), // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  status: varchar("status", { length: 32 }).notNull().default("PENDING"), // 'PENDING', 'PROCESSING', 'RESOLVED', 'DISMISSED'
  caseId: text("case_id").references(() => cases.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

// 3. Reglas y Aprendizaje de Políticas por Empresa
export const policyRules = pgTable("policy_rules", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  ruleType: varchar("rule_type", { length: 64 }).notNull(),
  conditions: jsonb("conditions").notNull().default({}),
  action: varchar("action", { length: 32 }).notNull().default("REQUIRE_APPROVAL"), // 'REQUIRE_APPROVAL', 'BLOCK', 'ALLOW'
  learnedFromDecisions: jsonb("learned_from_decisions").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
