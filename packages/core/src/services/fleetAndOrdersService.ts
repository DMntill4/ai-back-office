import { db } from "../db/client";
import {
  suppliers,
  supplierProducts,
  purchaseOrders,
  shipments,
  products,
  users,
  salesHistory,
  companies,
} from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getCompanyConfig } from "./configService";

export interface SupplierSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  city: string | null;
  country: string | null;
  hasGps: boolean;
  catalogCount: number;
  avgLeadTimeDays: number;
  totalOrdersIssued: number;
}

export interface SupplierDetail extends SupplierSummary {
  catalog: Array<{
    productId: string;
    sku: string;
    productName: string;
    unitPrice: number;
    minOrderQuantity: number;
    leadTimeDays: number;
  }>;
  recentOrders: Array<{
    id: string;
    productName: string;
    quantity: number;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
}

export interface OrderItemSummary {
  id: string;
  orderNumber: string;
  productId: string;
  productName: string;
  sku: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  status: "abierta" | "recibida" | "cancelada";
  createdAt: string;
  trackingNumber?: string | null;
  shipmentStatus?: string | null;
  carrier?: string | null;
}

export interface FleetShipmentItem {
  id: string;
  trackingNumber: string;
  carrier: string;
  purchaseOrderId: string | null;
  productName: string;
  status: "en_preparacion" | "en_transito" | "retrasado" | "entregado" | "cancelado";
  estimatedDelivery: string;
  actualDelivery: string | null;
  originLocation: string | null;
  currentLocation: string | null;
  destinationLocation: string | null;
  notes: string | null;
}

export interface DriverMember {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  assignedShipmentsCount: number;
}

export interface SalesChannelSummary {
  channel: string;
  totalTransactions: number;
  totalUnitsSold: number;
  totalRevenue: number;
  currency: string;
  topProducts: Array<{ sku: string; name: string; units: number }>;
}

/**
 * 1. Lista todos los proveedores de la empresa con métricas de catálogo y desempeño
 */
export async function listCompanySuppliers(
  companyId: string = "comp_default",
): Promise<SupplierSummary[]> {
  const [suppList, spList, poList] = await Promise.all([
    db.select().from(suppliers).where(eq(suppliers.companyId, companyId)),
    db.select().from(supplierProducts).where(eq(supplierProducts.companyId, companyId)),
    db.select().from(purchaseOrders).where(eq(purchaseOrders.companyId, companyId)),
  ]);

  return suppList.map((s) => {
    const productsOffered = spList.filter((sp) => sp.supplierId === s.id);
    const ordersIssued = poList.filter((po) => po.supplierId === s.id);
    const avgLead =
      productsOffered.length > 0
        ? Math.round(
            productsOffered.reduce((sum, sp) => sum + (sp.leadTimeDays || 3), 0) /
              productsOffered.length,
          )
        : 3;

    const hasGps = Boolean(s.latitude && s.longitude);

    return {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      taxId: s.taxId,
      city: s.city,
      country: s.country,
      hasGps,
      catalogCount: productsOffered.length,
      avgLeadTimeDays: avgLead,
      totalOrdersIssued: ordersIssued.length,
    };
  });
}

/**
 * 2. Detalle completo de un proveedor con catálogo de precios y órdenes
 */
export async function getSupplierDetail(
  companyId: string = "comp_default",
  supplierId: string,
): Promise<SupplierDetail | null> {
  const cleanId = supplierId.trim();
  const suppRows = await db
    .select()
    .from(suppliers)
    .where(
      and(
        eq(suppliers.companyId, companyId),
        sql`lower(${suppliers.id}) = lower(${cleanId}) or lower(${suppliers.name}) = lower(${cleanId})`,
      ),
    )
    .limit(1);

  if (suppRows.length === 0) return null;
  const s = suppRows[0];

  const [spRows, prods, poRows] = await Promise.all([
    db.select().from(supplierProducts).where(and(eq(supplierProducts.companyId, companyId), eq(supplierProducts.supplierId, s.id))),
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(purchaseOrders).where(and(eq(purchaseOrders.companyId, companyId), eq(purchaseOrders.supplierId, s.id))).orderBy(desc(purchaseOrders.createdAt)).limit(10),
  ]);

  const prodMap = new Map(prods.map((p) => [p.id, p]));

  const catalog = spRows.map((sp) => {
    const p = prodMap.get(sp.productId);
    return {
      productId: sp.productId,
      sku: p?.sku || sp.productId,
      productName: p?.name || `Producto ${sp.productId}`,
      unitPrice: parseFloat(sp.unitPrice?.toString() || "0"),
      minOrderQuantity: sp.minOrderQuantity || 1,
      leadTimeDays: sp.leadTimeDays || 3,
    };
  });

  const recentOrders = poRows.map((po) => {
    const p = prodMap.get(po.productId);
    return {
      id: po.id,
      productName: p?.name || po.productId,
      quantity: po.quantity,
      totalAmount: parseFloat(po.totalAmount?.toString() || "0"),
      status: po.status,
      createdAt: po.createdAt ? po.createdAt.toISOString() : "",
    };
  });

  const avgLead =
    catalog.length > 0
      ? Math.round(catalog.reduce((sum, c) => sum + c.leadTimeDays, 0) / catalog.length)
      : 3;

  return {
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    taxId: s.taxId,
    city: s.city,
    country: s.country,
    hasGps: Boolean(s.latitude && s.longitude),
    catalogCount: catalog.length,
    avgLeadTimeDays: avgLead,
    totalOrdersIssued: recentOrders.length,
    catalog,
    recentOrders,
  };
}

/**
 * 3. Registra un nuevo proveedor real en PostgreSQL
 */
export async function addCompanySupplier(
  companyId: string = "comp_default",
  input: {
    name: string;
    email?: string;
    phone?: string;
    taxId?: string;
    city?: string;
    country?: string;
    streetAddress?: string;
  },
): Promise<{ id: string; name: string }> {
  const cleanName = input.name.trim();
  if (!cleanName) throw new Error("El nombre del proveedor es obligatorio.");

  const id = `prov_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20)}_${Date.now().toString().slice(-4)}`;

  await db.insert(suppliers).values({
    id,
    companyId,
    name: cleanName,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    taxId: input.taxId?.trim() || null,
    city: input.city?.trim() || null,
    country: input.country?.trim() || null,
    streetAddress: input.streetAddress?.trim() || null,
    origin: "real",
  });

  return { id, name: cleanName };
}

/**
 * 4. Lista las órdenes de compra con datos enriquecidos y tracking
 */
export async function listCompanyOrders(
  companyId: string = "comp_default",
  statusFilter?: string,
): Promise<OrderItemSummary[]> {
  const config = await getCompanyConfig(companyId);

  const [poList, suppList, prodList, shipList] = await Promise.all([
    db.select().from(purchaseOrders).where(eq(purchaseOrders.companyId, companyId)).orderBy(desc(purchaseOrders.createdAt)),
    db.select().from(suppliers).where(eq(suppliers.companyId, companyId)),
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(shipments).where(eq(shipments.companyId, companyId)),
  ]);

  const suppMap = new Map(suppList.map((s) => [s.id, s.name]));
  const prodMap = new Map(prodList.map((p) => [p.id, p]));
  const shipMap = new Map(shipList.filter((s) => s.purchaseOrderId).map((s) => [s.purchaseOrderId!, s]));

  let filtered = poList;
  if (statusFilter && statusFilter !== "all" && statusFilter !== "todas") {
    filtered = poList.filter((po) => po.status.toLowerCase() === statusFilter.toLowerCase());
  }

  return filtered.map((po) => {
    const prod = prodMap.get(po.productId);
    const ship = shipMap.get(po.id);

    return {
      id: po.id,
      orderNumber: po.id,
      productId: po.productId,
      productName: prod?.name || po.productId,
      sku: prod?.sku || po.productId,
      supplierId: po.supplierId,
      supplierName: suppMap.get(po.supplierId) || po.supplierId,
      quantity: po.quantity,
      unitPrice: parseFloat(po.unitPrice?.toString() || "0"),
      totalAmount: parseFloat(po.totalAmount?.toString() || "0"),
      currency: config.currency,
      status: po.status as any,
      createdAt: po.createdAt ? po.createdAt.toISOString() : new Date().toISOString(),
      trackingNumber: ship?.trackingNumber || null,
      shipmentStatus: ship?.status || null,
      carrier: ship?.carrier || null,
    };
  });
}

/**
 * 5. Lista los envíos activos y flota de transporte
 */
export async function listCompanyFleet(
  companyId: string = "comp_default",
): Promise<{
  activeShipments: FleetShipmentItem[];
  drivers: DriverMember[];
  totalInTransit: number;
  totalDelayed: number;
}> {
  const [shipList, userList, prodList] = await Promise.all([
    db.select().from(shipments).where(eq(shipments.companyId, companyId)).orderBy(desc(shipments.createdAt)),
    db.select().from(users).where(and(eq(users.companyId, companyId), eq(users.role, "driver"))),
    db.select().from(products).where(eq(products.companyId, companyId)),
  ]);

  const activeShipments: FleetShipmentItem[] = shipList.map((s) => ({
    id: s.id,
    trackingNumber: s.trackingNumber,
    carrier: s.carrier,
    purchaseOrderId: s.purchaseOrderId,
    productName: s.purchaseOrderId || "Carga de Almacén",
    status: s.status as any,
    estimatedDelivery: s.estimatedDelivery ? s.estimatedDelivery.toISOString() : "",
    actualDelivery: s.actualDelivery ? s.actualDelivery.toISOString() : null,
    originLocation: s.originLocation,
    currentLocation: s.currentLocation,
    destinationLocation: s.destinationLocation,
    notes: s.notes,
  }));

  const drivers: DriverMember[] = userList.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: null,
    assignedShipmentsCount: shipList.filter((s) => s.carrier.toLowerCase().includes(u.name.toLowerCase())).length,
  }));

  const totalInTransit = activeShipments.filter((s) => s.status === "en_transito" || s.status === "en_preparacion").length;
  const totalDelayed = activeShipments.filter((s) => s.status === "retrasado").length;

  return {
    activeShipments,
    drivers,
    totalInTransit,
    totalDelayed,
  };
}

