import { executeGoalSeekingEngine } from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { renderTable } from "../ui/table";

export async function goalCommand(
  objectivePrompt: string,
  options: { json?: boolean; noExit?: boolean } = {},
) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  if (!objectivePrompt || objectivePrompt.trim().length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ error: "Debes especificar un objetivo. Ej: mint goal 'bajar gastos en un 30%'" }));
    } else {
      console.log(theme.amber("\n  [AVISO] Debes especificar un objetivo estratégico."));
      console.log(`  Ejemplo: ${theme.mintBold("mint goal 'bajar gastos en un 30%'")}`);
      console.log(`  O en consola: ${theme.mintBold("/goal bajar gastos en un 30%")}\n`);
    }
    if (!options.noExit) process.exit(1);
    return;
  }

  try {
    const plan = await executeGoalSeekingEngine(companyId, objectivePrompt);

    if (options.json) {
      console.log(JSON.stringify(plan, null, 2));
      return;
    }

    console.log("\n" + drawDivider(`MOTOR ESTRATÉGICO DE OBJETIVOS │ PLAN DE IMPLEMENTACIÓN [${companyId}]`, 86));

    const baselineStr = `$${plan.currentMonthlyBaselineMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;
    const targetStr = `$${plan.targetMonthlySpendMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;
    const savingsStr = `$${plan.projectedMonthlySavingsMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;

    // Barra de viabilidad técnica estilo terminal Linux
    const barLength = 24;
    const filled = Math.round(plan.feasibilityScore * barLength);
    const progressBar = theme.mint("█".repeat(filled)) + theme.dim("░".repeat(barLength - filled));

    console.log(
      drawCard(
        [
          `${theme.dim("Objetivo:")}        ${theme.bold(`"${plan.objectiveText}"`)}`,
          `${theme.dim("Meta de Reducción:")} ${theme.mintBold(`-${plan.targetSavingsPercentage}%`)}  ${theme.dim("│")}  ${theme.dim("Viabilidad:")} ${progressBar} ${(plan.feasibilityScore * 100).toFixed(0)}%`,
          theme.dim("─".repeat(74)),
          `${theme.dim("Gasto Mensual Base:")}     ${theme.bold(baselineStr)} (Compras + Almacén + Fletes)`,
          `${theme.dim("Gasto Objetivo Nuevo:")}    ${theme.cyanBold(targetStr)} / mes`,
          `${theme.dim("Ahorro Neto Proyectado:")}  ${theme.mintBold(savingsStr)} / mes`,
        ],
        {
          title: "LÍNEA BASE Y OBJETIVO FINANCIERO",
          badge: `METRIC -${plan.targetSavingsPercentage}%`,
          badgeColor: "mint",
          borderColor: theme.mint,
        },
      ),
    );

    console.log("\n  " + theme.bold("LAS 4 PALANCAS TÁCTICAS OPERATIVAS:"));
    const leverRows = plan.levers.map((l) => ({
      name: l.name,
      area: theme.badge(l.area, l.area === "COMPRAS" ? "cyan" : l.area === "INVENTARIO" ? "mint" : l.area === "FLETES" ? "amber" : "violet"),
      savings: `$${l.monthlySavingsMxn.toLocaleString("es-MX")} MXN`,
      timeframe: l.timeframe,
      risk: `${(l.riskScore * 100).toFixed(0)}%`,
    }));

    console.log(
      renderTable(
        [
          { header: "Palanca Operativa", key: "name", width: 34 },
          { header: "Área", key: "area", width: 12, align: "center" },
          { header: "Ahorro / Mes", key: "savings", width: 16, align: "right" },
          { header: "Plazo", key: "timeframe", width: 12, align: "center" },
          { header: "Riesgo", key: "risk", width: 8, align: "center" },
        ],
        leverRows,
      ),
    );

    console.log("\n  " + theme.bold("HOJA DE RUTA Y PLAN DE IMPLEMENTACIÓN EN 3 FASES:"));
    for (const ph of plan.phases) {
      console.log(
        drawCard(
          [
            `${theme.dim("Período:")} ${theme.bold(ph.period)}  ${theme.dim("│")}  ${theme.dim("Enfoque:")} ${ph.focus}`,
            `${theme.dim("Ahorro Acumulado Proyectado:")} ${theme.mintBold(`$${ph.expectedCumulativeSavingsMxn.toLocaleString("es-MX")} MXN / mes`)}`,
            theme.dim("Hitos clave:"),
            ...ph.milestones.map((m) => `  ${theme.mint("→")} ${m}`),
          ],
          {
            title: `FASE ${ph.phaseNumber}: ${ph.title.toUpperCase()}`,
            borderColor: ph.phaseNumber === 1 ? theme.cyan : ph.phaseNumber === 2 ? theme.mint : theme.gray,
          },
        ),
      );
    }

    if (plan.stagedDecisions.length > 0) {
      console.log("\n  " + theme.bold("ACCIONES PREPARADAS Y ENCOLADAS EN /inbox (HUMAN-IN-THE-LOOP):"));
      console.log(theme.dim("  El agente autónomo preparó las siguientes decisiones para que las apruebes:\n"));
      for (const st of plan.stagedDecisions) {
        console.log(
          `  ${theme.mintBold("[STAGED]")} ${theme.bold(st.id)} │ ${st.title}`,
        );
        console.log(
          `           Costo Comprometido: $${st.costMxn.toLocaleString("es-MX")} MXN │ Ahorro Esperado: ${theme.mintBold(`$${st.projectedSavingsMxn.toLocaleString("es-MX")} MXN`)}`,
        );
        console.log(
          `           Acción: ${theme.cyan(`/approve ${st.id}`)} para autorizar y emitir la orden/guía.\n`,
        );
      }
    }

    console.log(theme.dim(`  Ejecuta ${theme.mintBold("/inbox")} para ver el detalle de gobernanza o ${theme.mintBold("/approve <id>")} para autorizar.\n`));
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`\n  [ERROR] Falló la formulación del objetivo: ${err.message}\n`));
    }
    if (!options.noExit) process.exit(1);
  }
}
