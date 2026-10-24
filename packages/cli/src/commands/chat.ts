import { db, cases, runAgentLoop, decisions } from "@mint/core";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { formatTerminalMarkdown } from "../ui/markdown";
import { withSpinner } from "../ui/spinner";

export async function chatCommand(message: string, options: { json?: boolean; noExit?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";
  const caseId = `chat_${randomUUID().slice(0, 8)}`;

  try {
    // 1. Registrar caso en base de datos para trazabilidad y memoria contextual
    await db.insert(cases).values({
      id: caseId,
      companyId,
      title: "Chat Operator",
      description: message,
      status: "en_proceso",
      priority: "media",
    });

    // 2. Ejecutar bucle ReAct autónomo in-process con herramientas y Grok
    let res: any;
    if (options.json) {
      res = await runAgentLoop(caseId);
    } else {
      res = await withSpinner("Agente Autónomo Mint deliberando y consultando herramientas...", async () => {
        return await runAgentLoop(caseId);
      });
    }

    if (options.json) {
      console.log(JSON.stringify(res, null, 2));
      return;
    }

    console.log("");
    const responseLines = formatTerminalMarkdown(res.summary || "Sin respuesta del modelo.");

    const statusBadge =
      res.status === "resuelto"
        ? "mint"
        : res.status === "escalado"
          ? "amber"
          : "cyan";

    console.log(
      drawCard(responseLines, {
        title: `RESPUESTA DEL AGENTE // CASO: ${res.caseId}`,
        badge: (res.status || "RESUELTO").toUpperCase(),
        badgeColor: statusBadge,
        borderColor: theme.mint,
      }),
    );

    const tokens = res.totalTokens ?? 0;
    const cost = res.totalCost ?? "0.00";
    console.log(
      `\n  ${theme.dim("Métricas:")} ${theme.bold(tokens)} tokens consumidos │ ${theme.bold(`$${cost} USD`)} costo API │ ${theme.dim("Caso:")} ${res.caseId}\n`,
    );
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`❌ Error en chat: ${err.message}`));
    }
    if (!options.noExit) {
      process.exit(1);
    }
  }
}

export async function todayCommand(options: { json?: boolean; noExit?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const allDecisions = await db
      .select()
      .from(decisions)
      .where(eq(decisions.companyId, companyId));

    const autoExecuted = allDecisions.filter(
      (d) => d.policyDecision === "auto_executed",
    );
    const pendingReview = allDecisions.filter(
      (d) => d.policyDecision === "pending_approval",
    );
    const blockedRisk = allDecisions.filter(
      (d) => d.policyDecision === "blocked",
    );

    const totalSpend = autoExecuted.reduce((sum, d) => sum + Number(d.costMxn || 0), 0);
    const estimatedSavings = totalSpend * 0.12;
    const systemHealth =
      pendingReview.length === 0 && blockedRisk.length === 0 ? "OPTIMAL" : "ATTENTION";

    const b = {
      totalDecisions: allDecisions.length,
      autoExecutedCount: autoExecuted.length,
      pendingReviewCount: pendingReview.length,
      blockedRiskCount: blockedRisk.length,
      totalAutonomousSpendMxn: totalSpend,
      estimatedSavingsMxn: estimatedSavings,
      systemHealth,
    };

    if (options.json) {
      console.log(JSON.stringify(b, null, 2));
      return;
    }

    console.log("\n" + drawDivider(`RESUMEN DIARIO OPERATIVO // DAILY BRIEFING [${companyId}]`, 86));

    const spendStr = `$${b.totalAutonomousSpendMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;
    const savingsStr = `$${b.estimatedSavingsMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;

    console.log("");
    console.log(
      drawCard(
        [
          `${theme.dim("Supervisadas:")}    ${b.autoExecutedCount > 0 ? theme.mintBold(b.autoExecutedCount) : theme.dim("0")} decisiones procesadas`,
          `${theme.dim("Supervisión:")}     ${b.pendingReviewCount > 0 ? theme.amberBold(`${b.pendingReviewCount} propuestas esperando al humano en el inbox (/inbox)`) : theme.success("0 pendientes (Al día)")}`,
          `${theme.dim("Riesgo bloqueado:")} ${b.blockedRiskCount > 0 ? theme.redBold(`${b.blockedRiskCount} operaciones bloqueadas por auditor de riesgo`) : theme.dim("0 bloqueadas")}`,
          `${theme.dim("Gasto aprobado:")}  ${theme.bold(spendStr)} en órdenes de reposición`,
          `${theme.dim("Ahorro estimado:")} ${theme.success(savingsStr)} por optimización de proveedores`,
          `${theme.dim("Salud Sistema:")}   ${theme.badge(b.systemHealth.toUpperCase(), b.systemHealth === "OPTIMAL" ? "mint" : "amber")}`,
        ],
        {
          title: "MINT DAILY BRIEFING",
          borderColor: theme.mint,
        },
      ),
    );
    console.log("");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`❌ Error en briefing: ${err.message}`));
    }
    if (!options.noExit) {
      process.exit(1);
    }
  }
}
