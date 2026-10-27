import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "../db/client";
import {
  products,
  inventory,
  salesHistory,
  purchaseOrders,
  suppliers,
  supplierProducts,
  shipments,
  decisions,
} from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { getCompanyConfig, formatCompanyDate } from "./configService";
import { getInventoryIntelligence } from "./inventoryIntelService";

export interface DailyReportSummary {
  companyId: string;
  companyName: string;
  currency: string;
  timezone: string;
  dateStr: string;
  totalProducts: number;
  totalStockUnits: number;
  criticalDeficitsCount: number;
  openProposalsCount: number;
  delayedShipmentsCount: number;
  recentOrdersCount: number;
  totalSpend: number;
  topPriorityActions: string[];
  systemHealth: "OPTIMAL" | "ATTENTION" | "CRITICAL";
}

export interface CsvExportResult {
  filepath: string;
  filename: string;
  totalRows: number;
}

/**
 * 1. Genera el resumen ejecutivo diario (Flash Briefing)
 */
export async function generateDailyOperationalReport(
  companyId: string = "comp_default",
): Promise<DailyReportSummary> {
  const [config, prods, invs, decList, poList, shipList] = await Promise.all([
    getCompanyConfig(companyId),
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(inventory).where(eq(inventory.companyId, companyId)),
    db.select().from(decisions).where(eq(decisions.companyId, companyId)).orderBy(desc(decisions.createdAt)).limit(50),
    db.select().from(purchaseOrders).where(eq(purchaseOrders.companyId, companyId)).orderBy(desc(purchaseOrders.createdAt)).limit(20),
    db.select().from(shipments).where(eq(shipments.companyId, companyId)),
  ]);

  const stockMap = new Map<string, number>();
  for (const inv of invs) {
    stockMap.set(inv.productId, (stockMap.get(inv.productId) || 0) + inv.stock);
  }

  let criticalDeficitsCount = 0;
  for (const p of prods) {
    const cur = stockMap.get(p.id) || 0;
    if (cur < p.minStock) criticalDeficitsCount++;
  }

  const openProposals = decList.filter((d) => d.policyDecision === "pending_approval");
  const delayedShipments = shipList.filter((s) => s.status === "retrasado");
  const totalSpend = poList.reduce((sum, po) => sum + parseFloat(po.totalAmount?.toString() || "0"), 0);

  const topPriorityActions: string[] = [];
  if (criticalDeficitsCount > 0) {
    topPriorityActions.push(`Atender ${criticalDeficitsCount} producto(s) en déficit crítico bajo umbral de seguridad.`);
  }
  if (openProposals.length > 0) {
    topPriorityActions.push(`Revisar y autorizar ${openProposals.length} propuesta(s) de compra pendientes en /inbox.`);
  }
  if (delayedShipments.length > 0) {
    topPriorityActions.push(`Monitorear ${delayedShipments.length} embarque(s) reportado(s) como retrasado(s) en transporte.`);
  }
  if (topPriorityActions.length === 0) {
    topPriorityActions.push("Operación en equilibrio óptimo. Sin cuellos de botella detectados.");
  }

  const systemHealth =
    criticalDeficitsCount > 2 || delayedShipments.length > 1
      ? "CRITICAL"
      : openProposals.length > 0 || criticalDeficitsCount > 0
        ? "ATTENTION"
        : "OPTIMAL";

  const dateStr = formatCompanyDate(new Date(), config.timezone, true);

  return {
    companyId,
    companyName: config.companyName,
    currency: config.currency,
    timezone: config.timezone,
    dateStr,
    totalProducts: prods.length,
    totalStockUnits: Array.from(stockMap.values()).reduce((sum, v) => sum + v, 0),
    criticalDeficitsCount,
    openProposalsCount: openProposals.length,
    delayedShipmentsCount: delayedShipments.length,
    recentOrdersCount: poList.length,
    totalSpend: parseFloat(totalSpend.toFixed(2)),
    topPriorityActions,
    systemHealth,
  };
}

/**
 * 2. Genera los datos tabulares del reporte de inventario y ROP
 */
