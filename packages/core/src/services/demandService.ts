import { salesHistory } from "../db/schema";
import { db } from "../db/client";
import { eq, and } from "drizzle-orm";
import { getStockByProduct } from "./inventoryService";

export interface DemandForecastInput {
  companyId?: string;
  productId: string;
  horizonDays?: number; // Por defecto 30 días
}

export interface DemandForecastResult {
  productId: string;
  productName: string;
  horizonDays: number;
  currentStock: number;
  stockInTransit: number;
  minSafetyStock: number;
  historicalSalesUnits: number;
  daysOfHistoryObserved: number;
  averageDailySales: number;
  projectedDemandUnits: number;
  projectedStockDeficit: number;
  estimatedDaysOfCoverage: number;
  status: "saludable" | "precaucion" | "urgente_reabastecer";
  recommendedOrderQuantity: number;
  analysisSummary: string;
}

export async function calculateDemandForecast(
  input: DemandForecastInput,
): Promise<DemandForecastResult> {
  const horizonDays = input.horizonDays && input.horizonDays > 0 ? input.horizonDays : 30;
  const effectiveCompanyId = input.companyId || "comp_default";

  // 1. Obtener datos actuales del producto y stock en tiempo real (resuelve SKU, nombre o ID)
  const stockInfo = await getStockByProduct(input.productId, effectiveCompanyId);
  const resolvedProductId =
    stockInfo && !("isFuzzyMatch" in stockInfo) && stockInfo.productId
      ? stockInfo.productId
      : input.productId;
  const productName =
    stockInfo && !("isFuzzyMatch" in stockInfo)
      ? stockInfo.productName
      : `Producto ${input.productId}`;
  const currentStock =
    stockInfo && !("isFuzzyMatch" in stockInfo) ? stockInfo.currentStock : 0;
  const stockInTransit =
    stockInfo && !("isFuzzyMatch" in stockInfo) ? stockInfo.stockInTransit : 0;
  const minStock =
    stockInfo && !("isFuzzyMatch" in stockInfo) ? stockInfo.minStock : 10;

  // 2. Consultar historial de ventas real desde la tabla sales_history usando el ID resuelto
  const history = await db
    .select()
    .from(salesHistory)
    .where(
      and(
        eq(salesHistory.companyId, effectiveCompanyId),
        eq(salesHistory.productId, resolvedProductId),
      ),
    );

  const totalUnits = history.reduce((acc, row) => acc + row.quantity, 0);
  const daysObserved = 30; // ventana mensual de análisis
  const dailyRate = history.length > 0 ? Math.max(0.1, totalUnits / daysObserved) : 0;
  const projectedDemand = Math.ceil(dailyRate * horizonDays);
  const requiredBuffer = projectedDemand + minStock;
  const totalAvailable = currentStock + stockInTransit;
  const deficit = Math.max(0, requiredBuffer - totalAvailable);
  const daysOfCoverage = dailyRate > 0 ? Math.round(currentStock / dailyRate) : 999;

  let status: "saludable" | "precaucion" | "urgente_reabastecer" = "saludable";
  if (currentStock <= minStock || (dailyRate > 0 && daysOfCoverage <= 10)) {
    status = "urgente_reabastecer";
  } else if (dailyRate > 0 && daysOfCoverage <= 21) {
    status = "precaucion";
  }

  const analysisSummary = history.length > 0
    ? `Pronóstico real a ${horizonDays} días: consumo diario de ${dailyRate.toFixed(2)} u/día basado en ${history.length} transacciones registradas. Cobertura estimada de ${daysOfCoverage} días. Estado: ${status.toUpperCase()}.`
    : `Sin historial previo de ventas en la tabla 'sales_history' para este SKU. Stock disponible: ${currentStock} u (mínimo de seguridad: ${minStock} u). Se sugiere registrar ventas para activar proyección predictiva.`;

  return {
    productId: resolvedProductId,
    productName,
    horizonDays,
    currentStock,
    stockInTransit,
    minSafetyStock: minStock,
    historicalSalesUnits: totalUnits,
    daysOfHistoryObserved: daysObserved,
    averageDailySales: parseFloat(dailyRate.toFixed(2)),
    projectedDemandUnits: projectedDemand,
    projectedStockDeficit: deficit,
    estimatedDaysOfCoverage: daysOfCoverage,
    status,
    recommendedOrderQuantity: deficit > 0 ? deficit : 0,
    analysisSummary,
  };
}
