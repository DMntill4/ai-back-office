import { z } from "zod";

export const analisisFinancieroSchema = z.object({
  incluir_proyecciones: z.boolean().default(true).describe("Si es true, proyecta las necesidades financieras a 30 días."),
});

export type AnalisisFinancieroInput = z.infer<typeof analisisFinancieroSchema>;

export async function executeAnalisisFinanciero(
  args: AnalisisFinancieroInput,
  context?: { companyId?: string },
) {
  try {
    const { db } = await import("../db/client");
    const { inventory, products, purchaseOrders, supplierProducts } = await import("../db/schema");
    const { eq, and, sql } = await import("drizzle-orm");

    const effectiveCompanyId = context?.companyId || "comp_default";

    // 1. Obtener existencias actuales con sus precios reales de catálogo de proveedores
    const items = await db
      .select({
        productId: products.id,
        name: products.name,
        stock: sql<number>`coalesce(${inventory.stock}, 0)`,
        minStock: products.minStock,
        supplierPrice: supplierProducts.unitPrice,
      })
      .from(products)
      .leftJoin(inventory, eq(products.id, inventory.productId))
      .leftJoin(supplierProducts, eq(products.id, supplierProducts.productId))
      .where(eq(products.companyId, effectiveCompanyId));

    // Consolidar por producto
    const productMap = new Map<
      string,
      { name: string; stock: number; minStock: number; unitPrice: number }
    >();

    for (const item of items) {
      const existing = productMap.get(item.productId);
      const price = item.supplierPrice ? Number(item.supplierPrice) : 0;
      if (!existing) {
        productMap.set(item.productId, {
          name: item.name,
          stock: Number(item.stock),
          minStock: Number(item.minStock),
          unitPrice: price,
        });
      } else if (price > 0 && (existing.unitPrice === 0 || price < existing.unitPrice)) {
        existing.unitPrice = price;
      }
    }

    const uniqueProducts = Array.from(productMap.values());

    // 2. Órdenes de compra abiertas reales
    const openOrders = await db
      .select({
        totalAmount: purchaseOrders.totalAmount,
      })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.companyId, effectiveCompanyId),
          eq(purchaseOrders.status, "abierta"),
        ),
      );

    const totalComprometido = openOrders.reduce(
      (acc, o) => acc + parseFloat(o.totalAmount || "0"),
      0,
    );

    // 3. Métricas reales calculadas a partir de datos existentes
    let valorEstimadoInventario = 0;
    let presupuestoReabastecimientoEstimado = 0;
    let productosSinPrecio = 0;
    let productosAgotados = 0;
    let productosBajoMinimo = 0;

    for (const prod of uniqueProducts) {
      if (prod.unitPrice > 0) {
        valorEstimadoInventario += prod.stock * prod.unitPrice;
      } else {
        productosSinPrecio++;
      }

      if (prod.stock === 0) {
        productosAgotados++;
      }

      if (prod.stock < prod.minStock) {
        productosBajoMinimo++;
        const deficit = prod.minStock - prod.stock;
        if (prod.unitPrice > 0) {
          presupuestoReabastecimientoEstimado += deficit * prod.unitPrice;
        }
      }
    }

    return {
      isSuccess: true,
      resumenFinanciero: {
        valorInventarioValuadoReal: `$${valorEstimadoInventario.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`,
        compromisosComprasAbiertas: `$${totalComprometido.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`,
        presupuestoReabastecimientoRequerido: `$${presupuestoReabastecimientoEstimado.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`,
        metricasSalud: {
          totalProductosRegistrados: uniqueProducts.length,
          productosAgotados,
          productosBajoMinimo,
          productosSinPrecioProveedor: productosSinPrecio,
        },
        diagnostico:
          productosBajoMinimo > 0
            ? `Se identificaron ${productosBajoMinimo} productos por debajo del stock mínimo. El costo real para cubrir el déficit con precios vigentes de catálogo es de $${presupuestoReabastecimientoEstimado.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN.`
            : "Inventario en balance. No hay productos por debajo del stock mínimo configurado.",
      },
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: `Error al calcular análisis financiero: ${(error as Error).message}`,
    };
  }
}
