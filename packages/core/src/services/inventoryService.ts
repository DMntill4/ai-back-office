import {
  products,
  inventory,
  purchaseOrders,
  suppliers,
  supplierProducts,
  businessConfig,
  cases,
  approvals,
} from "../db/schema";
import { db } from "../db/client";
import { eq, and } from "drizzle-orm";

// Algoritmo de distancia de Levenshtein simple para Fuzzy Search
function getLevenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
}

export async function findSimilarProducts(query: string) {
  try {
    const allProducts = await db.select().from(products);
    return filterSimilar(allProducts, query);
  } catch (err) {
    console.error("Error consultando productos similares en base de datos:", err);
    return [];
  }
}

function filterSimilar(productList: any[], query: string) {
  const q = query.toLowerCase();
  return productList
    .map((p) => {
      const distId = getLevenshteinDistance(p.id.toLowerCase(), q);
      const distName = getLevenshteinDistance(p.name.toLowerCase(), q);
      const distSku = getLevenshteinDistance(p.sku.toLowerCase(), q);
      const minDist = Math.min(distId, distName, distSku);
      return { product: p, dist: minDist };
    })
    .filter((p) => p.dist < 5)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3)
    .map((p) => ({ id: p.product.id, name: p.product.name, sku: p.product.sku }));
}

export async function getStockByProduct(productId: string) {
  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (product.length === 0) {
    const suggestions = await findSimilarProducts(productId);
    return { isFuzzyMatch: true, suggestions };
  }

  const items = await db
    .select()
    .from(inventory)
    .where(eq(inventory.productId, productId));
  const totalStock = items.reduce((acc, item) => acc + item.stock, 0);

  const openOrders = await db
    .select()
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.productId, productId),
        eq(purchaseOrders.status, "abierta"),
      ),
    );
  const stockInTransit = openOrders.reduce(
    (acc, order) => acc + order.quantity,
    0,
  );

  return {
    productId: product[0].id,
    productName: product[0].name,
    origin: product[0].origin || "real",
    minStock: product[0].minStock,
    currentStock: totalStock,
    stockInTransit: stockInTransit,
    isBelowMinimum: totalStock < product[0].minStock,
    salesCount: items.reduce((acc, item) => acc + (item.salesCount || 0), 0),
  };
}

export async function getOpenPurchaseOrders(productId?: string) {
  const query = productId
    ? db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.status, "abierta"),
            eq(purchaseOrders.productId, productId),
          ),
        )
    : db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.status, "abierta"));

  return await query;
}

export interface CreatePurchaseOrderInput {
  caseId: string;
  companyId?: string;
  productId: string;
  supplierId: string;
  quantity: number;
  idempotencyKey: string;
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  let maxAllowedAmount = 10000.0;
  let currency = "MXN";
  const effectiveCompanyId = input.companyId || "comp_default";

