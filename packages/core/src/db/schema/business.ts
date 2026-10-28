import {
  pgTable,
  text,
  integer,
  decimal,
  timestamp,
  varchar,
  unique,
  primaryKey,
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
    key: varchar("key", { length: 100 }).notNull(),
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

// 9. Seguimiento de Envíos (Para consultar_envios y transportista simulado)
export const shipments = pgTable("shipments", {
  id: text("id").primaryKey(), // ej: 'ship_001'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  purchaseOrderId: text("purchase_order_id")
    .references(() => purchaseOrders.id, { onDelete: "set null" }),
  trackingNumber: varchar("tracking_number", { length: 100 }).notNull(),
  carrier: text("carrier").notNull(), // ej: 'Simulado Logistics', 'FedEx', 'UPS', 'DHL'
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
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
