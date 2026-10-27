import { randomUUID } from "node:crypto";
import { db } from "../db/client";
import {
  products,
  inventory,
  warehouses,
  suppliers,
  supplierProducts,
  purchaseOrders,
  shipments,
  salesHistory,
  companies,
  businessConfig,
} from "../db/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import { calculateRealRoute, type GeoPoint, type RouteCalculationResult } from "./routeCalculator";
import { geocodeAddressOrCity, resolveNodeGeoPoint } from "./geocodingService";

/**
 * MOTOR CENTRAL DEL COORDINADOR LOGÍSTICO EMPRESARIAL (MINT CONTROL TOWER)
 * Implementa las 6 funciones de ingeniería logística real:
 * 1. Balanceo Multi-Bodega y Transferencias Internas (Cross-Docking)
 * 2. Despacho de Última Milla y Ruteo Óptimo (Inbound & Outbound)
 * 3. Consolidación Multi-SKU de Carga, MOQ y Landed Cost (Producto + Flete + Peajes)
 * 4. Ciclo Completo de Guías de Tránsito (Creación, Monitoreo y Recepción Física en Almacén)
 * 5. Inteligencia Dinámica de Punto de Reorden (ROP) y Cantidad Económica de Pedido (EOQ)
 * 6. Generación de Manifiestos de Embarque y Solicitudes de Cotización (RFQ / PO)
 */

export interface DynamicInventoryHealth {
  productId: string;
  sku: string;
  name: string;
  category: string;
  totalStock: number;
  inTransitQuantity: number;
  minStockStatic: number;
  dailyBurnRate: number; // 0 si no hay ventas registradas (ver hasSalesData)
  hasSalesData: boolean;
  daysOfCoverage: number | null;
  daysCoverage: number | null;
  leadTimeDays: number | null;
  safetyStockDynamic: number;
  reorderPointDynamic: number; // ROP = (BurnRate * LeadTime) + SafetyStock
  dynamicRop: number;
  needsReorder: boolean;
  suggestedOrderQty: number | null;
  unitCostEstimate: number | null;
  status: "OPTIMO" | "ATENCION_ROP" | "BAJO" | "AGOTADO";
  hasSupplierAssigned: boolean;
  preferredSupplierName?: string;
  warehouseBreakdown: Array<{
    warehouseId: string;
    warehouseName: string;
    city?: string | null;
    stock: number;
  }>;
}

export interface WarehouseTransferProposal {
  productId: string;
  sku: string;
  productName: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  quantityToTransfer: number;
  transferQuantity: number;
  distanceKm: number;
  durationFormatted: string;
  transferFreightCost: number;
  transferFreightCostMxn: number;
  externalPurchaseCost: number;
  avoidedPurchaseCostMxn: number;
  netSavings: number;
  netSavingsMxn: number;
  currency: string;
}

export interface OutboundDispatchResult {
  success: boolean;
  message: string;
  trackingNumber: string;
  shipmentId: string;
  originWarehouse: string;
  distanceKm: number;
  durationFormatted: string;
  freightCostMxn: number | null;
  estimatedDelivery: string;
  remainingStock: number;
  selectedWarehouse: {
    id: string;
    name: string;
    city?: string;
    coordinates?: string;
  };
  destination: {
    customerOrSite: string;
    address: string;
    coordinates?: string;
  };
  product: {
    id: string;
    sku: string;
    name: string;
    quantityDispatched: number;
    remainingStockInWarehouse: number;
  };
  route: {
    distanceKm: number;
    durationFormatted: string;
    freightCostFormatted: string;
    freightCost: number | null;
    carrier: string;
    estimatedDelivery: string;
  };
  manifestSummary: string;
}

export interface ConsolidatedLoadPlan {
  supplierId: string;
  supplierName: string;
  supplierLocation: string;
  supplierCity: string;
  destinationWarehouseName: string;
  items: Array<{
    productId: string;
    sku: string;
    name: string;
    productName: string;
    currentStock: number;
    reorderPoint: number;
    quantityToOrder: number;
    quantity: number;
    unitPrice: number;
    subtotalProductCost: number;
    lineCostMxn: number;
  }>;
  subtotalProducts: number;
  productsCostMxn: number;
  estimatedFreightCost: number | null;
  freightCostMxn: number | null;
  consolidationSavingsMxn: number | null;
  totalLandedCost: number | null;
  totalLandedCostMxn: number | null;
  freightSharePercentage: number | null;
  distanceKm: number;
  durationFormatted: string;
  leadTimeDays: number | null;
  currency: string;
}

