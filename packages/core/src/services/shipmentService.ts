import { shipments } from "../db/schema";
import { db } from "../db/client";
import { eq, and } from "drizzle-orm";

export interface ShipmentTrackInput {
  companyId?: string;
  trackingNumber?: string;
  orderId?: string;
}

export interface ShipmentRecord {
  id: string;
  trackingNumber: string;
  purchaseOrderId?: string | null;
  carrier: string;
  status: "en_preparacion" | "en_transito" | "retrasado" | "entregado" | "cancelado";
  estimatedDelivery: string;
  actualDelivery?: string | null;
  originLocation?: string | null;
  currentLocation?: string | null;
  destinationLocation?: string | null;
  notes?: string | null;
}

export async function trackShipments(
  input: ShipmentTrackInput,
): Promise<{ success: boolean; total: number; shipments: ShipmentRecord[]; message: string }> {
  const effectiveCompanyId = input.companyId || "comp_default";

  try {
    let rows;

    if (input.trackingNumber) {
      rows = await db
        .select()
        .from(shipments)
        .where(
          and(
            eq(shipments.companyId, effectiveCompanyId),
            eq(shipments.trackingNumber, input.trackingNumber),
          ),
        );
    } else if (input.orderId) {
      rows = await db
        .select()
        .from(shipments)
        .where(
          and(
            eq(shipments.companyId, effectiveCompanyId),
            eq(shipments.purchaseOrderId, input.orderId),
          ),
        );
    } else {
      rows = await db
        .select()
        .from(shipments)
        .where(eq(shipments.companyId, effectiveCompanyId));
    }

    const mapped: ShipmentRecord[] = rows.map((r) => ({
      id: r.id,
      trackingNumber: r.trackingNumber,
      purchaseOrderId: r.purchaseOrderId,
      carrier: r.carrier,
      status: r.status as any,
      estimatedDelivery: r.estimatedDelivery.toISOString(),
      actualDelivery: r.actualDelivery ? r.actualDelivery.toISOString() : null,
      originLocation: r.originLocation,
      currentLocation: r.currentLocation,
      destinationLocation: r.destinationLocation,
      notes: r.notes,
    }));

    return {
      success: true,
      total: mapped.length,
      shipments: mapped,
      message:
        mapped.length > 0
          ? `Se encontraron ${mapped.length} envíos registrados en la base de datos.`
          : "No hay envíos registrados para los criterios indicados en la base de datos.",
    };
  } catch (err: any) {
    console.error("Error al consultar envíos en base de datos:", err);
    return {
      success: false,
      total: 0,
      shipments: [],
      message: `Error al conectar con la base de datos de envíos: ${err.message}`,
    };
  }
}
