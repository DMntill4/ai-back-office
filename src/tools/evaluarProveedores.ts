import { z } from "zod";
import { db } from "../db/client";
import { suppliers, supplierProducts, products } from "../db/schema";
import { eq, sql } from "drizzle-orm";

export const evaluarProveedoresSchema = z.object({
  producto_id: z.string().describe("ID del producto a cotizar/evaluar (ej. 'prod_st200')"),
  criterio: z.enum(["costo", "velocidad", "balanceado"]).default("balanceado")
    .describe("Criterio de prioridad: costo (menor precio), velocidad (menor tiempo de entrega), o balanceado."),
});

export type EvaluarProveedoresInput = z.infer<typeof evaluarProveedoresSchema>;

export async function executeEvaluarProveedores(args: EvaluarProveedoresInput) {
  try {
    const rows = await db
      .select({
        supplierId: suppliers.id,
        supplierName: suppliers.name,
        rating: sql<string>`'4.8'`,
        unitPrice: supplierProducts.unitPrice,
        minOrderQuantity: supplierProducts.minOrderQuantity,
        leadTimeDays: supplierProducts.leadTimeDays,
        productName: products.name,
      })
      .from(supplierProducts)
      .innerJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
      .innerJoin(products, eq(supplierProducts.productId, products.id))
      .where(eq(supplierProducts.productId, args.producto_id));

    if (!rows.length) {
      // Consultar proveedores registrados en la base de datos
      const registeredSuppliers = await db.select().from(suppliers).limit(5);
      return {
        isSuccess: false,
        criterioUsado: args.criterio,
        message: `No se encontraron cotizaciones para el producto '${args.producto_id}' en la tabla 'supplier_products'.`,
        proveedoresDisponiblesEnSistema: registeredSuppliers.map((s) => ({
          id: s.id,
          nombre: s.name,
          email: s.email,
          telefono: s.phone,
        })),
      };
    }

    return sortAndReturnOptions(rows, args.criterio);
  } catch (err: any) {
    return {
      isSuccess: false,
      criterioUsado: args.criterio,
      message: `Error al consultar proveedores en la base de datos: ${err.message}`,
    };
  }
}

function sortAndReturnOptions(options: any[], criterio: string) {
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
      precioUnitario: `$${recomendado.unitPrice} MXN`,
      tiempoEntregaDias: recomendado.leadTimeDays,
      cantidadMinima: recomendado.minOrderQuantity,
      motivoRecomendacion: `Seleccionado por presentar la mejor puntuación bajo el criterio '${criterio}' en la base de datos de proveedores.`,
    },
    todasLasOpciones: sorted.map((o) => ({
      proveedorId: o.supplierId,
      nombre: o.supplierName,
      precioUnitario: `$${o.unitPrice} MXN`,
      tiempoEntregaDias: o.leadTimeDays,
      cantidadMinima: o.minOrderQuantity,
    })),
  };
}