/**
 * Obtiene la moneda configurada de la empresa activa
 */
export async function getCompanyCurrency(companyId: string): Promise<string> {
  try {
    const [comp] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (comp?.currency) return comp.currency;
    const [conf] = await db
      .select()
      .from(businessConfig)
      .where(and(eq(businessConfig.companyId, companyId), eq(businessConfig.key, "currency")))
      .limit(1);
    return conf?.currency || "USD";
  } catch {
    return "USD";
  }
}

/**
 * Busca un producto de la empresa de forma flexible (por ID exacto, SKU, o nombre parcial)
 */
export async function resolveProductInCompany(
  query: string,
  companyId: string,
): Promise<typeof products.$inferSelect | null> {
  if (!query) return null;
  const clean = query.trim();

  // 1. Exact ID or SKU match within company
  const exact = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.companyId, companyId),
        or(eq(products.id, clean), ilike(products.sku, clean), ilike(products.name, clean)),
      ),
    )
    .limit(1);

  if (exact.length > 0) return exact[0];

  // 2. Partial match in name or SKU within company
  const partial = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.companyId, companyId),
        or(ilike(products.name, `%${clean}%`), ilike(products.sku, `%${clean}%`), ilike(products.id, `%${clean}%`)),
      ),
    )
    .limit(1);

  if (partial.length > 0) return partial[0];

  // 3. Fallback search across all products
  const anyMatch = await db
    .select()
    .from(products)
    .where(or(eq(products.id, clean), ilike(products.sku, `%${clean}%`), ilike(products.name, `%${clean}%`)))
    .limit(1);

  return anyMatch[0] || null;
}

/**
 * 1. INTELIGENCIA DINÁMICA DE INVENTARIO (Burn Rate, Días de Cobertura y ROP Dinámico)
 * Funciona con CUALQUIER base de datos, tenga o no historial de ventas o proveedores.
 */