/**
 * 6. Resumen de clientes y canales de venta
 */
export async function listCompanySalesSummary(
  companyId: string = "comp_default",
): Promise<{
  channels: SalesChannelSummary[];
  totalRevenue: number;
  totalUnits: number;
  currency: string;
}> {
  const config = await getCompanyConfig(companyId);
  const [sales, prods] = await Promise.all([
    db.select().from(salesHistory).where(eq(salesHistory.companyId, companyId)),
    db.select().from(products).where(eq(products.companyId, companyId)),
  ]);

  const prodMap = new Map(prods.map((p) => [p.id, p]));
  const channelMap = new Map<string, { txCount: number; units: number; rev: number; prodUnits: Map<string, number> }>();

  for (const s of sales) {
    const ch = s.channel || "directo";
    const existing = channelMap.get(ch) || { txCount: 0, units: 0, rev: 0, prodUnits: new Map() };
    const qty = s.quantity;
    const amount = parseFloat(s.totalAmount?.toString() || "0");

    existing.txCount += 1;
    existing.units += qty;
    existing.rev += amount;
    existing.prodUnits.set(s.productId, (existing.prodUnits.get(s.productId) || 0) + qty);

    channelMap.set(ch, existing);
  }

  const channels: SalesChannelSummary[] = Array.from(channelMap.entries()).map(([ch, data]) => {
    const topProds = Array.from(data.prodUnits.entries())
      .map(([pid, u]) => {
        const p = prodMap.get(pid);
        return { sku: p?.sku || pid, name: p?.name || pid, units: u };
      })
      .sort((a, b) => b.units - a.units)
      .slice(0, 3);

    return {
      channel: ch,
      totalTransactions: data.txCount,
      totalUnitsSold: data.units,
      totalRevenue: parseFloat(data.rev.toFixed(2)),
      currency: config.currency,
      topProducts: topProds,
    };
  });

  const totalRevenue = channels.reduce((sum, c) => sum + c.totalRevenue, 0);
  const totalUnits = channels.reduce((sum, c) => sum + c.totalUnitsSold, 0);

  return {
    channels,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalUnits,
    currency: config.currency,
  };
}
