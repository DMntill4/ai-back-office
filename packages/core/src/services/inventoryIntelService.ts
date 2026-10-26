import { db } from "../db/client";
import {
  products,
  inventory,
  salesHistory,
  supplierProducts,
  purchaseOrders,
  companies,
} from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCompanyConfig } from "./configService";

export type StockoutRiskLevel =
  | "AGOTADO"
  | "CRITICO_QUIEBRE_INMINENTE"
  | "URGENTE_QUIEBRE_SEMANAL"
  | "PRECAUCION_ROP"
  | "SALUDABLE"
  | "SIN_ROTACION";

export type AbcClassification = "A" | "B" | "C";

export interface SkuIntelligence {
  productId: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  stockInTransit: number;
  minSafetyStock: number;
  sales30dUnits: number;
  salesCountLifetime: number;
  dailyBurnRate: number; // unidades por día (promedio)
  daysUntilStockout: number; // 999 si no hay rotación
  riskLevel: StockoutRiskLevel;
  unitPrice: number;
  unitCost: number;
  revenue30d: number;
  leadTimeDays: number;
  dynamicRop: number;
  suggestedReorderQuantity: number;
  isOverstock: boolean;
  excessUnits: number;
  immobilizedCapital: number;
  abcClass: AbcClassification;
  abcContributionPct: number;
  diagnosis: string;
  recommendedAction: string;
}

export interface InventoryIntelligenceSummary {
  companyId: string;
  companyName: string;
  currency: string;
  totalSkus: number;
  totalStockUnits: number;
  totalStockValuation: number;
  totalImmobilizedOverstockCapital: number;
  criticalQuiebreCount: number; // <= 7 días
  stockoutCount: number; // 0 unidades
  overstockCount: number;
  healthyCount: number;
  abcBreakdown: {
    classA: { count: number; revenuePct: number };
    classB: { count: number; revenuePct: number };
    classC: { count: number; revenuePct: number };
  };
  topQuiebreRisks: SkuIntelligence[];
  topOverstockItems: SkuIntelligence[];
  items: SkuIntelligence[];
  generatedAt: string;
}

/**
 * Calcula la inteligencia de inventario completa con análisis predictivo de quiebre,
 * clasificación ABC (Pareto 80/15/5), capital inmovilizado en sobrestock y ROP dinámico.
 */