export async function analyzeDynamicCatalogHealth(companyId: string): Promise<DynamicInventoryHealth[]> {
  const [prods, invs, whs, supps, suppProds, openOrders, sales] = await Promise.all([
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(inventory).where(eq(inventory.companyId, companyId)),
    db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
    db.select().from(suppliers).where(eq(suppliers.companyId, companyId)),
    db.select().from(supplierProducts).where(eq(supplierProducts.companyId, companyId)),
    db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.companyId, companyId), eq(purchaseOrders.status, "abierta"))),
    db.select().from(salesHistory).where(eq(salesHistory.companyId, companyId)),
  ]);

  const whMap = new Map(whs.map((w) => [w.id, w]));
  const suppMap = new Map(supps.map((s) => [s.id, s]));

  return prods.map((p) => {
    const prodInvs = invs.filter((i) => i.productId === p.id);
    const totalStock = prodInvs.reduce((acc, i) => acc + i.stock, 0);
    const totalSalesCount = prodInvs.reduce((acc, i) => acc + (i.salesCount || 0), 0);

    const inTransitQuantity = openOrders
      .filter((o) => o.productId === p.id)
      .reduce((acc, o) => acc + o.quantity, 0);

    const prodSales = sales.filter((s) => s.productId === p.id);
    const soldLast30d = prodSales.reduce((acc, s) => acc + s.quantity, 0);

    // Velocidad de venta SOLO desde ventas reales registradas; sin ventas = 0 y hasSalesData=false
    const hasSalesData = soldLast30d > 0 || totalSalesCount > 0;
    const dailyBurnRate = soldLast30d > 0
      ? Math.round((soldLast30d / 30) * 100) / 100
      : totalSalesCount > 0
        ? Math.round((totalSalesCount / 30) * 100) / 100
        : 0;

    const prodOffers = suppProds
      .filter((sp) => sp.productId === p.id)
      .sort((a, b) => parseFloat(a.unitPrice) - parseFloat(b.unitPrice));

    const bestOffer = prodOffers[0];
    const leadTimeDays: number | null = bestOffer ? bestOffer.leadTimeDays : null;
    const unitCostEstimate: number | null = bestOffer ? parseFloat(bestOffer.unitPrice) : null;
    const preferredSupplierName = bestOffer ? suppMap.get(bestOffer.supplierId)?.name : undefined;

    // ROP = (Demanda Diaria * Lead Time) + Stock de Seguridad
    // Stock de seguridad = minimo configurado por producto (sin multiplicadores inventados)
    const safetyStockDynamic = p.minStock;
    const reorderPointDynamic =
      (leadTimeDays !== null ? Math.ceil(dailyBurnRate * leadTimeDays) : 0) + safetyStockDynamic;

    const effectiveStock = totalStock + inTransitQuantity;
    const daysOfCoverage =
      hasSalesData && dailyBurnRate > 0 ? Math.round((totalStock / dailyBurnRate) * 10) / 10 : null;

    // Cantidad = faltante real hasta el punto de reorden; respeta el minimo de compra solo si el proveedor lo informa
    const shortfall = reorderPointDynamic - effectiveStock;
    const suggestedOrderQty: number | null =
      shortfall > 0 ? Math.max(shortfall, bestOffer?.minOrderQuantity ?? 0) : null;

    let status: DynamicInventoryHealth["status"] = "OPTIMO";
    if (totalStock === 0) status = "AGOTADO";
    else if (totalStock < p.minStock) status = "BAJO";
    else if (totalStock <= reorderPointDynamic) status = "ATENCION_ROP";

    const warehouseBreakdown = prodInvs.map((inv) => {
      const wh = whMap.get(inv.warehouseId);
      return {
        warehouseId: inv.warehouseId,
        warehouseName: wh?.name || inv.warehouseId,
        city: wh?.city || wh?.location || null,
        stock: inv.stock,
      };
    });

    return {
      productId: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category || "General",
      totalStock,
      inTransitQuantity,
      minStockStatic: p.minStock,
      dailyBurnRate,
      hasSalesData,
      daysOfCoverage,
      daysCoverage: daysOfCoverage,
      leadTimeDays,
      safetyStockDynamic,
      reorderPointDynamic,
      dynamicRop: reorderPointDynamic,
      needsReorder: status !== "OPTIMO",
      suggestedOrderQty,
      unitCostEstimate,
      status,
      hasSupplierAssigned: Boolean(bestOffer),
      preferredSupplierName,
      warehouseBreakdown,
    };
  });
}

/**
 * 2. BALANCEO MULTI-BODEGA Y TRANSFERENCIAS INTERNAS (Cross-Docking)
 */
export async function evaluateWarehouseRebalancing(companyId: string): Promise<WarehouseTransferProposal[]> {
  const [prods, invs, whs, suppProds] = await Promise.all([
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(inventory).where(eq(inventory.companyId, companyId)),
    db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
    db.select().from(supplierProducts).where(eq(supplierProducts.companyId, companyId)),
  ]);

  if (whs.length < 2) return [];

  const currency = await getCompanyCurrency(companyId);
  const whMap = new Map(whs.map((w) => [w.id, w]));
  const proposals: WarehouseTransferProposal[] = [];

  for (const prod of prods) {
    const prodInvs = invs.filter((i) => i.productId === prod.id);
    if (prodInvs.length < 2) continue;

    const deficitWh = prodInvs.find((i) => i.stock < prod.minStock);
    const surplusWh = prodInvs.find((i) => i.stock > prod.minStock + 5 && i.warehouseId !== deficitWh?.warehouseId);

    if (deficitWh && surplusWh) {
      const fromWh = whMap.get(surplusWh.warehouseId);
      const toWh = whMap.get(deficitWh.warehouseId);
      if (!fromWh || !toWh) continue;

      const needed = prod.minStock - deficitWh.stock + 2;
      const availableSurplus = surplusWh.stock - prod.minStock;
      const qtyToTransfer = Math.min(needed, availableSurplus);
      if (qtyToTransfer <= 0) continue;

      const originGeo = await resolveNodeGeoPoint(fromWh);
      const destGeo = await resolveNodeGeoPoint(toWh);
      if (!originGeo || !destGeo) {
        // No se puede calcular ruta vial sin coordenadas GPS reales de ambas bodegas
        continue;
      }

      const route = await calculateRealRoute(originGeo, destGeo, { currency, companyId });
      const offer = suppProds.find((sp) => sp.productId === prod.id);
      if (!offer || route.costoFleteEstimado === null) continue; // sin precio o tarifa reales no se calcula ahorro
      const unitPrice = parseFloat(offer.unitPrice);
      const externalCost = Math.round(unitPrice * qtyToTransfer);
      const netSavings = Math.max(0, externalCost - route.costoFleteEstimado);

      proposals.push({
        productId: prod.id,
        sku: prod.sku,
        productName: prod.name,
        fromWarehouseId: fromWh.id,
        fromWarehouseName: fromWh.name,
        toWarehouseId: toWh.id,
        toWarehouseName: toWh.name,
        quantityToTransfer: qtyToTransfer,
        transferQuantity: qtyToTransfer,
        distanceKm: route.distanceKm,
        durationFormatted: route.durationFormatted,
        transferFreightCost: route.costoFleteEstimado,
        transferFreightCostMxn: route.costoFleteEstimado,
        externalPurchaseCost: externalCost,
        avoidedPurchaseCostMxn: externalCost,
        netSavings,
        netSavingsMxn: netSavings,
        currency,
      });
    }
  }

  return proposals;
}

