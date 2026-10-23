import { db } from "../../db/client";
import { shipments, purchaseOrders } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { compactShipmentFacts } from "../context/contextManager";

export interface ShipmentAnalysis {
  activeShipmentsCount: number;
  delayedShipmentsCount: number;
  inTransitQuantity: number;
  hasDelayedShipment: boolean;
  delayedTrackingNumbers: string[];
  compactFacts: string;
}

/**
 * Especialista en Transporte y Rutas: audita el estado real de los camiones y guías en tránsito.
 */
export async function analyzeShipmentsForProduct(
  productId: string,
  companyId: string = "comp_default",
): Promise<ShipmentAnalysis> {
  const activeOrders = await db
    .select({
      orderId: purchaseOrders.id,
      quantity: purchaseOrders.quantity,
    })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.productId, productId),
        eq(purchaseOrders.companyId, companyId),
        eq(purchaseOrders.status, "abierta"),
      ),
    );

  const orderIds = activeOrders.map((o) => o.orderId);

  // Consultar todos los envíos activos de la empresa
  const allCompanyShipments = await db
    .select()
    .from(shipments)
    .where(eq(shipments.companyId, companyId));

  const relevantShipments = allCompanyShipments.filter(
    (s) => s.purchaseOrderId && orderIds.includes(s.purchaseOrderId),
  );

  const now = new Date();
  const delayedShipments = relevantShipments.filter(
    (s) => s.status === "retrasado" || (s.status === "en_transito" && new Date(s.estimatedDelivery) < now),
  );

  const inTransitQuantity = activeOrders.reduce((sum, o) => sum + o.quantity, 0);

  const compactFacts = compactShipmentFacts(
    relevantShipments.map((s) => ({
      trackingNumber: s.trackingNumber,
      carrier: s.carrier,
      status: s.status,
      estimatedDelivery: s.estimatedDelivery,
      currentLocation: s.currentLocation,
      purchaseOrderId: s.purchaseOrderId,
      isDelayed: delayedShipments.some((d) => d.id === s.id),
    })),
  );

  return {
    activeShipmentsCount: relevantShipments.length,
    delayedShipmentsCount: delayedShipments.length,
    inTransitQuantity,
    hasDelayedShipment: delayedShipments.length > 0,
    delayedTrackingNumbers: delayedShipments.map((s) => s.trackingNumber),
    compactFacts,
  };
}
