import { sendChatApi, getBriefingApi } from "../client";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { withSpinner } from "../ui/spinner";

export async function chatCommand(message: string, options: { json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    let res: any;
    if (options.json) {
      res = await sendChatApi(message, companyId);
    } else {
      res = await withSpinner("Agente Autónomo Mint deliberando y consultando herramientas...", async () => {
        return await sendChatApi(message, companyId);
      });
    }

    if (!res.success) {
      throw new Error("El agente no pudo procesar la solicitud.");
    }

    if (options.json) {
      console.log(JSON.stringify(res, null, 2));
      return;
    }

    console.log("");
    // Split response into readable lines for card
    const responseLines = res.response
      .split("\n")
      .map((l: string) => (l.trim() ? l : " "));

    const statusBadge =
      res.status === "RESOLVED"
        ? "mint"
        : res.status === "ESCALATED"
          ? "amber"
          : "cyan";

    console.log(
      drawCard(responseLines, {
        title: `RESPUESTA DEL AGENTE // CASO: ${res.caseId}`,
        badge: res.status,
        badgeColor: statusBadge,
        borderColor: theme.mint,
      }),
    );

    const tokens = res.metrics?.totalTokens ?? 0;
    const cost = res.metrics?.totalCostUsd ?? "0.00";
    console.log(
      `\n  ${theme.dim("Métricas:")} ${theme.bold(tokens)} tokens consumidos │ ${theme.bold(`$${cost} USD`)} costo API │ ${theme.dim("Caso:")} ${res.caseId}\n`,
    );
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`❌ Error en chat: ${err.message}`));
    }
    process.exit(1);
  }
}

export async function todayCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const res = await getBriefingApi(companyId);
    if (!res.success) {
      throw new Error("No se pudo obtener el resumen diario");
    }

    if (options.json) {
      console.log(JSON.stringify(res.data, null, 2));
      return;
    }

    const b = res.data;
    console.log("\n" + drawDivider(`RESUMEN DIARIO OPERATIVO // DAILY BRIEFING [${companyId}]`, 86));

    const spendStr = `$${b.totalAutonomousSpendMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;
    const savingsStr = `$${b.estimatedSavingsMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;

    console.log("");
    console.log(
      drawCard(
        [
          `${theme.dim("Autoejecutadas:")} ${theme.mintBold(b.autoExecutedCount)} decisiones ejecutadas bajo umbral autónomo`,
          `${theme.dim("Supervisión:")}    ${b.pendingReviewCount > 0 ? theme.amberBold(`${b.pendingReviewCount} decisiones esperando al humano en el inbox`) : theme.success("0 pendientes")}`,
          `${theme.dim("Riesgo bloqueado:")} ${b.blockedRiskCount > 0 ? theme.redBold(`${b.blockedRiskCount} operaciones bloqueadas por auditor de riesgo`) : theme.dim("0 bloqueadas")}`,
          `${theme.dim("Presupuesto:")}    ${theme.bold(spendStr)} gestionados de forma autónoma`,
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
    process.exit(1);
  }
}
