import { z } from "zod";
import { dispatchShipmentWithManifest } from "../services/freightDispatchService";

export const despacharEmbarqueSchema = z.object({
  almacen_origen_id: z
    .string()
    .describe("ID del almacen de donde sale la carga (ej. 'alm_central')"),
  vehiculo_id: z
    .string()
    .describe("ID del vehiculo de la flota asignado (ej. 'veh_trk_01')"),
  destino_direccion: z
    .string()
    .describe("Direccion fisica completa de entrega (ej. 'Av. Americas #1500, Guadalajara')"),
  destino_ciudad: z
    .string()
    .optional()
    .describe("Ciudad de destino (ej. 'Guadalajara')"),
  items: z
    .array(
      z.object({
        producto_id: z.string().describe("ID o SKU del producto a cargar"),
        cantidad: z.number().positive().describe("Cantidad de unidades"),
        peso_unitario_kg: z.number().positive().optional().describe("Peso en kg por unidad"),
      }),
    )
    .min(1)
    .describe("Lista de productos que componen el manifiesto de carga del camion"),
  notas: z
    .string()
    .optional()
    .describe("Instrucciones especiales de entrega o manejo de carga"),
});

export type DespacharEmbarqueInput = z.infer<typeof despacharEmbarqueSchema>;

export async function executeDespacharEmbarque(
  args: DespacharEmbarqueInput,
  context?: { companyId?: string; userRole?: string },
) {
  const companyId = context?.companyId || "comp_default";
  try {
    return await dispatchShipmentWithManifest({
      companyId,
      originWarehouseId: args.almacen_origen_id,
      vehicleId: args.vehiculo_id,
      destinationAddress: args.destino_direccion,
      destinationCity: args.destino_ciudad,
      items: args.items.map((i) => ({
        productId: i.producto_id,
        quantity: i.cantidad,
        unitWeightKg: i.peso_unitario_kg,
      })),
      notes: args.notas,
      userRole: context?.userRole,
    });
  } catch (error: any) {
    return {
      isSuccess: false,
      message: `Error al despachar embarque: ${error.message}`,
    };
  }
}
