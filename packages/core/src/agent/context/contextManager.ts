/**
 * Capa de Gestión y Compresión de Ventana de Contexto
 * Previene context bloat, saturación de tokens y pérdida de atención en la red multi-agente.
 */

export interface TokenBudget {
  maxInputTokens: number;
  maxOutputTokens: number;
}

export const TOKEN_BUDGETS = {
  INVENTORY_SPECIALIST: { maxInputTokens: 1200, maxOutputTokens: 400 },
  PURCHASING_SPECIALIST: { maxInputTokens: 1200, maxOutputTokens: 400 },
  TRANSPORT_SPECIALIST: { maxInputTokens: 1200, maxOutputTokens: 400 },
  RISK_AUDITOR: { maxInputTokens: 1500, maxOutputTokens: 500 },
  COORDINATOR: { maxInputTokens: 2500, maxOutputTokens: 800 },
} as const;

/**
 * Compacta información real de existencias y demanda en formato denso para el LLM
 */
export function compactStockFacts(data: {
  product: { id: string; name: string; sku: string; minStock: number };
  stock: number;
  burnRate: number | null;
  daysCoverage: number | null;
  salesCountLast30Days?: number;
}): string {
  const deficit = Math.max(0, data.product.minStock - data.stock);
  const status =
    data.stock === 0
      ? "QUIEBRE_TOTAL"
      : data.daysCoverage !== null && data.daysCoverage < 3
        ? "CRÍTICO_INMINENTE"
        : data.stock < data.product.minStock
          ? "BAJO_STOCK_SEGURIDAD"
          : "ÓPTIMO";

  const burnRateText =
    data.burnRate !== null
      ? `${data.burnRate.toFixed(1)} uds/día (basado en ${data.salesCountLast30Days ?? 30} ventas analizadas)`
      : `Historial de ventas insuficiente (0 ventas registradas). No se pronostica cobertura ni burn rate sin datos históricos.`;

  const coverageText =
    data.daysCoverage !== null
      ? `${data.daysCoverage.toFixed(1)} días antes de agotar existencias`
      : `Sin proyección de cobertura por falta de historial de consumo.`;

  return `[FACTS_INVENTARIO_REAL]
- Producto: "${data.product.name}" (ID: ${data.product.id}, SKU: ${data.product.sku})
- Stock Físico: ${data.stock} uds | Stock Mínimo Requerido: ${data.product.minStock} uds
- Déficit Actual: ${deficit} uds | Estado: ${status}
- Tasa de Consumo (Burn Rate): ${burnRateText}
- Cobertura Proyectada: ${coverageText}`;
}

/**
 * Compacta el catálogo de proveedores reales en formato denso
 */
export function compactSupplierFacts(
  suppliers: Array<{
    supplierId: string;
    supplierName: string;
    unitPrice: number;
    leadTimeDays: number;
    minOrderQuantity: number;
    origin?: string;
  }>,
  currency: string = "USD",
): string {
  if (suppliers.length === 0) {
    return "[FACTS_PROVEEDORES_REAL] No existen proveedores homologados registrados para este insumo.";
  }

  const lines = suppliers.map((s, idx) => {
    return `  #${idx + 1}: ${s.supplierName} (ID: ${s.supplierId}) -> Precio: $${s.unitPrice.toFixed(2)} ${currency}/u | Plazo Entrega: ${s.leadTimeDays} días | Pedido Mínimo: ${s.minOrderQuantity}u`;
  });

  return `[FACTS_PROVEEDORES_REAL] (Opciones homologadas disponibles en base de datos):
${lines.join("\n")}`;
}

/**
 * Compacta envíos en tránsito y transportistas reales
 */
export function compactShipmentFacts(
  shipments: Array<{
    trackingNumber: string;
    carrier: string;
    status: string;
    estimatedDelivery: Date | string;
    currentLocation?: string | null;
    purchaseOrderId?: string | null;
    isDelayed?: boolean;
  }>,
): string {
  if (shipments.length === 0) {
    return "[FACTS_LOGÍSTICA_REAL] No hay envíos activos ni camiones asignados actualmente en tránsito.";
  }

  const lines = shipments.map((s) => {
    const eta = typeof s.estimatedDelivery === "string" ? s.estimatedDelivery : s.estimatedDelivery.toISOString().slice(0, 10);
    return `  - Guía: ${s.trackingNumber} | Transportista: ${s.carrier} | Estatus: ${s.status} | ETA: ${eta} | Ubicación: ${s.currentLocation || "En ruta"} | Retrasado: ${s.isDelayed ? "SÍ (ALERTA)" : "NO"}`;
  });

  return `[FACTS_LOGÍSTICA_REAL] (Envíos reales monitoreados en PostgreSQL):
${lines.join("\n")}`;
}

/**
 * Compacta compras recientes (72h) para que el Agente de Riesgo detecte duplicados reales
 */
export function compactRecentOrdersFacts(
  orders: Array<{
    id: string;
    productId: string;
    quantity: number;
    totalAmount: string | number;
    status: string;
    createdAt: Date | string;
  }>,
  currency: string = "USD",
): string {
  if (orders.length === 0) {
    return "[AUDITORÍA_COMPRAS_72H] Cero órdenes emitidas en las últimas 72 horas para este producto.";
  }

  const lines = orders.map((o) => {
    const date = typeof o.createdAt === "string" ? o.createdAt : o.createdAt.toISOString();
    return `  - PO: ${o.id} | Cantidad: ${o.quantity}u | Total: $${Number(o.totalAmount).toFixed(2)} ${currency} | Estado: ${o.status} | Fecha: ${date}`;
  });

  return `[AUDITORÍA_COMPRAS_72H] (Órdenes recientes detectadas en base de datos):
${lines.join("\n")}`;
}

/**
 * Recorta y sanea el texto para asegurar que no exceda el presupuesto de tokens asignado
 */
export function enforceTokenBudget(text: string, maxTokens: number): string {
  // Aproximación estándar: 1 token ≈ 4 caracteres
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars) + "\n...[Contexto truncado por límite de ventana]";
}
