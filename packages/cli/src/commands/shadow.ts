import { getShadowComparisonReport, configureShadowMode, getShadowModeStatus } from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawFrame } from "../ui/frame";
import { drawDivider } from "../ui/box";

export async function shadowCommand(args: string[] = []) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  const subCommand = args[0]?.toLowerCase();

  if (subCommand === "on") {
    const days = parseInt(args[1] || "14", 10);
    await configureShadowMode(companyId, true, days);
    console.log(theme.mint(`\n✅ Modo Sombra ACTIVADO para '${companyId}' por ${days} días.`));
    console.log(theme.dim("   MINT observará y simulará decisiones sin alterar producción ni notificar.\n"));
    return;
  }

  if (subCommand === "off") {
    await configureShadowMode(companyId, false, 0);
    console.log(theme.amber(`\n⚠️ Modo Sombra DESACTIVADO para '${companyId}'. Autonomía estándar reanudada.\n`));
    return;
  }

  const [status, report] = await Promise.all([
    getShadowModeStatus(companyId),
    getShadowComparisonReport(companyId),
  ]);

  console.log("");
  console.log(
    drawFrame({
      title: `MODO SOMBRA (SHADOW RUN) - EMPRESA: ${companyId}`,
      rows: [
        { key: "Estado", value: status.enabled ? "ACTIVO" : "INACTIVO", color: status.enabled ? theme.mint : theme.gray },
        { key: "Días Restantes", value: `${status.daysRemaining} de ${status.daysDuration} días programados` },
        { key: "Decisiones Simuladas", value: `${report.totalSimulatedDecisions} registradas` },
        { key: "Gasto Simulado Total", value: `$${report.totalSimulatedCost.toFixed(2)}` },
        { key: "Aciertos / Desvíos", value: `${report.matchedCount} coincidentes / ${report.divergedCount} divergentes`, color: report.matchedCount >= report.divergedCount ? theme.mint : theme.amber },
      ],
      footerLeft: theme.dim("activar: /shadow on <días> | apagar: /shadow off"),
      footerRight: theme.dim(`evaluadas: ${report.evaluatedCount}`),
    })
  );

  console.log(theme.mintBold("\n[ULTIMAS DECISIONES SIMULADAS EN LA SOMBRA]"));
  drawDivider();

  if (report.decisions.length === 0) {
    console.log(theme.dim("  Aún no se han registrado eventos para simular en modo sombra."));
  } else {
    for (const d of report.decisions.slice(0, 8)) {
      const statusColor =
        d.shadowStatus === "matched"
          ? theme.mint
          : d.shadowStatus === "diverged"
          ? theme.amber
          : theme.cyan;

      console.log(
        ` ${statusColor(`[${d.shadowStatus.toUpperCase()}]`)} ${theme.bold(d.title)} ` +
        `($${d.simulatedCost.toFixed(2)}) - ${d.actionType}`
      );
      if (d.comparisonNotes) {
        console.log(theme.dim(`   → Notas: ${d.comparisonNotes}`));
      }
    }
  }
  console.log("");
}
