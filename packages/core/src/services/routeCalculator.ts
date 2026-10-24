/**
 * Motor Global de Cálculo de Rutas y Fletes Logísticos
 * Conecta con OSRM (Open Source Routing Machine) y cartografía global OpenStreetMap
 * para calcular distancias viales reales, tiempos de conducción y costos de transporte en cualquier parte del mundo.
 */

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
  baseRate?: number;
  ratePerKm?: number;
}

export interface RouteCalculationResult {
  isSuccess: boolean;
  origin: GeoPoint;
  destination: GeoPoint;
  distanceKm: number;
  durationMinutes: number;
  durationHours: number;
  durationFormatted: string;
  costoFleteEstimado: number;
  estimatedFreightCostMxn: number;
  costoFleteFormatted: string;
  moneda: string;
  desgloseCostos: {
    tarifaBase: number;
    costoPorDistancia: number;
    peajesYTasasTransito: number;
  };
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

  // Modelo de costos logísticos estandarizado por divisa:
  const isMxn = currency.toUpperCase() === "MXN";
  const isCop = currency.toUpperCase() === "COP";
  const tarifaBase = options.baseRate ?? (isCop ? 45000 : isMxn ? 850 : 50);
  const tarifaKm = options.ratePerKm ?? (isCop ? 1800 : isMxn ? 16.5 : 1.25);
  const factorPeaje = isCop ? 250 : isMxn ? 2.8 : 0.2;

  const costoDistancia = Math.round(distanceKm * tarifaKm);
  const peajesTransito = distanceKm > 60 ? Math.round(distanceKm * factorPeaje) : 0;
  const totalFlete = tarifaBase + costoDistancia + peajesTransito;

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
    costoFleteFormatted: `$${totalFlete.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`,
    moneda: currency,
    desgloseCostos: {
      tarifaBase,
      costoPorDistancia: costoDistancia,
      peajesYTasasTransito: peajesTransito,
    },
    origenNombre: origin.name || `${origin.city || "Origen"}${origin.state ? `, ${origin.state}` : ""}`,
    destinoNombre: destination.name || `${destination.city || "Destino"}${destination.state ? `, ${destination.state}` : ""}`,
    motorUtilizado: motor,
  };
}

