import { z } from "zod";

export const auditarAnomaliasSchema = z.object({
  tipo_auditoria: z.enum(["descalces_inventario", "precios_proveedor", "todo"]).default("todo")
    .describe("Filtro de auditoría: descalces de stock, aumentos anormales de precio en proveedores o auditoría completa."),
});

export type AuditarAnomaliasInput = z.infer<typeof auditarAnomaliasSchema>;

export async function executeAuditarAnomalias(
  args: AuditarAnomaliasInput,
  context?: { companyId?: string },
) {
  try {
    const { db } = await import("../db/client");
    const { products, inventory, supplierProducts, suppliers, companies } = await import("../db/schema");
    const { eq, and, sql } = await import("drizzle-orm");

    const effectiveCompanyId = context?.companyId || "comp_default";
    let currency = "USD";
    try {
      const [comp] = await db.select({ currency: companies.currency }).from(companies).where(eq(companies.id, effectiveCompanyId)).limit(1);
      if (comp?.currency) currency = comp.currency;
    } catch {}

    const anomaliasDetectadas: any[] = [];

    if (args.tipo_auditoria === "todo" || args.tipo_auditoria === "descalces_inventario") {
      const stockList = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          minStock: products.minStock,
          stock: sql<number>`coalesce(sum(${inventory.stock}), 0)`,
        })
        .from(products)
        .leftJoin(inventory, eq(products.id, inventory.productId))
        .where(eq(products.companyId, effectiveCompanyId))
        .groupBy(products.id, products.name, products.sku, products.minStock);

      for (const item of stockList) {
        const stockVal = Number(item.stock);
        const minVal = Number(item.minStock);
        if (stockVal === 0) {
          anomaliasDetectadas.push({
            categoria: "DESCALCE_STOCK_CRÍTICO",
            gravedad: "CRÍTICA",
            entidad: `${item.name} (${item.sku})`,
            descripcion: `Producto agotado (stock: 0u). Mínimo de seguridad requerido: ${minVal}u.`,
            accionSugerida: "Generar propuesta de reabastecimiento en /inbox.",
          });
        } else if (stockVal < minVal) {
          anomaliasDetectadas.push({
            categoria: "DESCALCE_STOCK_BAJO",
            gravedad: "ALTA",
            entidad: `${item.name} (${item.sku})`,
            descripcion: `Stock actual (${stockVal}u) por debajo del umbral mínimo de seguridad (${minVal}u).`,
            accionSugerida: "Revisar órdenes de compra abiertas o cotizar con proveedores.",
          });
        }
      }
    }

    if (args.tipo_auditoria === "todo" || args.tipo_auditoria === "precios_proveedor") {
      const catalogPrices = await db
        .select({
          productId: products.id,
          productName: products.name,
          sku: products.sku,
          supplierName: suppliers.name,
          unitPrice: supplierProducts.unitPrice,
        })
        .from(supplierProducts)
        .innerJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
        .innerJoin(products, eq(supplierProducts.productId, products.id))
        .where(eq(products.companyId, effectiveCompanyId));

      // Agrupar por producto para calcular dispersión real de precios
      const pricesByProduct = new Map<
        string,
        Array<{ supplier: string; price: number; productName: string; sku: string }>
      >();

      for (const row of catalogPrices) {
        const price = Number(row.unitPrice);
        if (!pricesByProduct.has(row.productId)) {
          pricesByProduct.set(row.productId, []);
        }
        pricesByProduct.get(row.productId)!.push({
          supplier: row.supplierName,
          price,
          productName: row.productName,
          sku: row.sku,
        });
      }

      for (const [, entries] of pricesByProduct.entries()) {
        if (entries.length > 1) {
          const minPrice = Math.min(...entries.map((e) => e.price));
          for (const entry of entries) {
            const spreadPercent = ((entry.price - minPrice) / minPrice) * 100;
            if (spreadPercent >= 20) {
              anomaliasDetectadas.push({
                categoria: "SOBREPRECIO_PROVEEDOR",
                gravedad: "MEDIA",
                entidad: `${entry.productName} (${entry.supplier})`,
                descripcion: `Precio unitario de $${entry.price.toFixed(2)} ${currency} es +${spreadPercent.toFixed(1)}% más caro que la mejor opción ($${minPrice.toFixed(2)} ${currency}).`,
                accionSugerida: "Priorizar al proveedor más económico en la próxima compra.",
              });
            }
          }
        }
      }
    }

    if (!anomaliasDetectadas.length) {
      anomaliasDetectadas.push({
        categoria: "SISTEMA_SALUDABLE",
        gravedad: "INFORMATIVA",
        entidad: "Auditoría de Almacén",
        descripcion: "No se detectaron descalces críticos ni sobreprecios en el catálogo analizado.",
        accionSugerida: "Continuar monitoreo rutinario.",
      });
    }

    return {
      isSuccess: true,
      totalAnomalias: anomaliasDetectadas.length,
      anomalias: anomaliasDetectadas,
      resumenAuditoria: {
        estadoGeneral: anomaliasDetectadas.some((a) => a.gravedad === "CRÍTICA")
          ? "REQUIERE_ATENCION_URGENTE"
          : "ESTABLE",
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: `Error al ejecutar auditoría de anomalías: ${(error as Error).message}`,
    };
  }
}
