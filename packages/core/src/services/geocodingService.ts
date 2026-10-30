import { db } from "../db/client";
import { warehouses, suppliers, companies } from "../db/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import { GeoPoint } from "./routeCalculator";

/**
 * Servicio Global de Geocodificación Logística (OpenStreetMap Nominatim + Caché + Hub Resolver)
 * Convierte cualquier ciudad, dirección, código postal o país en coordenadas GPS reales
 * sin necesidad de que el usuario conozca latitudes/longitudes ni hardcodear una sola tienda.
 */

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  displayName: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  source: "NOMINATIM_OSM" | "LOGISTICS_HUB_INDEX" | "EXISTING_COORDINATES";
}

// Índice rápido de corredores industriales/logísticos internacionales y de LATAM/USA/Europa
// como respaldo instantáneo (<1ms) cuando no hay red o en entornos de test offline.
const GLOBAL_LOGISTICS_HUBS: Record<string, Omit<GeocodedLocation, "source">> = {
  "ciudad de mexico": { latitude: 19.4326, longitude: -99.1332, displayName: "Ciudad de México, CDMX, México", city: "Ciudad de México", state: "CDMX", country: "México" },
  "cdmx": { latitude: 19.4326, longitude: -99.1332, displayName: "Ciudad de México, CDMX, México", city: "Ciudad de México", state: "CDMX", country: "México" },
  "monterrey": { latitude: 25.6866, longitude: -100.3161, displayName: "Monterrey, Nuevo León, México", city: "Monterrey", state: "Nuevo León", country: "México" },
  "guadalajara": { latitude: 20.6597, longitude: -103.3496, displayName: "Guadalajara, Jalisco, México", city: "Guadalajara", state: "Jalisco", country: "México" },
  "queretaro": { latitude: 20.5888, longitude: -100.3899, displayName: "Santiago de Querétaro, Querétaro, México", city: "Querétaro", state: "Querétaro", country: "México" },
  "puebla": { latitude: 19.0414, longitude: -98.2063, displayName: "Puebla de Zaragoza, Puebla, México", city: "Puebla", state: "Puebla", country: "México" },
  "toluca": { latitude: 19.2826, longitude: -99.6557, displayName: "Toluca de Lerdo, Estado de México, México", city: "Toluca", state: "Estado de México", country: "México" },
  "cuautitlan": { latitude: 19.6453, longitude: -99.2081, displayName: "Cuautitlán Izcalli, Estado de México, México", city: "Cuautitlán Izcalli", state: "Estado de México", country: "México" },
  "naucalpan": { latitude: 19.4678, longitude: -99.2312, displayName: "Naucalpan de Juárez, Estado de México, México", city: "Naucalpan", state: "Estado de México", country: "México" },
  "apodaca": { latitude: 25.7812, longitude: -100.1895, displayName: "Apodaca, Nuevo León, México", city: "Apodaca", state: "Nuevo León", country: "México" },
  "tijuana": { latitude: 32.5149, longitude: -117.0382, displayName: "Tijuana, Baja California, México", city: "Tijuana", state: "Baja California", country: "México" },
  "leon": { latitude: 21.1221, longitude: -101.6826, displayName: "León, Guanajuato, México", city: "León", state: "Guanajuato", country: "México" },
  "merida": { latitude: 20.9674, longitude: -89.5926, displayName: "Mérida, Yucatán, México", city: "Mérida", state: "Yucatán", country: "México" },
  "veracruz": { latitude: 19.1738, longitude: -96.1342, displayName: "Puerto de Veracruz, Veracruz, México", city: "Veracruz", state: "Veracruz", country: "México" },
  "bogota": { latitude: 4.711, longitude: -74.0721, displayName: "Bogotá, D.C., Colombia", city: "Bogotá", state: "Cundinamarca", country: "Colombia" },
  "medellin": { latitude: 6.2442, longitude: -75.5812, displayName: "Medellín, Antioquia, Colombia", city: "Medellín", state: "Antioquia", country: "Colombia" },
  "cali": { latitude: 3.4516, longitude: -76.532, displayName: "Santiago de Cali, Valle del Cauca, Colombia", city: "Cali", state: "Valle del Cauca", country: "Colombia" },
  "barranquilla": { latitude: 10.9685, longitude: -74.7813, displayName: "Barranquilla, Atlántico, Colombia", city: "Barranquilla", state: "Atlántico", country: "Colombia" },
  "cartagena": { latitude: 10.391, longitude: -75.4794, displayName: "Cartagena de Indias, Bolívar, Colombia", city: "Cartagena", state: "Bolívar", country: "Colombia" },
  "bucaramanga": { latitude: 7.1193, longitude: -73.1227, displayName: "Bucaramanga, Santander, Colombia", city: "Bucaramanga", state: "Santander", country: "Colombia" },
  "lima": { latitude: -12.0464, longitude: -77.0428, displayName: "Lima, Perú", city: "Lima", state: "Lima", country: "Perú" },
  "santiago": { latitude: -33.4489, longitude: -70.6693, displayName: "Santiago, Región Metropolitana, Chile", city: "Santiago", state: "RM", country: "Chile" },
  "buenos aires": { latitude: -34.6037, longitude: -58.3816, displayName: "Buenos Aires, CABA, Argentina", city: "Buenos Aires", state: "CABA", country: "Argentina" },
  "madrid": { latitude: 40.4168, longitude: -3.7038, displayName: "Madrid, Comunidad de Madrid, España", city: "Madrid", state: "Madrid", country: "España" },
  "barcelona": { latitude: 41.3874, longitude: 2.1686, displayName: "Barcelona, Cataluña, España", city: "Barcelona", state: "Cataluña", country: "España" },
  "miami": { latitude: 25.7617, longitude: -80.1918, displayName: "Miami, Florida, USA", city: "Miami", state: "FL", country: "USA" },
  "houston": { latitude: 29.7604, longitude: -95.3698, displayName: "Houston, Texas, USA", city: "Houston", state: "TX", country: "USA" },
  "laredo": { latitude: 27.5036, longitude: -99.5076, displayName: "Laredo, Texas, USA", city: "Laredo", state: "TX", country: "USA" },
  "los angeles": { latitude: 34.0522, longitude: -118.2437, displayName: "Los Angeles, California, USA", city: "Los Angeles", state: "CA", country: "USA" },
  "new york": { latitude: 40.7128, longitude: -74.006, displayName: "New York, NY, USA", city: "New York", state: "NY", country: "USA" },
  "sao paulo": { latitude: -23.5505, longitude: -46.6333, displayName: "São Paulo, SP, Brasil", city: "São Paulo", state: "SP", country: "Brasil" },
  "panama": { latitude: 8.9824, longitude: -79.5199, displayName: "Ciudad de Panamá, Panamá", city: "Ciudad de Panamá", state: "Panamá", country: "Panamá" },
};

