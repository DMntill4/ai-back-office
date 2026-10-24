import { z } from "zod";
import { calculateRealRoute, GeoPoint } from "../services/routeCalculator";

export const calcularRutaLogisticaSchema = z.object({
  proveedor_id: z
    .string()
    .optional()
    .describe("ID o nombre del proveedor de origen (ej. 'prov_acme' o 'Bosch')"),
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
    const { suppliers, warehouses } = await import("../db/schema");
    const { eq, ilike, or } = await import("drizzle-orm");

    const effectiveCompanyId = context?.companyId || "comp_default";

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
    };

    const destination: GeoPoint = {
      latitude: Number(targetWarehouse.latitude),
      longitude: Number(targetWarehouse.longitude),
      name: targetWarehouse.name,
      address: targetWarehouse.streetAddress || undefined,
      city: targetWarehouse.city || undefined,
      state: targetWarehouse.state || undefined,
    };

    const route = await calculateRealRoute(origin, destination);

    return {
      isSuccess: true,
      rutaLogistica: {
        origen: {
          proveedor: targetSupplier.name,
          direccion: targetSupplier.streetAddress || "Dirección no especificada",
          ciudad: `${targetSupplier.city || "N/A"}, ${targetSupplier.state || "N/A"}`,
          coordenadas: `${targetSupplier.latitude}, ${targetSupplier.longitude}`,
        },
        destino: {
          almacen: targetWarehouse.name,
          direccion: targetWarehouse.streetAddress || "Dirección no especificada",
          ciudad: `${targetWarehouse.city || "N/A"}, ${targetWarehouse.state || "N/A"}`,
          coordenadas: `${targetWarehouse.latitude}, ${targetWarehouse.longitude}`,
        },
        distanciaVialRealKm: route.distanceKm,
        tiempoEstimadoTransito: route.durationFormatted,
        costoFleteEstimado: route.costoFleteFormatted,
        desgloseFlete: {
          tarifaBaseManiobra: `$${route.desgloseCostos.tarifaBaseMxn.toLocaleString("es-MX")} MXN`,
          costoPorKilometro: `$${route.desgloseCostos.costoPorKmRecorridoMxn.toLocaleString("es-MX")} MXN`,
          casetasPeajesCapufe: `$${route.desgloseCostos.peajesEstimadosCapufeMxn.toLocaleString("es-MX")} MXN`,
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