export async function generateInventoryReportData(companyId: string = "comp_default"): Promise<{
  headers: string[];
  rows: (string | number)[][];
}> {
  const intel = await getInventoryIntelligence(companyId);

  const headers = [
    "SKU",
    "Producto",
    "Categoria",
    "Stock Actual",
    "Stock Minimo",
    "Ventas 30d",
    "Consumo Diario (u/d)",
    "Dias Cobertura",
    "Clasificacion ABC",
    "ROP Dinamico",
    "Reorden Sugerida (u)",
    "Sobrestock",
    `Capital Inmovilizado (${intel.currency})`,
    "Diagnostico",
  ];

  const rows = intel.items.map((i) => [
    i.sku,
    i.name,
    i.category,
    i.currentStock,
    i.minSafetyStock,
    i.sales30dUnits,
    i.dailyBurnRate,
    i.daysUntilStockout === 999 ? "Sin rotacion" : i.daysUntilStockout,
    i.abcClass,
    i.dynamicRop,
    i.suggestedReorderQuantity,
    i.isOverstock ? "SI" : "NO",
    i.immobilizedCapital,
    i.diagnosis,
  ]);

  return { headers, rows };
}

/**
 * 3. Genera los datos tabulares del reporte de ventas
 */
export async function generateSalesReportData(companyId: string = "comp_default"): Promise<{
  headers: string[];
  rows: (string | number)[][];
}> {
  const [sales, prods, config] = await Promise.all([
    db.select().from(salesHistory).where(eq(salesHistory.companyId, companyId)).orderBy(desc(salesHistory.saleDate)),
    db.select().from(products).where(eq(products.companyId, companyId)),
    getCompanyConfig(companyId),
  ]);

  const prodMap = new Map(prods.map((p) => [p.id, p]));

  const headers = [
    "ID Venta",
    "Fecha",
    "Canal",
    "SKU",
    "Producto",
    "Cantidad",
    `Precio Unitario (${config.currency})`,
    `Total (${config.currency})`,
  ];

  const rows = sales.map((s) => {
    const p = prodMap.get(s.productId);
    const dateFormatted = s.saleDate ? formatCompanyDate(s.saleDate, config.timezone, false) : "";
    return [
      s.id,
      dateFormatted,
      s.channel || "directo",
      p?.sku || s.productId,
      p?.name || s.productId,
      s.quantity,
      parseFloat(s.unitPrice?.toString() || "0"),
      parseFloat(s.totalAmount?.toString() || "0"),
    ];
  });

  return { headers, rows };
}

/**
 * 4. Genera los datos tabulares del reporte de órdenes de compra
 */
export async function generateOrdersReportData(companyId: string = "comp_default"): Promise<{
  headers: string[];
  rows: (string | number)[][];
}> {
  const [orders, supps, prods, config] = await Promise.all([
    db.select().from(purchaseOrders).where(eq(purchaseOrders.companyId, companyId)).orderBy(desc(purchaseOrders.createdAt)),
    db.select().from(suppliers).where(eq(suppliers.companyId, companyId)),
    db.select().from(products).where(eq(products.companyId, companyId)),
    getCompanyConfig(companyId),
  ]);

  const suppMap = new Map(supps.map((s) => [s.id, s.name]));
  const prodMap = new Map(prods.map((p) => [p.id, p]));

  const headers = [
    "ID Orden",
    "Fecha",
    "Proveedor",
    "SKU",
    "Producto",
    "Cantidad",
    `Precio Unitario (${config.currency})`,
    `Total (${config.currency})`,
    "Estado",
  ];

  const rows = orders.map((o) => {
    const p = prodMap.get(o.productId);
    const suppName = suppMap.get(o.supplierId) || o.supplierId;
    const dateFormatted = o.createdAt ? formatCompanyDate(o.createdAt, config.timezone, false) : "";
    return [
      o.id,
      dateFormatted,
      suppName,
      p?.sku || o.productId,
      p?.name || o.productId,
      o.quantity,
      parseFloat(o.unitPrice?.toString() || "0"),
      parseFloat(o.totalAmount?.toString() || "0"),
      o.status,
    ];
  });

  return { headers, rows };
}

/**
 * 5. Reporte de Ganancias (Profit) y Margen por Producto y Total (Tarea 1.5)
 * Regla Estricta: Si falta el costo de un producto, MINT dice 'costo no registrado'
 * y no calcula margen de ese producto; nunca lo estima.
 */