const geocodeCache = new Map<string, GeocodedLocation>();

function normalizeLocationKey(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Geocodifica cualquier dirección, ciudad o texto de ubicación en coordenadas GPS reales.
 * 1. Primero consulta si ya viene en formato "lat, lon".
 * 2. Segundo busca en el índice de corredores logísticos (respuesta inmediata).
 * 3. Tercero consulta la API global de OpenStreetMap Nominatim.
 */
export async function geocodeAddressOrCity(locationQuery: string): Promise<GeocodedLocation | null> {
  if (!locationQuery || !locationQuery.trim()) return null;

  const trimmed = locationQuery.trim();

  // 1. ¿El usuario pasó coordenadas directas "19.4326, -99.1332"?
  const coordMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return {
        latitude: lat,
        longitude: lon,
        displayName: `Coordenadas (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
        source: "EXISTING_COORDINATES",
      };
    }
  }

  const normKey = normalizeLocationKey(trimmed);
  if (geocodeCache.has(normKey)) {
    return geocodeCache.get(normKey)!;
  }

  // 2. Buscar coincidencia en el índice de corredores logísticos
  for (const [hubKey, hubVal] of Object.entries(GLOBAL_LOGISTICS_HUBS)) {
    if (normKey === hubKey || normKey.includes(hubKey)) {
      const result: GeocodedLocation = {
        ...hubVal,
        source: "LOGISTICS_HUB_INDEX",
      };
      geocodeCache.set(normKey, result);
      return result;
    }
  }

  // 3. Consultar OpenStreetMap Nominatim en vivo
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(trimmed)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "MintAutonomousLogisticsCoordinator/2.0",
        "Accept-Language": "es,en",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: any[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const hit = data[0];
        const addr = hit.address || {};
        const result: GeocodedLocation = {
          latitude: parseFloat(hit.lat),
          longitude: parseFloat(hit.lon),
          displayName: hit.display_name || trimmed,
          city: addr.city || addr.town || addr.municipality || addr.village || addr.county || undefined,
          state: addr.state || addr.region || undefined,
          country: addr.country || undefined,
          postalCode: addr.postcode || undefined,
          source: "NOMINATIM_OSM",
        };
        geocodeCache.set(normKey, result);
        return result;
      }
    }
  } catch {
    // Si está sin internet, continuar con fallback nulo
  }

  return null;
}

/**
 * Actualiza o registra la ubicación física y coordenadas GPS de una Bodega/Almacén o Proveedor.
 */
export async function updateLogisticsNodeLocation(params: {
  companyId: string;
  entityType?: "warehouse" | "supplier" | "company";
  nodeType?: "warehouse" | "supplier" | "company";
  entityIdOrName?: string;
  nodeIdOrName?: string;
  addressText?: string;
  addressOrCity?: string;
  customName?: string;
}): Promise<{
  success: boolean;
  entityType: string;
  entityId: string;
  entityName: string;
  geocoded: GeocodedLocation;
  message: string;
}> {
  const companyId = params.companyId;
  const entityType = params.entityType || params.nodeType || "warehouse";
  const entityIdOrName = params.entityIdOrName || params.nodeIdOrName;
  const addressText = params.addressText || params.addressOrCity || "";
  const customName = params.customName;
  const geocoded = await geocodeAddressOrCity(addressText);


  if (!geocoded) {
    throw new Error(
      `No se pudo geolocalizar "${addressText}". Por favor especifica ciudad y país (ej: "Monterrey, México" o "Medellín, Colombia") o coordenadas "lat, lon".`
    );
  }

  const latStr = geocoded.latitude.toFixed(6);
  const lonStr = geocoded.longitude.toFixed(6);

  if (entityType === "company") {
    await db
      .update(companies)
      .set({
        streetAddress: addressText,
        city: geocoded.city || addressText,
        state: geocoded.state,
        country: geocoded.country,
        postalCode: geocoded.postalCode,
        latitude: latStr,
        longitude: lonStr,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    return {
      success: true,
      entityType: "company",
      entityId: companyId,
      entityName: customName || companyId,
      geocoded,
      message: `Ubicación matriz de la empresa actualizada en ${geocoded.displayName} [GPS: ${latStr}, ${lonStr}].`,
    };
  }

  if (entityType === "warehouse") {
    let targetWh: any = null;
    if (entityIdOrName) {
      const found = await db
        .select()
        .from(warehouses)
        .where(
          and(
            eq(warehouses.companyId, companyId),
            or(eq(warehouses.id, entityIdOrName), ilike(warehouses.name, `%${entityIdOrName}%`))
          )
        )
        .limit(1);
      targetWh = found[0];
    }

    if (!targetWh && !customName) {
      const existing = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId)).limit(1);
      targetWh = existing[0];
    }

    if (targetWh) {
      await db
        .update(warehouses)
        .set({
          name: customName || targetWh.name,
          location: geocoded.displayName,
          streetAddress: addressText,
          city: geocoded.city || addressText,
          state: geocoded.state,
          country: geocoded.country,
          postalCode: geocoded.postalCode,
          latitude: latStr,
          longitude: lonStr,
        })
        .where(eq(warehouses.id, targetWh.id));

      return {
        success: true,
        entityType: "warehouse",
        entityId: targetWh.id,
        entityName: customName || targetWh.name,
        geocoded,
        message: `Almacén "${customName || targetWh.name}" georreferenciado en ${geocoded.displayName} [GPS: ${latStr}, ${lonStr}].`,
      };
    } else {
      const newWhId = `alm_${(customName || entityIdOrName || "central").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 16)}_${Date.now().toString(36).slice(-4)}`;
      const whName = customName || entityIdOrName || `Almacén ${geocoded.city || "Principal"}`;
      await db.insert(warehouses).values({
        id: newWhId,
        companyId,
        name: whName,
        location: geocoded.displayName,
        streetAddress: addressText,
        city: geocoded.city || addressText,
        state: geocoded.state,
        country: geocoded.country,
        postalCode: geocoded.postalCode,
        latitude: latStr,
        longitude: lonStr,
      });

      return {
        success: true,
        entityType: "warehouse",
        entityId: newWhId,
        entityName: whName,
        geocoded,
        message: `Nuevo almacén "${whName}" creado y georreferenciado en ${geocoded.displayName} [GPS: ${latStr}, ${lonStr}].`,
      };
    }
  }

  // entityType === "supplier"
  let targetSupp: any = null;
  if (entityIdOrName) {
    const found = await db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.companyId, companyId),
          or(eq(suppliers.id, entityIdOrName), ilike(suppliers.name, `%${entityIdOrName}%`))
        )
      )
      .limit(1);
    targetSupp = found[0];
  }

  if (!targetSupp && !customName) {
    const existing = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId)).limit(1);
    targetSupp = existing[0];
  }

  if (targetSupp) {
    await db
      .update(suppliers)
      .set({
        name: customName || targetSupp.name,
        streetAddress: addressText,
        city: geocoded.city || addressText,
        state: geocoded.state,
        country: geocoded.country,
        postalCode: geocoded.postalCode,
        latitude: latStr,
        longitude: lonStr,
        origin: "real",
      })
      .where(eq(suppliers.id, targetSupp.id));

    return {
      success: true,
      entityType: "supplier",
      entityId: targetSupp.id,
      entityName: customName || targetSupp.name,
      geocoded,
      message: `Proveedor "${customName || targetSupp.name}" georreferenciado en ${geocoded.displayName} [GPS: ${latStr}, ${lonStr}].`,
    };
  } else {
    const suppName = customName || entityIdOrName || `Proveedor ${geocoded.city || "Homologado"}`;
    const newSuppId = `supp_${suppName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 18)}_${companyId.slice(0, 8)}`;
    await db
      .insert(suppliers)
      .values({
        id: newSuppId,
        companyId,
        name: suppName,
        streetAddress: addressText,
        city: geocoded.city || addressText,
        state: geocoded.state,
        country: geocoded.country,
        postalCode: geocoded.postalCode,
        latitude: latStr,
        longitude: lonStr,
        origin: "real",
      })
      .onConflictDoNothing();

    return {
      success: true,
      entityType: "supplier",
      entityId: newSuppId,
      entityName: suppName,
      geocoded,
      message: `Proveedor "${suppName}" registrado y georreferenciado en ${geocoded.displayName} [GPS: ${latStr}, ${lonStr}].`,
    };
  }
}

/**
 * Convierte un registro de almacén o proveedor en un GeoPoint intentando geocodificar
 * su dirección/ciudad si aún no tiene latitud/longitud guardada.
 */
export async function resolveNodeGeoPoint(node: {
  id?: string;
  name?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  location?: string | null;
}): Promise<GeoPoint | null> {
  if (node.latitude && node.longitude && !isNaN(Number(node.latitude)) && !isNaN(Number(node.longitude))) {
    return {
      latitude: Number(node.latitude),
      longitude: Number(node.longitude),
      name: node.name || undefined,
      address: node.streetAddress || node.location || undefined,
      city: node.city || undefined,
      state: node.state || undefined,
      country: node.country || undefined,
    };
  }

  const queryParts = [node.streetAddress, node.city, node.state, node.country, node.location].filter(Boolean);
  if (queryParts.length === 0) return null;

  const geocoded = await geocodeAddressOrCity(queryParts.join(", "));
  if (!geocoded) return null;

  return {
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
    name: node.name || geocoded.displayName,
    address: node.streetAddress || geocoded.displayName,
    city: geocoded.city || node.city || undefined,
    state: geocoded.state || node.state || undefined,
    country: geocoded.country || node.country || undefined,
  };
}
