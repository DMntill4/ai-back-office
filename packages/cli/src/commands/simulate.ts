import { coordinateOperationalEvent, db, products } from "@mint/core";
import { eq } from "drizzle-orm";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { withSpinner } from "../ui/spinner";
import { getSession } from "../keychain";

export async function simulateCommand(
  scenarioType = "stockout",
  options: { json?: boolean; sku?: string; companyId?: string } = {},
) {
  const session = await getSession();
  const companyId = options.companyId || session?.companyId || "comp_default";

  const { getCompanyConfig } = await import("@mint/core");
  const config = await getCompanyConfig(companyId);

  const validScenarios = ["stockout", "delay", "price-spike", "demand-surge", "supplier-outage"];
  if (!validScenarios.includes(scenarioType.toLowerCase())) {
    console.error(
      theme.redBold(
        `[ERROR] Escenario '${scenarioType}' no válido. Escenarios disponibles: ${validScenarios.join(", ")}`,
      ),
    );
    if (!options.json) {
      return;
    }
    process.exit(1);
  }

  if (!options.json) {
    console.log("\n" + theme.mintBold("SIMULADOR MULTI-AGENTE // WHAT-IF LOGISTICS"));
    console.log(theme.muted(`   Empresa: ${companyId} │ Escenario: ${scenarioType.toUpperCase()} │ Modo: Sandbox Dry-Run\n`));
  }

  try {
    // 1. Resolver producto para la simulación
    let targetProductId = "";
    if (options.sku) {
      const found = await db.select().from(products).where(eq(products.sku, options.sku)).limit(1);
      if (found.length > 0) targetProductId = found[0].id;
    }
    if (!targetProductId) {
      const prods = await db.select().from(products).where(eq(products.companyId, companyId)).limit(1);
      if (prods.length > 0) {
        targetProductId = prods[0].id;
      } else {
        targetProductId = "prod_sample";
      }
    }

    let eventType = "STOCK_CRITICAL";
    let title = "Simulación de Quiebre Crítico de Stock";
    let description = "Déficit simulado de stock demandando reabastecimiento urgente";

    if (scenarioType.toLowerCase() === "delay") {
      eventType = "SHIPMENT_DELAY";
      title = "Simulación de Retraso Crítico en Transporte";
      description = "Guía de envío retrasada 5 días comprometiendo stock mínimo";
    } else if (scenarioType.toLowerCase() === "price-spike") {
      eventType = "PRICE_ANOMALY";
      title = "Simulación de Anomalía y Subida de Precios";
      description = "Cotización de proveedor presenta incremento atípico";
    } else if (scenarioType.toLowerCase() === "demand-surge") {
      eventType = "STOCK_CRITICAL";
      title = "Simulación de Pico Repentino de Demanda (+50%)";
      description = "Aumento acelerado de consumo diario agota cobertura antes del lead time";
    } else if (scenarioType.toLowerCase() === "supplier-outage") {
      eventType = "STOCK_CRITICAL";
      title = "Simulación de Paro / Quiebre en Proveedor Habitual";
      description = "Proveedor principal no disponible, forzando evaluación de alternativas secundarias";
    }

    const result = await withSpinner(
      `Ejecutando orquestación multi-agente en sandbox (${scenarioType})...`,
      async () => {
        return await coordinateOperationalEvent({
          eventType,
          companyId,
          productId: targetProductId,
          title,
          description,
          autonomyLevel: "dry-run",
        });
      },
    );

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (!result.success || !result.proposal) {
      console.log(`\n${theme.amberBold("[AVISO]")} Simulación completada con advertencia:`);
      console.log(`   ${result.summary}\n`);
      return;
    }

    console.log("\n" + drawDivider("PROPUESTA ESTRUCTURADA RESULTANTE"));

    const policyDecision = result.policyResult?.policyDecision || "pending_approval";
    const badgeColor =
      policyDecision === "auto_executed"
        ? "mint"
        : policyDecision === "pending_approval"
          ? "amber"
          : "red";

    const costStr = `$${result.proposal.costMxn.toLocaleString("es-CO", { minimumFractionDigits: 2 })} ${config.currency}`;
    const riskScore = result.proposal.riskAssessment.riskScore;
    const riskPct = `${(riskScore * 100).toFixed(0)}%`;

    console.log(
      drawCard(
        [
          `${theme.dim("Acción:")}     ${theme.cyanBold(result.proposal.actionType)}`,
          `${theme.dim("Título:")}     ${result.proposal.title}`,
          `${theme.dim("Costo:")}      ${theme.bold(costStr)}`,
          `${theme.dim("Riesgo:")}     ${theme.badge(riskPct, riskScore > 0.4 ? "red" : "mint")}`,
          `${theme.dim("Veredicto:")}  ${theme.bold(policyDecision.toUpperCase())} (Modo Dry-Run)`,
        ],
        {
          title: "SÍNTESIS DEL COORDINADOR AUTÓNOMO",
          badge: policyDecision.toUpperCase(),
          badgeColor,
        },
      ),
    );

    console.log("\n" + drawDivider("DELIBERACIÓN DE AGENTES ESPECIALISTAS"));

    console.log(`\n${theme.mintBold("1. Síntesis y Resumen Operativo:")}`);
    console.log(`   ${result.summary}`);

    if (result.proposal.riskAssessment.redFlags && result.proposal.riskAssessment.redFlags.length > 0) {
      console.log(`\n${theme.amberBold("2. Auditoría Adversarial de Riesgo:")}`);
      for (const flag of result.proposal.riskAssessment.redFlags) {
        console.log(`   ${theme.danger("•")} ${flag}`);
      }
    }

    console.log("\n" + drawDivider("POLÍTICA Y GOBERNANZA"));
    console.log(
      `   ${theme.muted("Regla activada:")} ${theme.bold(result.policyResult?.matchedRule || "RULE_DRY_RUN_GUARDRAIL")}\n` +
        `   ${theme.muted("Razón:")}          ${result.policyResult?.reason || "Políticas evaluadas deterministamente"}\n` +
        `   ${theme.muted("Nota:")}           En modo producción ('auto'), esta acción se ejecutaría en milisegundos si cumple los guardrails.\n`,
    );
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`[ERROR] Error en simulación: ${err.message}`));
    }
  }
}
