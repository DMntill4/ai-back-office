import { randomUUID } from "node:crypto";
import { db } from "../db/client";
import { products, inventory, shipments, purchaseOrders, operationalEvents } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { coordinateOperationalEvent } from "../agent/coordinador";

export interface EventScanSummary {
  stockDeficitsFound: number;
  delayedShipmentsFound: number;
  eventsTriggered: number;
  processedDecisions: string[];
}

/**
 * Escanea la base de datos real en búsqueda de productos bajo el stock mínimo de seguridad
 */
export async function scanRealInventoryDeficits(
  companyId: string = "comp_default",
): Promise<Array<{ productId: string; name: string; currentStock: number; minStock: number }>> {
  const prods = await db.select().from(products).where(eq(products.companyId, companyId));
  const invs = await db.select().from(inventory).where(eq(inventory.companyId, companyId));

  const deficits: Array<{ productId: string; name: string; currentStock: number; minStock: number }> = [];

  for (const p of prods) {
    const itemStock = invs.filter((i) => i.productId === p.id).reduce((sum, item) => sum + item.stock, 0);
    if (itemStock < p.minStock) {
      deficits.push({
        productId: p.id,
        name: p.name,
        currentStock: itemStock,
        minStock: p.minStock,
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
 * Ejecuta el ciclo completo de ingestión de eventos sobre datos reales
 */
export async function runFullOperationalEventScan(
  companyId: string = "comp_default",
): Promise<EventScanSummary> {
  const [deficits, delayed] = await Promise.all([
    scanRealInventoryDeficits(companyId),
    scanRealShipmentDelays(companyId),
  ]);

  const processedDecisions: string[] = [];
  let eventsTriggered = 0;

  // 1. Procesar desabastos reales
  for (const def of deficits) {
    // Verificar si ya existe un evento PENDING o PROCESSING para este producto
    const existingEvents = await db
      .select()
      .from(operationalEvents)
      .where(and(eq(operationalEvents.companyId, companyId), eq(operationalEvents.status, "PENDING")));

    const isAlreadyQueued = existingEvents.some(
      (e) => (e.payload as any)?.productId === def.productId,
    );

    if (!isAlreadyQueued) {
      const eventId = `ev_${randomUUID().slice(0, 8)}`;
      await db.insert(operationalEvents).values({
        id: eventId,
        companyId,
        eventType: "STOCK_CRITICAL",
        severity: def.currentStock === 0 ? "CRITICAL" : "HIGH",
        status: "PROCESSING",
        title: `Déficit de Inventario Real: ${def.name}`,
        description: `Existencias actuales (${def.currentStock}u) cayeron bajo el umbral mínimo (${def.minStock}u).`,
        payload: {
          productId: def.productId,
          currentStock: def.currentStock,
          minStock: def.minStock,
        },
      });

      eventsTriggered++;

      // Disparar red multi-agente
      const coordResult = await coordinateOperationalEvent({
        eventId,
        eventType: "STOCK_CRITICAL",
        companyId,
        productId: def.productId,
        title: `Abastecimiento para ${def.name}`,
        description: `Déficit detectado en almacén: ${def.currentStock}/${def.minStock}u`,
        payload: { productId: def.productId },
      });

      if (coordResult.decisionId) {
        processedDecisions.push(coordResult.decisionId);
      }
    }
  }

  // 2. Procesar retrasos reales de transporte
  for (const del of delayed) {
    if (del.orderId) {
      // Buscar producto vinculado a la orden
      const po = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, del.orderId))
        .limit(1);

      if (po.length > 0) {
        const prodId = po[0].productId;
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

        if (coordResult.decisionId) {
          processedDecisions.push(coordResult.decisionId);
        }
      }
    }
  }

  return {
    stockDeficitsFound: deficits.length,
    delayedShipmentsFound: delayed.length,
    eventsTriggered,
    processedDecisions,
  };
}
