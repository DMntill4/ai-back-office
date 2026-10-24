import * as readline from "readline";
import { getPendingDecisionsApi, resolveDecisionApi } from "../client";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";

export async function inboxCommand(
  action?: "list" | "approve" | "reject",
  targetId?: string,
  options: { json?: boolean; interactive?: boolean; noExit?: boolean } = {},
) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  // 1. Si se solicita aprobar directamente
  if (action === "approve" && targetId) {
    try {
      const res = await resolveDecisionApi(targetId, "approve", session?.name || "CLI_OPERATOR");
      if (options.json) {
        console.log(JSON.stringify(res));
      } else {
        if (res.success) {
          console.log(`\n${theme.success("✔")} Decisión ${theme.bold(targetId)} ${theme.mintBold("APROBADA")}.`);
          console.log(`   ${res.message}`);
          console.log(`   ${theme.muted("Post-verificación en PostgreSQL confirmada.")}\n`);
        } else {
          console.error(theme.redBold(`❌ Falló la aprobación: ${res.message}`));
        }
      }
      return;
    } catch (err: any) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: err.message }));
      } else {
        console.error(theme.redBold(`❌ Error al aprobar decisión: ${err.message}`));
      }
      if (!options.noExit) {
        process.exit(1);
      }
      return;
    }
  }

  // 2. Si se solicita rechazar directamente
  if (action === "reject" && targetId) {
    try {
      const res = await resolveDecisionApi(targetId, "reject", session?.name || "CLI_OPERATOR");
      if (options.json) {
        console.log(JSON.stringify(res));
      } else {
        console.log(`\n${theme.warning("⚠")} Decisión ${theme.bold(targetId)} ${theme.amberBold("RECHAZADA")} y archivada en bitácora.\n`);
      }
      return;
    } catch (err: any) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: err.message }));
      } else {
        console.error(theme.redBold(`❌ Error al rechazar decisión: ${err.message}`));
      }
      if (!options.noExit) {
        process.exit(1);
      }
      return;
    }
  }

  // 3. Listar decisiones pendientes (inbox list / visualización interactiva)
  try {
    const res = await getPendingDecisionsApi(companyId);
    if (!res.success) {
      throw new Error("No se pudieron cargar las decisiones pendientes");
    }

    if (options.json) {
      console.log(JSON.stringify(res.data, null, 2));
      return;
    }

    console.log("\n" + drawDivider(`BANDEJA DE DECISIONES PENDIENTES (HITL) [${companyId}]`, 86));

    if (res.data.length === 0) {
      console.log(`\n  ${theme.success("✨ No hay decisiones pendientes de supervisión humana.")}`);
      console.log(`  ${theme.muted("El agente autónomo mantiene todas las operaciones al día.")}\n`);
      return;
    }

    console.log(`\n  ${theme.bold(res.data.length)} decisión(es) esperando autorización del operador:\n`);

    for (let i = 0; i < res.data.length; i++) {
      const d = res.data[i];
      const evidence = d.evidence || {};
      const risk = d.risk || {};

      const costStr = `$${Number(d.costMxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;
      const riskPct = `${(Number(d.riskScore) * 100).toFixed(0)}%`;
      const riskBadge = theme.badge(riskPct, Number(d.riskScore) > 0.4 ? "red" : "mint");

      const cardLines = [
        `${theme.dim("ID:")}         ${theme.bold(d.id)}  ${theme.dim("│")}  ${theme.dim("Agente:")} ${theme.mintBold(d.proposingAgent)}`,
        `${theme.dim("Costo:")}      ${theme.bold(costStr)}  ${theme.dim("│")}  ${theme.dim("Riesgo:")} ${riskBadge}`,
        `${theme.dim("Gobernanza:")} ${d.policyReason}`,
        `${theme.dim("Evidencia:")}  Stock: ${evidence.currentStock ?? "0"}u │ Déficit: ${evidence.deficit ?? "N/A"}u │ Prov: ${evidence.supplierName ?? "N/A"}`,
      ];

      if (risk.redFlags && risk.redFlags.length > 0) {
        cardLines.push(`${theme.danger("Banderas:")}   ${risk.redFlags.join("; ")}`);
      }

      cardLines.push(
        `${theme.dim("Acciones:")}   ${theme.mintBold(`mint inbox approve ${d.id}`)}  ${theme.dim("│")}  ${theme.amberBold(`mint inbox reject ${d.id}`)}  ${theme.dim("│")}  ${theme.cyanBold(`mint explain ${d.id}`)}`,
      );

      console.log(
        drawCard(cardLines, {
          title: `[#${i + 1}] ${d.title}`,
          badge: "PENDIENTE",
          badgeColor: "amber",
          borderColor: theme.amber,
        }),
      );
      console.log("");
    }
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`❌ Error al consultar inbox: ${err.message}`));
    }
    if (!options.noExit) {
      process.exit(1);
    }
  }
}
