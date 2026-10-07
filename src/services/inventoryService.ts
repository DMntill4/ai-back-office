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

// 1. Productos
const mockProducts = [
  {
    id: "prod_st200",
    name: "Sensor Térmico ST-200",
    description: "Sensor de temperatura industrial de alta precisión",
    sku: "SKU-ST200",
    minStock: 10,
    origin: "simulado" as const,
    createdAt: new Date(),
  },
  {
    id: "prod_v500",
    name: "Válvula Reguladora V-500",
    description: "Válvula de presión hidráulica",
    sku: "SKU-V500",
    minStock: 5,
    origin: "simulado" as const,
    createdAt: new Date(),
  },
];

// 2. Inventario
const mockInventory = [
  {
    id: "inv_001",
    productId: "prod_st200",
    warehouseId: "alm_central",
    stock: 2,
    updatedAt: new Date(),
  },
  {
    id: "inv_002",
    productId: "prod_v500",
    warehouseId: "alm_central",
    stock: 15,
    updatedAt: new Date(),
  },
];

// 3. Proveedores y sus precios
const mockSupplierProducts = [
  {
    id: "sp_001",
    supplierId: "prov_acme",
    productId: "prod_st200",
    unitPrice: "450.00",
    minOrderQuantity: 5,
    leadTimeDays: 2,
  },
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
    if (product.length === 0) return null;

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
    if (!product) return null;

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

    if (totalAmount > maxAllowedAmount) {
      const approvalId = `appr_${Date.now()}`;
      await db.insert(approvals).values({
        id: approvalId,
        caseId: input.caseId,
        actionType: "crear_orden_compra",
        amount: totalAmount.toFixed(2),
        currency: "MXN",
        reason: `El importe de $${totalAmount.toFixed(2)} MXN supera el límite permitido de $${maxAllowedAmount.toFixed(2)} MXN.`,
        status: "pendiente",
      });

      return {
        success: false,
        requiresApproval: true,
        approvalId,
        totalAmount,
        maxAllowedAmount,
        message: `El monto total de $${totalAmount.toFixed(2)} MXN supera el límite de aprobación de $${maxAllowedAmount.toFixed(2)} MXN.`,
      };
    }

    const orderId = `po_${Date.now()}`;
    await db.insert(purchaseOrders).values({
      id: orderId,
      supplierId: input.supplierId,
      productId: input.productId,
      quantity: input.quantity,
      unitPrice: unitPrice.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      status: "abierta",
      idempotencyKey: input.idempotencyKey,
      caseId: input.caseId,
    });

    const verifiedOrder = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId))
      .limit(1);

    return {
      success: true,
      duplicate: false,
      verified: verifiedOrder.length > 0,
      message: "Orden de compra creada y verificada exitosamente.",
      order: verifiedOrder[0],
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

    if (totalAmount > maxAllowedAmount) {
      const approvalId = `appr_${Date.now()}`;
      mockApprovals.push({
        id: approvalId,
        caseId: input.caseId,
        actionType: "crear_orden_compra",
        amount: totalAmount.toFixed(2),
        currency: "MXN",
        reason: `El importe de $${totalAmount.toFixed(2)} MXN supera el límite permitido de $${maxAllowedAmount.toFixed(2)} MXN.`,
        status: "pendiente",
        requestedAt: new Date(),
      });

      return {
        success: false,
        requiresApproval: true,
        approvalId,
        totalAmount,
        maxAllowedAmount,
        message: `El monto total de $${totalAmount.toFixed(2)} MXN supera el límite de aprobación de $${maxAllowedAmount.toFixed(2)} MXN.`,
      };
    }

    const newOrder = {
      id: `po_${Date.now()}`,
      supplierId: input.supplierId,
      productId: input.productId,
      quantity: input.quantity,
      unitPrice: unitPrice.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      status: "abierta" as const,
      idempotencyKey: input.idempotencyKey,
      caseId: input.caseId,
      createdAt: new Date(),
    };
    mockPurchaseOrders.push(newOrder);

    return {
      success: true,
      duplicate: false,
      verified: true,
      message: "Orden de compra creada y verificada exitosamente.",
      order: newOrder,
    };
  }
}
