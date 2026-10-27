import {
  getDailyExecutiveBriefing,
  reconcileSalesPaymentsDeliveries,
  exportMintBackup,
} from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawFrame } from "../ui/frame";
import { drawDivider } from "../ui/box";
import * as fs from "node:fs";
import * as path from "node:path";

export async function briefingCommand() {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  const briefing = await getDailyExecutiveBriefing(companyId);

  console.log("");
  console.log(
    drawFrame({
      title: `RESUMEN DIARIO EJECUTIVO: ${companyId} (${briefing.date})`,
      rows: [
        { key: "Ventas Totales", value: `${briefing.salesSummary.ordersCount} órdenes ($${briefing.salesSummary.grossSales.toFixed(2)} ${briefing.currency})` },
        { key: "Ganancia Estimada", value: `$${briefing.salesSummary.estimatedProfit.toFixed(2)} ${briefing.currency}`, color: theme.mint },
        { key: "Costos Faltantes", value: `${briefing.salesSummary.missingCostCount} productos con costo no registrado`, color: briefing.salesSummary.missingCostCount > 0 ? theme.amber : theme.mint },
        { key: "Quiebres Inminentes", value: `${briefing.imminentStockouts.length} productos en riesgo (<5 días)`, color: briefing.imminentStockouts.length > 0 ? theme.red : theme.mint },
        { key: "Entregas en Riesgo", value: `${briefing.delayedDeliveries.length} guías retrasadas`, color: briefing.delayedDeliveries.length > 0 ? theme.amber : theme.mint },
        { key: "Inbox Pendientes", value: `${briefing.pendingApprovalsCount} aprobaciones | ${briefing.pendingQuestionsCount} preguntas`, color: briefing.pendingApprovalsCount > 0 ? theme.amber : theme.mint },
      ],
      footerLeft: theme.dim("ejecuta /reconcile o /inbox"),
      footerRight: theme.dim(new Date().toLocaleTimeString()),
    })
  );

  if (briefing.imminentStockouts.length > 0) {
    console.log(theme.redBold("\n[QUIEBRES DE STOCK INMINENTES (< 5 DIAS)]"));
    drawDivider();
    for (const s of briefing.imminentStockouts) {
      console.log(
        ` ${theme.red("•")} ${theme.bold(s.productName)} (${s.sku}): ${s.currentStock} unidades restantes ` +
        `→ se agota en ${theme.redBold(`${s.daysRemaining} días`)} (consumo: ${s.dailyRunRate} u/día)`
      );
    }
  }

  if (briefing.delayedDeliveries.length > 0) {
    console.log(theme.amberBold("\n[ENTREGAS LOGISTICAS EN RIESGO]"));
    drawDivider();
    for (const d of briefing.delayedDeliveries) {
      console.log(` ${theme.amber("•")} Guía ${theme.bold(d.trackingNumber)}: Retraso +${d.delayMinutes}m. Causa: ${d.reason}`);
    }
  }
  console.log("");
}

export async function reconcileCommand() {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  const rec = await reconcileSalesPaymentsDeliveries(companyId);

  console.log("");
  console.log(
    drawFrame({
      title: `CONCILIACION DE 3 VIAS (VENTAS vs COBROS vs DESPACHOS)`,
      rows: [
        { key: "Órdenes Auditadas", value: `${rec.totalOrdersAudited} transacciones` },
        { key: "Órdenes Cuadradas", value: `${rec.balancedCount} balanceadas`, color: theme.mint },
        { key: "Discrepancias Detectadas", value: `${rec.discrepanciesCount} diferencias`, color: rec.discrepanciesCount > 0 ? theme.amber : theme.mint },
      ],
      footerLeft: theme.dim("MINT no resuelve en silencio: muestra diferencias para decisión humana"),
      footerRight: theme.dim(`empresa: ${companyId}`),
    })
  );

  if (rec.discrepancies.length > 0) {
    console.log(theme.amberBold("\n[DISCREPANCIAS DETECTADAS]"));
    drawDivider();
    for (const d of rec.discrepancies) {
      console.log(` ${theme.amber("•")} Pedido ${theme.bold(d.orderId)} (${d.customerName}): $${d.orderAmount.toFixed(2)}`);
      console.log(`   Pago: ${d.paymentStatus} | Despacho: ${d.shippingStatus}`);
      console.log(theme.dim(`   → Conflicto: ${d.issue}`));
    }
  } else {
    console.log(theme.mint("\n[OK] Todas las ventas, pagos y despachos coinciden exactamente sin discrepancias.\n"));
  }
  console.log("");
}

export async function backupCommand() {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  const backupData = await exportMintBackup(companyId);
  const targetDir = path.join(process.cwd(), "vault", "backups");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filename = `mint_backup_${companyId}_${Date.now()}.json`;
  const fullPath = path.join(targetDir, filename);
  fs.writeFileSync(fullPath, JSON.stringify(backupData, null, 2), "utf8");

  console.log(theme.mintBold(`\n[OK] Respaldo completo de configuración y memoria exportado exitosamente.`));
  console.log(theme.dim(`   Archivo guardado en: ${fullPath}\n`));
}
