import { db, cases, runAgentLoop, decisions } from "@mint/core";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { formatTerminalMarkdown } from "../ui/markdown";

export async function chatCommand(message: string, options: { json?: boolean; noExit?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";
  const caseId = `chat_${randomUUID().slice(0, 8)}`;

  try {
    await db.insert(cases).values({
      id: caseId,
      companyId,
      title: "Operacion Coordinador",
      description: message,
      status: "en_proceso",
      priority: "media",
    });

    if (options.json) {
      const res = await runAgentLoop(caseId);
      console.log(JSON.stringify(res, null, 2));
      return;
    }

    const executedSteps: string[] = [];
    const res = await runAgentLoop(caseId, {
      onEvent: (ev) => {
        executedSteps.push(`${ev.action}`);
      },
    });

    console.log("");
    if (executedSteps.length > 0) {
      console.log(`  ${theme.dim("Tools ejecutadas:")} ${theme.cyan(executedSteps.join(" -> "))}`);
    }

    const responseLines = formatTerminalMarkdown(res.summary || "Sin respuesta del modelo.");
    console.log(theme.dim("  " + "─".repeat(76)));
    for (const line of responseLines) {
      console.log(`  ${line}`);
    }
    console.log(theme.dim("  " + "─".repeat(76)));
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`  [ERROR] ${err.message}`));
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

    const autoExecuted = allDecisions.filter((d) => d.policyDecision === "auto_executed");
    const pendingReview = allDecisions.filter((d) => d.policyDecision === "pending_approval");
    const blockedRisk = allDecisions.filter((d) => d.policyDecision === "blocked");

    const totalSpend = autoExecuted.reduce((sum, d) => sum + Number(d.costMxn || 0), 0);
    const estimatedSavings = totalSpend * 0.12;
    const systemHealth = pendingReview.length === 0 && blockedRisk.length === 0 ? "OPTIMAL" : "ATTENTION";

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

    const spendStr = `$${b.totalAutonomousSpendMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;
    const savingsStr = `$${b.estimatedSavingsMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;

    console.log("\n" + drawDivider(`RESUMEN DIARIO OPERATIVO [${companyId}]`, 78));
    console.log(
      drawCard(
        [
          `${theme.dim("Autoejecutadas:")}   ${b.autoExecutedCount}`,
          `${theme.dim("Pendientes HITL:")}  ${b.pendingReviewCount} en /inbox`,
          `${theme.dim("Bloqueadas:")}       ${b.blockedRiskCount}`,
          `${theme.dim("Gasto aprobado:")}   ${theme.bold(spendStr)}`,
          `${theme.dim("Ahorro estimado:")}  ${theme.mint(savingsStr)}`,
          `${theme.dim("Estado Sistema:")}   ${b.systemHealth}`,
        ],
        {
          title: "RESUMEN DEL DIA",
          borderColor: theme.mint,
        },
      ),
    );
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`  [ERROR] ${err.message}`));
    }
    if (!options.noExit) {
      process.exit(1);
    }
  }
}
