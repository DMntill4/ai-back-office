import { db, decisions, cases, caseEvents } from "@mint/core";
import { eq, desc } from "drizzle-orm";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { getSession } from "../keychain";

export async function explainCommand(
  decisionId?: string,
  options: { json?: boolean; noExit?: boolean } = {},
) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  if (!decisionId) {
    if (options.json) {
      console.log(JSON.stringify({ error: "Debes especificar el ID de la decisión." }));
    } else {
      console.log(`\n  ${theme.amberBold("[AVISO]")} ${theme.smoke("Debes especificar el ID de la propuesta. Ejemplo: /explain dec_12345 o /explain 1")}\n`);
    }
    if (!options.noExit) process.exit(1);
    return;
  }

  try {
    let finalId = decisionId;
    const num = parseInt(decisionId.replace("#", ""), 10);
    if (!isNaN(num) && num > 0) {
      const list = await db
        .select({ id: decisions.id })
        .from(decisions)
        .where(eq(decisions.companyId, companyId))
        .orderBy(desc(decisions.createdAt));
      if (num <= list.length) {
        finalId = list[num - 1].id;
      }
    }

    const foundDecisions = await db
      .select()
      .from(decisions)
      .where(eq(decisions.id, finalId))
      .limit(1);

    if (foundDecisions.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({ error: `Decisión ${decisionId} no encontrada.` }));
      } else {
        console.log(`\n  ${theme.redBold("[ERROR]")} ${theme.smoke(`No se encontró la propuesta '${decisionId}' en la empresa ${companyId}.`)}\n`);
      }
      if (!options.noExit) process.exit(1);
      return;
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

    const costStr = `$${Number(d.costMxn).toLocaleString("es-CO", { minimumFractionDigits: 0 })} COP`;
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
          width: 76,
        },
      ),
    );

    console.log("\n" + drawDivider("DELIBERACIÓN MULTI-AGENTE Y EVIDENCIA", 76));

    const evidence = (d.evidencePayload as any) || {};
    const risk = (d.riskPayload as any) || {};

    console.log(`\n  ${theme.mintBold("1. Agente Especialista Proponente (" + d.proposingAgent + "):")}`);
    console.log(`     ${theme.dim("Motivo:")}    ${d.title}`);
    console.log(
      `     ${theme.dim("Métricas:")}  Stock Actual: ${evidence.currentStock ?? "N/A"}u ` +
        `│ Déficit: ${evidence.deficit ?? "N/A"}u ` +
        `│ Proveedor: ${evidence.supplierName ?? "N/A"} ` +
        `│ Costo Unitario: $${Number(evidence.unitCostMxn || 0).toLocaleString("es-CO", { minimumFractionDigits: 0 })} COP`,
    );

    console.log(`\n  ${theme.cyanBold("2. Agente de Riesgo y Auditoría (Adversarial):")}`);
    console.log(`     ${theme.dim("Confianza:")} ${((1 - Number(d.riskScore)) * 100).toFixed(0)}% `);
    if (risk.redFlags && risk.redFlags.length > 0) {
      console.log(`     ${theme.danger("Banderas Rojas Detectadas:")}`);
      for (const flag of risk.redFlags) {
        console.log(`     ${theme.redBold("•")} ${flag}`);
      }
    } else {
      console.log(`     ${theme.success("[OK]")} Sin objeciones de seguridad ni duplicidad detectadas.`);
    }

    console.log("\n" + drawDivider("MOTOR DE POLÍTICAS DETERMINISTA", 76));
    console.log(`\n  ${theme.amberBold("3. Regla de Gobernanza Aplicada:")}`);
    console.log(`     ${theme.dim("Decisión:")} ${theme.bold(d.policyDecision.toUpperCase())}`);
    console.log(`     ${theme.dim("Razón:")}    ${d.policyReason || "Evaluado según políticas activas."}`);

    if (d.approvedBy) {
      console.log(`     ${theme.success("Aprobador:")} ${theme.bold(d.approvedBy)}`);
    }
    if (d.executedAt) {
      console.log(
        `     ${theme.success("Ejecutado:")} ${new Date(d.executedAt).toLocaleString("es-CO")}`,
      );
    }
    if (d.verifiedAt) {
      console.log(
        `     ${theme.success("[OK] Post-Verificación en PostgreSQL confirmada:")} ${new Date(d.verifiedAt).toLocaleString("es-CO")}`,
      );
    }

    if (events.length > 0) {
      console.log("\n" + drawDivider("TRAZA CRIPTOGRÁFICA INMUTABLE (case_events)", 76));
      console.log("");
      for (const ev of events) {
        const time = new Date(ev.createdAt).toLocaleTimeString("es-CO");
        const payloadDesc = (ev.payload as any)?.description || (ev.payload as any)?.motivo || (ev.payload as any)?.message || JSON.stringify(ev.payload);
        console.log(
          `  ${theme.dim(`[${time}]`)} ${theme.bold(ev.eventType.padEnd(18))} ` +
            `${theme.dim(payloadDesc)}`,
        );
      }
    }
    console.log("");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`  [ERROR] Error al explicar decisión: ${err.message}`));
    }
    if (!options.noExit) {
      process.exit(1);
    }
  }
}
