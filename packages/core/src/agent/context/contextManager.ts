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
  COORDINATOR: { maxInputTokens: 7000, maxOutputTokens: 800 },
} as const;

const PRIORITY_CONTEXT_KEYS = [
  "isSuccess",
  "verified",
  "errorMessage",
  "status",
  "id",
  "sku",
  "productId",
  "message",
  "details",
  "data",
  "result",
];

function compactValue(value: unknown, budget: number): unknown {
  if (budget < 4) return undefined;
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") {
    if (value.length <= budget - 2) return value;
    return `${value.slice(0, Math.max(0, budget - 18))}…[recortado]`;
  }
  if (Array.isArray(value)) {
    const result: unknown[] = [];
    for (const item of value) {
      const available = budget - JSON.stringify(result).length - 4;
      if (available < 8) break;
      const compacted = compactValue(item, Math.min(available, 1200));
      if (compacted === undefined) break;
      result.push(compacted);
    }
    return result;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((a, b) => {
      const aPriority = PRIORITY_CONTEXT_KEYS.indexOf(a);
      const bPriority = PRIORITY_CONTEXT_KEYS.indexOf(b);
      return (aPriority < 0 ? PRIORITY_CONTEXT_KEYS.length : aPriority) -
        (bPriority < 0 ? PRIORITY_CONTEXT_KEYS.length : bPriority);
    });
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      const used = JSON.stringify(result).length;
      const available = budget - used - key.length - 6;
      if (available < 8) continue;
      const compacted = compactValue(record[key], Math.min(available, 1600));
      if (compacted !== undefined) result[key] = compacted;
    }
    return result;
  }
  return String(value).slice(0, Math.max(0, budget - 18));
}

/** Compacta resultados manteniendo JSON válido y los campos operativos prioritarios. */
export function compactToolPayload(value: unknown, maxTokens = 900): string {
  const maxChars = Math.max(64, maxTokens * 4);
  const compacted = compactValue(value, maxChars);
  const serialized = JSON.stringify(compacted ?? { truncated: true });
  if (serialized.length <= maxChars) return serialized;
  const fallback = JSON.stringify({ truncated: true });
  return fallback.length <= maxChars ? fallback : "{}";
}

interface ContextMessage {
  role: string;
  content?: unknown;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

function messageSize(messages: ContextMessage[]): number {
  return Math.ceil(JSON.stringify(messages).length / 4);
}

/** Conserva la solicitud actual y las interacciones más recientes dentro del presupuesto. */
export function fitMessagesToBudget<T extends ContextMessage>(
  messages: T[],
  maxTokens: number,
): T[] {
  if (messageSize(messages) <= maxTokens) return messages;
  const system = messages[0];
  const remaining = messages.slice(1);
  const firstToolCallIndex = remaining.findIndex(
    (message) => message.role === "assistant" && message.tool_calls?.length,
  );
  const userSearchEnd = firstToolCallIndex >= 0 ? firstToolCallIndex : remaining.length;
  let userIndex = -1;
  for (let index = 0; index < userSearchEnd; index++) {
    if (remaining[index].role === "user") userIndex = index;
  }
  if (userIndex < 0) {
    for (let index = 0; index < remaining.length; index++) {
      if (remaining[index].role === "user") userIndex = index;
    }
  }
  if (userIndex < 0) return messages;

  const history = remaining.slice(0, userIndex).slice(-4);
  const currentUser = remaining[userIndex];
  const interactions = remaining.slice(userIndex + 1);
  const rounds: T[][] = [];
  for (const message of interactions) {
    if (message.role === "assistant" && message.tool_calls?.length) {
      rounds.push([message]);
    } else if (rounds.length > 0) {
      rounds[rounds.length - 1].push(message);
    }
  }

  let retainedRounds = rounds.slice(-2);
  let retainedHistory = history;
  let result = [system, ...retainedHistory, currentUser, ...retainedRounds.flat()];
  while (messageSize(result) > maxTokens && retainedRounds.length > 1) {
    retainedRounds = retainedRounds.slice(1);
    result = [system, ...retainedHistory, currentUser, ...retainedRounds.flat()];
  }
  while (messageSize(result) > maxTokens && retainedHistory.length > 0) {
    retainedHistory = retainedHistory.slice(2);
    result = [system, ...retainedHistory, currentUser, ...retainedRounds.flat()];
  }
  if (messageSize(result) > maxTokens) {
    const excessChars = (messageSize(result) - maxTokens) * 4;
    const userContent = typeof currentUser.content === "string" ? currentUser.content : "";
    const systemContent = typeof system.content === "string" ? system.content : "";
    const userLimit = Math.max(1000, userContent.length - Math.ceil(excessChars * 0.6));
    const systemLimit = Math.max(4000, systemContent.length - Math.ceil(excessChars * 0.4));
    const boundedSystem = {
      ...system,
      content: systemContent.slice(0, systemLimit),
    } as T;
    const boundedUser = {
      ...currentUser,
      content: userContent.slice(0, userLimit),
    } as T;
    result = [boundedSystem, ...retainedHistory, boundedUser, ...retainedRounds.flat()];
  }
  while (messageSize(result) > maxTokens) {
    const excessChars = (messageSize(result) - maxTokens) * 4 + 8;
    let toolIndex = -1;
    for (let index = result.length - 1; index >= 0; index -= 1) {
      if (result[index].role === "tool" && typeof result[index].content === "string") {
        toolIndex = index;
        break;
      }
    }
    if (toolIndex >= 0) {
      const toolMessage = result[toolIndex];
      const content = String(toolMessage.content);
      const requestedTokens = Math.max(32, Math.floor((content.length - excessChars) / 4));
      let payload: unknown = content;
      try {
        payload = JSON.parse(content);
      } catch {
        payload = content.slice(0, Math.max(0, content.length - excessChars));
      }
      const compactedContent = typeof payload === "string"
        ? payload
        : compactToolPayload(payload, requestedTokens);
      if (compactedContent.length < content.length) {
        result = result.map((message, index) =>
          index === toolIndex ? { ...message, content: compactedContent } as T : message,
        );
        continue;
      }
    }

    let userPosition = -1;
    for (let index = result.length - 1; index >= 0; index -= 1) {
      if (result[index].role === "user") {
        userPosition = index;
        break;
      }
    }
    const userMessage = result[userPosition];
    const userContent = typeof userMessage?.content === "string" ? userMessage.content : "";
    if (userContent.length > 120) {
      const reducedContent = userContent.slice(0, Math.max(120, userContent.length - excessChars));
      result = result.map((message, index) =>
        index === userPosition ? { ...message, content: reducedContent } as T : message,
      );
      continue;
    }

    const systemMessage = result[0];
    const systemContent = typeof systemMessage?.content === "string" ? systemMessage.content : "";
    if (systemContent.length > 1000) {
      const reducedContent = systemContent.slice(0, Math.max(1000, systemContent.length - excessChars));
      result = result.map((message, index) =>
        index === 0 ? { ...message, content: reducedContent } as T : message,
      );
      continue;
    }
    break;
  }
  return result;
}

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
  currency: string = "MXN",
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
