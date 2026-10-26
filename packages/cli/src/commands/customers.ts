import { listCompanySalesSummary } from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { renderTable, type ColumnDef } from "../ui/table";

export async function customersCommand() {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  console.log("\n" + drawDivider("CANALES DE VENTA Y CARTERA DE CLIENTES", 84));

  const summary = await listCompanySalesSummary(companyId);

  console.log(
    drawCard(
      [
        `${theme.bold("MÉTRICAS CONSOLIDADAS DE DEMANDA:")}`,
        `  - Total Ingresos:      $${summary.totalRevenue.toLocaleString()} ${summary.currency}`,
        `  - Unidades Vendidas:   ${theme.bold(String(summary.totalUnits))} unidades`,
        `  - Canales Activos:     ${summary.channels.length} canales comerciales`,
      ],
      {
        title: "RESUMEN COMERCIAL",
        borderColor: theme.mint,
      },
    ),
  );

  if (summary.channels.length === 0) {
    console.log(`\n  ${theme.dim("○ No hay transacciones de venta registradas en sales_history aún.")}`);
    console.log(`  ${theme.dim("Las ventas se registran mediante integraciones o importación de CSV.")}\n`);
    return;
  }

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
  console.log("");
}
