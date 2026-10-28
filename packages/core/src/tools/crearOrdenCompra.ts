import { z } from "zod";
import { createPurchaseOrder, getStockByProduct } from "../services/inventoryService";
import { db } from "../db/client";
import { suppliers } from "../db/schema";
import { eq, and, or, ilike } from "drizzle-orm";

// Esquema Zod para crear orden de compra
export const crearOrdenCompraSchema = z.object({
  case_id: z.string().describe("ID del caso atendido por el agente"),
  producto_id: z
    .string()
    .describe("ID, SKU o nombre del producto a comprar (ej. 'prod_st200')"),
  proveedor_id: z
    .string()
    .describe("ID o nombre del proveedor elegido (ej. 'prov_acme')"),
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

export async function executeCrearOrdenCompra(
  args: CrearOrdenCompraInput,
  context?: { companyId?: string },
) {
  const effectiveCompanyId = context?.companyId || "comp_default";

  try {
    // 1. Resolver producto si pasaron SKU o nombre parcial
    let resolvedProductId = args.producto_id;
    try {
      const stockInfo = await getStockByProduct(args.producto_id, effectiveCompanyId);
      if (stockInfo && !("isFuzzyMatch" in stockInfo) && stockInfo.productId) {
        resolvedProductId = stockInfo.productId;
      }
    } catch {
      // Mantener args.producto_id
    }

    // 2. Resolver proveedor si el LLM pasó el nombre en lugar del ID
    let resolvedSupplierId = args.proveedor_id;
    try {
      const [matchedSupp] = await db
        .select({ id: suppliers.id })
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
      if (matchedSupp) {
        resolvedSupplierId = matchedSupp.id;
      }
    } catch {
      // Mantener args.proveedor_id
    }

    const result = await createPurchaseOrder({
      caseId: args.case_id,
      companyId: effectiveCompanyId,
      productId: resolvedProductId,
      supplierId: resolvedSupplierId,
      quantity: args.cantidad,
      idempotencyKey: args.idempotency_key,
    });

    const isPendingApproval = Boolean(result.requiresApproval);

    if (!result.success && !isPendingApproval) {
      return {
        isSuccess: false,
        verified: false,
        requiresApproval: false,
        message: result.message,
        canRetry: true,
      };
    }

    const resAny = result as any;

    return {
      isSuccess: true,
      verified: !isPendingApproval,
      requiresApproval: isPendingApproval,
      duplicate: resAny.duplicate ?? false,
      trackingNumber: resAny.trackingNumber,
      message: result.message,
      data: resAny.order ?? null,
    };
  } catch (error) {
    return {
      isSuccess: false,
      verified: false,
      requiresApproval: false,
      message: `Error al crear la orden de compra: ${(error as Error).message}`,
      canRetry: true,
    };
  }
}