export async function generateProfitAndMarginReportData(companyId: string = "comp_default"): Promise<{
  headers: string[];
  rows: (string | number)[][];
  summary: {
    totalRevenue: number;
    totalProfit: number;
    overallMarginPercent: number | null;
    productsWithoutCostCount: number;
    currency: string;
  };
}> {
  const [prods, sales, supplierProds, orders, config] = await Promise.all([
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(salesHistory).where(eq(salesHistory.companyId, companyId)),
    db.select().from(supplierProducts).where(eq(supplierProducts.companyId, companyId)),
    db.select().from(purchaseOrders).where(eq(purchaseOrders.companyId, companyId)).orderBy(desc(purchaseOrders.createdAt)),
    getCompanyConfig(companyId),
  ]);

  // Mapa de costos por producto
  const costMap = new Map<string, { unitCost: number; origin: string }>();
  for (const sp of supplierProds) {
    const cost = parseFloat(sp.unitPrice?.toString() || "0");
    if (cost > 0) {
      costMap.set(sp.productId, { unitCost: cost, origin: "Catálogo proveedor" });
    }
  }

  // Si no está en supplierProducts, buscar en órdenes de compra históricas
  for (const po of orders) {
    if (!costMap.has(po.productId)) {
      const cost = parseFloat(po.unitPrice?.toString() || "0");
      if (cost > 0) {
        costMap.set(po.productId, { unitCost: cost, origin: "Historial de compra" });
      }
    }
  }

  // Agrupar ventas por producto
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const salesByProd = new Map<string, { unitsSold: number; totalRevenue: number }>();
  for (const s of sales) {
    if (s.saleDate && s.saleDate >= thirtyDaysAgo) {
      const prev = salesByProd.get(s.productId) || { unitsSold: 0, totalRevenue: 0 };
      prev.unitsSold += s.quantity;
      prev.totalRevenue += parseFloat(s.totalAmount?.toString() || "0");
      salesByProd.set(s.productId, prev);
    }
  }

  const headers = [
    "SKU",
    "Producto",
    `Precio Venta Prom (${config.currency})`,
    `Costo Unitario (${config.currency})`,
    `Ganancia Unitaria (${config.currency})`,
    "Margen %",
    "Unidades Vendidas (30d)",
    `Ganancia Total 30d (${config.currency})`,
    "Origen del Costo",
  ];

  let sumRevenueWithCost = 0;
  let sumCostTotal = 0;
  let productsWithoutCostCount = 0;

  const rows = prods.map((p) => {
    const saleData = salesByProd.get(p.id) || { unitsSold: 0, totalRevenue: 0 };
    const avgSalePrice =
      saleData.unitsSold > 0 ? Number((saleData.totalRevenue / saleData.unitsSold).toFixed(2)) : 0;

    const costInfo = costMap.get(p.id);

    if (!costInfo || costInfo.unitCost <= 0) {
      productsWithoutCostCount++;
      return [
        p.sku,
        p.name,
        avgSalePrice > 0 ? avgSalePrice : "-",
        "costo no registrado",
        "N/A",
        "N/A",
        saleData.unitsSold,
        "N/A",
        "Sin registro",
      ];
    }

    const unitCost = costInfo.unitCost;
    const profitUnit = avgSalePrice > 0 ? Number((avgSalePrice - unitCost).toFixed(2)) : 0;
    const marginPercent =
      avgSalePrice > 0 ? Number((((avgSalePrice - unitCost) / avgSalePrice) * 100).toFixed(1)) : 0;
    const profitTotal30d = Number((profitUnit * saleData.unitsSold).toFixed(2));

    if (saleData.unitsSold > 0) {
      sumRevenueWithCost += saleData.totalRevenue;
      sumCostTotal += unitCost * saleData.unitsSold;
    }

    return [
      p.sku,
      p.name,
      avgSalePrice > 0 ? avgSalePrice : "-",
      unitCost.toFixed(2),
      avgSalePrice > 0 ? profitUnit.toFixed(2) : "-",
      avgSalePrice > 0 ? `${marginPercent}%` : "-",
      saleData.unitsSold,
      profitTotal30d > 0 ? profitTotal30d.toFixed(2) : "-",
      costInfo.origin,
    ];
  });

  const totalProfit = Number((sumRevenueWithCost - sumCostTotal).toFixed(2));
  const overallMarginPercent =
    sumRevenueWithCost > 0
      ? Number((((sumRevenueWithCost - sumCostTotal) / sumRevenueWithCost) * 100).toFixed(1))
      : null;

  return {
    headers,
    rows,
    summary: {
      totalRevenue: Number(sumRevenueWithCost.toFixed(2)),
      totalProfit,
      overallMarginPercent,
      productsWithoutCostCount,
      currency: config.currency,
    },
  };
}

/**
 * 6. Exporta reporte a formato PDF portable 1.4 estándar sin dependencias nativas
 */
