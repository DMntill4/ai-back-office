import { z } from "zod";
import { db } from "../db/client";
import { suppliers, supplierProducts, products, companies } from "../db/schema";
import { eq, and, or, ilike } from "drizzle-orm";

export const evaluarProveedoresSchema = z.object({
  producto_id: z.string().describe("ID, SKU o nombre del producto a cotizar/evaluar (ej. 'prod_st200')"),
  criterio: z.enum(["costo", "velocidad", "balanceado"]).default("balanceado")
    .describe("Criterio de prioridad: costo (menor precio), velocidad (menor tiempo de entrega), o balanceado."),
});

export type EvaluarProveedoresInput = z.infer<typeof evaluarProveedoresSchema>;

export async function executeEvaluarProveedores(
  args: EvaluarProveedoresInput,
  context?: { companyId?: string },
) {
  const effectiveCompanyId = context?.companyId || "comp_default";

  try {
    let targetProductId = args.producto_id;
    let targetProductName = args.producto_id;
    try {
      const prodMatch = await db
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
      if (prodMatch.length > 0) {
        targetProductId = prodMatch[0].id;
        targetProductName = prodMatch[0].name;
      }
    } catch {
      // Continuar con args.producto_id
    }

    let currency = "USD";
    try {
      const [comp] = await db
        .select({ currency: companies.currency })
        .from(companies)
        .where(eq(companies.id, effectiveCompanyId))
        .limit(1);
      if (comp?.currency) currency = comp.currency;
    } catch {}

    const rows = await db
      .select({
        supplierId: suppliers.id,
        supplierName: suppliers.name,
        unitPrice: supplierProducts.unitPrice,
        minOrderQuantity: supplierProducts.minOrderQuantity,
        leadTimeDays: supplierProducts.leadTimeDays,
        productName: products.name,
      })
      .from(supplierProducts)
      .innerJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
      .innerJoin(products, eq(supplierProducts.productId, products.id))
      .where(
        and(
          eq(supplierProducts.productId, targetProductId),
          eq(products.companyId, effectiveCompanyId),
        ),
      );

    if (!rows.length) {
      const registeredSuppliers = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.companyId, effectiveCompanyId))
        .limit(5);

      return {
        isSuccess: false,
        criterioUsado: args.criterio,
        message:
          registeredSuppliers.length === 0
            ? `No tengo este dato: no hay proveedores registrados en la base de datos de esta empresa. MINT no inventa proveedores ni precios ficticios.`
            : `No tengo este dato: el producto '${targetProductName}' (${targetProductId}) no tiene precio unitario ni cotización vinculada en 'supplier_products' con ningún proveedor homologado. MINT no asume ni inventa precios.`,
        proveedoresDisponiblesEnSistema: registeredSuppliers.map((s) => ({
          id: s.id,
          nombre: s.name,
          email: s.email,
          ubicacion: s.city || s.streetAddress,
        })),
      };
    }

    return sortAndReturnOptions(rows, args.criterio, currency);
  } catch (err: any) {
    return {
      isSuccess: false,
      criterioUsado: args.criterio,
      message: `Error al consultar proveedores en la base de datos: ${err.message}`,
    };
  }
}

function sortAndReturnOptions(options: any[], criterio: string, currency = "USD") {
  const sorted = [...options].sort((a, b) => {
    const priceA = parseFloat(a.unitPrice);
    const priceB = parseFloat(b.unitPrice);
    const daysA = a.leadTimeDays;
    const daysB = b.leadTimeDays;

    if (criterio === "costo") return priceA - priceB;
    if (criterio === "velocidad") return daysA - daysB;
    // Balanceado: (Precio * 0.6) + (Días * 50 * 0.4)
    const scoreA = priceA * 0.6 + daysA * 50 * 0.4;
    const scoreB = priceB * 0.6 + daysB * 50 * 0.4;
    return scoreA - scoreB;
  });

  const recomendado = sorted[0];

  return {
    isSuccess: true,
    criterioUsado: criterio,
    opcionRecomendada: {
      proveedorId: recomendado.supplierId,
      nombre: recomendado.supplierName,
      precioUnitario: `$${recomendado.unitPrice} ${currency}`,
      tiempoEntregaDias: recomendado.leadTimeDays,
      cantidadMinima: recomendado.minOrderQuantity,
      motivoRecomendacion: `Seleccionado por presentar la mejor puntuación bajo el criterio '${criterio}' en la base de datos de proveedores.`,
    },
    todasLasOpciones: sorted.map((o) => ({
      proveedorId: o.supplierId,
      nombre: o.supplierName,
      precioUnitario: `$${o.unitPrice} ${currency}`,
      tiempoEntregaDias: o.leadTimeDays,
      cantidadMinima: o.minOrderQuantity,
    })),
  };
}
