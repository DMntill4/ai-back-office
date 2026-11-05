import { db } from "../db/client";
import {
  fleetVehicles,
  shipments,
  warehouses,
  products,
  inventory,
  users,
} from "../db/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { calculateRealRoute, GeoPoint } from "./routeCalculator";
import { geocodeAddressOrCity, resolveNodeGeoPoint } from "./geocodingService";
import { appendDailyAuditLog } from "./obsidianMemoryService";

export interface CargoManifestItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitWeightKg: number;
  totalWeightKg: number;
}

export interface CreateVehicleInput {
  companyId: string;
  name: string;
  plateNumber: string;
  vehicleType?: "van" | "box_truck" | "heavy_truck" | "motorcycle";
  maxWeightKg?: number;
  maxVolumeM3?: number;
  assignedDriverId?: string;
  notes?: string;
}

export interface DispatchShipmentInput {
  companyId: string;
  originWarehouseId: string;
  destinationAddress: string;
  destinationCity?: string;
  vehicleId: string;
  driverId?: string;
  items: Array<{ productId: string; quantity: number; unitWeightKg?: number }>;
  notes?: string;
  userRole?: string;
}

export interface DispatchResult {
  isSuccess: boolean;
  message: string;
  code?: string;
  shipmentId?: string;
  trackingNumber?: string;
  vehicle?: {
    id: string;
    name: string;
    plateNumber: string;
    maxWeightKg: number;
    capacityUtilizationPct: number;
  };
  cargoManifest?: CargoManifestItem[];
  totalWeightKg?: number;
  route?: {
    distanceKm: number;
    durationFormatted: string;
    freightCostFormatted: string;
    origin: string;
    destination: string;
  };
}

/**
 * Registra un nuevo vehículo en la flota de la empresa
 */
export async function createFleetVehicle(input: CreateVehicleInput) {
  const vehicleId = `veh_${randomUUID().slice(0, 8)}`;
  const [created] = await db
    .insert(fleetVehicles)
    .values({
      id: vehicleId,
      companyId: input.companyId,
      name: input.name,
      plateNumber: input.plateNumber.toUpperCase().trim(),
      vehicleType: input.vehicleType || "box_truck",
      maxWeightKg: String(input.maxWeightKg || 3500),
      maxVolumeM3: String(input.maxVolumeM3 || 18),
      assignedDriverId: input.assignedDriverId || null,
      status: "available",
      notes: input.notes || null,
    })
    .returning();

  return created;
}

/**
 * Consulta la flota de vehículos activa de la empresa
 */
export async function listFleetVehicles(companyId: string) {
  return db
    .select()
    .from(fleetVehicles)
    .where(eq(fleetVehicles.companyId, companyId));
}

/**
 * Despacha un embarque calculando manifiesto de carga real,
 * validando sobrepeso vehicular, descontando stock y trazando ruta GPS
 */