export async function exportReportToPdf(
  filenamePrefix: string,
  title: string,
  headers: string[],
  rows: (string | number)[][],
): Promise<{ filepath: string; filename: string; totalRows: number }> {
  const reportsDir = path.resolve(process.cwd(), "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `${filenamePrefix}_${timestamp}.pdf`;
  const filepath = path.join(reportsDir, filename);

  // Generador PDF 1.4 estándar puro
  const streamLines: string[] = [
    "BT",
    "/F1 14 Tf",
    "50 760 Td",
    `(${title.replace(/[()\\]/g, "")}) Tj`,
    "/F1 9 Tf",
    "0 -20 Td",
    `(Generado: ${new Date().toLocaleString()} | Total Registros: ${rows.length}) Tj`,
    "0 -25 Td",
  ];

  // Header
  const headerStr = headers.map((h) => String(h).slice(0, 16)).join(" | ");
  streamLines.push(`(${headerStr.replace(/[()\\]/g, "")}) Tj`);
  streamLines.push("0 -15 Td");
  streamLines.push(`(${("-".repeat(Math.min(headerStr.length, 100)))}) Tj`);
  streamLines.push("0 -15 Td");

  // Primeras 40 filas en la página
  for (const r of rows.slice(0, 40)) {
    const rowStr = r.map((c) => String(c).slice(0, 16)).join(" | ");
    streamLines.push(`(${rowStr.replace(/[()\\]/g, "")}) Tj`);
    streamLines.push("0 -13 Td");
  }

  streamLines.push("ET");
  const streamContent = streamLines.join("\n");

  const pdfData = [
    "%PDF-1.4",
    "1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj",
    "2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj",
    "3 0 obj <</Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R>> endobj",
    "4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Courier>> endobj",
    `5 0 obj <</Length ${streamContent.length}>> stream\n${streamContent}\nendstream\nendobj`,
    "xref",
    "0 6",
    "0000000000 65535 f ",
    "0000000010 00000 n ",
    "0000000060 00000 n ",
    "0000000117 00000 n ",
    "0000000243 00000 n ",
    "0000000315 00000 n ",
    "trailer <</Size 6 /Root 1 0 R>>",
    "startxref",
    "450",
    "%%EOF",
  ].join("\n");

  fs.writeFileSync(filepath, pdfData, { encoding: "binary" });

  return {
    filepath,
    filename,
    totalRows: rows.length,
  };
}

/**
 * 6. Genera datos para el informe exportable de salud de datos y cuarentena (E3.3)
 */
export async function generateDataHealthReportData(
  companyId: string = "comp_default",
): Promise<{
  headers: string[];
  rows: (string | number)[][];
  summary: {
    overallHealth: string;
    averageScorePercent: number;
    quarantinedCount: number;
  };
}> {
  const { auditDataHealth } = await import("./dataHealthService");
  const health = await auditDataHealth(companyId);

  const headers = [
    "MODULO",
    "NIVEL_CONFIANZA",
    "PUNTAJE_CALIDAD",
    "TOTAL_AUDITADOS",
    "REGISTROS_CORRUPTOS",
    "ACCION_RECOMENDADA",
  ];

  const rows: (string | number)[][] = Object.values(health.modules).map((m: any) => [
    String(m.module).toUpperCase(),
    String(m.confidenceLevel),
    `${m.scorePercent}%`,
    m.totalRecordsAudited,
    m.corruptRecordsCount,
    (m.suggestedFixes || []).join(" | ") || "Sin acciones requeridas",
  ]);

  return {
    headers,
    rows,
    summary: {
      overallHealth: health.overallHealth,
      averageScorePercent: health.averageScorePercent,
      quarantinedCount: health.quarantinedTotal,
    },
  };
}

/**
 * 7. Exporta cualquier conjunto de datos a un archivo CSV estructurado con BOM UTF-8
 */
export async function exportReportToCsv(
  filenamePrefix: string,
  headers: string[],
  rows: (string | number)[][],
): Promise<CsvExportResult> {
  const reportsDir = path.resolve(process.cwd(), "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `${filenamePrefix}_${timestamp}.csv`;
  const filepath = path.join(reportsDir, filename);

  const escapeCell = (val: string | number) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes(";")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [];
  lines.push(headers.map(escapeCell).join(","));

  for (const r of rows) {
    lines.push(r.map(escapeCell).join(","));
  }

  // BOM UTF-8 (\uFEFF) para que Excel abra los acentos sin problemas
  const csvContent = "\uFEFF" + lines.join("\r\n");
  fs.writeFileSync(filepath, csvContent, { encoding: "utf8" });

  return {
    filepath,
    filename,
    totalRows: rows.length,
  };
}
