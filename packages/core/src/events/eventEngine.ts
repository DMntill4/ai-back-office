import { randomUUID } from "node:crypto";
import { db } from "../db/client";
import { products, inventory, shipments, purchaseOrders, operationalEvents, salesHistory } from "../db/schema";
import { eq } from "drizzle-orm";
import { coordinateOperationalEvent } from "../agent/coordinador";
import { getProductsWithOpenProposals } from "./openProposals";

export { getProductsWithOpenProposals, REJECTION_COOLDOWN_HOURS } from "./openProposals";

/** Máximo de propuestas nuevas por escaneo para no saturar la bandeja ni los canales. */
export const MAX_NEW_PROPOSALS_PER_SCAN = 10;

export interface InventoryDeficitItem {
  productId: string;
  name: string;
  currentStock: number;
  minStock: number;
  reason?: "deficit_min_stock" | "quiebre_inminente_predictivo";
  daysUntilStockout?: number;
}

export interface EventScanSummary {
  stockDeficitsFound: number;
  delayedShipmentsFound: number;
  eventsTriggered: number;
  processedDecisions: string[];
  /** Productos que ya tenían una propuesta abierta (o rechazada hace poco) y se omitieron. */
  alreadyOpen: number;
  /** Productos que quedaron para el siguiente escaneo por el límite por ciclo. */
  deferred: number;
}

/**
 * Escanea la base de datos real en búsqueda de productos bajo el stock mínimo de seguridad
 * o con quiebre de stock inminente (<= 3 días de cobertura según tasa de venta diaria)
 */