/**
 * Ejecuta una transferencia interna real de inventario entre dos almacenes y genera la guía interna.
 */
export async function executeWarehouseTransfer(params: {
  companyId: string;
  productIdOrSku?: string;
  productId?: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
}): Promise<{
  success: boolean;
  trackingNumber?: string;
  shipmentId?: string;
  productName?: string;
  quantity?: number;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  message: string;
}> {
  const { companyId, fromWarehouseId, toWarehouseId, quantity } = params;
  const targetQuery = params.productIdOrSku || params.productId || "";
  const prod = await resolveProductInCompany(targetQuery, companyId);
  if (!prod) {
    return { success: false, message: `Producto "${targetQuery}" no encontrado.` };
  }

  const [fromInv] = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.productId, prod.id), eq(inventory.warehouseId, fromWarehouseId)))
    .limit(1);

  if (!fromInv || fromInv.stock < quantity) {
    return {
      success: false,
      message: `Stock insuficiente en almacén origen (${fromInv?.stock ?? 0}u disponibles).`,
    };
  }

  await db
    .update(inventory)
    .set({ stock: fromInv.stock - quantity, updatedAt: new Date() })
    .where(eq(inventory.id, fromInv.id));

  const [toInv] = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.productId, prod.id), eq(inventory.warehouseId, toWarehouseId)))
    .limit(1);

  if (toInv) {
    await db
      .update(inventory)
      .set({ stock: toInv.stock + quantity, updatedAt: new Date() })
      .where(eq(inventory.id, toInv.id));
  } else {
    await db.insert(inventory).values({
      id: `inv_${companyId}_${prod.id}_${toWarehouseId}`,
      companyId,
      productId: prod.id,
      warehouseId: toWarehouseId,
      stock: quantity,
    });
  }

  const trackingNumber = `TRK-XFER-${Date.now().toString().slice(-6)}`;
  const shipmentId = `shp_int_${randomUUID().slice(0, 8)}`;
  const eta = new Date(Date.now() + 6 * 3600 * 1000);

  await db.insert(shipments).values({
    id: shipmentId,
    companyId,
    trackingNumber,
    carrier: "Flota Interna Cross-Docking",
    status: "en_transito",
    estimatedDelivery: eta,
    originLocation: fromWarehouseId,
    currentLocation: "En tránsito inter-bodega",
    destinationLocation: toWarehouseId,
    notes: `Transferencia interna de ${quantity}u de ${prod.name} (${prod.sku})`,
  });

  return {
    success: true,
    trackingNumber,
    shipmentId,
    productName: prod.name,
    quantity,
    fromWarehouseId,
    toWarehouseId,
    message: `Transferencia inter-almacén completada (${quantity}u de ${prod.name}). Guía: ${trackingNumber}.`,
  };
}

/**
 * 3. DESPACHO DE ÚLTIMA MILLA / OUTBOUND LOGISTICS
 */
