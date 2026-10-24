import { z } from "zod";
import { getStockByProduct } from "../services/inventoryService";

// Esquema Zod para los argumentos de la herramienta
export const consultarStockSchema = z.object({
  producto_id: z
    .string()
    .describe("ID, SKU o nombre del producto a consultar stock (ej. 'prod_st200')"),
});

export type ConsultarStockInput = z.infer<typeof consultarStockSchema>;

export async function executeConsultarStock(
  args: ConsultarStockInput,
  context?: { companyId?: string },
) {
  try {
    const stockInfo = await getStockByProduct(args.producto_id, context?.companyId);

    if (!stockInfo) {
      return {
        isSuccess: false,
        message: `No se encontró el producto con ID '${args.producto_id}'.`,
        canRetry: false,
      };
    }

    if ("isFuzzyMatch" in stockInfo) {
      const { suggestions } = stockInfo as { isFuzzyMatch: true; suggestions: any[] };
      const suggestionText =
        suggestions.length > 0
          ? suggestions.map((s) => `- ${s.name} (ID: ${s.id}, SKU: ${s.sku})`).join("\n")
          : "No hay productos similares.";

      return {
        isSuccess: false,
        message: `No se encontró el producto con ID '${args.producto_id}'. ¿Quisiste decir alguno de estos?\n${suggestionText}`,
        canRetry: true,
      };
    }

    const isReal = (stockInfo as any).origin === "real";
    return {
      isSuccess: true,
      message: isReal
        ? "Consulta de stock exitosa en base de datos REAL de la empresa."
        : "Consulta de stock exitosa.",
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