export async function scanRealInventoryDeficits(
  companyId: string = "comp_default",
): Promise<Array<InventoryDeficitItem>> {
  const [prods, invs, sales] = await Promise.all([
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(inventory).where(eq(inventory.companyId, companyId)),
    db.select().from(salesHistory).where(eq(salesHistory.companyId, companyId)),
  ]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const salesMap = new Map<string, number>();
  for (const s of sales) {
    if (new Date(s.saleDate) >= thirtyDaysAgo) {
      salesMap.set(s.productId, (salesMap.get(s.productId) || 0) + s.quantity);
    }
  }

  const deficits: Array<InventoryDeficitItem> = [];

  for (const p of prods) {
    const itemStock = invs.filter((i) => i.productId === p.id).reduce((sum, item) => sum + item.stock, 0);
    const sales30d = salesMap.get(p.id) || 0;
    const dailyBurnRate = sales30d > 0 ? sales30d / 30 : 0;
    const daysUntilStockout = dailyBurnRate > 0 ? Math.round(itemStock / dailyBurnRate) : 999;

    if (itemStock <= p.minStock) {
      deficits.push({
        productId: p.id,
        name: p.name,
        currentStock: itemStock,
        minStock: p.minStock,
        reason: "deficit_min_stock",
        daysUntilStockout,
      });
    } else if (dailyBurnRate > 0 && daysUntilStockout <= 3 && itemStock > 0) {
      // Alerta predictiva inteligente: el stock físico aún no baja de minStock, pero a la velocidad actual se agota en <= 3 días
      deficits.push({
        productId: p.id,
        name: p.name,
        currentStock: itemStock,
        minStock: p.minStock,
        reason: "quiebre_inminente_predictivo",
        daysUntilStockout,
      });
    }
  }

  return deficits;
}

/**
 * Escanea la base de datos real en búsqueda de camiones o guías retrasadas
 */
export async function scanRealShipmentDelays(
  companyId: string = "comp_default",
): Promise<Array<{ shipmentId: string; trackingNumber: string; carrier: string; orderId?: string }>> {
  const allShipments = await db.select().from(shipments).where(eq(shipments.companyId, companyId));
  const now = new Date();

  const delayed = allShipments.filter(
    (s) => s.status === "retrasado" || (s.status === "en_transito" && new Date(s.estimatedDelivery) < now),
  );

  return delayed.map((s) => ({
    shipmentId: s.id,
    trackingNumber: s.trackingNumber,
    carrier: s.carrier,
    orderId: s.purchaseOrderId || undefined,
  }));
}

/**
 * Ejecuta el ciclo completo de ingestión de eventos sobre datos reales.
 * Es idempotente: no vuelve a proponer productos que ya tienen una propuesta abierta,
 * y limita la cantidad de propuestas nuevas por ciclo.
 */
export async function runFullOperationalEventScan(
  companyId: string = "comp_default",
): Promise<EventScanSummary> {
  const [deficits, delayed, blocked] = await Promise.all([
    scanRealInventoryDeficits(companyId),
    scanRealShipmentDelays(companyId),
    getProductsWithOpenProposals(companyId),
  ]);

  const processedDecisions: string[] = [];
  let eventsTriggered = 0;
  let alreadyOpen = 0;
  let deferred = 0;

  const budgetLeft = () => MAX_NEW_PROPOSALS_PER_SCAN - processedDecisions.length;

  // 1. Procesar desabastos reales (los más críticos primero)
  const orderedDeficits = [...deficits].sort((a, b) => a.currentStock - b.currentStock);
  for (const def of orderedDeficits) {
    if (blocked.has(def.productId)) {
      alreadyOpen++;
      continue;
    }
    if (budgetLeft() <= 0) {
      deferred++;
      continue;
    }

    const eventId = `ev_${randomUUID().slice(0, 8)}`;
    await db.insert(operationalEvents).values({
      id: eventId,
      companyId,
      eventType: "STOCK_CRITICAL",
      severity: def.currentStock === 0 ? "CRITICAL" : "HIGH",
      status: "PROCESSING",
      title:
        def.reason === "quiebre_inminente_predictivo"
          ? `Alerta Predictiva de Quiebre: ${def.name}`
          : `Déficit de Inventario Real: ${def.name}`,
      description:
        def.reason === "quiebre_inminente_predictivo"
          ? `Existencias actuales (${def.currentStock}u) se agotarán en ~${def.daysUntilStockout} días según la tasa de ventas diaria.`
          : `Existencias actuales (${def.currentStock}u) cayeron bajo el umbral mínimo (${def.minStock}u).`,
      payload: {
        productId: def.productId,
        currentStock: def.currentStock,
        minStock: def.minStock,
        reason: def.reason || "deficit_min_stock",
        daysUntilStockout: def.daysUntilStockout,
      },
    });

    eventsTriggered++;

    const coordResult = await coordinateOperationalEvent({
      eventId,
      eventType: "STOCK_CRITICAL",
      companyId,
      productId: def.productId,
      title:
        def.reason === "quiebre_inminente_predictivo"
          ? `Reposición Anticipada para ${def.name}`
          : `Abastecimiento para ${def.name}`,
      description:
        def.reason === "quiebre_inminente_predictivo"
          ? `Quiebre inminente en ~${def.daysUntilStockout} días (${def.currentStock}u en almacén)`
          : `Déficit detectado en almacén: ${def.currentStock}/${def.minStock}u`,
      payload: { productId: def.productId },
    });

    blocked.add(def.productId);
    if (coordResult.decisionId) {
      processedDecisions.push(coordResult.decisionId);
    }
  }

  // 2. Procesar retrasos reales de transporte
  for (const del of delayed) {
    if (!del.orderId) continue;

    const po = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, del.orderId)).limit(1);
    if (po.length === 0) continue;

    const prodId = po[0].productId;
    if (blocked.has(prodId)) {
      alreadyOpen++;
      continue;
    }
    if (budgetLeft() <= 0) {
      deferred++;
      continue;
    }

    const eventId = `ev_trn_${randomUUID().slice(0, 8)}`;
    await db.insert(operationalEvents).values({
      id: eventId,
      companyId,
      eventType: "SHIPMENT_DELAY",
      severity: "HIGH",
      status: "PROCESSING",
      title: `Retraso de Transporte: Guía ${del.trackingNumber}`,
      description: `El envío ${del.trackingNumber} de ${del.carrier} presenta demoras en tránsito.`,
      payload: {
        productId: prodId,
        trackingNumber: del.trackingNumber,
        carrier: del.carrier,
        orderId: del.orderId,
      },
    });

    eventsTriggered++;

    const coordResult = await coordinateOperationalEvent({
      eventId,
      eventType: "SHIPMENT_DELAY",
      companyId,
      productId: prodId,
      trackingNumber: del.trackingNumber,
      title: `Riesgo logístico por retraso en guía ${del.trackingNumber}`,
      description: `El transportista reporta demora. Se activa evaluación de compras y cobertura.`,
      payload: { productId: prodId, trackingNumber: del.trackingNumber },
    });

    blocked.add(prodId);
    if (coordResult.decisionId) {
      processedDecisions.push(coordResult.decisionId);
    }
  }

  return {
    stockDeficitsFound: deficits.length,
    delayedShipmentsFound: delayed.length,
    eventsTriggered,
    processedDecisions,
    alreadyOpen,
    deferred,
  };
}
