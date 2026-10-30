import {
  generateDailyOperationalReport,
  generateInventoryReportData,
  generateSalesReportData,
  generateOrdersReportData,
  exportReportToCsv,
} from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { renderTable, type ColumnDef } from "../ui/table";

export async function reportsCommand(type?: string, format?: string) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  const cleanType = type ? type.trim().toLowerCase() : "";
  const isCsv = format?.toLowerCase() === "csv" || cleanType === "csv";

  // 1. Reporte Ejecutivo Diario / Flash Briefing (/reports briefing o /today)
  if (cleanType === "briefing" || cleanType === "today" || cleanType === "diario" || cleanType === "flash") {
    console.log("\n" + drawDivider("FLASH BRIEFING EJECUTIVO // OPERACIÓN DIARIA", 86));
    const r = await generateDailyOperationalReport(companyId);

    const healthBadge =
      r.systemHealth === "OPTIMAL"
        ? theme.badge("OPERACIÓN ÓPTIMA", "mint")
        : r.systemHealth === "ATTENTION"
          ? theme.badge("ATENCIÓN REQUERIDA", "amber")
          : theme.badge("RIESGO CRÍTICO", "red");

    console.log(
      drawCard(
        [
          `${theme.bold("ESTADO GENERAL DEL SISTEMA:")} ${healthBadge}`,
          `  - Empresa:            ${theme.mintBold(r.companyName)} [${r.companyId}]`,
          `  - Fecha y Hora Local: ${theme.bold(r.dateStr)} (${r.timezone})`,
          `  - Divisa Operativa:   ${theme.bold(r.currency)}`,
          "",
          `${theme.bold("INDICADORES CLAVE DEL DÍA:")}`,
          `  - Déficits de Stock:  ${r.criticalDeficitsCount > 0 ? theme.redBold(`${r.criticalDeficitsCount} producto(s) bajo mínimo`) : theme.mintBold("0 desabastos")}`,
          `  - Propuestas Inbox:   ${r.openProposalsCount > 0 ? theme.amberBold(`${r.openProposalsCount} pendiente(s) de aprobación (/inbox)`) : theme.mintBold("0 pendientes")}`,
          `  - Envíos en Retraso:  ${r.delayedShipmentsCount > 0 ? theme.redBold(`${r.delayedShipmentsCount} transporte(s) retrasado(s) (/fleet)`) : theme.mintBold("0 retrasos")}`,
          `  - Gasto Comprometido: $${r.totalSpend.toLocaleString()} ${r.currency} (${r.recentOrdersCount} órdenes recientes)`,
          "",
          `${theme.bold("PRIORIDADES RECOMENDADAS PARA HOY:")}`,
          ...r.topPriorityActions.map((action, idx) => `  ${idx + 1}. ${action}`),
        ],
        {
          title: "RESUMEN DEL DÍA",
          borderColor: r.systemHealth === "OPTIMAL" ? theme.mint : theme.amber,
        },
      ),
    );
    console.log("");
    return;
  }

  // 2. Reporte de Inventario (/reports stock [csv])
  if (cleanType === "stock" || cleanType === "inventario") {
    console.log("\n" + drawDivider("REPORTE OPERATIVO DE INVENTARIO Y REORDEN DINÁMICO", 86));
    const data = await generateInventoryReportData(companyId);

    if (isCsv || format === "csv") {
      const exportRes = await exportReportToCsv("inventario_rop", data.headers, data.rows);
      console.log(`\n  ${theme.success("[OK]")} Reporte de inventario exportado en formato CSV compatible con Excel.`);
      console.log(`  ${theme.dim("Registros:")} ${exportRes.totalRows} filas.`);
      console.log(`  ${theme.dim("Archivo:")}   ${theme.mintBold(exportRes.filepath)}\n`);
      return;
    }

    const cols: ColumnDef[] = [
      { header: "SKU", key: "0", width: 12 },
      { header: "PRODUCTO", key: "1", width: 22 },
      { header: "STOCK", key: "3", width: 8, align: "right" },
      { header: "MÍN.", key: "4", width: 8, align: "right" },
      { header: "CONSUMO", key: "6", width: 10, align: "right", format: (v) => `${v} u/d` },
      { header: "COBERTURA", key: "7", width: 12, align: "right", format: (v) => `${v} d` },
      { header: "ABC", key: "8", width: 6, align: "center", format: (v) => theme.bold(String(v)) },
      { header: "ROP", key: "9", width: 8, align: "right" },
      { header: "PEDIR", key: "10", width: 8, align: "right", format: (v) => (Number(v) > 0 ? theme.mintBold(`+${v}`) : theme.dim("0")) },
    ];

    const rowObjects = data.rows.map((row) => {
      const obj: Record<string, any> = {};
      row.forEach((val, idx) => {
        obj[String(idx)] = val;
      });
      return obj;
    });

    console.log(renderTable(cols, rowObjects));
    console.log(`\n  ${theme.dim("Para exportar a CSV:")} ${theme.mintBold("/reports stock csv")}\n`);
    return;
  }

  // 3. Reporte de Ventas (/reports sales [csv])
  if (cleanType === "sales" || cleanType === "ventas") {
    console.log("\n" + drawDivider("REPORTE HISTÓRICO DE VENTAS", 86));
    const data = await generateSalesReportData(companyId);

    if (data.rows.length === 0) {
      console.log(`\n  ${theme.dim("○ No hay registros de ventas para exportar.")}\n`);
      return;
    }

    if (isCsv || format === "csv") {
      const exportRes = await exportReportToCsv("ventas_demanda", data.headers, data.rows);
      console.log(`\n  ${theme.success("[OK]")} Reporte de ventas exportado en formato CSV compatible con Excel.`);
      console.log(`  ${theme.dim("Registros:")} ${exportRes.totalRows} transacciones.`);
      console.log(`  ${theme.dim("Archivo:")}   ${theme.mintBold(exportRes.filepath)}\n`);
      return;
    }

    const cols: ColumnDef[] = [
      { header: "ID", key: "0", width: 10 },
      { header: "FECHA", key: "1", width: 12 },
      { header: "CANAL", key: "2", width: 12 },
      { header: "SKU", key: "3", width: 12 },
      { header: "PRODUCTO", key: "4", width: 22 },
      { header: "CANT.", key: "5", width: 8, align: "right" },
      { header: "PRECIO UNIT.", key: "6", width: 14, align: "right", format: (v) => `$${Number(v).toFixed(2)}` },
      { header: "TOTAL", key: "7", width: 14, align: "right", format: (v) => theme.mintBold(`$${Number(v).toFixed(2)}`) },
    ];

    const rowObjects = data.rows.map((row) => {
      const obj: Record<string, any> = {};
      row.forEach((val, idx) => {
        obj[String(idx)] = val;
      });
      return obj;
    });

    console.log(renderTable(cols, rowObjects));
    console.log(`\n  ${theme.dim("Para exportar a CSV:")} ${theme.mintBold("/reports sales csv")}\n`);
    return;
  }

  // 4. Reporte de Órdenes de Compra (/reports orders [csv])
  if (cleanType === "orders" || cleanType === "ordenes" || cleanType === "compras") {
    console.log("\n" + drawDivider("REPORTE DE ÓRDENES DE COMPRA (INBOUND)", 86));
    const data = await generateOrdersReportData(companyId);

    if (data.rows.length === 0) {
      console.log(`\n  ${theme.dim("○ No hay órdenes de compra registradas para exportar.")}\n`);
      return;
    }

    if (isCsv || format === "csv") {
      const exportRes = await exportReportToCsv("ordenes_compra", data.headers, data.rows);
      console.log(`\n  ${theme.success("[OK]")} Reporte de compras exportado en formato CSV compatible con Excel.`);
      console.log(`  ${theme.dim("Registros:")} ${exportRes.totalRows} órdenes emitidas.`);
      console.log(`  ${theme.dim("Archivo:")}   ${theme.mintBold(exportRes.filepath)}\n`);
      return;
    }

    const cols: ColumnDef[] = [
      { header: "ORDEN ID", key: "0", width: 14 },
      { header: "FECHA", key: "1", width: 12 },
      { header: "PROVEEDOR", key: "2", width: 22 },
      { header: "PRODUCTO", key: "4", width: 20 },
      { header: "CANT.", key: "5", width: 8, align: "right" },
      { header: "TOTAL", key: "7", width: 14, align: "right", format: (v) => theme.mintBold(`$${Number(v).toFixed(2)}`) },
      { header: "ESTADO", key: "8", width: 12, align: "center", format: (v) => (v === "recibida" ? theme.mint("[RECIBIDA]") : theme.amber(`[${String(v).toUpperCase()}]`)) },
    ];

    const rowObjects = data.rows.map((row) => {
      const obj: Record<string, any> = {};
      row.forEach((val, idx) => {
        obj[String(idx)] = val;
      });
      return obj;
    });

    console.log(renderTable(cols, rowObjects));
    console.log(`\n  ${theme.dim("Para exportar a CSV:")} ${theme.mintBold("/reports orders csv")}\n`);
    return;
  }

  // 4.1 Reporte de Ganancias (Profit) y Margen (Tarea 1.5)
  if (cleanType === "profit" || cleanType === "ganancia" || cleanType === "margen" || cleanType === "finanzas") {
    console.log("\n" + drawDivider("REPORTE FINANCIERO DE GANANCIAS Y MARGEN POR PRODUCTO", 86));
    const { generateProfitAndMarginReportData, exportReportToPdf } = await import("@mint/core");
    const data = await generateProfitAndMarginReportData(companyId);

    const isPdf = format?.toLowerCase() === "pdf";

    if (isPdf) {
      const exportRes = await exportReportToPdf("reporte_ganancias", `Reporte de Ganancias y Margen - ${companyId}`, data.headers, data.rows);
      console.log(`\n  ${theme.success("[OK]")} Reporte financiero exportado en formato PDF estándar.`);
      console.log(`  ${theme.dim("Registros:")} ${exportRes.totalRows} productos.`);
      console.log(`  ${theme.dim("Archivo:")}   ${theme.mintBold(exportRes.filepath)}\n`);
      return;
    }

    if (isCsv || format === "csv") {
      const exportRes = await exportReportToCsv("reporte_ganancias", data.headers, data.rows);
      console.log(`\n  ${theme.success("[OK]")} Reporte financiero exportado en formato CSV compatible con Excel.`);
      console.log(`  ${theme.dim("Registros:")} ${exportRes.totalRows} productos.`);
      console.log(`  ${theme.dim("Archivo:")}   ${theme.mintBold(exportRes.filepath)}\n`);
      return;
    }

    const cols: ColumnDef[] = [
      { header: "SKU", key: "0", width: 12 },
      { header: "PRODUCTO", key: "1", width: 22 },
      { header: "P. VENTA", key: "2", width: 10, align: "right", format: (v) => v === "-" ? "-" : `$${v}` },
      { header: "COSTO UNIT", key: "3", width: 20, align: "center", format: (v) => v === "costo no registrado" ? theme.amber("costo no registrado") : `$${v}` },
      { header: "GANANCIA", key: "4", width: 11, align: "right", format: (v) => v === "N/A" || v === "-" ? theme.dim(String(v)) : theme.mintBold(`+$${v}`) },
      { header: "MARGEN", key: "5", width: 10, align: "center", format: (v) => v === "N/A" || v === "-" ? theme.dim(String(v)) : theme.bold(String(v)) },
      { header: "VTAS 30D", key: "6", width: 9, align: "right" },
      { header: "GANANCIA 30D", key: "7", width: 14, align: "right", format: (v) => v === "N/A" || v === "-" ? theme.dim(String(v)) : theme.mintBold(`$${v}`) },
    ];

    const rowObjects = data.rows.map((row) => {
      const obj: Record<string, any> = {};
      row.forEach((val, idx) => {
        obj[String(idx)] = val;
      });
      return obj;
    });

    console.log(renderTable(cols, rowObjects));

    console.log(`\n  ${theme.bold("RESUMEN FINANCIERO:")}`);
    console.log(`  • Ingresos Totales (con costo): ${theme.bold(`$${data.summary.totalRevenue.toLocaleString()} ${data.summary.currency}`)}`);
    console.log(`  • Ganancia Neta Estimada (30d): ${theme.mintBold(`$${data.summary.totalProfit.toLocaleString()} ${data.summary.currency}`)}`);
    if (data.summary.overallMarginPercent !== null) {
      console.log(`  • Margen Global Ponderado:     ${theme.mintBold(`${data.summary.overallMarginPercent}%`)}`);
    }
    if (data.summary.productsWithoutCostCount > 0) {
      console.log(`  • ${theme.amber(`Aviso: ${data.summary.productsWithoutCostCount} producto(s) con 'costo no registrado' (margen omitido, nunca estimado).`)}`);
    }
    console.log(`\n  ${theme.dim("Exportar:")} ${theme.mintBold("/reports profit csv")}  ${theme.dim("│")}  ${theme.mintBold("/reports profit pdf")}\n`);
    return;
  }

  // 4.2 Reporte de Salud de Datos y Cuarentena (E3.3)
  if (cleanType === "health" || cleanType === "salud" || cleanType === "quarantine" || cleanType === "cuarentena") {
    console.log("\n" + drawDivider("INFORME DE SALUD DE DATOS Y AISLAMIENTO EN CUARENTENA", 86));
    const { generateDataHealthReportData, exportReportToCsv } = await import("@mint/core");
    const data = await generateDataHealthReportData(companyId);

    if (isCsv || format === "csv") {
      const exportRes = await exportReportToCsv("salud_datos", data.headers, data.rows);
      console.log(`\n  ${theme.success("[OK]")} Informe de salud de datos exportado en formato CSV.`);
      console.log(`  ${theme.dim("Módulos Auditados:")} ${exportRes.totalRows}.`);
      console.log(`  ${theme.dim("Archivo:")}           ${theme.mintBold(exportRes.filepath)}\n`);
      return;
    }

    console.log(
      drawCard(
        [
          `${theme.bold("ESTADO DE INTEGRIDAD DE DATOS:")} ${data.summary.overallHealth === "CONFIABLE" ? theme.mintBold("[CONFIABLE]") : data.summary.overallHealth === "DUDOSO" ? theme.amberBold("[DUDOSO - ACCIONES LIMITADAS]") : theme.redBold("[NO CONFIABLE - BLOQUEADO]")}`,
          `  - Calidad Promedio:      ${data.summary.averageScorePercent}%`,
          `  - Registros en Cuarentena: ${data.summary.quarantinedCount > 0 ? theme.amberBold(`${data.summary.quarantinedCount} aislados`) : theme.mintBold("0 errores")}`,
          `  - Política de Protección: Registros inválidos aislados en mint_quarantine_records sin alterar tablas originales del cliente.`,
        ],
        {
          title: "RESUMEN DE SALUD DE DATOS",
          borderColor: data.summary.overallHealth === "CONFIABLE" ? theme.mint : theme.amber,
        },
      ),
    );

    const cols: ColumnDef[] = [
      { header: "MÓDULO", key: "0", width: 14, format: (v) => theme.bold(String(v)) },
      {
        header: "CONFIANZA",
        key: "1",
        width: 16,
        format: (v) => (v === "CONFIABLE" ? theme.mint("[CONFIABLE]") : v === "DUDOSO" ? theme.amberBold("[DUDOSO]") : theme.redBold("[NO CONFIABLE]")),
      },
      { header: "SCORE", key: "2", width: 10, align: "right" },
      { header: "AUDITADOS", key: "3", width: 12, align: "right" },
      { header: "CORRUPTOS", key: "4", width: 12, align: "right", format: (v) => (Number(v) > 0 ? theme.amberBold(String(v)) : theme.dim("0")) },
      { header: "ACCIÓN SUGERIDA", key: "5", width: 34, format: (v) => theme.dim(String(v)) },
    ];

    const rowObjects = data.rows.map((row) => {
      const obj: Record<string, any> = {};
      row.forEach((val, idx) => {
        obj[String(idx)] = val;
      });
      return obj;
    });

    console.log("\n" + theme.bold("DESGLOSE POR MÓDULO OPERATIVO:"));
    console.log(renderTable(cols, rowObjects));
    console.log(`\n  ${theme.dim("Exportar a CSV:")} ${theme.mintBold("/reports health csv")}\n`);
    return;
  }

  // 5. Menú General de Reportes (/reports)
  console.log("\n" + drawDivider("CENTRO DE REPORTES OPERATIVOS & EXPORTACIÓN", 86));
  console.log(
    drawCard(
      [
        `${theme.bold("REPORTES DISPONIBLES EN TIEMPO REAL:")}`,
        "",
        `  1. ${theme.mintBold("/reports briefing")} (o /today)`,
        `     Resumen ejecutivo del día con prioridades, salud operativa y gasto diario.`,
        "",
        `  2. ${theme.mintBold("/reports stock [csv]")}`,
        `     Estado de existencias, consumo diario, cobertura, clasificación ABC y ROP.`,
        "",
        `  3. ${theme.mintBold("/reports sales [csv]")}`,
        `     Historial de transacciones comerciales y demanda por canal.`,
        "",
        `  4. ${theme.mintBold("/reports orders [csv]")}`,
        `     Historial completo de órdenes de compra emitidas a proveedores y landed cost.`,
        "",
        `  5. ${theme.mintBold("/reports profit [csv|pdf]")}`,
        `     Ganancia y margen unitario por producto con costo real registrado.`,
        "",
        `  6. ${theme.mintBold("/reports health [csv]")}`,
        `     Evaluación de calidad de fuentes y auditoría de registros en cuarentena.`,
        "",
        `${theme.dim("Nota: Al incluir 'csv' el archivo se genera en la carpeta ./reports con codificación UTF-8 BOM compatible con Excel.")}`,
      ],
      {
        title: "GENERADOR DE REPORTES MINT",
        borderColor: theme.cyan,
      },
    ),
  );
  console.log("");
}
