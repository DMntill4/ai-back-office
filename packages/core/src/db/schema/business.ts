import {
  pgTable,
  text,
  integer,
  decimal,
  timestamp,
  varchar,
  unique,
  primaryKey,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

// 0. Empresas (Multi-tenant con perfil físico y fiscal global)
export const companies = pgTable("companies", {
  id: text("id").primaryKey(), // ej: 'comp_default', 'comp_acme' o UUID de Supabase Auth
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).unique(),
  legalName: text("legal_name"),
  taxId: varchar("tax_id", { length: 50 }),
  rfcTaxId: varchar("rfc_tax_id", { length: 50 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  streetAddress: text("street_address"),
  postalCode: varchar("postal_code", { length: 20 }),
  city: text("city"),
  state: text("state"),
  country: varchar("country", { length: 50 }),
  latitude: decimal("latitude", { precision: 10, scale: 6 }),
  longitude: decimal("longitude", { precision: 10, scale: 6 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 1. Productos
export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(), // ej: 'prod_st200'
    companyId: text("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull()
      .default("comp_default"),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").default("general"),
    sku: varchar("sku", { length: 50 }).notNull(),
    minStock: integer("min_stock").notNull().default(10),
    price: decimal("price", { precision: 10, scale: 2 }),
    costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
    origin: text("origin", { enum: ["simulado", "real"] })
      .notNull()
      .default("simulado"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("products_company_sku_unique").on(table.companyId, table.sku),
  ],
);

// 2. Almacenes / Bodegas con ubicación física y coordenadas GPS reales
export const warehouses = pgTable("warehouses", {
  id: text("id").primaryKey(), // ej: 'alm_central'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  name: text("name").notNull(),
  location: text("location"),
  streetAddress: text("street_address"),
  postalCode: varchar("postal_code", { length: 20 }),
  city: text("city"),
  state: text("state"),
  country: varchar("country", { length: 50 }),
  latitude: decimal("latitude", { precision: 10, scale: 6 }),
  longitude: decimal("longitude", { precision: 10, scale: 6 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 3. Inventario / Existencias por producto y almacén
export const inventory = pgTable("inventory", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  productId: text("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  warehouseId: text("warehouse_id")
    .references(() => warehouses.id, { onDelete: "cascade" })
    .notNull(),
  stock: integer("stock").notNull().default(0),
  expirationDate: timestamp("expiration_date", { withTimezone: true }),
  salesCount: integer("sales_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 4. Proveedores con ubicación física real y datos fiscales
export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(), // ej: 'prov_acme'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  name: text("name").notNull(),
  email: text("email"),
  phone: varchar("phone", { length: 50 }),
  taxId: varchar("tax_id", { length: 20 }),
  streetAddress: text("street_address"),
  postalCode: varchar("postal_code", { length: 20 }),
  city: text("city"),
  state: text("state"),
  country: varchar("country", { length: 50 }),
  latitude: decimal("latitude", { precision: 10, scale: 6 }),
  longitude: decimal("longitude", { precision: 10, scale: 6 }),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankClabe: varchar("bank_clabe", { length: 30 }),
  origin: text("origin", { enum: ["simulado", "real"] })
    .notNull()
    .default("simulado"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 5. Oferta de Proveedor por Producto (Precios, pedido mínimo, días de entrega)
export const supplierProducts = pgTable("supplier_products", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  supplierId: text("supplier_id")
    .references(() => suppliers.id, { onDelete: "cascade" })
    .notNull(),
  productId: text("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  minOrderQuantity: integer("min_order_quantity").notNull().default(1),
  leadTimeDays: integer("lead_time_days").notNull().default(3),
});

// 6. Órdenes de Compra
export const purchaseOrders = pgTable("purchase_orders", {
  id: text("id").primaryKey(), // ej: 'po_001'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  supplierId: text("supplier_id")
    .references(() => suppliers.id, { onDelete: "cascade" })
    .notNull(),
  productId: text("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status", {
    enum: ["abierta", "recibida", "cancelada"],
  })
    .notNull()
    .default("abierta"),
  paymentStatus: text("payment_status", {
    enum: ["pendiente_pago", "pagada", "cancelada"],
  })
    .notNull()
    .default("pendiente_pago"),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).unique(),
  caseId: text("case_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 7. Configuración de Negocio (Límites de aprobación de compras por empresa)
export const businessConfig = pgTable(
  "business_config",
  {
    companyId: text("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull()
      .default("comp_default"),
    key: text("key").notNull(),
    value: text("value").notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("MXN"),
    description: text("description"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.companyId, table.key] }),
  ],
);

// 8. Historial de Ventas (Para pronosticar_demanda y plantilla Excel)
export const salesHistory = pgTable("sales_history", {
  id: text("id").primaryKey(), // ej: 'sh_001'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  productId: text("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  saleDate: timestamp("sale_date", { withTimezone: true }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  channel: text("channel").default("directo"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 8.5 Flota Vehicular y Unidades de Transporte Físicas
export const fleetVehicles = pgTable("fleet_vehicles", {
  id: text("id").primaryKey(), // ej: 'veh_trk_01'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  name: text("name").notNull(), // ej: 'Camión Isuzu 3.5T - Unidad 02'
  plateNumber: varchar("plate_number", { length: 32 }).notNull(), // ej: 'PL-892-XYZ'
  vehicleType: text("vehicle_type", {
    enum: ["van", "box_truck", "heavy_truck", "motorcycle"],
  }).notNull().default("box_truck"),
  maxWeightKg: decimal("max_weight_kg", { precision: 10, scale: 2 }).notNull().default("3500.00"),
  maxVolumeM3: decimal("max_volume_m3", { precision: 10, scale: 2 }).notNull().default("18.00"),
  assignedDriverId: text("assigned_driver_id"),
  status: text("status", {
    enum: ["available", "loading", "in_transit", "maintenance"],
  }).notNull().default("available"),
  currentLatitude: text("current_latitude"),
  currentLongitude: text("current_longitude"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 9. Seguimiento de Envíos y Fletes Logísticos con Manifiesto de Carga Real
export const shipments = pgTable("shipments", {
  id: text("id").primaryKey(), // ej: 'ship_001'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  purchaseOrderId: text("purchase_order_id")
    .references(() => purchaseOrders.id, { onDelete: "set null" }),
  vehicleId: text("vehicle_id")
    .references(() => fleetVehicles.id, { onDelete: "set null" }),
  driverId: text("driver_id"),
  originWarehouseId: text("origin_warehouse_id")
    .references(() => warehouses.id, { onDelete: "set null" }),
  trackingNumber: varchar("tracking_number", { length: 100 }).notNull(),
  carrier: text("carrier").notNull(), // ej: 'Flota Interna', 'FedEx', 'DHL'
  status: text("status", {
    enum: [
      "en_preparacion",
      "en_transito",
      "retrasado",
      "entregado",
      "cancelado",
    ],
  })
    .notNull()
    .default("en_transito"),
  estimatedDelivery: timestamp("estimated_delivery", {
    withTimezone: true,
  }).notNull(),
  actualDelivery: timestamp("actual_delivery", { withTimezone: true }),
  originLocation: text("origin_location"),
  currentLocation: text("current_location"),
  destinationLocation: text("destination_location"),
  destinationAddress: text("destination_address"),
  destinationLatitude: text("destination_latitude"),
  destinationLongitude: text("destination_longitude"),
  cargoManifest: jsonb("cargo_manifest").notNull().default([]), // [{ productId, sku, name, quantity, unitWeightKg, totalWeightKg }]
  totalWeightKg: decimal("total_weight_kg", { precision: 10, scale: 2 }).default("0.00"),
  capacityUtilizationPct: decimal("capacity_utilization_pct", { precision: 5, scale: 2 }).default("0.00"),
  freightCostMxn: decimal("freight_cost_mxn", { precision: 10, scale: 2 }).default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 10. Historial Temporal de Movimientos de Inventario (Detección de Mermas, Discrepancias y Velocidad)
export const inventoryMovements = pgTable("inventory_movements", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  productId: text("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  warehouseId: text("warehouse_id")
    .references(() => warehouses.id, { onDelete: "cascade" })
    .notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  quantityDelta: integer("quantity_delta").notNull(),
  movementType: text("movement_type", {
    enum: [
      "VENTA",
      "RECEPCION_COMPRA",
      "AJUSTE_AUDITORIA",
      "MERMA",
      "DEVOLUCION",
      "DISCREPANCIA_DETECTADA",
      "IMPORTACION_INICIAL",
    ],
  })
    .notNull()
    .default("AJUSTE_AUDITORIA"),
  reason: text("reason"),
  authorizedBy: text("authorized_by").notNull().default("SISTEMA"),
  transactionRef: text("transaction_ref"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 11. Memoria Operativa Persistente del Negocio (Directivas, Reglas de Proveedores y Políticas Aprendidas)
export const businessOperationalMemory = pgTable("business_operational_memory", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  category: text("category", {
    enum: [
      "DIRECTIVA_PROVEEDOR",
      "POLITICA_COMPRAS",
      "REGLA_INVENTARIO",
      "HORARIO_OPERATIVO",
      "INCIDENCIA_RECURRENTE",
      "PREFERENCIA_CLIENTE",
      "CONTEXTO_OPERATIVO",
    ],
  })
    .notNull()
    .default("CONTEXTO_OPERATIVO"),
  subjectKey: text("subject_key").notNull(),
  content: text("content").notNull(),
  confidence: decimal("confidence", { precision: 3, scale: 2 })
    .notNull()
    .default("1.00"),
  author: text("author").notNull().default("ADMIN"),
  supersedesId: text("supersedes_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 12. Registro Inmutable de Incidentes de Seguridad y Anomalías Operativas (RBAC, Mermas, Fallos)
export const auditIncidents = pgTable("audit_incidents", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  incidentType: text("incident_type", {
    enum: [
      "ACCESO_NO_AUTORIZADO",
      "VIOLACION_RBAC",
      "CAIDA_STOCK_SIN_VENTA",
      "PROVEEDOR_INCUMPLIDO",
      "PRECIO_ALTERADO",
      "DISCREPANCIA_FISICA",
      "FALLO_INTEGRACION_RECUPERADO",
      "FUENTE_DATOS_INVALIDA",
    ],
  })
    .notNull()
    .default("VIOLACION_RBAC"),
  severity: text("severity", {
    enum: ["BAJA", "MEDIA", "ALTA", "CRITICA"],
  })
    .notNull()
    .default("ALTA"),
  title: text("title").notNull(),
  details: text("details").notNull(),
  status: text("status", {
    enum: ["DETECTADO", "EN_REVISION", "NOTIFICADO", "MITIGADO", "RESUELTO"],
  })
    .notNull()
    .default("DETECTADO"),
  detectedBy: text("detected_by").notNull().default("MINT_AUTONOMOUS_PATROL"),
  resolvedBy: text("resolved_by"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

// 13. Checkpoints de Tareas Autónomas Multi-Paso (Recuperación tras Reinicio o Interrupción)
export const agentTaskCheckpoints = pgTable("agent_task_checkpoints", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  taskType: text("task_type").notNull(), // ej: 'IMPORT_DATABASE', 'INVENTORY_ORGANIZATION', 'MULTI_STEP_RECOVERY'
  objective: text("objective").notNull(),
  status: text("status", {
    enum: ["IN_PROGRESS", "INTERRUPTED", "RECOVERING", "COMPLETED", "FAILED_BLOCKED"],
  })
    .notNull()
    .default("IN_PROGRESS"),
  sourceTarget: text("source_target"),
  completedSteps: jsonb("completed_steps").notNull().default([]), // Array de pasos e IDs ya procesados (idempotencia)
  pendingSteps: jsonb("pending_steps").notNull().default([]),
  failedAttempts: jsonb("failed_attempts").notNull().default([]), // [{ step, error, recoveryAction, timestamp }]
  verificationResult: jsonb("verification_result").notNull().default({}),
  initiatedBy: text("initiated_by").notNull().default("AUTONOMOUS_AGENT"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