export async function dispatchShipmentWithManifest(
  input: DispatchShipmentInput,
): Promise<DispatchResult> {
  const effectiveRole = (input.userRole || "operator").toLowerCase().trim();

  // 1. Verificación RBAC de despacho
  if (effectiveRole === "viewer" || effectiveRole === "driver") {
    return {
      isSuccess: false,
      code: "DENIED_INSUFFICIENT_PERMISSIONS",
      message: `Acceso denegado: El rol '${effectiveRole}' no tiene autorización para despachar carga en almacén.`,
    };
  }

  // 2. Validar vehículo de la flota
  const [vehicle] = await db
    .select()
    .from(fleetVehicles)
    .where(
      and(
        eq(fleetVehicles.id, input.vehicleId),
        eq(fleetVehicles.companyId, input.companyId),
      ),
    )
    .limit(1);

  if (!vehicle) {
    return {
      isSuccess: false,
      code: "VEHICLE_NOT_FOUND",
      message: `Vehículo con ID '${input.vehicleId}' no encontrado en la flota de la empresa.`,
    };
  }

  if (vehicle.status === "maintenance") {
    return {
      isSuccess: false,
      code: "VEHICLE_UNAVAILABLE",
      message: `El vehículo '${vehicle.name}' (Placas: ${vehicle.plateNumber}) está en mantenimiento y no puede ser despachado.`,
    };
  }

  // 3. Validar almacén de origen
  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(
      and(
        eq(warehouses.id, input.originWarehouseId),
        eq(warehouses.companyId, input.companyId),
      ),
    )
    .limit(1);

  if (!warehouse) {
    return {
      isSuccess: false,
      code: "WAREHOUSE_NOT_FOUND",
      message: `Almacén de origen '${input.originWarehouseId}' no encontrado.`,
    };
  }

  // 4. Validar productos, existencias y construir el manifiesto de carga
  if (!input.items || input.items.length === 0) {
    return {
      isSuccess: false,
      code: "EMPTY_CARGO",
      message: "El despacho debe contener al menos un producto en el manifiesto de carga.",
    };
  }

  const cargoManifest: CargoManifestItem[] = [];
  let totalWeightKg = 0;

  for (const item of input.items) {
    if (item.quantity <= 0) continue;

    const [prod] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.companyId, input.companyId),
          or(eq(products.id, item.productId), ilike(products.sku, item.productId)),
        ),
      )
      .limit(1);

    if (!prod) {
      return {
        isSuccess: false,
        code: "PRODUCT_NOT_FOUND",
        message: `Producto '${item.productId}' no existe en el catálogo.`,
      };
    }

    // Validar existencias en almacén
    const [inv] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.companyId, input.companyId),
          eq(inventory.productId, prod.id),
          eq(inventory.warehouseId, warehouse.id),
        ),
      )
      .limit(1);

    const availableStock = inv ? inv.stock : 0;
    if (availableStock < item.quantity) {
      return {
        isSuccess: false,
        code: "INSUFFICIENT_STOCK",
        message: `Stock insuficiente en almacén '${warehouse.name}' para '${prod.name}'. Disponible: ${availableStock} u, solicitado para despacho: ${item.quantity} u.`,
      };
    }

    // Peso unitario (de input o estimado por defecto a 1.2 kg si no especificado)
    const unitWeight = item.unitWeightKg || 1.2;
    const itemTotalWeight = Math.round(item.quantity * unitWeight * 100) / 100;

    cargoManifest.push({
      productId: prod.id,
      sku: prod.sku,
      name: prod.name,
      quantity: item.quantity,
      unitWeightKg: unitWeight,
      totalWeightKg: itemTotalWeight,
    });

    totalWeightKg += itemTotalWeight;
  }

  totalWeightKg = Math.round(totalWeightKg * 100) / 100;
  const maxVehicleWeight = Number(vehicle.maxWeightKg);

  // 5. ESCUDO DE SOBREPESO VEHICULAR (Anti-Overload Protection)
  if (totalWeightKg > maxVehicleWeight) {
    return {
      isSuccess: false,
      code: "OVERWEIGHT_CAPACITY_EXCEEDED",
      message: `[ALERTA DE SEGURIDAD VIAL] La carga total solicitada (${totalWeightKg} kg) excede la capacidad máxima del vehículo '${vehicle.name}' (${maxVehicleWeight} kg). Despacho bloqueado para evitar infracciones y riesgos de transporte.`,
      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        plateNumber: vehicle.plateNumber,
        maxWeightKg: maxVehicleWeight,
        capacityUtilizationPct: Math.round((totalWeightKg / maxVehicleWeight) * 100),
      },
    };
  }

  const capacityUtilizationPct =
    maxVehicleWeight > 0
      ? Math.min(100, Math.round((totalWeightKg / maxVehicleWeight) * 10000) / 100)
      : 0;

  // 6. Geocodificación y cálculo de ruta vial OSRM
  const originGeo: GeoPoint = (await resolveNodeGeoPoint(warehouse)) || {
    latitude: 19.4326,
    longitude: -99.1332,
    name: warehouse.name,
    address: warehouse.streetAddress || warehouse.name,
    city: warehouse.city || "Ciudad de Origen",
  };

  const geocodedDest = await geocodeAddressOrCity(input.destinationAddress);
  const destinationGeo: GeoPoint = geocodedDest
    ? {
        latitude: geocodedDest.latitude,
        longitude: geocodedDest.longitude,
        name: geocodedDest.displayName,
        address: geocodedDest.displayName,
        city: geocodedDest.city || input.destinationCity || "Ciudad de Destino",
      }
    : {
        latitude: originGeo.latitude + 0.15,
        longitude: originGeo.longitude + 0.15,
        name: input.destinationAddress,
        address: input.destinationAddress,
        city: input.destinationCity || "Ciudad de Destino",
      };

  const routeCalc = await calculateRealRoute(originGeo, destinationGeo, {
    companyId: input.companyId,
  });

  // 7. Aplicar deducción de inventario en almacén y write-back
  for (const item of cargoManifest) {
    const [inv] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.companyId, input.companyId),
          eq(inventory.productId, item.productId),
          eq(inventory.warehouseId, warehouse.id),
        ),
      )
      .limit(1);

    if (inv) {
      const newStock = Math.max(0, inv.stock - item.quantity);
      await db
        .update(inventory)
        .set({ stock: newStock })
        .where(eq(inventory.id, inv.id));

      // Write-back hacia fuentes externas cliente (CSV, SQLite)
      try {
        const ingestMod: any = await import("@mint/ingest");
        if (typeof ingestMod.writeBackStockUpdateToSource === "function") {
          await ingestMod.writeBackStockUpdateToSource({
            companyId: input.companyId,
            productId: item.productId,
            sku: item.sku,
            newStock,
            reason: `Despacho en camión ${vehicle.plateNumber}: -${item.quantity} u`,
          });
        }
      } catch {}
    }
  }

  // 8. Crear registro de embarque con manifiesto de carga completo
  const shipmentId = `ship_${randomUUID().slice(0, 8)}`;
  const trackingNumber = `TRK-${vehicle.plateNumber.replace(/[^A-Z0-9]/g, "")}-${Date.now().toString().slice(-4)}`;
  const estimatedDelivery = new Date(Date.now() + Math.max(2, routeCalc.durationHours) * 3600 * 1000);

  await db.insert(shipments).values({
    id: shipmentId,
    companyId: input.companyId,
    vehicleId: vehicle.id,
    driverId: input.driverId || vehicle.assignedDriverId || null,
    originWarehouseId: warehouse.id,
    trackingNumber,
    carrier: `${vehicle.name} (${vehicle.plateNumber})`,
    status: "en_transito",
    estimatedDelivery,
    originLocation: `${warehouse.name} (${originGeo.city || "Origen"})`,
    currentLocation: `${warehouse.name} (Despachado)`,
    destinationLocation: input.destinationCity || input.destinationAddress,
    destinationAddress: input.destinationAddress,
    destinationLatitude: String(destinationGeo.latitude),
    destinationLongitude: String(destinationGeo.longitude),
    cargoManifest,
    totalWeightKg: String(totalWeightKg),
    capacityUtilizationPct: String(capacityUtilizationPct),
    freightCostMxn: String(routeCalc.costoFleteEstimado || 0),
    notes: input.notes || "Embarque despachado con manifiesto de carga verificado.",
  });

  // 9. Actualizar estado del vehículo a en tránsito
  await db
    .update(fleetVehicles)
    .set({
      status: "in_transit",
      currentLatitude: String(originGeo.latitude),
      currentLongitude: String(originGeo.longitude),
    })
    .where(eq(fleetVehicles.id, vehicle.id));

  // 10. Registrar en Obsidian Vault (Auditoría)
  try {
    await appendDailyAuditLog({
      companyId: input.companyId,
      action: `Despacho de Embarque: ${trackingNumber}`,
      details: `Vehículo: ${vehicle.name} [${vehicle.plateNumber}] | Carga: ${totalWeightKg} kg (${capacityUtilizationPct}% ocupación) | Manifiesto: ${cargoManifest.map((c) => `${c.quantity}x ${c.sku}`).join(", ")} | Destino: ${input.destinationAddress} | Ruta: ${routeCalc.distanceKm} km (${routeCalc.durationFormatted})`,
      timestamp: new Date(),
    });
  } catch {}

  return {
    isSuccess: true,
    message: `Embarque despachado exitosamente con guía ${trackingNumber}. Vehículo en tránsito con ${cargoManifest.length} tipo(s) de producto (${totalWeightKg} kg, ${capacityUtilizationPct}% de ocupación).`,
    shipmentId,
    trackingNumber,
    vehicle: {
      id: vehicle.id,
      name: vehicle.name,
      plateNumber: vehicle.plateNumber,
      maxWeightKg: maxVehicleWeight,
      capacityUtilizationPct,
    },
    cargoManifest,
    totalWeightKg,
    route: {
      distanceKm: routeCalc.distanceKm,
      durationFormatted: routeCalc.durationFormatted,
      freightCostFormatted: routeCalc.costoFleteFormatted,
      origin: originGeo.name || warehouse.name,
      destination: destinationGeo.name || input.destinationAddress,
    },
  };
}

