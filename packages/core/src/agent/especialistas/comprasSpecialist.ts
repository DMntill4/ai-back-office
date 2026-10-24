import { db } from "../../db/client";
import { suppliers, supplierProducts, warehouses, purchaseOrders } from "../../db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { compactSupplierFacts } from "../context/contextManager";
import { resolveNodeGeoPoint } from "../../services/geocodingService";
import { calculateRealRoute } from "../../services/routeCalculator";

export interface SupplierOption {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  leadTimeDays: number;
  minOrderQuantity: number;
  totalCostMxn: number;
  freightCostMxn?: number;
  distanceKm?: number;
  landedCostMxn?: number;
  isEstimatedFallback?: boolean;
}

export interface PurchasingProposal {
  recommendedOption: SupplierOption;
  alternativeOptions: SupplierOption[];
  recommendedQuantity: number;
  totalCostMxn: number;
  reason: string;
  compactFacts: string;
}

/**
 * Especialista en Compras: evalúa proveedores reales homologados en PostgreSQL,
 * calcula Landed Cost (Precio Producto + Flete OSRM) y NUNCA falla si la tienda
 * aún no tiene proveedores o tablas supplier_products (genera Licitación Abierta / Compra Directa).
 */
export async function analyzePurchasingOptions(
  productId: string,
  targetQuantity: number,
  companyId: string = "comp_default",
  isUrgent: boolean = false,
): Promise<PurchasingProposal | null> {
  const options = await db
    .select({
      supplierId: suppliers.id,
      supplierName: suppliers.name,
      supplierLocation: suppliers.streetAddress,
      supplierCity: suppliers.city,
      supplierLat: suppliers.latitude,
      supplierLon: suppliers.longitude,
      unitPrice: supplierProducts.unitPrice,
      leadTimeDays: supplierProducts.leadTimeDays,
      minOrderQuantity: supplierProducts.minOrderQuantity,
    })
    .from(supplierProducts)
    .innerJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
    .where(and(eq(supplierProducts.productId, productId), eq(supplierProducts.companyId, companyId)))
    .orderBy(asc(supplierProducts.unitPrice));

  // Buscar almacén destino para calcular flete real OSRM si es posible
  const whRows = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.companyId, companyId))
    .limit(1);
  const destGeo = whRows.length > 0 ? await resolveNodeGeoPoint(whRows[0]).catch(() => null) : null;

  let mappedOptions: SupplierOption[] = [];

  if (options.length > 0) {
    for (const opt of options) {
      const unitPrice = parseFloat(opt.unitPrice);
      const qty = Math.max(targetQuantity, opt.minOrderQuantity);
      const productCost = unitPrice * qty;

      let freightCostMxn = 0;
      let distanceKm = 0;

      if (destGeo) {
        const origGeo = await resolveNodeGeoPoint({
          latitude: opt.supplierLat,
          longitude: opt.supplierLon,
          city: opt.supplierCity,
          location: opt.supplierLocation,
          name: opt.supplierName,
        }).catch(() => null);

        if (origGeo) {
          const route = await calculateRealRoute(origGeo, destGeo).catch(() => null);
          if (route) {
            freightCostMxn = route.estimatedFreightCostMxn;
            distanceKm = route.distanceKm;
          }
        }
      }

      mappedOptions.push({
        supplierId: opt.supplierId,
        supplierName: opt.supplierName,
        unitPrice,
        leadTimeDays: opt.leadTimeDays,
        minOrderQuantity: opt.minOrderQuantity,
        totalCostMxn: productCost,
        freightCostMxn,
        distanceKm,
        landedCostMxn: Number((productCost + freightCostMxn).toFixed(2)),
      });
    }
  } else {
    // FALLBACK RESILIENTE: Si la base de datos de la tienda no tiene filas en supplier_products
    // 1. Verificar si existen órdenes históricas de este producto para inferir su último costo real
    const historicalPo = await db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.productId, productId), eq(purchaseOrders.companyId, companyId)))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(1);

    const inferredUnitPrice =
      historicalPo.length > 0 && Number(historicalPo[0].unitPrice) > 0
        ? Number(historicalPo[0].unitPrice)
        : 250.0;

    // 2. Verificar si la empresa tiene proveedores generales registrados en la tabla suppliers
    const companySuppliers = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.companyId, companyId));

    if (companySuppliers.length > 0) {
      mappedOptions = companySuppliers.map((s) => {
        const qty = Math.max(targetQuantity, 5);
        return {
          supplierId: s.id,
          supplierName: s.name,
          unitPrice: inferredUnitPrice,
          leadTimeDays: 3,
          minOrderQuantity: 5,
          totalCostMxn: Number((inferredUnitPrice * qty).toFixed(2)),
          landedCostMxn: Number((inferredUnitPrice * qty).toFixed(2)),
          isEstimatedFallback: true,
        };
      });
    } else {
      // 3. Si la base de datos no maneja proveedores en absoluto, usar Licitación Abierta / Compra Directa
      const qty = Math.max(targetQuantity, 5);
      mappedOptions = [
        {
          supplierId: `supp_direct_${companyId}`,
          supplierName: "Compra Directa / Licitación Abierta (RFQ)",
          unitPrice: inferredUnitPrice,
          leadTimeDays: 3,
          minOrderQuantity: 5,
          totalCostMxn: Number((inferredUnitPrice * qty).toFixed(2)),
          landedCostMxn: Number((inferredUnitPrice * qty).toFixed(2)),
          isEstimatedFallback: true,
        },
      ];
    }
  }

  // Si es urgente, priorizar proveedor con menor tiempo de entrega
  let recommended: SupplierOption;
  if (isUrgent) {
    mappedOptions.sort(
      (a, b) =>
        a.leadTimeDays - b.leadTimeDays ||
        (a.landedCostMxn ?? a.totalCostMxn) - (b.landedCostMxn ?? b.totalCostMxn),
    );
    recommended = mappedOptions[0];
  } else {
    // Si es rutinario, priorizar menor Landed Cost (o costo de producto)
    mappedOptions.sort((a, b) => a.unitPrice - b.unitPrice);
    recommended = mappedOptions[0];
  }

  const finalQuantity = Math.max(targetQuantity, recommended.minOrderQuantity);
  const totalCostMxn = Number((recommended.unitPrice * finalQuantity).toFixed(2));

  const compactFacts = compactSupplierFacts(
    mappedOptions.map((o) => ({
      supplierId: o.supplierId,
      supplierName: o.supplierName,
      unitPrice: o.unitPrice,
      leadTimeDays: o.leadTimeDays,
      minOrderQuantity: o.minOrderQuantity,
    })),
  );

  const freightSuffix =
    recommended.freightCostMxn && recommended.freightCostMxn > 0
      ? ` (Flete estimado OSRM: $${recommended.freightCostMxn.toFixed(2)} MXN / ${recommended.distanceKm} km)`
      : "";

  return {
    recommendedOption: recommended,
    alternativeOptions: mappedOptions.filter((o) => o.supplierId !== recommended.supplierId),
    recommendedQuantity: finalQuantity,
    totalCostMxn,
    reason: recommended.isEstimatedFallback
      ? `Modalidad "${recommended.supplierName}" asignada automáticamente con costo estimado ($${recommended.unitPrice.toFixed(2)} MXN/u) dado que el catálogo no registraba proveedor fijo para este SKU.`
      : isUrgent
        ? `Proveedor "${recommended.supplierName}" seleccionado por menor tiempo de entrega (${recommended.leadTimeDays} días) para mitigar riesgo de desabasto.${freightSuffix}`
        : `Proveedor "${recommended.supplierName}" seleccionado por mejor costo unitario ($${recommended.unitPrice.toFixed(2)} MXN).${freightSuffix}`,
    compactFacts,
  };
}