export async function dispatchOutboundShipment(params: {
  companyId: string;
  productIdOrSku?: string;
  productQuery?: string;
  quantity: number;
  destinationAddressOrCity: string;
  customerName?: string;
  preferredCarrier?: string;
  carrier?: string;
}): Promise<OutboundDispatchResult> {
  const {
    companyId,
    quantity,
    destinationAddressOrCity,
    customerName = "Cliente / Obra Destino",
  } = params;
  const productKey = params.productIdOrSku || params.productQuery || "";
  const preferredCarrier = params.preferredCarrier || params.carrier;

  const prod = await resolveProductInCompany(productKey, companyId);
  if (!prod) {
    return {
      success: false,
      message: `No se encontró el producto "${productKey}" en el catálogo de tu empresa.`,
    } as any;
  }

  const destGeocoded = await geocodeAddressOrCity(destinationAddressOrCity);
  if (!destGeocoded) {
    return {
      success: false,
      message: `No se pudo geocodificar la ubicación destino '${destinationAddressOrCity}'. Por favor proporciona una ciudad o dirección válida para calcular la ruta vial.`,
    } as any;
  }

  const destGeoPoint: GeoPoint = {
    latitude: destGeocoded.latitude,
    longitude: destGeocoded.longitude,
    name: customerName,
    address: destGeocoded.displayName,
    city: destGeocoded.city,
    state: destGeocoded.state,
    country: destGeocoded.country,
  };

  const [whs, prodInvs] = await Promise.all([
    db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
    db.select().from(inventory).where(and(eq(inventory.companyId, companyId), eq(inventory.productId, prod.id))),
  ]);

  const eligibleWarehouses = prodInvs.filter((inv) => inv.stock >= quantity);
  if (eligibleWarehouses.length === 0) {
    const totalAvailable = prodInvs.reduce((acc, i) => acc + i.stock, 0);
    return {
      success: false,
      message: `Stock insuficiente para despachar ${quantity}u de "${prod.name}" (SKU: ${prod.sku}). Disponible en almacén: ${totalAvailable}u.`,
    } as any;
  }

  const currency = await getCompanyCurrency(companyId);

  let bestCandidate: {
    inv: typeof inventory.$inferSelect;
    wh: typeof warehouses.$inferSelect | undefined;
    route: RouteCalculationResult;
    originGeo: GeoPoint;
  } | null = null;

  for (const inv of eligibleWarehouses) {
    const wh = whs.find((w) => w.id === inv.warehouseId);
    const originGeo = wh ? await resolveNodeGeoPoint(wh) : null;
    if (!originGeo) continue; // sin ubicacion real del almacen no se calcula ruta

    const route = await calculateRealRoute(originGeo, destGeoPoint, { currency, companyId });
    if (!bestCandidate || route.distanceKm < bestCandidate.route.distanceKm) {
      bestCandidate = { inv, wh, route, originGeo };
    }
  }

  if (!bestCandidate) {
    return {
      success: false,
      message: "No se pudo determinar un almacén de origen para el despacho.",
    } as any;
  }

  const newStock = bestCandidate.inv.stock - quantity;
  await db
    .update(inventory)
    .set({
      stock: newStock,
      salesCount: (bestCandidate.inv.salesCount || 0) + quantity,
      updatedAt: new Date(),
    })
    .where(eq(inventory.id, bestCandidate.inv.id));

  const totalMinutes = bestCandidate.route.durationMinutes + 120;
  const etaDate = new Date(Date.now() + totalMinutes * 60 * 1000);

  const carrier =
    preferredCarrier ||
    (bestCandidate.route.distanceKm > 300
      ? "DHL Freight / Línea Federal"
      : bestCandidate.route.distanceKm > 50
        ? "Estafeta / Unidad Regional"
        : "Flota Dedicada Última Milla");

  const trackingNumber = `TRK-OUT-${Date.now().toString().slice(-6)}`;
  const shipmentId = `shp_out_${randomUUID().slice(0, 8)}`;

  const originLabel = bestCandidate.wh
    ? `${bestCandidate.wh.name} (${bestCandidate.wh.city || bestCandidate.originGeo.city || "Origen"})`
    : bestCandidate.originGeo.name || "Almacén Central";

  const destLabel = `${customerName} — ${destGeocoded?.displayName || destinationAddressOrCity}`;

  await db.insert(shipments).values({
    id: shipmentId,
    companyId,
    trackingNumber,
    carrier,
    status: "en_transito",
    estimatedDelivery: etaDate,
    originLocation: originLabel,
    currentLocation: `Saliendo de ${originLabel} (${bestCandidate.route.distanceKm} km por recorrer)`,
    destinationLocation: destLabel,
    notes: `Despacho Outbound: ${quantity}u de ${prod.name} (${prod.sku}) • Flete: ${bestCandidate.route.costoFleteFormatted} • Tiempo vial: ${bestCandidate.route.durationFormatted}`,
  });

  const manifestSummary = [
    `[PAQUETE] MANIFIESTO DE DESPACHO #${trackingNumber}`,
    `• Producto: ${prod.name} (SKU: ${prod.sku}) × ${quantity} unidades`,
    `• Nodo Origen: ${originLabel} [GPS: ${bestCandidate.originGeo.latitude.toFixed(4)}, ${bestCandidate.originGeo.longitude.toFixed(4)}]`,
    `• Destino Final: ${destLabel} [GPS: ${destGeoPoint.latitude.toFixed(4)}, ${destGeoPoint.longitude.toFixed(4)}]`,
    `• Ruta Vial (${bestCandidate.route.motorUtilizado}): ${bestCandidate.route.distanceKm} km │ Tiempo estimado: ${bestCandidate.route.durationFormatted}`,
    `• Transportista: ${carrier} │ Costo Flete: ${bestCandidate.route.costoFleteFormatted}`,
    `• ETA Prometido: ${etaDate.toLocaleString("es-MX")} │ Stock restante en bodega: ${newStock}u`,
  ].join("\n");

  return {
    success: true,
    message: `Guía ${trackingNumber} despachada (${quantity}u de ${prod.name}) desde ${originLabel} hacia ${destLabel}. Distancia: ${bestCandidate.route.distanceKm} km (${bestCandidate.route.durationFormatted}). Stock restante: ${newStock}u.`,
    trackingNumber,
    shipmentId,
    originWarehouse: originLabel,
    distanceKm: bestCandidate.route.distanceKm,
    durationFormatted: bestCandidate.route.durationFormatted,
    freightCostMxn: bestCandidate.route.costoFleteEstimado,
    estimatedDelivery: etaDate.toISOString(),
    remainingStock: newStock,
    selectedWarehouse: {
      id: bestCandidate.wh?.id || bestCandidate.inv.warehouseId,
      name: bestCandidate.wh?.name || "Almacén Central",
      city: bestCandidate.wh?.city || bestCandidate.originGeo.city,
      coordinates: `${bestCandidate.originGeo.latitude.toFixed(4)}, ${bestCandidate.originGeo.longitude.toFixed(4)}`,
    },
    destination: {
      customerOrSite: customerName,
      address: destGeocoded?.displayName || destinationAddressOrCity,
      coordinates: `${destGeoPoint.latitude.toFixed(4)}, ${destGeoPoint.longitude.toFixed(4)}`,
    },
    product: {
      id: prod.id,
      sku: prod.sku,
      name: prod.name,
      quantityDispatched: quantity,
      remainingStockInWarehouse: newStock,
    },
    route: {
      distanceKm: bestCandidate.route.distanceKm,
      durationFormatted: bestCandidate.route.durationFormatted,
      freightCostFormatted: bestCandidate.route.costoFleteFormatted,
      freightCost: bestCandidate.route.costoFleteEstimado,
      carrier,
      estimatedDelivery: etaDate.toISOString(),
    },
    manifestSummary,
  };
}

