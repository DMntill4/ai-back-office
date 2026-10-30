import { z } from "zod";
import { db } from "../db/client";
import { inventory, products } from "../db/schema";
import { eq, and, or, ilike } from "drizzle-orm";
import { triggerStockAlertIfLow } from "../worker/proactiveMonitor";

export const ajustarStockSchema = z.object({
  producto_id: z
    .string()
    .describe("ID, SKU o nombre del producto a modificar stock (ej. 'prod_st200', 'SKU-MAN-SM400', 'Servomotor')"),
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

  // Validación de límites numéricos y valores anómalos / infinitos
  if (!Number.isFinite(args.cantidad_delta) || isNaN(args.cantidad_delta)) {
    return {
      isSuccess: false,
      verified: false,
      message: "La cantidad a ajustar debe ser un número finito válido.",
    };
  }

  if (args.cantidad_delta === 0) {
    return {
      isSuccess: false,
      verified: false,
      message: "La cantidad a ajustar no puede ser cero.",
    };
  }

  if (Math.abs(args.cantidad_delta) > 1_000_000) {
    return {
      isSuccess: false,
      verified: false,
      message: "Cantidad de ajuste excede el rango operativo seguro permitido (máximo 1,000,000 unidades por movimiento).",
    };
  }

  try {
    // 1. Validar que el producto existe en el tenant (soporta ID, SKU insensible a mayúsculas o nombre parcial)
    const prodList = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.companyId, effectiveCompanyId),
          or(
            eq(products.id, args.producto_id),
            ilike(products.sku, args.producto_id),
            ilike(products.name, `%${args.producto_id}%`),
          ),
        ),
      )
      .limit(1);

    if (prodList.length === 0) {
      return {
        isSuccess: false,
        verified: false,
        message: `No se encontró el producto '${args.producto_id}' en el catálogo de tu empresa. Verifica el SKU o nombre exacto antes de ajustar existencias.`,
        canRetry: false,
      };
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
          verified: false,
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
          verified: false,
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

    // 4. Despachar log del movimiento a los canales configurados (Discord, Slack, Webhook, Telegram)
    try {
      const notifiersMod: any = await import("@mint/notifiers");
      if (typeof notifiersMod.dispatchStockLogNotification === "function") {
        await notifiersMod.dispatchStockLogNotification({
          companyId: effectiveCompanyId,
          type: isCritical ? "STOCK_CRITICAL" : "STOCK_UPDATE",
          title: isCritical
            ? `Desabasto Critico: ${product.name}`
            : `Ajuste de Stock: ${product.name}`,
          description: `Stock de '${product.name}' (SKU: ${product.sku}) cambio de ${previousStock} u a ${newStock} u (Delta: ${args.cantidad_delta > 0 ? "+" : ""}${args.cantidad_delta} u). Motivo: ${args.motivo || "Ajuste directo"}.${isCritical ? ` Minimo requerido: ${product.minStock} u.` : ""}`,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantityDelta: args.cantidad_delta,
          previousStock,
          newStock,
          minStock: product.minStock,
          severity: isCritical ? "CRITICAL" : "INFO",
        });
      }
    } catch {}

    return {
      isSuccess: true,
      verified: true,
      message: `Stock actualizado y verificado con éxito para '${product.name}' (SKU: ${product.sku}). Stock anterior: ${previousStock} u -> Nuevo stock: ${newStock} u.${isCritical ? " [AVISO] ATENCIÓN: El stock quedó por debajo del mínimo de seguridad (" + product.minStock + " u). Se generó una alerta de reposición." : ""}`,
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
      verified: false,
      message: `Error al ajustar inventario: ${(error as Error).message}`,
    };
  }
}