export async function getInventoryIntelligence(
  companyId: string = "comp_default",
): Promise<InventoryIntelligenceSummary> {
  const [config, prods, invs, sales, suppProds, openPos] = await Promise.all([
    getCompanyConfig(companyId),
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(inventory).where(eq(inventory.companyId, companyId)),
    db.select().from(salesHistory).where(eq(salesHistory.companyId, companyId)),
    db.select().from(supplierProducts).where(eq(supplierProducts.companyId, companyId)),
    db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.companyId, companyId), eq(purchaseOrders.status, "abierta"))),
  ]);

  // 1. Mapeo de existencias y ventas acumuladas
  const stockMap = new Map<string, { totalStock: number; salesCount: number }>();
  for (const inv of invs) {
    const existing = stockMap.get(inv.productId) || { totalStock: 0, salesCount: 0 };
    stockMap.set(inv.productId, {
      totalStock: existing.totalStock + inv.stock,
      salesCount: existing.salesCount + (inv.salesCount || 0),
    });
  }

  // 2. Mapeo de mercancía en tránsito (Órdenes de compra abiertas)
  const inTransitMap = new Map<string, number>();
  for (const po of openPos) {
    inTransitMap.set(po.productId, (inTransitMap.get(po.productId) || 0) + po.quantity);
  }

  // 3. Mapeo de proveedores (Mejor costo y tiempo de entrega)
  const suppMap = new Map<string, { bestCost: number; leadTimeDays: number }>();
  for (const sp of suppProds) {
    const cost = parseFloat(sp.unitPrice?.toString() || "0");
    const existing = suppMap.get(sp.productId);
    if (!existing || cost < existing.bestCost) {
      suppMap.set(sp.productId, {
        bestCost: cost,
        leadTimeDays: sp.leadTimeDays || 3,
      });
    }
  }

  // 4. Mapeo de ventas de los últimos 30 días
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const sales30dMap = new Map<string, { units: number; revenue: number; lastUnitPrice: number }>();
  for (const s of sales) {
    const sDate = new Date(s.saleDate);
    const qty = s.quantity;
    const price = parseFloat(s.unitPrice?.toString() || "0");
    const total = parseFloat(s.totalAmount?.toString() || (qty * price).toString());

    if (sDate >= thirtyDaysAgo) {
      const existing = sales30dMap.get(s.productId) || { units: 0, revenue: 0, lastUnitPrice: price };
      sales30dMap.set(s.productId, {
        units: existing.units + qty,
        revenue: existing.revenue + total,
        lastUnitPrice: price > 0 ? price : existing.lastUnitPrice,
      });
    }
  }

  // 5. Análisis preliminar de cada SKU
  const rawItems: Array<Omit<SkuIntelligence, "abcClass" | "abcContributionPct">> = [];

  for (const p of prods) {
    const invData = stockMap.get(p.id) || { totalStock: 0, salesCount: 0 };
    const currentStock = invData.totalStock;
    const stockInTransit = inTransitMap.get(p.id) || 0;
    const minSafetyStock = p.minStock || 10;

    const suppData = suppMap.get(p.id) || { bestCost: 50, leadTimeDays: 5 };
    const unitCost = suppData.bestCost;
    const leadTimeDays = suppData.leadTimeDays;

    const salesData = sales30dMap.get(p.id);
    let sales30dUnits = salesData ? salesData.units : 0;
    let revenue30d = salesData ? salesData.revenue : 0;
    let unitPrice = salesData?.lastUnitPrice && salesData.lastUnitPrice > 0
      ? salesData.lastUnitPrice
      : parseFloat((unitCost * 1.35).toFixed(2));

    // Fallback de rotación si sales_history aún no tiene transacciones pero el inventario registra ventas
    if (sales30dUnits === 0 && invData.salesCount > 0) {
      sales30dUnits = Math.min(invData.salesCount, 30);
      revenue30d = sales30dUnits * unitPrice;
    }

    const dailyBurnRate = parseFloat((sales30dUnits / 30).toFixed(2));
    const daysUntilStockout =
      currentStock === 0
        ? 0
        : dailyBurnRate > 0
          ? Math.round(currentStock / dailyBurnRate)
          : 999;

    let riskLevel: StockoutRiskLevel = "SALUDABLE";
    if (currentStock === 0) {
      riskLevel = "AGOTADO";
    } else if (daysUntilStockout <= 3) {
      riskLevel = "CRITICO_QUIEBRE_INMINENTE";
    } else if (daysUntilStockout <= 7) {
      riskLevel = "URGENTE_QUIEBRE_SEMANAL";
    } else if (daysUntilStockout <= 15 || currentStock <= minSafetyStock) {
      riskLevel = "PRECAUCION_ROP";
    } else if (dailyBurnRate === 0 && currentStock > 0) {
      riskLevel = "SIN_ROTACION";
    }

    // Dynamic ROP = (Consumo diario * Días de entrega de proveedor) + Stock de seguridad
    const dynamicRop = Math.ceil(dailyBurnRate * leadTimeDays + minSafetyStock);
    const suggestedReorderQuantity = Math.max(0, dynamicRop - (currentStock + stockInTransit));

    // Detección de Sobre-stock / Capital inmovilizado
    // Criterio: Cobertura > 60 días y stock > 2.5 veces el mínimo de seguridad
    const isOverstock =
      currentStock > minSafetyStock * 2.5 && (daysUntilStockout > 60 || dailyBurnRate === 0);
    const excessUnits = isOverstock ? Math.max(0, currentStock - minSafetyStock * 2) : 0;
    const immobilizedCapital = parseFloat((excessUnits * unitCost).toFixed(2));

    // Diagnóstico y acción recomendada honesta
    let diagnosis = "";
    let recommendedAction = "";

    switch (riskLevel) {
      case "AGOTADO":
        diagnosis = "Quiebre total de inventario. Pérdida inmediata de ventas.";
        recommendedAction = `Emitir orden de compra urgente por ${suggestedReorderQuantity || minSafetyStock} unidades.`;
        break;
      case "CRITICO_QUIEBRE_INMINENTE":
        diagnosis = `Quiebre inminente en ${daysUntilStockout} días (consumo: ${dailyBurnRate} u/día).`;
        recommendedAction = `Aprobar reposición inmediata en /inbox por ${suggestedReorderQuantity} unidades.`;
        break;
      case "URGENTE_QUIEBRE_SEMANAL":
        diagnosis = `Stock disponible para ${daysUntilStockout} días. Cerca de agotar antes del lead time (${leadTimeDays}d).`;
        recommendedAction = `Generar propuesta de compra por ${suggestedReorderQuantity} unidades a proveedor.`;
        break;
      case "PRECAUCION_ROP":
        diagnosis = `Punto de reorden alcanzado (${currentStock}/${dynamicRop} u). Margen de seguridad activo.`;
        recommendedAction = `Reabastecer ${suggestedReorderQuantity || minSafetyStock} unidades en el próximo ciclo.`;
        break;
      case "SIN_ROTACION":
        if (isOverstock) {
          diagnosis = `Stock estancado sin ventas en 30 días con $${immobilizedCapital.toLocaleString()} inmovilizados.`;
          recommendedAction = `Crear promoción, paquete o devolver ${excessUnits} unidades excedentes.`;
        } else {
          diagnosis = "Sin rotación registrada en los últimos 30 días.";
          recommendedAction = "Monitorear demanda y registrar salidas en punto de venta.";
        }
        break;
      case "SALUDABLE":
      default:
        if (isOverstock) {
          diagnosis = `Sobrestock con ${daysUntilStockout} días de cobertura ($${immobilizedCapital.toLocaleString()} en exceso).`;
          recommendedAction = `Pausar compras y liquidar ${excessUnits} unidades para liberar flujo de caja.`;
        } else {
          diagnosis = `Nivel óptimo. Cobertura estimada de ${daysUntilStockout} días.`;
          recommendedAction = "Mantener política de reorden estándar.";
        }
        break;
    }

    rawItems.push({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category || "general",
      currentStock,
      stockInTransit,
      minSafetyStock,
      sales30dUnits,
      salesCountLifetime: invData.salesCount,
      dailyBurnRate,
      daysUntilStockout,
      riskLevel,
      unitPrice,
      unitCost,
      revenue30d,
      leadTimeDays,
      dynamicRop,
      suggestedReorderQuantity,
      isOverstock,
      excessUnits,
      immobilizedCapital,
      diagnosis,
      recommendedAction,
    });
  }

  // 6. Clasificación ABC de Pareto (80/15/5 sobre ingresos o volumen)
  const totalRevenue = rawItems.reduce((acc, item) => acc + item.revenue30d, 0);

  // Ordenar de mayor a menor contribución financiera
  rawItems.sort((a, b) => {
    if (totalRevenue > 0) {
      return b.revenue30d - a.revenue30d;
    }
    // Si no hay ventas registradas, ordenar por valor de inventario
    return b.currentStock * b.unitCost - a.currentStock * a.unitCost;
  });

  let runningSum = 0;
  const items: SkuIntelligence[] = rawItems.map((item) => {
    const contribution = totalRevenue > 0 ? item.revenue30d : item.currentStock * item.unitCost;
    const baseTotal = totalRevenue > 0 ? totalRevenue : rawItems.reduce((acc, i) => acc + i.currentStock * i.unitCost, 0) || 1;
    runningSum += contribution;
    const cumulativePct = (runningSum / baseTotal) * 100;
    const contributionPct = parseFloat(((contribution / baseTotal) * 100).toFixed(1));

    let abcClass: AbcClassification = "C";
    if (cumulativePct <= 80 || (itemsSoFarCount(rawItems, item) === 0 && contribution > 0)) {
      abcClass = "A";
    } else if (cumulativePct <= 95) {
      abcClass = "B";
    } else {
      abcClass = "C";
    }

    return {
      ...item,
      abcClass,
      abcContributionPct: contributionPct,
    };
  });

  function itemsSoFarCount(arr: any[], cur: any) {
    return arr.indexOf(cur);
  }

  // 7. Cálculo de agregados ejecutivos
  const totalStockUnits = items.reduce((acc, i) => acc + i.currentStock, 0);
  const totalStockValuation = items.reduce((acc, i) => acc + i.currentStock * i.unitCost, 0);
  const totalImmobilizedOverstockCapital = items.reduce((acc, i) => acc + i.immobilizedCapital, 0);

  const criticalQuiebreCount = items.filter(
    (i) => i.riskLevel === "AGOTADO" || i.riskLevel === "CRITICO_QUIEBRE_INMINENTE" || i.riskLevel === "URGENTE_QUIEBRE_SEMANAL",
  ).length;

  const stockoutCount = items.filter((i) => i.currentStock === 0).length;
  const overstockCount = items.filter((i) => i.isOverstock).length;
  const healthyCount = items.filter((i) => i.riskLevel === "SALUDABLE" && !i.isOverstock).length;

  const classAItems = items.filter((i) => i.abcClass === "A");
  const classBItems = items.filter((i) => i.abcClass === "B");
  const classCItems = items.filter((i) => i.abcClass === "C");

  const classARevPct = classAItems.reduce((acc, i) => acc + i.abcContributionPct, 0);
  const classBRevPct = classBItems.reduce((acc, i) => acc + i.abcContributionPct, 0);
  const classCRevPct = classCItems.reduce((acc, i) => acc + i.abcContributionPct, 0);

  const topQuiebreRisks = [...items]
    .filter((i) => i.daysUntilStockout <= 15)
    .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
    .slice(0, 5);

  const topOverstockItems = [...items]
    .filter((i) => i.isOverstock)
    .sort((a, b) => b.immobilizedCapital - a.immobilizedCapital)
    .slice(0, 5);

  return {
    companyId,
    companyName: config.companyName,
    currency: config.currency,
    totalSkus: items.length,
    totalStockUnits,
    totalStockValuation: parseFloat(totalStockValuation.toFixed(2)),
    totalImmobilizedOverstockCapital: parseFloat(totalImmobilizedOverstockCapital.toFixed(2)),
    criticalQuiebreCount,
    stockoutCount,
    overstockCount,
    healthyCount,
    abcBreakdown: {
      classA: { count: classAItems.length, revenuePct: parseFloat(classARevPct.toFixed(1)) },
      classB: { count: classBItems.length, revenuePct: parseFloat(classBRevPct.toFixed(1)) },
      classC: { count: classCItems.length, revenuePct: parseFloat(classCRevPct.toFixed(1)) },
    },
    topQuiebreRisks,
    topOverstockItems,
    items,
    generatedAt: new Date().toISOString(),
  };
}