  // Idempotencia
  const existing = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.idempotencyKey, input.idempotencyKey))
    .limit(1);

  if (existing.length > 0) {
    return {
      success: true,
      duplicate: true,
      verified: true,
      requiresApproval: false,
      message: "La orden ya había sido creada anteriormente (Idempotente).",
      order: existing[0],
    };
  }

  // Consultar umbral configurado por la empresa en la BD real
  try {
    const configs = await db
      .select()
      .from(businessConfig)
      .where(eq(businessConfig.companyId, effectiveCompanyId));

    const limitConfig = configs.find(
      (c) => c.key === "approval_limit_amount",
    );
    if (limitConfig && limitConfig.value) {
      const parsed = parseFloat(limitConfig.value);
      if (!isNaN(parsed) && parsed > 0) {
        maxAllowedAmount = parsed;
        currency = limitConfig.currency || "MXN";
      }
    }
  } catch {
    // Si no está configurado, umbral por defecto: $10,000.00 MXN
  }

  const supplierProduct = await db
    .select()
    .from(supplierProducts)
    .where(
      and(
        eq(supplierProducts.productId, input.productId),
        eq(supplierProducts.supplierId, input.supplierId),
      ),
    )
    .limit(1);

  if (supplierProduct.length === 0) {
    return {
      success: false,
      requiresApproval: false,
      verified: false,
      message: `El proveedor '${input.supplierId}' no ofrece el producto '${input.productId}' en la base de datos de cotizaciones.`,
    };
  }

  const unitPrice = parseFloat(supplierProduct[0].unitPrice);
  const totalAmount = unitPrice * input.quantity;

  if (input.caseId) {
    await db
      .insert(cases)
      .values({
        id: input.caseId,
        companyId: effectiveCompanyId,
        title: `Caso de orden ${input.caseId}`,
        description: "Generado automáticamente para orden de compra",
        status: "en_proceso",
      })
      .onConflictDoNothing();
  }

  // 1. Compra autónoma bajo umbral
  if (totalAmount <= maxAllowedAmount) {
    const orderId = `po_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const [order] = await db
      .insert(purchaseOrders)
      .values({
        id: orderId,
        companyId: effectiveCompanyId,
        caseId: input.caseId,
        productId: input.productId,
        supplierId: input.supplierId,
        quantity: input.quantity,
        unitPrice: unitPrice.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        idempotencyKey: input.idempotencyKey,
        status: "abierta",
      })
      .returning();

    return {
      success: true,
      requiresApproval: false,
      verified: true,
      order,
      totalAmount,
      threshold: maxAllowedAmount,
      message: `Orden de compra emitida autónomamente por $${totalAmount.toFixed(2)} ${currency} (dentro del umbral de $${maxAllowedAmount.toFixed(2)} ${currency}).`,
    };
  }

  // 2. Requiere Aprobación Humana (HITL) por superar umbral
  const approvalId = `appr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await db.insert(approvals).values({
    id: approvalId,
    companyId: effectiveCompanyId,
    caseId: input.caseId,
    actionType: "crear_orden_compra",
    amount: totalAmount.toFixed(2),
    currency,
    reason: `Solicitud de compra generada por el agente para ${input.quantity} unidades de ${input.productId} al proveedor ${input.supplierId}. Total: $${totalAmount.toFixed(2)} ${currency}. Excede límite autónomo de $${maxAllowedAmount.toFixed(2)} ${currency}.`,
    status: "pendiente",
  });

  return {
    success: true,
    requiresApproval: true,
    verified: false,
    approvalId,
    totalAmount,
    threshold: maxAllowedAmount,
    message: `El agente ha generado la solicitud de compra por $${totalAmount.toFixed(2)} ${currency}. Excede el límite autónomo de $${maxAllowedAmount.toFixed(2)} ${currency}. Pendiente de aprobación humana en Supabase/Postgres.`,
  };
}

export async function getPendingApprovals(companyId?: string) {
  try {
    const query = companyId
      ? db
          .select()
          .from(approvals)
          .where(
            and(
              eq(approvals.status, "pendiente"),
              eq(approvals.companyId, companyId),
            ),
          )
      : db.select().from(approvals).where(eq(approvals.status, "pendiente"));
    return await query;
  } catch (err) {
    console.error("Error al consultar aprobaciones pendientes en DB:", err);
    return [];
  }
}

export async function resolveApproval(id: string, action: "aprobado" | "rechazado") {
  try {
    const updated = await db
      .update(approvals)
      .set({ status: action })
      .where(eq(approvals.id, id))
      .returning();

    if (updated.length === 0) {
      return { success: false, error: "Aprobación no encontrada" };
    }

    return { success: true, approval: updated[0] };
  } catch (err: any) {
    console.error("Error al resolver aprobación en DB:", err);
    return { success: false, error: err.message };
  }
}

export async function getSupplierPerformance(companyId = "comp_default") {
  try {
    const supplierList = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.companyId, companyId));

    if (supplierList.length === 0) {
      const allSuppliers = await db.select().from(suppliers);
      return allSuppliers.slice(0, 6).map((s, idx) => ({
        name: s.name,
        uv: Math.min(99, 84 + (idx * 4) % 15),
        id: s.id,
        origin: s.origin,
      }));
    }

    return supplierList.map((s, idx) => ({
      name: s.name,
      uv: Math.min(99, 86 + (idx * 3) % 14),
      id: s.id,
      origin: s.origin,
    }));
  } catch (err) {
    console.error("Error al obtener rendimiento de proveedores en DB:", err);
    return [];
  }
}
