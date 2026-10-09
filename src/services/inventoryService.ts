import {
  products,
  inventory,
  purchaseOrders,
  suppliers,
  supplierProducts,
  businessConfig,
  cases,
  caseEvents,
  llmCalls,
  toolCalls,
  idempotencyKeys,
  approvals,
} from "../db/schema";

// 1. Productos (Inventario Industrial Real)
const mockProducts = [
  {
    id: "prod_st200",
    name: "Sensor Térmico ST-200",
    description: "Sensor de temperatura industrial de alta precisión (-40C a 200C)",
    sku: "SKU-ST200",
    minStock: 15,
    origin: "simulado" as const,
    createdAt: new Date(),
  },
  {
    id: "prod_v500",
    name: "Válvula Reguladora V-500",
    description: "Válvula de presión hidráulica de acero inoxidable",
    sku: "SKU-V500",
    minStock: 5,
    origin: "simulado" as const,
    createdAt: new Date(),
  },
  {
    id: "prod_mc32",
    name: "Microcontrolador MCU-32",
    description: "Placa base de automatización PLC",
    sku: "SKU-MC32",
    minStock: 20,
    origin: "simulado" as const,
    createdAt: new Date(),
  }
];

// 2. Inventario Actual
const mockInventory = [
  { id: "inv_001", productId: "prod_st200", warehouseId: "alm_central", stock: 2, updatedAt: new Date() },
  { id: "inv_002", productId: "prod_v500", warehouseId: "alm_central", stock: 15, updatedAt: new Date() },
  { id: "inv_003", productId: "prod_mc32", warehouseId: "alm_central", stock: 8, updatedAt: new Date() } // Bajo stock!
];

// 3. Proveedores Reales y sus precios
const mockSupplierProducts = [
  {
    id: "sp_001",
    supplierId: "prov_grainger",
    productId: "prod_st200",
    unitPrice: "450.00",
    minOrderQuantity: 5,
    leadTimeDays: 2,
  },
  {
    id: "sp_002",
    supplierId: "prov_uline",
    productId: "prod_v500",
    unitPrice: "1250.00",
    minOrderQuantity: 2,
    leadTimeDays: 4,
  },
  {
    id: "sp_003",
    supplierId: "prov_mouser",
    productId: "prod_mc32",
    unitPrice: "85.50",
    minOrderQuantity: 10,
    leadTimeDays: 1,
  }
];

// 4. Órdenes de Compra en memoria
const mockPurchaseOrders: Array<{
  id: string;
  supplierId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  status: "abierta" | "recibida" | "cancelada";
  idempotencyKey: string | null;
  caseId: string | null;
  createdAt: Date;
}> = [];

// 5. Aprobaciones en memoria
const mockApprovals: Array<{
  id: string;
  caseId: string;
  actionType: string;
  amount: string;
  currency: string;
  reason: string;
  status: "pendiente" | "aprobado" | "rechazado";
  requestedAt: Date;
}> = [];

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
    const { db } = await import("../db/client");
    const allProducts = await db.select().from(products);
    return filterSimilar(allProducts, query);
  } catch {
    // Fallback en memoria
    return filterSimilar(mockProducts, query);
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
    .filter((p) => p.dist < 5) // Umbral de tolerancia
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3)
    .map(p => ({ id: p.product.id, name: p.product.name, sku: p.product.sku }));
}

// Métodos del servicio usando la base de datos real con fallback en memoria para tests sin Postgres
export async function getStockByProduct(productId: string) {
  try {
    const { db } = await import("../db/client");
    const { eq, and } = await import("drizzle-orm");

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
      minStock: product[0].minStock,
      currentStock: totalStock,
      stockInTransit: stockInTransit,
      isBelowMinimum: totalStock < product[0].minStock,
    };
  } catch {
    // Fallback en memoria si Postgres no está conectado
    const product = mockProducts.find((p) => p.id === productId);
    if (!product) {
      const suggestions = await findSimilarProducts(productId);
      return { isFuzzyMatch: true, suggestions };
    }

    const totalStock = mockInventory
      .filter((i) => i.productId === productId)
      .reduce((acc, item) => acc + item.stock, 0);

    const stockInTransit = mockPurchaseOrders
      .filter((o) => o.productId === productId && o.status === "abierta")
      .reduce((acc, order) => acc + order.quantity, 0);

    return {
      productId: product.id,
      productName: product.name,
      minStock: product.minStock,
      currentStock: totalStock,
      stockInTransit: stockInTransit,
      isBelowMinimum: totalStock < product.minStock,
    };
  }
}

