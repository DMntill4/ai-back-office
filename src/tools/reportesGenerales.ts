import { z } from "zod";

export const reporteGeneralSchema = z.object({
  tipo_reporte: z.enum(["mas_vendido", "sin_stock", "renovar", "caducidad"])
    .describe("Tipo de reporte que el usuario solicita."),
});

export type ReporteGeneralInput = z.infer<typeof reporteGeneralSchema>;

export async function executeReporteGeneral(args: ReporteGeneralInput) {
  const { db } = await import("../db/client");
  const { products, inventory } = await import("../db/schema");
  const { desc, eq, lt, isNotNull, and, sql } = await import("drizzle-orm");

  if (args.tipo_reporte === "mas_vendido") {
    // Top 1 vendido usando la tabla de inventario
    const topSales = await db
      .select({
        producto: products.name,
        sku: products.sku,
        ventas_totales: inventory.salesCount,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .orderBy(desc(inventory.salesCount))
      .limit(1);

    if (!topSales.length) {
      return { isSuccess: true, message: "No hay datos de ventas disponibles." };
    }

    return {
      isSuccess: true,
      message: "Reporte del producto más vendido.",
      data: topSales[0],
    };
  }
  
  if (args.tipo_reporte === "sin_stock") {
    const agotados = await db
      .select({
        id: products.id,
        nombre: products.name,
        stock: inventory.stock,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(eq(inventory.stock, 0));

    return {
      isSuccess: true,
      message: "Reporte de productos sin stock (Agotados).",
      data: agotados.length > 0 ? agotados : "No hay productos agotados actualmente."
    };
  }
  
  if (args.tipo_reporte === "renovar") {
    const porRenovar = await db
      .select({
        id: products.id,
        nombre: products.name,
        stock_actual: inventory.stock,
        minimo_requerido: products.minStock,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(lt(inventory.stock, products.minStock));

    return {
      isSuccess: true,
      message: "Reporte de productos que están por debajo de su umbral mínimo y deben renovarse.",
      data: porRenovar.length > 0 ? porRenovar : "Todos los productos tienen stock saludable."
    };
  }
  
  if (args.tipo_reporte === "caducidad") {
    // Simplemente traemos todos los de comida que tienen expiration_date
    const alimentos = await db
      .select({
        id: products.id,
        nombre: products.name,
        caducidad: inventory.expirationDate,
        stock: inventory.stock,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(isNotNull(inventory.expirationDate));

    // Filtramos en memoria los que caducan pronto para evitar complejidad de fechas en SQLite/PG
    const hoy = new Date();
    const caducandoPronto = alimentos.filter(a => {
      if (!a.caducidad) return false;
      const diasRestantes = Math.ceil((a.caducidad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      return diasRestantes <= 7 && diasRestantes >= 0;
    }).map(a => ({
      ...a,
      dias_restantes: Math.ceil((a.caducidad!.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    }));

    return {
      isSuccess: true,
      message: "Reporte de perecederos próximos a caducar en los siguientes 7 días.",
      data: caducandoPronto.length > 0 ? caducandoPronto : "No hay alimentos próximos a caducar."
    };
  }

  return {
    isSuccess: false,
    message: "Tipo de reporte desconocido.",
  };
}
