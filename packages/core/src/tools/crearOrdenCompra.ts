import { z } from "zod";
import { createPurchaseOrder } from "../services/inventoryService";

// Esquema Zod para crear orden de compra
export const crearOrdenCompraSchema = z.object({
  case_id: z.string().describe("ID del caso atendido por el agente"),
  producto_id: z
    .string()
    .describe("ID del producto a comprar (ej. 'prod_st200')"),
  proveedor_id: z
    .string()
    .describe("ID del proveedor elegido (ej. 'prov_acme')"),
  cantidad: z
    .number()
    .int()
    .positive()
    .describe("Cantidad de unidades a pedir"),
  idempotency_key: z
    .string()
    .describe("Clave única para evitar duplicados en la creación de la orden"),
});

export type CrearOrdenCompraInput = z.infer<typeof crearOrdenCompraSchema>;

export async function executeCrearOrdenCompra(args: CrearOrdenCompraInput) {
  try {
    const result = await createPurchaseOrder({
      caseId: args.case_id,
      productId: args.producto_id,
      supplierId: args.proveedor_id,
      quantity: args.cantidad,
      idempotencyKey: args.idempotency_key,
    });

    if (!result.success) {
      return {
        isSuccess: false,
        requiresApproval: result.requiresApproval ?? false,
        message: result.message,
        canRetry: !result.requiresApproval,
      };
    }

    const resAny = result as any;

    return {
      isSuccess: true,
      requiresApproval: result.requiresApproval ?? false,
      verified: resAny.verified ?? true,
      duplicate: resAny.duplicate ?? false,
      message: result.message,
      data: resAny.order ?? null,
    };
  } catch (error) {
    return {
      isSuccess: false,
      requiresApproval: false,
      message: `Error al crear la orden de compra: ${(error as Error).message}`,
      canRetry: true,
    };
  }
}
