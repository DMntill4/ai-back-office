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
  burnRate: number; // Unidades vendidas por día
  daysCoverage: number;
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

  let burnRate = 0;
  if (sales.length > 0) {
    const totalSold = sales.reduce((sum, s) => sum + s.quantity, 0);
    burnRate = totalSold / 30;
  } else {
    // Estimación empírica segura basada en el stock mínimo si no hay historial previo
    burnRate = minStock / 14;
  }
  burnRate = Math.max(0.5, burnRate); // Evitar división por cero

  const daysCoverage = currentStock / burnRate;

  const status =
    currentStock === 0
      ? "QUIEBRE_TOTAL"
      : daysCoverage < 3
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
    status,
    compactFacts,
  };
}