/**
 * 4. RECEPCIÓN FÍSICA DE ENVÍO EN ALMACÉN (Inbound Receiving)
 */
export async function receiveInboundShipment(params: {
  companyId: string;
  trackingOrShipmentId?: string;
  trackingOrOrderId?: string;
  receivedBy?: string;
}): Promise<{
  success: boolean;
  trackingNumber?: string;
  shipmentId?: string;
  orderId?: string | null;
  productUpdated?: {
    id: string;
    sku: string;
    name: string;
    quantityAdded: number;
    previousStock: number;
    newStock: number;
  };
  message: string;
}> {
  const { companyId } = params;
  const searchKey = params.trackingOrShipmentId || params.trackingOrOrderId || "";

  const found = await db
    .select()
    .from(shipments)
    .where(
      and(
        eq(shipments.companyId, companyId),
        or(
          eq(shipments.id, searchKey),
          eq(shipments.purchaseOrderId, searchKey),
          ilike(shipments.trackingNumber, `%${searchKey}%`),
        ),
      ),
    )
    .limit(1);

  if (found.length === 0) {
    return {
      success: false,
      message: `No se encontró ningún envío con guía o ID "${searchKey}".`,
    };
  }

  const shp = found[0];
  if (shp.status === "entregado") {
    return {
      success: true,
      trackingNumber: shp.trackingNumber,
      shipmentId: shp.id,
      orderId: shp.purchaseOrderId,
      message: `El envío ${shp.trackingNumber} ya había sido marcado como entregado anteriormente.`,
    };
  }

  const now = new Date();
  let productUpdated:
    | {
        id: string;
        sku: string;
        name: string;
        quantityAdded: number;
        previousStock: number;
        newStock: number;
      }
    | undefined;

  if (shp.purchaseOrderId) {
    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, shp.purchaseOrderId))
      .limit(1);

    if (po) {
      await db
        .update(purchaseOrders)
        .set({ status: "recibida" })
        .where(eq(purchaseOrders.id, po.id));

      const [prod] = await db.select().from(products).where(eq(products.id, po.productId)).limit(1);
      const [inv] = await db
        .select()
        .from(inventory)
        .where(and(eq(inventory.productId, po.productId), eq(inventory.companyId, companyId)))
        .limit(1);

      const prevStock = inv ? inv.stock : 0;
      const newStock = prevStock + po.quantity;

      if (inv) {
        await db
          .update(inventory)
          .set({ stock: newStock, updatedAt: now })
          .where(eq(inventory.id, inv.id));
      } else {
        const [wh] = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId)).limit(1);
        await db.insert(inventory).values({
          id: `inv_${companyId}_${po.productId}`,
          companyId,
          productId: po.productId,
          warehouseId: wh?.id || `alm_central_${companyId}`,
          stock: newStock,
        });
      }

      if (prod) {
        productUpdated = {
          id: prod.id,
          sku: prod.sku,
          name: prod.name,
          quantityAdded: po.quantity,
          previousStock: prevStock,
          newStock,
        };
      }
    }
  }

  await db
    .update(shipments)
    .set({
      status: "entregado",
      actualDelivery: now,
      currentLocation: shp.destinationLocation || "Entregado en Almacén Destino",
      updatedAt: now,
    })
    .where(eq(shipments.id, shp.id));

  const stockMsg = productUpdated
    ? ` Se ingresaron +${productUpdated.quantityAdded}u de "${productUpdated.name}" (${productUpdated.sku}) al inventario (Stock: ${productUpdated.previousStock}u ➔ ${productUpdated.newStock}u).`
    : "";

  return {
    success: true,
    trackingNumber: shp.trackingNumber,
    shipmentId: shp.id,
    orderId: shp.purchaseOrderId,
    productUpdated,
    message: `[OK] Recepción confirmada para guía ${shp.trackingNumber}.${stockMsg}`,
  };
}

