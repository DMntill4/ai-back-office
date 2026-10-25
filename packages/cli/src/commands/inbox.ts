import { db, decisions, executeAndVerifyDecision } from "@mint/core";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { renderTable } from "../ui/table";

export async function inboxCommand(
  action?: string,
  targetId?: string,
  options: { json?: boolean; interactive?: boolean; noExit?: boolean } = {},
) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  // Helper para resolver id por número ordinal (#1, 1, 2) o id directo
  const resolveTargetId = async (input?: string): Promise<string | undefined> => {
    if (!input) return undefined;
    if (input.startsWith("dec_")) return input;
    const num = parseInt(input.replace("#", ""), 10);
    if (!isNaN(num) && num > 0) {
      const list = await db
        .select({ id: decisions.id })
        .from(decisions)
        .where(and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "pending_approval")))
        .orderBy(desc(decisions.createdAt));
      if (num <= list.length) {
        return list[num - 1].id;
      }
    }
    return input;
  };

  // 1. Aprobar directamente
  if (action === "approve") {
    const finalId = await resolveTargetId(targetId);
    if (!finalId) {
      console.log(`\n  ${theme.amberBold("[AVISO]")} ${theme.smoke("Especifica el ID de la propuesta a aprobar. Ej: /approve dec_12345 o /approve 1")}\n`);
      return;
    }
    try {
      const res = await executeAndVerifyDecision(finalId, session?.name || "CLI_OPERATOR");
      if (options.json) {
        console.log(JSON.stringify(res));
      } else {
        if (res.success) {
          console.log(`\n  ${theme.mintBold("[OK] DECISIÓN APROBADA Y EJECUTADA EN PRODUCCIÓN")}`);
          if (res.diff) {
            console.log("");
            console.log(`  ${theme.charcoal("┌─")} ${theme.bold("DIFF DE IMPACTO EN BASE DE DATOS")}`);
            console.log(`  ${theme.charcoal("│")}  ${theme.dim("Entidad:")}         ${theme.smokeBold(res.diff.entity)}`);
            console.log(`  ${theme.charcoal("│")}  ${theme.redBold("[-] ANTERIOR:")}      ${theme.dim(res.diff.previousState)}`);
            console.log(`  ${theme.charcoal("│")}  ${theme.mintBold("[+] NUEVO:")}         ${theme.smoke(res.diff.newState)}`);
            console.log(`  ${theme.charcoal("│")}  ${theme.dim("Tablas mutadas:")}  ${theme.cyan(res.diff.tablesAffected.join(", "))}`);
            console.log(`  ${theme.charcoal("└─" + "─".repeat(50))}\n`);
          }
          if (res.voucher) {
            const { renderInvoiceVoucher } = require("../ui/voucher");
            console.log(renderInvoiceVoucher(res.voucher) + "\n");
            if (res.voucher.receiptPath) {
              console.log(`  ${theme.dim("Comprobante formal emitido:")} ${theme.cyan(res.voucher.receiptPath)}\n`);
            }
          } else {
            console.log(`  ${res.message}\n`);
          }
        } else {
          console.error(theme.redBold(`  [ERROR] Falló la aprobación: ${res.message}`));
        }
      }
      return;
    } catch (err: any) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: err.message }));
      } else {
        console.error(theme.redBold(`  [ERROR] ${err.message}`));
      }
      if (!options.noExit) {
        process.exit(1);
      }
      return;
    }
  }

  // 2. Rechazar directamente
  if (action === "reject") {
    const finalId = await resolveTargetId(targetId);
    if (!finalId) {
      console.log(`\n  ${theme.amberBold("[AVISO]")} ${theme.smoke("Especifica el ID de la propuesta a rechazar. Ej: /reject dec_12345 o /reject 1")}\n`);
      return;
    }
    try {
      await db
        .update(decisions)
        .set({ policyDecision: "rejected", decidedAt: new Date() })
        .where(eq(decisions.id, finalId));

      if (options.json) {
        console.log(JSON.stringify({ success: true, message: `Decisión ${finalId} rechazada.` }));
      } else {
        console.log(`\n  [OK] Decisión ${theme.bold(finalId)} ${theme.amberBold("RECHAZADA")} y archivada.\n`);
      }
      return;
    } catch (err: any) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: err.message }));
      } else {
        console.error(theme.redBold(`  [ERROR] ${err.message}`));
      }
      if (!options.noExit) {
        process.exit(1);
      }
      return;
    }
  }

  // 3. Ver detalle de una propuesta puntual (/inbox <id> o /inbox show <id> o /inbox 1)
  const isSpecificId =
    action &&
    action !== "list" &&
    action !== "all" &&
    (action.startsWith("dec_") || /^\d+$/.test(action) || action === "show" || action === "view");

  if (isSpecificId) {
    const queryId = (action === "show" || action === "view") ? targetId : action;
    const finalId = await resolveTargetId(queryId);

    if (finalId) {
      const found = await db
        .select()
        .from(decisions)
        .where(eq(decisions.id, finalId))
        .limit(1);

      if (found.length > 0) {
        const d = found[0];
        const evidence = (d.evidencePayload as any) || {};
        const risk = (d.riskPayload as any) || {};
        const costStr = `$${Number(d.costMxn).toLocaleString("es-CO", { minimumFractionDigits: 0 })} COP`;
        const riskPct = `${(Number(d.riskScore) * 100).toFixed(0)}%`;
        const riskBadge = theme.badge(riskPct, Number(d.riskScore) > 0.4 ? "red" : "mint");

        const cardLines = [
          `${theme.dim("ID:")}         ${theme.bold(d.id)}  ${theme.dim("│")}  ${theme.dim("Agente:")} ${theme.mintBold(d.proposingAgent)}`,
          `${theme.dim("Costo:")}      ${theme.bold(costStr)}  ${theme.dim("│")}  ${theme.dim("Riesgo:")} ${riskBadge}`,
          `${theme.dim("Gobernanza:")} ${d.policyReason || "Propuesta de compra por stock de seguridad"}`,
          `${theme.dim("Evidencia:")}  Stock: ${evidence.currentStock ?? "0"}u │ Déficit: ${evidence.deficit ?? "N/A"}u │ Prov: ${evidence.supplierName ?? "N/A"}`,
        ];

        if (risk.redFlags && risk.redFlags.length > 0) {
          cardLines.push(`${theme.danger("Banderas:")}   ${risk.redFlags.join("; ")}`);
        }

        cardLines.push(
          `${theme.dim("Acción:")}     ${theme.mintBold(`/approve ${d.id}`)}   ${theme.dim("o")}   ${theme.amberBold(`/reject ${d.id}`)}`,
        );

        console.log("\n" + drawDivider(`DETALLE DE PROPUESTA [${d.id}]`, 76));
        console.log(
          drawCard(cardLines, {
            title: d.title,
            badge: d.policyDecision.toUpperCase(),
            badgeColor: d.policyDecision === "pending_approval" ? "amber" : "mint",
            borderColor: theme.amber,
            width: 76,
          }),
        );
        console.log("");
        return;
      }
    }
  }

  // 4. Listar decisiones pendientes (Human-in-the-Loop) en formato tabla compacta
  try {
    const pending = await db
      .select()
      .from(decisions)
      .where(and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "pending_approval")))
      .orderBy(desc(decisions.createdAt));

    if (options.json) {
      console.log(JSON.stringify(pending, null, 2));
      return;
    }

    if (pending.length === 0) {
      console.log(`\n  ${theme.mintBold("[OK]")} ${theme.smoke("No hay propuestas pendientes de supervisión humana en la bandeja.")}\n`);
      return;
    }

    const showAll = action === "all";
    const limit = showAll ? pending.length : 5;
    const displayed = pending.slice(0, limit);

    console.log("\n" + drawDivider(`BANDEJA DE DECISIONES PENDIENTES (HITL)`, 76));

    const rows = displayed.map((d, idx) => {
      const costNum = Number(d.costMxn || 0);
      const costStr = `$${costNum.toLocaleString("es-CO", { minimumFractionDigits: 0 })} COP`;
      const riskNum = Number(d.riskScore || 0);
      const riskPct = `${(riskNum * 100).toFixed(0)}%`;
      const riskDisplay = riskNum > 0.4 ? theme.redBold(`▲ ${riskPct}`) : theme.mint(`● ${riskPct}`);

      let cleanTitle = d.title.replace(/^Reabastecimiento preventivo:\s*/i, "").trim();
      if (cleanTitle.length > 26) {
        cleanTitle = cleanTitle.slice(0, 23) + "...";
      }

      return {
        idx: String(idx + 1),
        id: theme.bold(d.id),
        title: cleanTitle,
        cost: theme.smokeBold(costStr),
        risk: riskDisplay,
      };
    });

    console.log(
      renderTable(
        [
          { header: "#", key: "idx", width: 2, align: "center" },
          { header: "ID DECISIÓN", key: "id", width: 13, align: "left" },
          { header: "PROPUESTA", key: "title", width: 24, align: "left" },
          { header: "MONTO (COP)", key: "cost", width: 15, align: "right" },
          { header: "RIESGO", key: "risk", width: 7, align: "center" },
        ],
        rows,
      ),
    );

    if (pending.length > limit) {
      console.log(
        `\n  ${theme.dim("Mostrando")} ${theme.bold(String(displayed.length))} ${theme.dim("de")} ${theme.bold(String(pending.length))} ${theme.dim("propuestas pendientes.")}`
      );
      console.log(
        `  ${theme.cyan("▸")} ${theme.dim("Ver todas:")} ${theme.mintBold("/inbox all")}  │  ${theme.dim("Detalle:")} ${theme.mintBold("/inbox <id>")}  │  ${theme.dim("Aprobar:")} ${theme.mintBold("/approve <id>")}\n`
      );
    } else {
      console.log(
        `\n  ${theme.dim("Total:")} ${theme.bold(String(pending.length))} ${theme.dim("propuestas pendientes.")}`
      );
      console.log(
        `  ${theme.cyan("▸")} ${theme.dim("Ver detalle:")} ${theme.mintBold("/inbox <id>")}  │  ${theme.dim("Aprobar:")} ${theme.mintBold("/approve <id>")}  │  ${theme.dim("Rechazar:")} ${theme.amberBold("/reject <id>")}\n`
      );
    }
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`  [ERROR] Error al consultar inbox: ${err.message}`));
    }
    if (!options.noExit) {
      process.exit(1);
    }
  }
}
