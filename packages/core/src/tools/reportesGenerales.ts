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
    const { eq, isNotNull, and } = await import("drizzle-orm");

    const [prods, invs] = await Promise.all([
      db.select().from(products).where(eq(products.companyId, companyId)),
      db.select().from(inventory).where(eq(inventory.companyId, companyId)),
    ]);

    const aggMap = new Map<string, { stock: number; salesCount: number }>();
    for (const inv of invs) {
      const prev = aggMap.get(inv.productId) || { stock: 0, salesCount: 0 };
      aggMap.set(inv.productId, {
        stock: prev.stock + (inv.stock || 0),
        salesCount: prev.salesCount + (inv.salesCount || 0),
      });
    }

    if (args.tipo_reporte === "mas_vendido") {
      if (!prods.length) {
        return { isSuccess: true, message: "No hay productos registrados en el catálogo de esta empresa." };
      }

      const mapped = prods.map((p) => {
        const agg = aggMap.get(p.id) || { stock: 0, salesCount: 0 };
        const estado = agg.stock === 0 ? "AGOTADO" : agg.stock < p.minStock ? "BAJO" : "ÓPTIMO";
        return {
          producto: p.name,
          sku: p.sku,
          categoria: p.category,
          stock_actual: agg.stock,
          stock_minimo: p.minStock,
          ventas_totales: agg.salesCount,
          estado,
        };
      });

      mapped.sort((a, b) => b.ventas_totales - a.ventas_totales || b.stock_actual - a.stock_actual);

      return {
        isSuccess: true,
        message: "Reporte del producto con mayor rotación/existencia en almacén.",
        data: mapped[0],
      };
    }

    if (args.tipo_reporte === "sin_stock") {
      const agotados = prods
        .map((p) => {
          const agg = aggMap.get(p.id) || { stock: 0, salesCount: 0 };
          return {
            id: p.id,
            nombre: p.name,
            sku: p.sku,
            categoria: p.category,
            stock_actual: agg.stock,
            minimo_requerido: p.minStock,
          };
        })
        .filter((item) => item.stock_actual === 0);

      return {
        isSuccess: true,
        message: "Reporte de productos sin stock (Agotados).",
        data: agotados.length > 0 ? agotados : "No hay productos agotados actualmente en el catálogo.",
      };
    }

    if (args.tipo_reporte === "renovar") {
      const porRenovar = prods
        .map((p) => {
          const agg = aggMap.get(p.id) || { stock: 0, salesCount: 0 };
          return {
            id: p.id,
            nombre: p.name,
            sku: p.sku,
            categoria: p.category,
            stock_actual: agg.stock,
            minimo_requerido: p.minStock,
          };
        })
        .filter((item) => item.stock_actual < item.minimo_requerido);

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
          stock_actual: inventory.stock,
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
          stock_actual: a.stock_actual ?? 0,
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
