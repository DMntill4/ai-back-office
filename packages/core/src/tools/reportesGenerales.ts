import { z } from "zod";

export const reporteGeneralSchema = z.object({
  tipo_reporte: z.enum(["mas_vendido", "sin_stock", "renovar", "caducidad"])
    .describe("Tipo de reporte que el usuario solicita."),
});

export type ReporteGeneralInput = z.infer<typeof reporteGeneralSchema>;

export async function executeReporteGeneral(
  args: ReporteGeneralInput,
  context?: { companyId?: string },
) {
  const companyId = context?.companyId || "comp_default";

  try {
    const { db } = await import("../db/client");
    const { products, inventory } = await import("../db/schema");
    const { desc, eq, lt, isNotNull, or, isNull, sql, and } = await import("drizzle-orm");

    if (args.tipo_reporte === "mas_vendido") {
      const topSales = await db
        .select({
          producto: products.name,
          sku: products.sku,
          categoria: products.category,
          stock_actual: sql<number>`COALESCE(${inventory.stock}, 0)`,
          stock_minimo: products.minStock,
          ventas_totales: sql<number>`COALESCE(${inventory.salesCount}, 0)`,
          estado: sql<string>`CASE 
            WHEN COALESCE(${inventory.stock}, 0) = 0 THEN 'AGOTADO'
            WHEN COALESCE(${inventory.stock}, 0) < ${products.minStock} THEN 'BAJO'
            ELSE 'ÓPTIMO'
          END`,
        })
        .from(products)
        .leftJoin(inventory, eq(products.id, inventory.productId))
        .where(eq(products.companyId, companyId))
        .orderBy(desc(sql`COALESCE(${inventory.salesCount}, 0)`), desc(sql`COALESCE(${inventory.stock}, 0)`))
        .limit(1);

      if (!topSales.length) {
        return { isSuccess: true, message: "No hay productos registrados en el catálogo de esta empresa." };
      }

      return {
        isSuccess: true,
        message: "Reporte del producto con mayor rotación/existencia en almacén.",
        data: topSales[0],
      };
    }

    if (args.tipo_reporte === "sin_stock") {
      const agotados = await db
        .select({
          id: products.id,
          nombre: products.name,
          sku: products.sku,
          categoria: products.category,
          stock_actual: sql<number>`COALESCE(${inventory.stock}, 0)`,
          minimo_requerido: products.minStock,
        })
        .from(products)
        .leftJoin(inventory, eq(products.id, inventory.productId))
        .where(
          and(
            eq(products.companyId, companyId),
            or(eq(inventory.stock, 0), isNull(inventory.stock)),
          ),
        );

      return {
        isSuccess: true,
        message: "Reporte de productos sin stock (Agotados).",
        data: agotados.length > 0 ? agotados : "No hay productos agotados actualmente en el catálogo.",
      };
    }

    if (args.tipo_reporte === "renovar") {
      const porRenovar = await db
        .select({
          id: products.id,
          nombre: products.name,
          sku: products.sku,
          categoria: products.category,
          stock_actual: sql<number>`COALESCE(${inventory.stock}, 0)`,
          minimo_requerido: products.minStock,
        })
        .from(products)
        .leftJoin(inventory, eq(products.id, inventory.productId))
        .where(
          and(
            eq(products.companyId, companyId),
            lt(sql<number>`COALESCE(${inventory.stock}, 0)`, products.minStock),
          ),
        );

      return {
        isSuccess: true,
        message: "Reporte de productos con existencias por debajo del umbral mínimo que requieren renovación.",
        data: porRenovar.length > 0 ? porRenovar : "Todos los productos tienen existencias por encima de su umbral mínimo de seguridad.",
      };
    }

    if (args.tipo_reporte === "caducidad") {
      const alimentos = await db
        .select({
          id: products.id,
          nombre: products.name,
          caducidad: inventory.expirationDate,
          stock_actual: sql<number>`COALESCE(${inventory.stock}, 0)`,
        })
        .from(products)
        .leftJoin(inventory, eq(products.id, inventory.productId))
        .where(
          and(
            eq(products.companyId, companyId),
            isNotNull(inventory.expirationDate),
          ),
        );

      const hoy = new Date();
      const caducandoPronto = alimentos
        .filter((a) => {
          if (!a.caducidad) return false;
          const diasRestantes = Math.ceil((a.caducidad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
          return diasRestantes <= 7 && diasRestantes >= 0;
        })
        .map((a) => ({
          ...a,
          dias_restantes: Math.ceil((a.caducidad!.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)),
        }));

      return {
        isSuccess: true,
        message: "Reporte de perecederos próximos a caducar en los siguientes 7 días.",
        data: caducandoPronto.length > 0 ? caducandoPronto : "No hay productos perecederos próximos a caducar en el inventario actual.",
      };
    }

    return {
      isSuccess: false,
      message: "Tipo de reporte desconocido.",
    };
  } catch (err: any) {
    return {
      isSuccess: false,
      message: `Error al consultar la base de datos para el reporte: ${err.message}`,
    };
  }
}
