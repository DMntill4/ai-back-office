import { db, decisions, cases, caseEvents } from "@mint/core";
import { eq, desc } from "drizzle-orm";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { getSession } from "../keychain";

export async function explainCommand(decisionId: string, options: { json?: boolean } = {}) {
  if (!decisionId) {
    console.error(theme.redBold("❌ Debes especificar el ID de la decisión. Ejemplo: mint explain dec_12345"));
    process.exit(1);
  }

  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const foundDecisions = await db
      .select()
      .from(decisions)
      .where(eq(decisions.id, decisionId))
      .limit(1);

    if (foundDecisions.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({ error: `Decisión ${decisionId} no encontrada.` }));
      } else {
        console.error(theme.redBold(`❌ No se encontró la decisión '${decisionId}' en la empresa ${companyId}.`));
      }
      process.exit(1);
    }

    const d = foundDecisions[0];

    // Cargar caso asociado
    const foundCases = await db.select().from(cases).where(eq(cases.id, d.caseId)).limit(1);
    const c = foundCases[0];

    // Cargar eventos del caso
    const events = await db
      .select()
      .from(caseEvents)
      .where(eq(caseEvents.caseId, d.caseId))
      .orderBy(desc(caseEvents.createdAt))
      .limit(5);

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            decision: d,
            case: c,
            events,
          },
          null,
          2,
        ),
      );
      return;
    }

    const badgeColor =
      d.policyDecision === "auto_executed" || d.policyDecision === "approved"
        ? "mint"
        : d.policyDecision === "pending_approval"
          ? "amber"
          : "red";

    const costStr = `$${Number(d.costMxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;
    const riskPct = `${(Number(d.riskScore) * 100).toFixed(0)}%`;

    console.log("");
    console.log(
      drawCard(
        [
          `${theme.dim("ID:")}         ${theme.bold(d.id)}  ${theme.dim("│")}  ${theme.dim("Caso:")} ${d.caseId}`,
          `${theme.dim("Acción:")}     ${theme.cyanBold(d.actionType)}`,
          `${theme.dim("Agente:")}     ${theme.mintBold(d.proposingAgent)}`,
          `${theme.dim("Costo:")}      ${theme.bold(costStr)}  ${theme.dim("│")}  ${theme.dim("Reversible:")} ${d.reversible ? theme.success("SÍ") : theme.warning("NO")}`,
          `${theme.dim("Riesgo:")}     ${theme.badge(riskPct, Number(d.riskScore) > 0.4 ? "red" : "mint")}`,
          `${theme.dim("Gobernanza:")} ${d.policyDecision.toUpperCase()}`,
        ],
        {
          title: `DECISIÓN AUTÓNOMA: ${d.title}`,
          badge: d.policyDecision.toUpperCase(),
          badgeColor,
        },
      ),
    );

    console.log("\n" + drawDivider("DELIBERACIÓN MULTI-AGENTE Y EVIDENCIA"));

    const evidence = (d.evidencePayload as any) || {};
    const risk = (d.riskPayload as any) || {};

    console.log(`\n${theme.mintBold("1. Agente Especialista Proponente (" + d.proposingAgent + "):")}`);
    console.log(`   ${theme.muted("Motivo:")}    ${d.title}`);
    console.log(
      `   ${theme.muted("Métricas:")}  Stock Actual: ${evidence.currentStock ?? "N/A"}u ` +
        `│ Déficit: ${evidence.deficit ?? "N/A"}u ` +
        `│ Proveedor: ${evidence.supplierName ?? "N/A"} ` +
        `│ Costo Unitario: $${evidence.unitCostMxn ?? "N/A"} MXN`,
    );

    console.log(`\n${theme.cyanBold("2. Agente de Riesgo y Auditoría (Adversarial):")}`);
    console.log(`   ${theme.muted("Confianza:")} ${((1 - Number(d.riskScore)) * 100).toFixed(0)}% `);
    if (risk.redFlags && risk.redFlags.length > 0) {
      console.log(`   ${theme.danger("Banderas Rojas Detectadas:")}`);
      for (const flag of risk.redFlags) {
        console.log(`   ${theme.redBold("•")} ${flag}`);
      }
    } else {
      console.log(`   ${theme.success("✔")} Sin objeciones de seguridad ni duplicidad detectadas.`);
    }

    console.log("\n" + drawDivider("MOTOR DE POLÍTICAS DETERMINISTA"));
    console.log(`\n${theme.amberBold("3. Regla de Gobernanza Aplicada:")}`);
    console.log(`   ${theme.muted("Decisión:")} ${theme.bold(d.policyDecision.toUpperCase())}`);
    console.log(`   ${theme.muted("Razón:")}    ${d.policyReason || "Evaluado según políticas activas."}`);

    if (d.approvedBy) {
      console.log(`   ${theme.success("Aprobador:")} ${theme.bold(d.approvedBy)}`);
    }
    if (d.executedAt) {
      console.log(
        `   ${theme.success("Ejecutado:")} ${new Date(d.executedAt).toLocaleString("es-MX")}`,
      );
    }
    if (d.verifiedAt) {
      console.log(
        `   ${theme.success("✔ Post-Verificación en PostgreSQL confirmada:")} ${new Date(d.verifiedAt).toLocaleString("es-MX")}`,
      );
    }

    if (events.length > 0) {
      console.log("\n" + drawDivider("TRAZA CRIPTOGRÁFICA INMUTABLE (case_events)"));
      console.log("");
      for (const ev of events) {
        const time = new Date(ev.createdAt).toLocaleTimeString("es-MX");
        const payloadDesc = (ev.payload as any)?.description || (ev.payload as any)?.motivo || (ev.payload as any)?.message || JSON.stringify(ev.payload);
        console.log(
          `  ${theme.dim(`[${time}]`)} ${theme.bold(ev.eventType.padEnd(18))} ` +
            `${theme.muted(payloadDesc)}`,
        );
      }
    }
    console.log("");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`❌ Error al explicar decisión: ${err.message}`));
    }
    process.exit(1);
  }
}
