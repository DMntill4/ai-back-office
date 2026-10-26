import {
  getInventoryIntelligence,
  type SkuIntelligence,
  type InventoryIntelligenceSummary,
} from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { renderTable, type ColumnDef } from "../ui/table";

export async function intelCommand(subcommand?: string, targetSku?: string) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  console.log("\n" + drawDivider("INTELIGENCIA PREDICTIVA DE INVENTARIO & ROTACIÓN", 86));

  const intel = await getInventoryIntelligence(companyId);

  const sub = subcommand ? subcommand.toLowerCase().trim() : "";
  const cleanSku = (targetSku || (sub !== "quiebre" && sub !== "overstock" && sub !== "abc" && sub !== "pareto" ? sub : "")).toUpperCase();

  // 1. Detalle de SKU específico (/intel <sku>)
  if (cleanSku && cleanSku !== "ALL" && cleanSku !== "SUMMARY") {
    const item = intel.items.find((i) => i.sku.toUpperCase() === cleanSku || i.productId === cleanSku);
    if (item) {
      renderSkuDeepDive(item, intel.currency);
      return;
    }
    // Si no fue un SKU específico, continuar con el subcomando
  }

  // 2. Vista de Quiebre de Stock (/intel quiebre)
  if (sub === "quiebre" || sub === "riesgo" || sub === "risk") {
    console.log(theme.mintBold("  [VISTA FILTRADA] Productos en Riesgo Inminente o Bajo Umbral de Seguridad:\n"));
    const atRisk = intel.items.filter(
      (i) =>
        i.riskLevel === "AGOTADO" ||
        i.riskLevel === "CRITICO_QUIEBRE_INMINENTE" ||
        i.riskLevel === "URGENTE_QUIEBRE_SEMANAL" ||
        i.riskLevel === "PRECAUCION_ROP",
    );

    if (atRisk.length === 0) {
      console.log(`  ${theme.mintBold("[OK]")} No hay productos en riesgo de desabasto en este momento. Todos los SKUs tienen cobertura saludable.\n`);
      return;
    }

    const columns: ColumnDef[] = [
      { header: "SKU", key: "sku", width: 12 },
      { header: "PRODUCTO", key: "name", width: 24 },
      { header: "STOCK", key: "currentStock", width: 8, align: "right" },
      { header: "BURN/DÍA", key: "dailyBurnRate", width: 10, align: "right", format: (v) => `${v} u` },
      {
        header: "DÍAS QUIEBRE",
        key: "daysUntilStockout",
        width: 14,
        align: "right",
        format: (v) => (v <= 3 ? theme.redBold(`${v} d (CRÍTICO)`) : v <= 7 ? theme.amberBold(`${v} d (URGENTE)`) : `${v} d`),
      },
      { header: "ROP DIN.", key: "dynamicRop", width: 10, align: "right", format: (v) => `${v} u` },
      {
        header: "SUGERIDO",
        key: "suggestedReorderQuantity",
        width: 10,
        align: "right",
        format: (v) => (v > 0 ? theme.mintBold(`+${v} u`) : theme.dim("0 u")),
      },
      { header: "DIAGNÓSTICO & ACCIÓN", key: "recommendedAction", width: 36 },
    ];

    console.log(renderTable(columns, atRisk));
    console.log(
      `\n  ${theme.dim("Para emitir la orden o ver detalles:")} ${theme.mintBold("/inbox")} o ${theme.mintBold(`/intel <sku>`)}\n`,
    );
    return;
  }

  // 3. Vista de Sobrestock / Capital Inmovilizado (/intel overstock)
  if (sub === "overstock" || sub === "exceso") {
    console.log(theme.amberBold("  [VISTA FILTRADA] Productos con Sobrestock y Capital Estancado:\n"));
    const overstocks = intel.items.filter((i) => i.isOverstock);

    if (overstocks.length === 0) {
      console.log(`  ${theme.mintBold("[OK]")} No se detectó capital inmovilizado en exceso de inventario. Flujo de stock equilibrado.\n`);
      return;
    }

    const columns: ColumnDef[] = [
      { header: "SKU", key: "sku", width: 12 },
      { header: "PRODUCTO", key: "name", width: 26 },
      { header: "STOCK", key: "currentStock", width: 9, align: "right" },
      { header: "MIN. SEG.", key: "minSafetyStock", width: 10, align: "right" },
      { header: "EXCESO", key: "excessUnits", width: 10, align: "right", format: (v) => theme.amberBold(`+${v} u`) },
      {
        header: `INMOVILIZADO (${intel.currency})`,
        key: "immobilizedCapital",
        width: 20,
        align: "right",
        format: (v) => theme.redBold(`$${Number(v).toLocaleString("es-CO", { minimumFractionDigits: 2 })}`),
      },
      { header: "COBERTURA", key: "daysUntilStockout", width: 12, align: "right", format: (v) => `${v} días` },
      { header: "RECOMENDACIÓN", key: "recommendedAction", width: 32 },
    ];

    console.log(renderTable(columns, overstocks));
    console.log(
      `\n  ${theme.dim("Total capital estancado:")} ${theme.redBold(`$${intel.totalImmobilizedOverstockCapital.toLocaleString()} ${intel.currency}`)}\n`,
    );
    return;
  }

  // 4. Vista Pareto ABC (/intel abc)
  if (sub === "abc" || sub === "pareto") {
    console.log(theme.cyanBold("  [CLASIFICACIÓN ABC PARETO 80/15/5] Distribución de Valor y Esfuerzo Logístico:\n"));
    console.log(
      drawCard(
        [
          `${theme.mintBold("CLASE A - ALTO IMPACTO (80% del valor/volumen)")}:`,
          `  - SKUs:             ${intel.abcBreakdown.classA.count} productos`,
          `  - Aporte Ingresos:  ${intel.abcBreakdown.classA.revenuePct}% del total`,
          `  - Directriz:        Monitoreo diario de ROP, stock de seguridad estricto y proveedores prioritarios.`,
          "",
          `${theme.cyanBold("CLASE B - IMPACTO MEDIO (15% del valor/volumen)")}:`,
          `  - SKUs:             ${intel.abcBreakdown.classB.count} productos`,
          `  - Aporte Ingresos:  ${intel.abcBreakdown.classB.revenuePct}% del total`,
          `  - Directriz:        Revisión semanal y pedidos agrupados con consolidación multi-SKU (/consolidate).`,
          "",
          `${theme.dim("CLASE C - BAJO IMPACTO / COLA LARGA (5% del valor/volumen)")}:`,
          `  - SKUs:             ${intel.abcBreakdown.classC.count} productos`,
          `  - Aporte Ingresos:  ${intel.abcBreakdown.classC.revenuePct}% del total`,
          `  - Directriz:        Stock de seguridad mínimo, compras bajo pedido estricto y evitar sobrestock.`,
        ],
        {
          title: "CURVA DE PARETO // CLASIFICACIÓN DE CATÁLOGO",
          borderColor: theme.cyan,
        },
      ),
    );
    console.log("");
    return;
  }

  // 5. Vista General Ejecutiva (Default)
  console.log(
    drawCard(
      [
        `${theme.bold("RESUMEN EJECUTIVO DE INVENTARIO:")}`,
        `  - Catálogo Activo:        ${theme.bold(String(intel.totalSkus))} SKUs  |  ${theme.bold(String(intel.totalStockUnits))} unidades totales`,
        `  - Valorización Total:     $${intel.totalStockValuation.toLocaleString()} ${intel.currency}`,
        `  - Capital Inmovilizado:   ${intel.totalImmobilizedOverstockCapital > 0 ? theme.redBold(`$${intel.totalImmobilizedOverstockCapital.toLocaleString()} ${intel.currency}`) : theme.mintBold("$0.00 (Flujo óptimo)")}`,
        `  - Quiebres Críticos:      ${intel.criticalQuiebreCount > 0 ? theme.redBold(`${intel.criticalQuiebreCount} SKU(s) (< 7 días cobertura)`) : theme.mintBold("0 SKUs en riesgo")}`,
        `  - Desglose Pareto ABC:    ${theme.mintBold(`A: ${intel.abcBreakdown.classA.count}`)}  ·  ${theme.cyanBold(`B: ${intel.abcBreakdown.classB.count}`)}  ·  ${theme.dim(`C: ${intel.abcBreakdown.classC.count}`)}`,
      ],
      {
        title: `PANEL DE CONTROL // ${intel.companyName.toUpperCase()}`,
        borderColor: theme.mint,
      },
    ),
  );

  console.log("\n" + theme.bold("MATRIZ OPERATIVA DE COBERTURA Y REORDEN DINÁMICO (ROP):"));

  const columns: ColumnDef[] = [
    { header: "SKU", key: "sku", width: 12 },
    { header: "PRODUCTO", key: "name", width: 22 },
    { header: "STOCK", key: "currentStock", width: 8, align: "right" },
    { header: "BURN/D", key: "dailyBurnRate", width: 9, align: "right", format: (v) => `${v}` },
    {
      header: "COBERTURA",
      key: "daysUntilStockout",
      width: 12,
      align: "right",
      format: (v) =>
        v === 0
          ? theme.redBold("0 d (AGOT)")
          : v <= 3
            ? theme.redBold(`${v} d (CRIT)`)
            : v <= 7
              ? theme.amberBold(`${v} d (URG)`)
              : v === 999
                ? theme.dim("Sin rotación")
                : `${v} d`,
    },
    {
      header: "ABC",
      key: "abcClass",
      width: 6,
      align: "center",
      format: (v) => (v === "A" ? theme.mintBold("A") : v === "B" ? theme.cyanBold("B") : theme.dim("C")),
    },
    { header: "ROP DIN.", key: "dynamicRop", width: 9, align: "right", format: (v) => `${v} u` },
    {
      header: "REORDEN",
      key: "suggestedReorderQuantity",
      width: 10,
      align: "right",
      format: (v) => (v > 0 ? theme.mintBold(`+${v} u`) : theme.dim("0 u")),
    },
    {
      header: "ESTADO / ACCIÓN SUGERIDA",
      key: "statusDisplay",
      width: 28,
    },
  ];

  const tableRows = intel.items.map((item) => ({
    ...item,
    statusDisplay: formatRiskBadge(item),
  }));

  console.log(renderTable(columns, tableRows));

  console.log("\n" + theme.bold("SUBCOMANDOS DISPONIBLES:"));
  console.log(`  ${theme.mintBold("/intel quiebre")}      Filtrar únicamente productos en riesgo de desabasto`);
  console.log(`  ${theme.mintBold("/intel overstock")}    Analizar capital inmovilizado y excedentes de inventario`);
  console.log(`  ${theme.mintBold("/intel abc")}          Ver distribución Pareto (Clase A, B, C)`);
  console.log(`  ${theme.mintBold("/intel <sku>")}        Tarjeta detallada de pronóstico y proveedores para un SKU\n`);
}

