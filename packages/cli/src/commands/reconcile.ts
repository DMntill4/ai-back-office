import { reconcileSalesPaymentsDeliveries } from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { renderTable, type ColumnDef } from "../ui/table";

export async function reconcileCommand() {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  console.log("\n" + drawDivider("CONCILIACIÓN 3 VÍAS: VENTAS vs COBROS vs DESPACHOS", 86));

  const result = await reconcileSalesPaymentsDeliveries(companyId);

  console.log(
    drawCard(
      [
        `${theme.bold("RESULTADOS DE LA AUDITORÍA DE 3 VÍAS:")}`,
        `  - Órdenes Auditadas:    ${theme.bold(String(result.totalOrdersAudited))}`,
        `  - Cuadradas al 100%:    ${theme.mintBold(`${result.balancedCount} órdenes`)}`,
        `  - Discrepancias:        ${result.discrepanciesCount > 0 ? theme.redBold(`${result.discrepanciesCount} detectadas`) : theme.mintBold("0 (Cero fugas)")}`,
        "",
        `${theme.dim("Criterio: Detecta mercancía entregada sin cobro o pagos recibidos sin despacho en más de 48h.")}`,
      ],
      {
        title: "CONCILIACIÓN FINANCIERO-LOGÍSTICA",
        borderColor: result.discrepanciesCount > 0 ? theme.amber : theme.mint,
      },
    ),
  );

  if (result.discrepanciesCount === 0) {
    console.log(`\n  ${theme.mintBold("[OK]")} Todas las transacciones comerciales, pagos y despachos coinciden exactamente.`);
    console.log(`  ${theme.dim("No se registran inconsistencias entre pasarelas de pago y logística.\n")}`);
    return;
  }

  console.log("\n" + theme.redBold("DISCREPANCIAS DETECTADAS QUE REQUIEREN ATENCIÓN:"));

  const cols: ColumnDef[] = [
    { header: "ORDEN", key: "orderId", width: 16, format: (v) => theme.bold(String(v)) },
    { header: "CLIENTE", key: "customerName", width: 22 },
    {
      header: "MONTO",
      key: "orderAmount",
      width: 14,
      align: "right",
      format: (v) => `$${Number(v).toLocaleString("es-CO", { minimumFractionDigits: 2 })}`,
    },
    {
      header: "PAGO",
      key: "paymentStatus",
      width: 12,
      align: "center",
      format: (v) => (v === "paid" ? theme.mint("[PAGADO]") : theme.redBold("[PENDIENTE]")),
    },
    {
      header: "DESPACHO",
      key: "shippingStatus",
      width: 14,
      align: "center",
      format: (v) =>
        v === "delivered"
          ? theme.mint("[ENTREGADO]")
          : v === "pending"
            ? theme.amberBold("[NO DESPACHADO]")
            : theme.cyan(`[${String(v).toUpperCase()}]`),
    },
    { header: "OBSERVACIÓN", key: "issue", width: 36, format: (v) => theme.amber(String(v)) },
  ];

  console.log(renderTable(cols, result.discrepancies));
  console.log("");
}
