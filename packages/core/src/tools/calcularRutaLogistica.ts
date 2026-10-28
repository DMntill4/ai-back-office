import { z } from "zod";
import { calculateRealRoute, GeoPoint } from "../services/routeCalculator";
import { geocodeAddressOrCity, resolveNodeGeoPoint } from "../services/geocodingService";

export const calcularRutaLogisticaSchema = z.object({
  proveedor_id: z
    .string()
    .optional()
    .describe("ID, nombre o ciudad del proveedor de origen (ej. 'prov_01', 'Proveedor Central')"),
  almacen_id: z
    .string()
    .optional()
    .describe("ID, nombre o ciudad del almacén de destino (por defecto toma el almacén principal de la empresa)"),
  origen_direccion: z
    .string()
    .optional()
    .describe("Ciudad o dirección libre de origen (ej. 'Zona Franca', 'Calle 26')"),
  destino_direccion: z
    .string()
    .optional()
    .describe("Ciudad o dirección libre de destino (ej. 'Almacén Central', 'Bodega Norte')"),
});

export type CalcularRutaLogisticaInput = z.infer<typeof calcularRutaLogisticaSchema>;

export async function executeCalcularRutaLogistica(
  args: CalcularRutaLogisticaInput,
  context?: { companyId?: string },
) {
  try {
    const { db } = await import("../db/client");
    const { suppliers, warehouses, companies, businessConfig } = await import("../db/schema");
    const { eq, ilike, or, and } = await import("drizzle-orm");

    const effectiveCompanyId = context?.companyId || "comp_default";

    // 0. Detectar moneda configurada para la empresa activa
    let currency = "USD";
    const [compRecord] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, effectiveCompanyId))
      .limit(1);

    if (compRecord && (compRecord as any).currency) {
      currency = (compRecord as any).currency;
    } else {
      const [conf] = await db
        .select()
        .from(businessConfig)
        .where(
          and(
            eq(businessConfig.companyId, effectiveCompanyId),
            eq(businessConfig.key, "currency"),
          ),
        )
        .limit(1);
      if (conf?.currency) currency = conf.currency;
    }

    // 1. Obtener o geocodificar almacén/destino (estrictamente dentro de la empresa activa)
    let targetWarehouse: any = null;
    if (args.almacen_id) {
      const found = await db
        .select()
        .from(warehouses)
        .where(
          and(
            eq(warehouses.companyId, effectiveCompanyId),
            or(
              eq(warehouses.id, args.almacen_id),
              ilike(warehouses.name, `%${args.almacen_id}%`),
            ),
          ),
        )
        .limit(1);
      if (found.length > 0) targetWarehouse = found[0];
    }

    if (!targetWarehouse && !args.destino_direccion) {
      const defaultAlm = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.companyId, effectiveCompanyId))
        .limit(1);
      if (defaultAlm.length > 0) targetWarehouse = defaultAlm[0];
    }

    let destination: GeoPoint | null = null;
    if (args.destino_direccion) {
      destination = await geocodeAddressOrCity(args.destino_direccion);
    } else if (targetWarehouse) {
      destination = await resolveNodeGeoPoint(targetWarehouse);
      // Persistir coordenadas si el almacén no las tenía aún
      if (destination && (!targetWarehouse.latitude || !targetWarehouse.longitude)) {
        await db
          .update(warehouses)
          .set({
            latitude: String(destination.latitude),
            longitude: String(destination.longitude),
            city: targetWarehouse.city || destination.city,
          })
          .where(eq(warehouses.id, targetWarehouse.id))
          .catch(() => {});
      }
    } else if (args.almacen_id) {
      destination = await geocodeAddressOrCity(args.almacen_id);
    }

    if (!destination) {
      return {
        isSuccess: false,
        message: "No se encontró un almacén con coordenadas GPS registradas en la empresa.",
      };
    }

    // 2. Obtener o geocodificar proveedor/origen (estrictamente dentro de la empresa activa)
    let targetSupplier: any = null;
    if (args.proveedor_id) {
      const found = await db
        .select()
        .from(suppliers)
        .where(
          and(
            eq(suppliers.companyId, effectiveCompanyId),
            or(
              eq(suppliers.id, args.proveedor_id),
              ilike(suppliers.name, `%${args.proveedor_id}%`),
            ),
          ),
        )
        .limit(1);
      if (found.length > 0) targetSupplier = found[0];
    }

    if (!targetSupplier && !args.origen_direccion) {
      const defaultSupp = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.companyId, effectiveCompanyId))
        .limit(1);
      if (defaultSupp.length > 0) targetSupplier = defaultSupp[0];
    }

    let origin: GeoPoint | null = null;
    if (args.origen_direccion) {
      origin = await geocodeAddressOrCity(args.origen_direccion);
    } else if (targetSupplier) {
      origin = await resolveNodeGeoPoint(targetSupplier);
      if (origin && (!targetSupplier.latitude || !targetSupplier.longitude)) {
        await db
          .update(suppliers)
          .set({
            latitude: String(origin.latitude),
            longitude: String(origin.longitude),
            city: targetSupplier.city || origin.city,
          })
          .where(eq(suppliers.id, targetSupplier.id))
          .catch(() => {});
      }
    } else if (args.proveedor_id) {
      origin = await geocodeAddressOrCity(args.proveedor_id);
    }

    if (!origin) {
      return {
        isSuccess: false,
        message: "No se encontró un proveedor con ubicación física o coordenadas GPS registradas.",
      };
    }

    const route = await calculateRealRoute(origin, destination, { currency });

    const formatCost = (num: number) =>
      `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

    return {
      isSuccess: true,
      rutaLogistica: {
        origen: {
          proveedor: targetSupplier?.name || origin.name || args.origen_direccion || "Origen",
          direccion: targetSupplier?.streetAddress || origin.address || "Dirección geocodificada",
          ubicacion: `${targetSupplier?.city || origin.city || "N/A"}${targetSupplier?.state || origin.state ? `, ${targetSupplier?.state || origin.state}` : ""}${targetSupplier?.country || origin.country ? ` (${targetSupplier?.country || origin.country})` : ""}`,
          coordenadas: `${origin.latitude}, ${origin.longitude}`,
        },
        destino: {
          almacen: targetWarehouse?.name || destination.name || args.destino_direccion || "Destino",
          direccion: targetWarehouse?.streetAddress || destination.address || "Dirección geocodificada",
          ubicacion: `${targetWarehouse?.city || destination.city || "N/A"}${targetWarehouse?.state || destination.state ? `, ${targetWarehouse?.state || destination.state}` : ""}${targetWarehouse?.country || destination.country ? ` (${targetSupplier?.country || destination.country})` : ""}`,
          coordenadas: `${destination.latitude}, ${destination.longitude}`,
        },
        distanciaVialRealKm: route.distanceKm,
        tiempoEstimadoTransito: route.durationFormatted,
        costoFleteEstimado: route.costoFleteFormatted,
        moneda: currency,
        desgloseFlete: route.desgloseCostos
          ? {
              tarifaBaseManiobra: formatCost(route.desgloseCostos.tarifaBase),
              costoPorDistancia: formatCost(route.desgloseCostos.costoPorDistancia),
              peajesYTasasTransito: formatCost(route.desgloseCostos.peajesYTasasTransito),
            }
          : {
              tarifaBaseManiobra: "Tarifa no configurada",
              costoPorDistancia: "Tarifa no configurada",
              peajesYTasasTransito: "Tarifa no configurada",
            },
        motorCartografico: route.motorUtilizado,
      },
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: `Error al calcular la ruta logística: ${(error as Error).message}`,
    };
  }
}