function formatRiskBadge(row: SkuIntelligence): string {
  if (row.isOverstock) {
    return theme.violet("[SOBRESTOCK] Liquidar exceso");
  }
  switch (row.riskLevel) {
    case "AGOTADO":
      return theme.redBold("[AGOTADO] Comprar urgente");
    case "CRITICO_QUIEBRE_INMINENTE":
      return theme.redBold(`[QUIEBRE <3D] Reponer ${row.suggestedReorderQuantity}u`);
    case "URGENTE_QUIEBRE_SEMANAL":
      return theme.amberBold(`[URGENTE <7D] Pedir ${row.suggestedReorderQuantity}u`);
    case "PRECAUCION_ROP":
      return theme.amber(`[ROP] Reabastecer ${row.suggestedReorderQuantity}u`);
    case "SIN_ROTACION":
      return theme.dim("[SIN VENTAS] Monitorear");
    case "SALUDABLE":
    default:
      return theme.mint("[SALUDABLE] Stock óptimo");
  }
}

function renderSkuDeepDive(item: SkuIntelligence, currency: string) {
  console.log(
    drawCard(
      [
        `${theme.bold("PRODUCTO Y CATÁLOGO:")}`,
        `  - SKU:               ${theme.mintBold(item.sku)} [${item.productId}]`,
        `  - Nombre:            ${theme.bold(item.name)} (Categoría: ${item.category})`,
        `  - Clasificación ABC: ${theme.mintBold(`Clase ${item.abcClass}`)} (Aporte al negocio: ${item.abcContributionPct}%)`,
        "",
        `${theme.bold("MÉTRICAS DE ROTACIÓN Y CONSUMO (30 DÍAS):")}`,
        `  - Unidades Vendidas: ${theme.bold(String(item.sales30dUnits))} u en los últimos 30 días`,
        `  - Tasa de Consumo:   ${theme.cyanBold(`${item.dailyBurnRate} unidades / día`)}`,
        `  - Días de Cobertura: ${item.daysUntilStockout <= 7 ? theme.redBold(`${item.daysUntilStockout} días`) : theme.bold(`${item.daysUntilStockout} días`)}`,
        `  - Ingresos Generados: $${item.revenue30d.toLocaleString()} ${currency}`,
        "",
        `${theme.bold("PARÁMETROS DE REORDEN DINÁMICO (ROP):")}`,
        `  - Existencias Físicas: ${theme.bold(String(item.currentStock))} unidades`,
        `  - En Tránsito (POs):   ${theme.dim(String(item.stockInTransit))} unidades`,
        `  - Stock de Seguridad:  ${theme.dim(String(item.minSafetyStock))} unidades`,
        `  - Tiempo Proveedor:    ${theme.dim(`${item.leadTimeDays} días de entrega`)}`,
        `  - Fórmula ROP:         (${item.dailyBurnRate} u/d * ${item.leadTimeDays}d) + ${item.minSafetyStock}u = ${theme.mintBold(`${item.dynamicRop} unidades`)}`,
        `  - Compra Sugerida:     ${item.suggestedReorderQuantity > 0 ? theme.mintBold(`${item.suggestedReorderQuantity} unidades`) : theme.dim("0 unidades (Stock suficiente)")}`,
        "",
        `${theme.bold("DIAGNÓSTICO AUTÓNOMO:")}`,
        `  - Estado Actual:       ${item.diagnosis}`,
        `  - Acción Recomendada:  ${theme.bold(item.recommendedAction)}`,
      ],
      {
        title: `DIAGNÓSTICO DETALLADO // SKU ${item.sku}`,
        borderColor: item.daysUntilStockout <= 7 ? theme.red : theme.mint,
      },
    ),
  );
  console.log("");
}
