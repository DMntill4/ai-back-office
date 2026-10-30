import { db } from "../../db/client";
import { products, inventory, salesHistory } from "../../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { compactStockFacts } from "../context/contextManager";

export interface InventoryAnalysis {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  deficit: number;
  burnRate: number | null; // Unidades vendidas por día (null si historial insuficiente)
  daysCoverage: number | null;
  hasSufficientHistory: boolean;
  historyExplanation: string;
  status: "QUIEBRE_TOTAL" | "CRÍTICO_INMINENTE" | "BAJO_STOCK_SEGURIDAD" | "ÓPTIMO";
  compactFacts: string;
}

/**
 * Especialista en Inventario: consulta existencias reales y calcula ritmo de consumo y cobertura.
 */
export async function analyzeInventoryForProduct(
  productId: string,
  companyId: string = "comp_default",
): Promise<InventoryAnalysis | null> {
  // 1. Obtener producto real
  const prods = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
    .limit(1);

  if (prods.length === 0) {
    return null;
  }
  const prod = prods[0];

  // 2. Obtener existencias físicas reales de todos los almacenes de la empresa
  const invs = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.productId, productId), eq(inventory.companyId, companyId)));

  const currentStock = invs.reduce((sum, item) => sum + item.stock, 0);
  const minStock = prod.minStock || 10;
  const deficit = Math.max(0, minStock - currentStock);

  // 3. Obtener ventas reales para calcular burn rate
  const sales = await db
    .select()
    .from(salesHistory)
    .where(and(eq(salesHistory.productId, productId), eq(salesHistory.companyId, companyId)))
    .orderBy(desc(salesHistory.saleDate))
    .limit(30);

  let burnRate: number | null = null;
  let daysCoverage: number | null = null;
  let hasSufficientHistory = false;
  let historyExplanation = "Historial insuficiente (0 ventas registradas). No se pronostica cobertura ni burn rate sin datos históricos.";

  if (sales.length > 0) {
    const totalSold = sales.reduce((sum, s) => sum + s.quantity, 0);
    const calculatedRate = totalSold / 30;
    if (sales.length >= 3 || totalSold >= 3) {
      burnRate = Math.max(0.1, calculatedRate);
      daysCoverage = currentStock / burnRate;
      hasSufficientHistory = true;
      historyExplanation = `Calculado sobre ${sales.length} ventas en los últimos 30 días (${totalSold} unidades totales).`;
    } else {
      historyExplanation = `Historial insuficiente (${sales.length} venta(s) registrada(s)). No se proyecta burn rate sin datos estadísticamente válidos.`;
    }
  }

  const status =
    currentStock === 0
      ? "QUIEBRE_TOTAL"
      : daysCoverage !== null && daysCoverage < 3
        ? "CRÍTICO_INMINENTE"
        : currentStock < minStock
          ? "BAJO_STOCK_SEGURIDAD"
          : "ÓPTIMO";

  const compactFacts = compactStockFacts({
    product: prod,
    stock: currentStock,
    burnRate,
    daysCoverage,
    salesCountLast30Days: sales.length,
  });

  return {
    productId: prod.id,
    productName: prod.name,
    sku: prod.sku,
    currentStock,
    minStock,
    deficit,
    burnRate,
    daysCoverage,
    hasSufficientHistory,
    historyExplanation,
    status,
    compactFacts,
  };
}
