import { z } from "zod";
import { getOpenPurchaseOrders } from "../services/inventoryService";

// Esquema Zod para ver ordenes abiertas
export const verOrdenesAbiertasSchema = z.object({
  producto_id: z
    .string()
    .optional()
    .describe("ID opcional del producto para filtrar las órdenes abiertas"),
});

export type VerOrdenesAbiertasInput = z.infer<typeof verOrdenesAbiertasSchema>;

export async function executeVerOrdenesAbiertas(
  args: VerOrdenesAbiertasInput,
  context?: { companyId?: string },
) {
  try {
    const orders = await getOpenPurchaseOrders(args.producto_id, context?.companyId);

    return {
      isSuccess: true,
      message: `Se encontraron ${orders.length} órdenes de compra abiertas.`,
      count: orders.length,
      orders: orders.map((o) => ({
        id: o.id,
        productId: o.productId,
        supplierId: o.supplierId,
        quantity: o.quantity,
        totalAmount: o.totalAmount,
        createdAt: o.createdAt,
      })),
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: `Error al consultar órdenes abiertas: ${(error as Error).message}`,
      canRetry: true,
    };
  }
}
