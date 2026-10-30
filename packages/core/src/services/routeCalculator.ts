/**
 * Motor Global de Cálculo de Rutas y Fletes Logísticos
 * Conecta con OSRM (Open Source Routing Machine) y cartografía global OpenStreetMap
 * para calcular distancias viales reales, tiempos de conducción y costos de transporte en cualquier parte del mundo.
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { businessConfig } from "../db/schema";
import { addPendingQuestion } from "./pendingQuestionsService";

/** Lee las tarifas de flete que la empresa configuro (business_config). Sin valor = undefined. */
async function loadFreightTariffs(companyId: string): Promise<{
  baseRate?: number;
  ratePerKm?: number;
  tollRatePerKm?: number;
}> {
  try {
    const rows = await db
      .select()
      .from(businessConfig)
      .where(
        and(
          eq(businessConfig.companyId, companyId),
          inArray(businessConfig.key, ["freight_base_rate", "freight_rate_per_km", "freight_toll_rate_per_km"]),
        ),
      );
    const num = (key: string): number | undefined => {
      const v = rows.find((r) => r.key === key)?.value;
      const n = v !== undefined ? Number(v) : NaN;
      return Number.isFinite(n) && n >= 0 ? n : undefined;
    };
    return {
      baseRate: num("freight_base_rate"),
      ratePerKm: num("freight_rate_per_km"),
      tollRatePerKm: num("freight_toll_rate_per_km"),
    };
  } catch {
    return {};
  }
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface RouteCalculationOptions {
  currency?: string;
  /** Empresa dueña de la tarifa; si no se pasan tarifas explícitas se leen de business_config */
  companyId?: string;
  baseRate?: number;
  ratePerKm?: number;
  tollRatePerKm?: number;
}

export interface RouteCalculationResult {
  isSuccess: boolean;
  origin: GeoPoint;
  destination: GeoPoint;
  distanceKm: number;
  durationMinutes: number;
  durationHours: number;
  durationFormatted: string;
  /** null cuando la empresa no configuro tarifas: MINT no inventa el flete */
  costoFleteEstimado: number | null;
  estimatedFreightCostMxn: number | null;
  costoFleteFormatted: string;
  moneda: string;
  desgloseCostos: {
    tarifaBase: number;
    costoPorDistancia: number;
    peajesYTasasTransito: number;
  } | null;
  origenNombre: string;
  destinoNombre: string;
  motorUtilizado: "OSRM_GLOBAL_ROUTING_ENGINE" | "HAVERSINE_CORRIDOR_FALLBACK";
}

/**
 * Fórmula de la distancia del semiverseno (Haversine) para respaldo en caso de contingencia de red
 */
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Factor de tortuosidad vial promedio internacional (+25% sobre distancia geodésica)
  return Math.round(R * c * 1.25);
}

export async function calculateRealRoute(
  origin: GeoPoint,
  destination: GeoPoint,
  options: RouteCalculationOptions = {},
): Promise<RouteCalculationResult> {
  const lon1 = origin.longitude;
  const lat1 = origin.latitude;
  const lon2 = destination.longitude;
  const lat2 = destination.latitude;
  const currency = options.currency || "USD";

  let distanceKm = 0;
  let durationMinutes = 0;
  let motor: "OSRM_GLOBAL_ROUTING_ENGINE" | "HAVERSINE_CORRIDOR_FALLBACK" = "OSRM_GLOBAL_ROUTING_ENGINE";

  try {
    const url = `http://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        durationMinutes = Math.round(route.duration / 60);
      } else {
        throw new Error("Respuesta OSRM sin rutas válidas");
      }
    } else {
      throw new Error(`HTTP ${res.status} desde servicio OSRM`);
    }
  } catch {
    distanceKm = haversineDistanceKm(lat1, lon1, lat2, lon2);
    // Velocidad promedio logística de 75 km/h en autopistas
    durationMinutes = Math.round((distanceKm / 75) * 60);
    motor = "HAVERSINE_CORRIDOR_FALLBACK";
  }

  // Tarifas: explicitas > configuradas por la empresa > desconocidas (nunca por divisa fija)
  let tarifaBase = options.baseRate;
  let tarifaKm = options.ratePerKm;
  let tarifaPeajeKm = options.tollRatePerKm;

  if ((tarifaBase === undefined || tarifaKm === undefined) && options.companyId) {
    const cfg = await loadFreightTariffs(options.companyId);
    tarifaBase = tarifaBase ?? cfg.baseRate;
    tarifaKm = tarifaKm ?? cfg.ratePerKm;
    tarifaPeajeKm = tarifaPeajeKm ?? cfg.tollRatePerKm;
  }

  let totalFlete: number | null = null;
  let desglose: RouteCalculationResult["desgloseCostos"] = null;

  if (tarifaBase !== undefined && tarifaKm !== undefined) {
    const costoDistancia = Math.round(distanceKm * tarifaKm);
    const peajesTransito = tarifaPeajeKm !== undefined ? Math.round(distanceKm * tarifaPeajeKm) : 0;
    totalFlete = tarifaBase + costoDistancia + peajesTransito;
    desglose = { tarifaBase, costoPorDistancia: costoDistancia, peajesYTasasTransito: peajesTransito };
  } else if (options.companyId) {
    await addPendingQuestion(
      options.companyId,
      "freight_tariff_missing",
      "No tengo este dato: cual es la tarifa base y la tarifa por km de flete (en la divisa de la empresa)? Configura freight_base_rate y freight_rate_per_km.",
      {},
    ).catch(() => {});
  }

  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const durationFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
  const durationHours = Math.round((durationMinutes / 60) * 10) / 10;

  return {
    isSuccess: true,
    origin,
    destination,
    distanceKm,
    durationMinutes,
    durationHours,
    durationFormatted,
    costoFleteEstimado: totalFlete,
    estimatedFreightCostMxn: totalFlete,
    costoFleteFormatted:
      totalFlete === null
        ? "sin tarifa configurada"
        : `$${totalFlete.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`,
    moneda: currency,
    desgloseCostos: desglose,
    origenNombre: origin.name || `${origin.city || "Origen"}${origin.state ? `, ${origin.state}` : ""}`,
    destinoNombre: destination.name || `${destination.city || "Destino"}${destination.state ? `, ${destination.state}` : ""}`,
    motorUtilizado: motor,
  };
}

