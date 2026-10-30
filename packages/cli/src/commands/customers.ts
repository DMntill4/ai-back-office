import { listCompanySalesSummary, getCustomersPortfolio } from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { renderTable, type ColumnDef } from "../ui/table";

export async function customersCommand() {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  console.log("\n" + drawDivider("CANALES DE VENTA Y CARTERA DE CLIENTES", 84));

  const [summary, portfolio] = await Promise.all([
    listCompanySalesSummary(companyId),
    getCustomersPortfolio(companyId),
  ]);

  console.log(
    drawCard(
      [
        `${theme.bold("MÉTRICAS CONSOLIDADAS DE DEMANDA:")}`,
        `  - Total Ingresos:      $${summary.totalRevenue.toLocaleString()} ${summary.currency}`,
        `  - Unidades Vendidas:   ${theme.bold(String(summary.totalUnits))} unidades`,
        `  - Canales Activos:     ${summary.channels.length} canales comerciales`,
        `  - Clientes Registrados: ${portfolio.customers.length} clientes en cartera`,
        `  - Clientes en Riesgo:  ${portfolio.atRiskCustomers.length > 0 ? theme.amberBold(`${portfolio.atRiskCustomers.length} en riesgo de abandono`) : theme.mint("0 (cartera activa)")}`,
      ],
      {
        title: "RESUMEN COMERCIAL Y CARTERA",
        borderColor: theme.mint,
      },
    ),
  );

  if (summary.channels.length === 0 && portfolio.customers.length === 0) {
    console.log(`\n  ${theme.dim("○ No hay transacciones de venta ni órdenes de clientes registradas aún.")}`);
    console.log(`  ${theme.dim("Las ventas se registran mediante integraciones webhooks o importación de catálogo.")}\n`);
    return;
  }

  if (summary.channels.length > 0) {
    console.log("\n" + theme.bold("DESGLOSE POR CANAL COMERCIAL:"));

    const cols: ColumnDef[] = [
      {
        header: "CANAL",
        key: "channel",
        width: 16,
        format: (v) => theme.bold(String(v).toUpperCase()),
      },
      { header: "TRANSACCIONES", key: "totalTransactions", width: 16, align: "right" },
      { header: "UNIDADES", key: "totalUnitsSold", width: 14, align: "right", format: (v) => `${v} u` },
      {
        header: `INGRESOS (${summary.currency})`,
        key: "totalRevenue",
        width: 20,
        align: "right",
        format: (v) => theme.mintBold(`$${Number(v).toLocaleString("es-CO", { minimumFractionDigits: 2 })}`),
      },
      {
        header: "TOP PRODUCTOS",
        key: "topProducts",
        width: 32,
        format: (v: any[]) =>
          v.length > 0 ? v.map((p) => `${p.sku} (${p.units}u)`).join(", ") : theme.dim("Sin datos"),
      },
    ];

    console.log(renderTable(cols, summary.channels));
  }

  // TOP CLIENTES DE MAYOR VALOR (E6.2)
  if (portfolio.topValuedCustomers.length > 0) {
    console.log("\n" + theme.bold("TOP CLIENTES DE MAYOR VALOR (LTV):"));

    const topCols: ColumnDef[] = [
      { header: "CLIENTE", key: "customerName", width: 24, format: (v) => theme.bold(String(v)) },
      { header: "CONTACTO", key: "customerEmail", width: 26, format: (v) => v ? String(v) : theme.dim("Sin email") },
      { header: "ÓRDENES", key: "totalOrders", width: 10, align: "right" },
      {
        header: `VALOR TOTAL (${portfolio.currency})`,
        key: "totalSpent",
        width: 18,
        align: "right",
        format: (v) => theme.mintBold(`$${Number(v).toLocaleString("es-CO", { minimumFractionDigits: 2 })}`),
      },
      {
        header: "ESTADO",
        key: "status",
        width: 14,
        format: (v) =>
          v === "ACTIVO"
            ? theme.mint("[ACTIVO]")
            : v === "EN_RIESGO"
              ? theme.amberBold("[EN RIESGO]")
              : theme.redBold("[INACTIVO]"),
      },
    ];

    console.log(renderTable(topCols, portfolio.topValuedCustomers.slice(0, 10)));
  }

  // CLIENTES QUE DEJARON DE COMPRAR / EN RIESGO (E6.2)
  if (portfolio.atRiskCustomers.length > 0) {
    console.log("\n" + theme.amberBold("CLIENTES EN RIESGO / QUE DEJARON DE COMPRAR (>30 días sin órdenes):"));

    const riskCols: ColumnDef[] = [
      { header: "CLIENTE", key: "customerName", width: 24, format: (v) => theme.bold(String(v)) },
      { header: "CONTACTO", key: "customerEmail", width: 26, format: (v) => v ? String(v) : theme.dim("Sin email") },
      { header: "DÍAS INACTIVO", key: "daysSinceLastOrder", width: 16, align: "right", format: (v) => theme.amberBold(`${v} días`) },
      {
        header: `HISTÓRICO (${portfolio.currency})`,
        key: "totalSpent",
        width: 18,
        align: "right",
        format: (v) => `$${Number(v).toLocaleString("es-CO", { minimumFractionDigits: 2 })}`,
      },
      {
        header: "DIAGNÓSTICO",
        key: "status",
        width: 16,
        format: (v) => (v === "INACTIVO" ? theme.redBold("ABANDONO (>45d)") : theme.amberBold("EN RIESGO (30-45d)")),
      },
    ];

    console.log(renderTable(riskCols, portfolio.atRiskCustomers));
  }

  console.log("");
}