/**
 * Consulta la Hoja de Ruta / Manifiesto de Carga de un vehículo o guía
 */
export async function getHojaDeRuta(companyId: string, query: string) {
  const clean = query.trim().toUpperCase();

  // Buscar por guía o id de embarque
  let [ship] = await db
    .select()
    .from(shipments)
    .where(
      and(
        eq(shipments.companyId, companyId),
        or(
          ilike(shipments.trackingNumber, `%${clean}%`),
          eq(shipments.id, query.trim()),
        ),
      ),
    )
    .limit(1);

  // Si no se encontró por guía, buscar el embarque activo del vehículo por placa o nombre
  if (!ship) {
    const [veh] = await db
      .select()
      .from(fleetVehicles)
      .where(
        and(
          eq(fleetVehicles.companyId, companyId),
          or(
            ilike(fleetVehicles.plateNumber, `%${clean}%`),
            ilike(fleetVehicles.name, `%${clean}%`),
            eq(fleetVehicles.id, query.trim()),
          ),
        ),
      )
      .limit(1);

    if (veh) {
      const activeShipments = await db
        .select()
        .from(shipments)
        .where(
          and(
            eq(shipments.companyId, companyId),
            eq(shipments.vehicleId, veh.id),
            eq(shipments.status, "en_transito"),
          ),
        )
        .limit(1);

      if (activeShipments.length > 0) {
        ship = activeShipments[0];
      }
    }
  }

  if (!ship) {
    return {
      isSuccess: false,
      message: `No se encontró ningún embarque u hoja de ruta para '${query}'.`,
    };
  }

  // Obtener chofer si existe
  let driverName = "Conductor Asignado";
  if (ship.driverId) {
    const [driverUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, ship.driverId))
      .limit(1);
    if (driverUser) driverName = driverUser.name;
  }

  const manifest = (ship.cargoManifest as CargoManifestItem[]) || [];

  return {
    isSuccess: true,
    hojaDeRuta: {
      guiaRastreo: ship.trackingNumber,
      estado: ship.status.toUpperCase(),
      transportista: ship.carrier,
      conductor: driverName,
      origen: ship.originLocation,
      posicionActual: ship.currentLocation,
      destino: ship.destinationAddress || ship.destinationLocation,
      fechaEstimadaLlegada: ship.estimatedDelivery.toLocaleString(),
      pesoTotalCargaKg: Number(ship.totalWeightKg || 0),
      porcentajeOcupacion: `${Number(ship.capacityUtilizationPct || 0)}%`,
      costoFleteEstimado: `$${Number(ship.freightCostMxn || 0).toFixed(2)} USD`,
      manifiestoDeCarga: manifest.map((m) => ({
        sku: m.sku,
        producto: m.name,
        cantidad: `${m.quantity} unidades`,
        pesoTotal: `${m.totalWeightKg} kg`,
      })),
      totalBultos: manifest.reduce((acc, m) => acc + (m.quantity || 0), 0),
    },
  };
}
