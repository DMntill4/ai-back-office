/**
 * Motor de Cálculo de Rutas y Fletes Logísticos Reales
 * Conecta con OSRM (Open Source Routing Machine) y cartografía OpenStreetMap
 * para calcular distancias viales reales, tiempos de conducción y costos de flete en México.
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
}

export interface RouteCalculationResult {
  isSuccess: boolean;
  origin: GeoPoint;
  destination: GeoPoint;
  distanceKm: number;
  durationMinutes: number;
  durationFormatted: string;
  costoFleteEstimadoMxn: number;
  costoFleteFormatted: string;
  desgloseCostos: {
    tarifaBaseMxn: number;
    costoPorKmRecorridoMxn: number;
    peajesEstimadosCapufeMxn: number;
  };
  origenNombre: string;
  destinoNombre: string;
  motorUtilizado: "OSRM_ROUTING_ENGINE" | "HAVERSINE_CORRIDOR_FALLBACK";
}

/**
 * Fórmula de la distancia del semiverseno (Haversine) para respaldo en caso de desconexión de red
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
  // Factor de tortuosidad vial típico en México (+25% sobre distancia recta)
  return Math.round(R * c * 1.25);
}

export async function calculateRealRoute(
  origin: GeoPoint,
  destination: GeoPoint,
): Promise<RouteCalculationResult> {
  const lon1 = origin.longitude;
  const lat1 = origin.latitude;
  const lon2 = destination.longitude;
  const lat2 = destination.latitude;

  let distanceKm = 0;
  let durationMinutes = 0;
  let motor: "OSRM_ROUTING_ENGINE" | "HAVERSINE_CORRIDOR_FALLBACK" = "OSRM_ROUTING_ENGINE";

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
    // Respaldo de contingencia vial con factor de tortuosidad
    distanceKm = haversineDistanceKm(lat1, lon1, lat2, lon2);
    // Velocidad promedio logística de 70 km/h en autopistas mexicanas
    durationMinutes = Math.round((distanceKm / 70) * 60);
    motor = "HAVERSINE_CORRIDOR_FALLBACK";
  }

  // Costo logístico real en México (camión de 3.5 toneladas / caja seca):
  // 1. Tarifa base de maniobra y despacho: $850.00 MXN
  // 2. Tarifa kilométrica: $16.50 MXN / km
  // 3. Estimación de peajes CAPUFE en tramos interurbanos (> 50 km)
  const tarifaBase = 850;
  const costoKm = Math.round(distanceKm * 16.5);
  const peajesCapufe = distanceKm > 60 ? Math.round(distanceKm * 2.8) : 0;
  const totalFlete = tarifaBase + costoKm + peajesCapufe;

  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const durationFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  return {
    isSuccess: true,
    origin,
    destination,
    distanceKm,
    durationMinutes,
    durationFormatted,
    costoFleteEstimadoMxn: totalFlete,
    costoFleteFormatted: `$${totalFlete.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`,
    desgloseCostos: {
      tarifaBaseMxn: tarifaBase,
      costoPorKmRecorridoMxn: costoKm,
      peajesEstimadosCapufeMxn: peajesCapufe,
    },
    origenNombre: origin.name || `${origin.city || "Origen"}, ${origin.state || ""}`,
    destinoNombre: destination.name || `${destination.city || "Destino"}, ${destination.state || ""}`,
    motorUtilizado: motor,
  };
}
