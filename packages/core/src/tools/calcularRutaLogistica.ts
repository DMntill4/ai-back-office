import { z } from "zod";
import { calculateRealRoute, GeoPoint } from "../services/routeCalculator";

export const calcularRutaLogisticaSchema = z.object({
  proveedor_id: z
    .string()
    .optional()
    .describe("ID o nombre del proveedor de origen (ej. 'prov_acme', 'Bosch', 'Grainger')"),
  almacen_id: z
    .string()
    .optional()
    .describe("ID del almacén de destino (por defecto toma el almacén principal de la empresa)"),
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

    // 1. Obtener almacén de destino
    let targetWarehouse: any = null;
    if (args.almacen_id) {
      const found = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, args.almacen_id))
        .limit(1);
      if (found.length > 0) targetWarehouse = found[0];
    }

    if (!targetWarehouse) {
      const defaultAlm = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.companyId, effectiveCompanyId))
        .limit(1);
      if (defaultAlm.length > 0) targetWarehouse = defaultAlm[0];
    }

    if (!targetWarehouse || !targetWarehouse.latitude || !targetWarehouse.longitude) {
      return {
        isSuccess: false,
        message: "No se encontró un almacén con coordenadas GPS registradas en la empresa.",
      };
    }

    // 2. Obtener proveedor de origen
    let targetSupplier: any = null;
    if (args.proveedor_id) {
      const found = await db
        .select()
        .from(suppliers)
        .where(
          or(
            eq(suppliers.id, args.proveedor_id),
            ilike(suppliers.name, `%${args.proveedor_id}%`),
          ),
        )
        .limit(1);
      if (found.length > 0) targetSupplier = found[0];
    }

    if (!targetSupplier) {
      const defaultSupp = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.companyId, effectiveCompanyId))
        .limit(1);
      if (defaultSupp.length > 0) targetSupplier = defaultSupp[0];
    }

    if (!targetSupplier || !targetSupplier.latitude || !targetSupplier.longitude) {
      return {
        isSuccess: false,
        message: "No se encontró un proveedor con ubicación física o coordenadas GPS registradas.",
      };
    }

    const origin: GeoPoint = {
      latitude: Number(targetSupplier.latitude),
      longitude: Number(targetSupplier.longitude),
      name: targetSupplier.name,
      address: targetSupplier.streetAddress || undefined,
      city: targetSupplier.city || undefined,
      state: targetSupplier.state || undefined,
      country: targetSupplier.country || undefined,
    };

    const destination: GeoPoint = {
      latitude: Number(targetWarehouse.latitude),
      longitude: Number(targetWarehouse.longitude),
      name: targetWarehouse.name,
      address: targetWarehouse.streetAddress || undefined,
      city: targetWarehouse.city || undefined,
      state: targetWarehouse.state || undefined,
      country: targetWarehouse.country || undefined,
    };

    const route = await calculateRealRoute(origin, destination, { currency });

    const formatCost = (num: number) =>
      `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

    return {
      isSuccess: true,
      rutaLogistica: {
        origen: {
          proveedor: targetSupplier.name,
          direccion: targetSupplier.streetAddress || "Dirección no especificada",
          ubicacion: `${targetSupplier.city || "N/A"}${targetSupplier.state ? `, ${targetSupplier.state}` : ""}${targetSupplier.country ? ` (${targetSupplier.country})` : ""}`,
          coordenadas: `${targetSupplier.latitude}, ${targetSupplier.longitude}`,
        },
        destino: {
          almacen: targetWarehouse.name,
          direccion: targetWarehouse.streetAddress || "Dirección no especificada",
          ubicacion: `${targetWarehouse.city || "N/A"}${targetWarehouse.state ? `, ${targetWarehouse.state}` : ""}${targetWarehouse.country ? ` (${targetWarehouse.country})` : ""}`,
          coordenadas: `${targetWarehouse.latitude}, ${targetWarehouse.longitude}`,
        },
        distanciaVialRealKm: route.distanceKm,
        tiempoEstimadoTransito: route.durationFormatted,
        costoFleteEstimado: route.costoFleteFormatted,
        moneda: currency,
        desgloseFlete: {
          tarifaBaseManiobra: formatCost(route.desgloseCostos.tarifaBase),
          costoPorDistancia: formatCost(route.desgloseCostos.costoPorDistancia),
          peajesYTasasTransito: formatCost(route.desgloseCostos.peajesYTasasTransito),
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
