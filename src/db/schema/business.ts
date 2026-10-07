import {
  pgTable,
  text,
  integer,
  decimal,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// 1. Productos
export const products = pgTable("products", {
  id: text("id").primaryKey(), // ej: 'prod_st200'
  name: text("name").notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  minStock: integer("min_stock").notNull().default(10),
  origin: text("origin", { enum: ["simulado", "real"] })
    .notNull()
    .default("simulado"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 2. Almacenes / Bodegas
export const warehouses = pgTable("warehouses", {
  id: text("id").primaryKey(), // ej: 'alm_central'
  name: text("name").notNull(),
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 3. Inventario / Existencias por producto y almacén
export const inventory = pgTable("inventory", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  warehouseId: text("warehouse_id")
    .references(() => warehouses.id, { onDelete: "cascade" })
    .notNull(),
  stock: integer("stock").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 4. Proveedores
export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(), // ej: 'prov_acme'
  name: text("name").notNull(),
  email: text("email"),
  phone: varchar("phone", { length: 50 }),
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
  idempotencyKey: varchar("idempotency_key", { length: 255 }).unique(),
  caseId: text("case_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 7. Configuración de Negocio (Limites de aprobación de compras)
export const businessConfig = pgTable("business_config", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
