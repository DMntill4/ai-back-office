import {
  db,
  products,
  inventory,
  shipments,
  purchaseOrders,
  decisions,
  cases,
  businessConfig,
  coordinateOperationalEvent,
  getProductsWithOpenProposals,
} from "@mint/core";
import { eq, and, lte, desc } from "drizzle-orm";

export interface ScanResult {
  stockDeficitsFound: number;
  delayedShipmentsFound: number;
  eventsTriggered: number;
  processedDecisions: string[];
}

/**
 * Disparador: Busca existencias agotadas o bajo el mínimo y abre casos autónomos
 * Idempotente: nunca procesa productos con propuestas abiertas ni satura APIs cartográficas.
 */
export async function scanStockDeficits(companyId: string = "comp_default"): Promise<number> {
  const [prods, invs, blocked] = await Promise.all([
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(inventory).where(eq(inventory.companyId, companyId)),
    getProductsWithOpenProposals(companyId).catch(() => new Set<string>()),
  ]);

  const stockMap = new Map<string, number>();
  for (const inv of invs) {
    stockMap.set(inv.productId, (stockMap.get(inv.productId) || 0) + Number(inv.stock || 0));
  }

  const deficits = prods
    .map((p) => ({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      minStock: p.minStock,
      stock: stockMap.get(p.id) || 0,
    }))
    .filter((r) => r.stock <= r.minStock && !blocked.has(r.productId));

  // Limitar a maximo 5 por ciclo para evitar tormentas de peticiones fantasma
  const batch = deficits.slice(0, 5);
  let triggeredCount = 0;

  for (const item of batch) {
    try {
      await coordinateOperationalEvent({
        eventType: "STOCK_BELOW_MIN",
        companyId,
        productId: item.productId,
        title: `Desabasto detectado: ${item.name} (${item.sku})`,
        description: `El stock total disponible (${item.stock}u) es menor o igual al umbral minimo (${item.minStock}u).`,
        payload: {
          productId: item.productId,
          sku: item.sku,
          currentStock: item.stock,
          minStock: item.minStock,
        },
      });
      blocked.add(item.productId);
      triggeredCount++;
    } catch (err: any) {
      console.error(`[DAEMON TRIGGER] Error evaluando desabasto de ${item.sku}: ${err.message}`);
    }
  }

  return triggeredCount;
}

/**
 * Disparador: Detecta envíos en tránsito retrasados respecto a su ETA prometida
 */
export async function scanDelayedShipments(companyId: string = "comp_default"): Promise<number> {
  const [profileCfg] = await db
    .select({ value: businessConfig.value })
    .from(businessConfig)
    .where(and(eq(businessConfig.companyId, companyId), eq(businessConfig.key, "business_profile")))
    .limit(1);

  if (profileCfg?.value === "tienda" || profileCfg?.value === "tienda_proveedores") {
    // Negocio sin flota: cero ruido de transporte
    return 0;
  }

  const allShipments = await db
    .select()
    .from(shipments)
    .where(eq(shipments.companyId, companyId));

  const now = new Date();
  const delayed = allShipments.filter(
    (s) => s.status === "retrasado" || (s.status === "en_transito" && new Date(s.estimatedDelivery) < now),
  );

  let triggeredCount = 0;

  for (const shp of delayed) {
    try {
      let productId: string | undefined;
      if (shp.purchaseOrderId) {
        const orderRow = await db
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.id, shp.purchaseOrderId))
          .limit(1);
        if (orderRow.length > 0) {
          productId = orderRow[0].productId;
        }
      }

      await coordinateOperationalEvent({
        eventType: "SHIPMENT_DELAYED",
        companyId,
        productId,
        trackingNumber: shp.trackingNumber,
        title: `Envío retrasado: Guía ${shp.trackingNumber} (${shp.carrier})`,
        description: `El envío presenta demora con destino a ${shp.destinationLocation || "almacén"}. ETA prometida: ${new Date(shp.estimatedDelivery).toLocaleDateString("es-MX")}`,
        payload: {
          trackingNumber: shp.trackingNumber,
          carrier: shp.carrier,
          estimatedDelivery: shp.estimatedDelivery,
          currentLocation: shp.currentLocation,
        },
      });
      triggeredCount++;
    } catch (err: any) {
      console.error(`[DAEMON TRIGGER] Error evaluando retraso de envío ${shp.trackingNumber}: ${err.message}`);
    }
  }

  return triggeredCount;
}

/**
 * Plan Diario Programado: Resume la situación operativa del día
 */
export async function generateDailyPlan(companyId: string = "comp_default") {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pendingDecisions = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "pending_approval")));

  const activeCases = await db
    .select()
    .from(cases)
    .where(and(eq(cases.companyId, companyId), eq(cases.status, "en_proceso")));

  const allStock = await db
    .select({
      stock: inventory.stock,
      minStock: products.minStock,
    })
    .from(products)
    .innerJoin(inventory, eq(products.id, inventory.productId))
    .where(eq(products.companyId, companyId));

  const atRiskCount = allStock.filter((s) => s.stock <= s.minStock).length;

  return {
    companyId,
    generatedAt: new Date().toISOString(),
    pendingDecisionsCount: pendingDecisions.length,
    activeCasesCount: activeCases.length,
    productsAtRiskCount: atRiskCount,
    decisions: pendingDecisions.map((d) => ({
      id: d.id,
      title: d.title,
      costMxn: d.costMxn,
      proposingAgent: d.proposingAgent,
    })),
  };
}
