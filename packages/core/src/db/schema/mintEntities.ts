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

// 1. Mapeo versionado de tablas y columnas de bases de datos preexistentes del cliente
export const mintTableMappings = pgTable("mint_table_mappings", {
  id: text("id").primaryKey(), // ej: 'map_comp_platica_guias_v1'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  sourceTable: varchar("source_table", { length: 128 }).notNull(),
  targetEntity: varchar("target_entity", { length: 64 }).notNull(), // 'shipments', 'orders', 'products', 'customers', 'inventory', 'suppliers'
  columnMappings: jsonb("column_mappings").notNull().default({}),
  isConfirmed: boolean("is_confirmed").notNull().default(false),
  isReadOnly: boolean("is_read_only").notNull().default(true), // Solo lectura por defecto
  writeRoles: jsonb("write_roles").notNull().default([]), // Roles con permiso explícito de escritura
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 2. Banco de Preguntas Pendientes (Truth-in-data: si no existe en BD, MINT no inventa; registra aquí)
export const mintPendingQuestions = pgTable("mint_pending_questions", {
  id: text("id").primaryKey(), // ej: 'q_supp_prod_st200'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  topic: varchar("topic", { length: 64 }).notNull(), // 'supplier_missing', 'cost_missing', 'warehouse_missing', 'route_divergence'
  question: text("question").notNull(),
  context: jsonb("context").notNull().default({}),
  status: varchar("status", { length: 32 }).notNull().default("pending"), // 'pending', 'answered', 'dismissed'
  answer: text("answer"),
  answeredBy: varchar("answered_by", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
});

// 3. Registro de Incidencias de Ruta Logística y Rutas Alternativas Propuestas
export const mintRouteIncidents = pgTable("mint_route_incidents", {
  id: text("id").primaryKey(), // ej: 'inc_ship_001_172900'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  shipmentId: text("shipment_id"),
  trackingNumber: varchar("tracking_number", { length: 100 }).notNull(),
  incidentType: varchar("incident_type", { length: 64 }).notNull(), // 'delay', 'deviation', 'anomalous_stop', 'traffic_incident'
  severity: varchar("severity", { length: 16 }).notNull().default("MEDIUM"),
  currentLocation: text("current_location"),
  delayMinutes: integer("delay_minutes").notNull().default(0),
  previousRoute: jsonb("previous_route").notNull().default({}),
  proposedRoute: jsonb("proposed_route").notNull().default({}),
  status: varchar("status", { length: 32 }).notNull().default("proposed"), // 'proposed', 'approved', 'rejected', 'applied'
  approvedBy: varchar("approved_by", { length: 100 }),
  notifiedParties: jsonb("notified_parties").notNull().default([]), // ['driver', 'operator', 'customer']
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

// 4. Metadatos de Ventas Omnicanal y Webhooks con Firma e Idempotencia
export const mintSalesOrders = pgTable("mint_sales_orders", {
  id: text("id").primaryKey(), // ej: 'order_wh_172900_abc'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  externalOrderId: varchar("external_order_id", { length: 128 }),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  shippingAddress: text("shipping_address").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  channel: varchar("channel", { length: 64 }).notNull().default("web"),
  paymentStatus: varchar("payment_status", { length: 32 }).notNull().default("paid"), // 'paid', 'pending', 'refunded'
  shippingStatus: varchar("shipping_status", { length: 32 }).notNull().default("pending"), // 'pending', 'in_transit', 'delivered', 'cancelled'
  idempotencyKey: varchar("idempotency_key", { length: 255 }).unique(),
  signatureVerified: boolean("signature_verified").notNull().default(false),
  itemsPayload: jsonb("items_payload").notNull().default([]), // [{ productId, sku, name, quantity, unitPrice }]
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 5. Tabla de Cuarentena de Registros Hostiles o Corruptos (Tarea C.4)
export const mintQuarantineRecords = pgTable("mint_quarantine_records", {
  id: text("id").primaryKey(), // ej: 'quar_172900_abc'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  entityType: varchar("entity_type", { length: 64 }).notNull(), // 'products', 'inventory', 'sales', 'shipments', 'suppliers'
  sourceTable: varchar("source_table", { length: 128 }).notNull(),
  recordIdentifier: varchar("record_identifier", { length: 128 }),
  violationType: varchar("violation_type", { length: 64 }).notNull(), // 'negative_value', 'impossible_date', 'orphan_fk', 'outlier', 'corrupt_encoding', 'injection_attempt'
  reason: text("reason").notNull(),
  severity: varchar("severity", { length: 16 }).notNull().default("ERROR"), // 'WARNING', 'ERROR', 'CRITICAL'
  rawPayload: jsonb("raw_payload").notNull().default({}),
  status: varchar("status", { length: 32 }).notNull().default("quarantined"), // 'quarantined', 'reviewed', 'ignored', 'resolved'
  reviewedBy: varchar("reviewed_by", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

// 6. Registro de Decisiones en Modo Sombra (Tarea D.4)
export const mintShadowDecisions = pgTable("mint_shadow_decisions", {
  id: text("id").primaryKey(), // ej: 'shadow_dec_172900'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  actionType: varchar("action_type", { length: 64 }).notNull(),
  proposingAgent: varchar("proposing_agent", { length: 64 }).notNull(),
  title: text("title").notNull(),
  simulatedCost: decimal("simulated_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  evidencePayload: jsonb("evidence_payload").notNull().default({}),
  predictedOutcome: jsonb("predicted_outcome").notNull().default({}),
  actualOutcome: jsonb("actual_outcome"),
  shadowStatus: varchar("shadow_status", { length: 32 }).notNull().default("simulated"), // 'simulated', 'evaluated', 'matched', 'diverged'
  comparisonNotes: text("comparison_notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true }),
});

// 7. Agregaciones Materializadas para Bases de Datos Masivas (Tarea D.1)
export const mintMaterializedAggregations = pgTable("mint_materialized_aggregations", {
  id: text("id").primaryKey(), // ej: 'agg_inventory_comp_platica_daily'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  aggregationKey: varchar("aggregation_key", { length: 128 }).notNull(),
  metricsPayload: jsonb("metrics_payload").notNull().default({}),
  recordCount: integer("record_count").notNull().default(0),
  computedAt: timestamp("computed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// 8. Puntajes de Calidad y Confianza de Datos por Módulo (Tarea C.2)
export const mintQualityScores = pgTable("mint_quality_scores", {
  id: text("id").primaryKey(), // ej: 'qs_comp_platica_inventory'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  module: varchar("module", { length: 64 }).notNull(), // 'inventory', 'sales', 'finance', 'logistics', 'suppliers'
  confidenceLevel: varchar("confidence_level", { length: 32 }).notNull(), // 'CONFIABLE', 'DUDOSO', 'NO_CONFIABLE'
  scorePercent: integer("score_percent").notNull(), // 0 a 100
  totalRecordsAudited: integer("total_records_audited").notNull().default(0),
  corruptRecordsCount: integer("corrupt_records_count").notNull().default(0),
  reasons: jsonb("reasons").notNull().default([]),
  sampleCorruptRecords: jsonb("sample_corrupt_records").notNull().default([]),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