/**
 * 5. CONSOLIDACIÓN DE CARGA MULTI-SKU Y LANDED COST (Producto + Flete OSRM)
 */
export async function buildConsolidatedLoadPlans(companyId: string): Promise<ConsolidatedLoadPlan[]> {
  const healthList = await analyzeDynamicCatalogHealth(companyId);
  const itemsNeedingRestock = healthList.filter((h) => h.status !== "OPTIMO" && h.inTransitQuantity === 0 && h.suggestedOrderQty !== null && h.suggestedOrderQty > 0);

  if (itemsNeedingRestock.length === 0) return [];

  const [whs, supps, suppProds] = await Promise.all([
    db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
    db.select().from(suppliers).where(eq(suppliers.companyId, companyId)),
    db.select().from(supplierProducts).where(eq(supplierProducts.companyId, companyId)),
  ]);

  const currency = await getCompanyCurrency(companyId);
  const mainWh = whs[0];
  const destGeo = mainWh ? await resolveNodeGeoPoint(mainWh) : null;
  if (!destGeo) return []; // sin ubicacion real del almacen no se calcula ruta

  const groupedBySupplier = new Map<
    string,
    {
      supplier: typeof suppliers.$inferSelect | null;
      items: Array<{
        health: DynamicInventoryHealth;
        unitPrice: number;
        leadTimeDays: number | null;
      }>;
    }
  >();

  for (const item of itemsNeedingRestock) {
    const offers = suppProds
      .filter((sp) => sp.productId === item.productId)
      .sort((a, b) => parseFloat(a.unitPrice) - parseFloat(b.unitPrice));

    let chosenSupp: typeof suppliers.$inferSelect | null = null;
    let unitPrice = item.unitCostEstimate;
    let leadTimeDays = item.leadTimeDays;

    if (offers.length > 0) {
      chosenSupp = supps.find((s) => s.id === offers[0].supplierId) || null;
      unitPrice = parseFloat(offers[0].unitPrice);
      leadTimeDays = offers[0].leadTimeDays;
    }

    if (!chosenSupp || unitPrice === null) continue; // sin proveedor/precio real no se planifica
    const groupKey = chosenSupp.id;
    if (!groupedBySupplier.has(groupKey)) {
      groupedBySupplier.set(groupKey, { supplier: chosenSupp, items: [] });
    }
    groupedBySupplier.get(groupKey)!.items.push({ health: item, unitPrice, leadTimeDays });
  }

  const plans: ConsolidatedLoadPlan[] = [];

  for (const [suppKey, group] of groupedBySupplier.entries()) {
    const supp = group.supplier;
    const originGeo = supp ? await resolveNodeGeoPoint(supp) : null;
    if (!originGeo) continue; // proveedor sin ubicacion real: no se inventa origen

    const route = await calculateRealRoute(originGeo, destGeo, { currency, companyId });

    const planItems = group.items.map(({ health, unitPrice }) => {
      const qty = health.suggestedOrderQty ?? 0;
      const subtotal = Math.round(qty * unitPrice * 100) / 100;
      return {
        productId: health.productId,
        sku: health.sku,
        name: health.name,
        productName: health.name,
        currentStock: health.totalStock,
        reorderPoint: health.reorderPointDynamic,
        quantityToOrder: qty,
        quantity: qty,
        unitPrice,
        subtotalProductCost: subtotal,
        lineCostMxn: subtotal,
      };
    });

    const subtotalProducts = planItems.reduce((acc, i) => acc + i.subtotalProductCost, 0);
    const estimatedFreightCost = route.costoFleteEstimado;
    const totalLandedCost = estimatedFreightCost === null ? null : subtotalProducts + estimatedFreightCost;
    const freightSharePercentage =
      estimatedFreightCost === null || totalLandedCost === null || totalLandedCost <= 0
        ? null
        : Math.round((estimatedFreightCost / totalLandedCost) * 1000) / 10;
    const consolidationSavingsMxn =
      estimatedFreightCost === null ? null : Math.max(0, (planItems.length - 1) * estimatedFreightCost);
    const supplierCity = supp?.city
      ? `${supp.city}${supp.state ? `, ${supp.state}` : ""}`
      : originGeo.name || "Centro Logístico";

    plans.push({
      supplierId: suppKey,
      supplierName: supp ? supp.name : suppKey,
      supplierLocation: supplierCity,
      supplierCity,
      destinationWarehouseName: mainWh?.name || "Almacén Central",
      items: planItems,
      subtotalProducts,
      productsCostMxn: subtotalProducts,
      estimatedFreightCost,
      freightCostMxn: estimatedFreightCost,
      consolidationSavingsMxn,
      totalLandedCost,
      totalLandedCostMxn: totalLandedCost,
      freightSharePercentage,
      distanceKm: route.distanceKm,
      durationFormatted: route.durationFormatted,
      leadTimeDays: (() => {
        const known = group.items.map((i) => i.leadTimeDays).filter((v): v is number => v !== null);
        return known.length > 0 ? Math.max(...known) : null;
      })(),
      currency,
    });
  }

  return plans;
}
