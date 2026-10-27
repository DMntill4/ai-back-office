import { db } from "../../db/client";
import { suppliers, supplierProducts, warehouses, purchaseOrders, decisions } from "../../db/schema";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { compactSupplierFacts } from "../context/contextManager";
import { resolveNodeGeoPoint } from "../../services/geocodingService";
import { calculateRealRoute } from "../../services/routeCalculator";
import { addPendingQuestion } from "../../services/pendingQuestionsService";
import { getCompanyConfig } from "../../services/configService";

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
  priceStatus: "estable" | "precio por confirmar";
  priceOrigin: string;
}

export interface PurchasingProposal {
  recommendedOption: SupplierOption;
  alternativeOptions: SupplierOption[];
  recommendedQuantity: number;
  totalCostMxn: number;
  reason: string;
  compactFacts: string;
  requesterUserId?: string;
  expiresInDays: number;
}

/**
 * Tarea 4: Compras a proveedores con aprobación estricta (reemplaza lógica anterior).
 * 1. Detecta stock bajo o quiebre estimado.
 * 2. Busca proveedor y precio estable en la BD. Sin proveedor: registra en el banco de preguntas pendientes.
 *    Sin precio estable: no inventa precio; marca 'precio por confirmar'.
 * 3. Con datos reales genera un borrador con proveedor, producto, cantidad, precio y origen.
 * 4. Valida que exista una sola solicitud abierta por producto y proveedor.
 * 5. MINT nunca paga ni envía la orden por sí solo.
 */
