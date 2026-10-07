import { z } from "zod";
import { getStockByProduct } from "../services/inventoryService";

// Esquema Zod para los argumentos de la herramienta
export const consultarStockSchema = z.object({
  producto_id: z
    .string()
    .describe("ID del producto a consultar stock (ej. 'prod_st200')"),
});

export type ConsultarStockInput = z.infer<typeof consultarStockSchema>;

export async function executeConsultarStock(args: ConsultarStockInput) {
  try {
    const stockInfo = await getStockByProduct(args.producto_id);

    if (!stockInfo) {
      return {
        isSuccess: false,
        message: `No se encontró el producto con ID '${args.producto_id}'.`,
        canRetry: false,
      };
    }

    return {
      isSuccess: true,
      message: "Consulta de stock exitosa.",
      data: stockInfo,
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: `Error al consultar el stock: ${(error as Error).message}`,
      canRetry: true,
    };
  }
}
