import { z } from "zod";
import { db } from "../db/client";
import { inventory, products } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { triggerStockAlertIfLow } from "../worker/proactiveMonitor";

export const ajustarStockSchema = z.object({
  producto_id: z
    .string()
    .describe("ID del producto a modificar stock (ej. 'prod_st200', 'prod_man_01')"),
  cantidad_delta: z
    .number()
    .describe("Cantidad a sumar o restar del stock. Ejemplo: -5 para quitar 5 unidades, 10 para agregar 10."),
  motivo: z
    .string()
    .optional()
    .describe("Razón del ajuste de inventario (ej. 'Venta de mostrador', 'Ajuste por merma', 'Conteo manual')"),
});

export type AjustarStockInput = z.infer<typeof ajustarStockSchema>;

export async function executeAjustarStock(
  args: AjustarStockInput,
  context?: { companyId?: string },
) {
  const effectiveCompanyId = context?.companyId || "comp_default";

  try {
    // 1. Validar que el producto existe en el tenant
    const prodList = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, args.producto_id),
          eq(products.companyId, effectiveCompanyId),
        ),
      )
      .limit(1);

    if (prodList.length === 0) {
      // Buscar si el usuario pasó un SKU en vez de un ID
      const bySku = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.sku, args.producto_id),
            eq(products.companyId, effectiveCompanyId),
          ),
        )
        .limit(1);

      if (bySku.length === 0) {
        return {
          isSuccess: false,
          message: `No se encontró el producto '${args.producto_id}' en el catálogo de tu empresa.`,
          canRetry: false,
        };
      }
      args.producto_id = bySku[0].id;
      prodList.push(bySku[0]);
    }

    const product = prodList[0];

    // 2. Obtener el registro de inventario existente
    const invItems = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.productId, product.id),
          eq(inventory.companyId, effectiveCompanyId),
        ),
      )
      .limit(1);

    let previousStock = 0;
    let newStock = 0;

    if (invItems.length === 0) {
      if (args.cantidad_delta < 0) {
        return {
          isSuccess: false,
          message: `El producto '${product.name}' no tiene existencias registradas (stock actual: 0). No se pueden restar ${Math.abs(args.cantidad_delta)} unidades.`,
        };
      }
      newStock = args.cantidad_delta;
      await db.insert(inventory).values({
        id: `inv_${Date.now()}`,
        companyId: effectiveCompanyId,
        productId: product.id,
        warehouseId: "alm_central",
        stock: newStock,
      });
    } else {
      previousStock = invItems[0].stock;
      newStock = previousStock + args.cantidad_delta;

      if (newStock < 0) {
        return {
          isSuccess: false,
          message: `Stock insuficiente. El producto '${product.name}' solo tiene ${previousStock} unidades disponibles. No es posible restar ${Math.abs(args.cantidad_delta)} unidades.`,
        };
      }

      await db
        .update(inventory)
        .set({ stock: newStock })
        .where(eq(inventory.id, invItems[0].id));
    }

    // 3. Evaluar alerta en tiempo real si el nuevo stock cae debajo del mínimo
    const isCritical = newStock < product.minStock;
    if (isCritical) {
      try {
        await triggerStockAlertIfLow(product.id, newStock, product.minStock, effectiveCompanyId);
      } catch {
        // Alerta en segundo plano
      }
    }

    return {
      isSuccess: true,
      message: `Stock actualizado con éxito para '${product.name}' (SKU: ${product.sku}). Stock anterior: ${previousStock} u ➔ Nuevo stock: ${newStock} u.${isCritical ? " [AVISO] ATENCIÓN: El stock quedó por debajo del mínimo de seguridad (" + product.minStock + " u). Se generó una alerta de reposición." : ""}`,
      data: {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        previousStock,
        newStock,
        minStock: product.minStock,
        isBelowMinimum: isCritical,
        reason: args.motivo || "Ajuste directo solicitado al agente",
      },
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: `Error al ajustar inventario: ${(error as Error).message}`,
    };
  }
}