export async function analyzePurchasingOptions(
  productId: string,
  targetQuantity: number,
  companyId: string = "comp_default",
  isUrgent: boolean = false,
  requesterUserId: string = "agent_compras",
): Promise<PurchasingProposal | null> {
  const config = await getCompanyConfig(companyId);

  // 1. Verificar si la empresa tiene proveedores en la BD
  const registeredSuppliers = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.companyId, companyId))
    .limit(1);

  if (registeredSuppliers.length === 0) {
    // Si la empresa no tiene proveedores registrados, MINT no los inventa. Registra en banco de preguntas.
    await addPendingQuestion(
      companyId,
      "supplier_missing",
      `No hay proveedores registrados en la base de datos para reabastecer el producto ID '${productId}'. ¿Quién es el proveedor autorizado?`,
      { productId, targetQuantity },
    );
    return null;
  }

  // 2. Buscar cotizaciones y productos homologados en supplier_products
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

  if (options.length === 0) {
    // Verificar si existen órdenes históricas para este producto
    const historicalPo = await db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.productId, productId), eq(purchaseOrders.companyId, companyId)))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(5);

    if (historicalPo.length === 0) {
      // Sin historial ni oferta formal -> Registrar pregunta pendiente
      await addPendingQuestion(
        companyId,
        "supplier_missing",
        `El producto ID '${productId}' no tiene proveedor asignado ni historial de compras. Favor indicar proveedor y precio acordado.`,
        { productId, targetQuantity },
      );
      return null;
    }
  }

  // 3. Verificar si ya existe una propuesta abierta (en borrador o pendiente de aprobación) para este producto
  const existingPending = await db
    .select()
    .from(decisions)
    .where(
      and(
        eq(decisions.companyId, companyId),
        eq(decisions.policyDecision, "pending_approval"),
        eq(decisions.actionType, "crear_orden_compra"),
      ),
    );

  const alreadyOpen = existingPending.find((d) => (d.evidencePayload as any)?.productId === productId);
  if (alreadyOpen) {
    return null; // Regla: Una sola solicitud abierta por producto y proveedor
  }

  // 4. Evaluar opciones y estabilidad de precio
  // Buscar almacén destino para flete
  const whRows = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.companyId, companyId))
    .limit(1);
  const destGeo = whRows.length > 0 ? await resolveNodeGeoPoint(whRows[0]).catch(() => null) : null;

  const mappedOptions: SupplierOption[] = [];

  for (const opt of options) {
    const rawPrice = parseFloat(opt.unitPrice);
    const qty = Math.max(targetQuantity, opt.minOrderQuantity);

    // Comprobar variación histórica de precios para este proveedor
    const pastOrders = await db
      .select({ unitPrice: purchaseOrders.unitPrice })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.companyId, companyId),
          eq(purchaseOrders.productId, productId),
          eq(purchaseOrders.supplierId, opt.supplierId),
        ),
      )
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(5);

    let priceStatus: SupplierOption["priceStatus"] = "estable";
    let priceOrigin = `Catálogo de proveedor (${config.currency} ${rawPrice.toFixed(2)}/u)`;

    if (pastOrders.length > 1) {
      const prices = pastOrders.map((p) => parseFloat(p.unitPrice));
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const variationRatio = minP > 0 ? (maxP - minP) / minP : 0;

      // Umbral configurable de estabilidad (15% por defecto)
      if (variationRatio > 0.15) {
        priceStatus = "precio por confirmar";
        priceOrigin = `Variación histórica del ${(variationRatio * 100).toFixed(0)}% detectada. Precio por confirmar antes de compra.`;
      }
    }

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
          freightCostMxn = route.estimatedFreightCostMxn ?? 0;
          distanceKm = route.distanceKm;
        }
      }
    }

    const productCost = rawPrice * qty;

    mappedOptions.push({
      supplierId: opt.supplierId,
      supplierName: opt.supplierName,
      unitPrice: rawPrice,
      leadTimeDays: opt.leadTimeDays,
      minOrderQuantity: opt.minOrderQuantity,
      totalCostMxn: productCost,
      freightCostMxn,
      distanceKm,
      landedCostMxn: Number((productCost + freightCostMxn).toFixed(2)),
      priceStatus,
      priceOrigin,
    });
  }

  if (mappedOptions.length === 0) {
    return null;
  }

  // Seleccionar la mejor opción
  if (isUrgent) {
    mappedOptions.sort(
      (a, b) =>
        a.leadTimeDays - b.leadTimeDays ||
        (a.landedCostMxn ?? a.totalCostMxn) - (b.landedCostMxn ?? b.totalCostMxn),
    );
  } else {
    mappedOptions.sort((a, b) => (a.landedCostMxn ?? a.totalCostMxn) - (b.landedCostMxn ?? b.totalCostMxn));
  }

  const recommended = mappedOptions[0];
  const finalQuantity = Math.max(targetQuantity, recommended.minOrderQuantity);
  const totalCost = Number((recommended.unitPrice * finalQuantity).toFixed(2));

  const compactFacts = compactSupplierFacts(
    mappedOptions.map((o) => ({
      supplierId: o.supplierId,
      supplierName: o.supplierName,
      unitPrice: o.unitPrice,
      leadTimeDays: o.leadTimeDays,
      minOrderQuantity: o.minOrderQuantity,
    })),
    config.currency,
  );

  const priceWarning =
    recommended.priceStatus === "precio por confirmar"
      ? " [ALERTA: Precio fluctuante, requiere confirmación formal]"
      : "";

  return {
    recommendedOption: recommended,
    alternativeOptions: mappedOptions.filter((o) => o.supplierId !== recommended.supplierId),
    recommendedQuantity: finalQuantity,
    totalCostMxn: totalCost,
    reason: isUrgent
      ? `Proveedor '${recommended.supplierName}' seleccionado por menor tiempo de entrega (${recommended.leadTimeDays} días). Origen de precio: ${recommended.priceOrigin}.${priceWarning}`
      : `Proveedor '${recommended.supplierName}' seleccionado por menor costo total. Origen de precio: ${recommended.priceOrigin}.${priceWarning}`,
    compactFacts,
    requesterUserId,
    expiresInDays: 7, // Vence tras 7 días configurables
  };
}