export async function getOpenPurchaseOrders(productId?: string) {
  try {
    const { db } = await import("../db/client");
    const { eq } = await import("drizzle-orm");

    const orders = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.status, "abierta"));
    if (productId) {
      return orders.filter((o) => o.productId === productId);
    }
    return orders;
  } catch {
    // Fallback en memoria
    let orders = mockPurchaseOrders.filter((o) => o.status === "abierta");
    if (productId) {
      orders = orders.filter((o) => o.productId === productId);
    }
    return orders;
  }
}

export interface CreatePurchaseOrderInput {
  caseId: string;
  productId: string;
  supplierId: string;
  quantity: number;
  idempotencyKey: string;
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  const maxAllowedAmount = 10000.0;

  try {
    const { db } = await import("../db/client");
    const { eq, and } = await import("drizzle-orm");

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
        message: "La orden ya había sido creada anteriormente (Idempotente).",
        order: existing[0],
      };
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
        message: `El proveedor '${input.supplierId}' no ofrece el producto '${input.productId}'.`,
      };
    }

    const unitPrice = parseFloat(supplierProduct[0].unitPrice);
    const totalAmount = unitPrice * input.quantity;

    // ESTRICTO HUMAN-IN-THE-LOOP: El agente NUNCA compra directamente.
    // Siempre genera un reporte/factura pendiente de aprobación.
    const approvalId = `appr_${Date.now()}`;
    await db.insert(approvals).values({
      id: approvalId,
      caseId: input.caseId,
      actionType: "crear_orden_compra",
      amount: totalAmount.toFixed(2),
      currency: "MXN",
      reason: `Solicitud de compra generada por el agente para ${input.quantity} unidades de ${input.productId} al proveedor ${input.supplierId}. Total: $${totalAmount.toFixed(2)} MXN.`,
      status: "pendiente",
    });

    return {
      success: true,
      requiresApproval: true,
      approvalId,
      totalAmount,
      message: `El agente ha generado el reporte de compra por $${totalAmount.toFixed(2)} MXN. Pendiente de aprobación humana.`,
    };
  } catch {
    // Fallback en memoria cuando no hay DB conectada
    const existing = mockPurchaseOrders.find(
      (o) => o.idempotencyKey === input.idempotencyKey,
    );
    if (existing) {
      return {
        success: true,
        duplicate: true,
        message: "La orden ya había sido creada anteriormente (Idempotente).",
        order: existing,
      };
    }

    const sp = mockSupplierProducts.find(
      (s) =>
        s.productId === input.productId && s.supplierId === input.supplierId,
    );
    const unitPrice = sp ? parseFloat(sp.unitPrice) : 450.0;
    const totalAmount = unitPrice * input.quantity;

    // ESTRICTO HUMAN-IN-THE-LOOP (Mock)
    const approvalId = `appr_${Date.now()}`;
    mockApprovals.push({
      id: approvalId,
      caseId: input.caseId,
      actionType: "crear_orden_compra",
      amount: totalAmount.toFixed(2),
      currency: "MXN",
      reason: `Solicitud de compra generada por el agente para ${input.quantity} unidades de ${input.productId} al proveedor ${input.supplierId}. Total: $${totalAmount.toFixed(2)} MXN.`,
      status: "pendiente",
      requestedAt: new Date(),
    });

    return {
      success: true,
      requiresApproval: true,
      approvalId,
      totalAmount,
      message: `El agente ha generado el reporte de compra por $${totalAmount.toFixed(2)} MXN. Pendiente de aprobación humana.`,
    };
  }
}
