import { db, decisions, executeAndVerifyDecision } from "@mint/core";
import { eq, and, desc } from "drizzle-orm";
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

  // 1. Aprobar directamente
  if (action === "approve" && targetId) {
    try {
      const res = await executeAndVerifyDecision(targetId, session?.name || "CLI_OPERATOR");
      if (options.json) {
        console.log(JSON.stringify(res));
      } else {
        if (res.success) {
          console.log(`\n  ${theme.mintBold("[OK] DECISIÓN APROBADA Y EJECUTADA CON ÉXITO")}`);
          if (res.voucher) {
            const { renderInvoiceVoucher } = require("../ui/voucher");
            console.log("\n" + renderInvoiceVoucher(res.voucher) + "\n");
            if (res.voucher.receiptPath) {
              console.log(`  ${theme.dim("Comprobante digital exportado:")} ${theme.cyan(res.voucher.receiptPath)}\n`);
            }
          } else {
            console.log(`  ${res.message}\n`);
          }
        } else {
          console.error(theme.redBold(`  [ERROR] Fallo la aprobacion: ${res.message}`));
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
  if (action === "reject" && targetId) {
    try {
      await db
        .update(decisions)
        .set({ policyDecision: "rejected", decidedAt: new Date() })
        .where(eq(decisions.id, targetId));

      if (options.json) {
        console.log(JSON.stringify({ success: true, message: `Decisión ${targetId} rechazada.` }));
      } else {
        console.log(`\n  [OK] Decision ${theme.bold(targetId)} ${theme.amberBold("RECHAZADA")} y archivada.\n`);
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

  // 3. Listar decisiones pendientes (Human-in-the-Loop)
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

    console.log("\n" + drawDivider(`BANDEJA DE DECISIONES PENDIENTES (HITL) [${companyId}]`, 84));

    if (pending.length === 0) {
      console.log(`\n  ${theme.mint("[OK] No hay decisiones pendientes de supervision humana.")}\n`);
      return;
    }

    console.log(`\n  ${theme.bold(pending.length)} propuesta(s) esperando autorización del operador:\n`);

    for (let i = 0; i < pending.length; i++) {
      const d = pending[i];
      const evidence = (d.evidencePayload as any) || {};
      const risk = (d.riskPayload as any) || {};

      const costStr = `$${Number(d.costMxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;
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
        `${theme.dim("Acciones:")}   ${theme.mintBold(`/approve ${d.id}`)}  ${theme.dim("│")}  ${theme.amberBold(`/reject ${d.id}`)}  ${theme.dim("│")}  ${theme.cyanBold(`/explain ${d.id}`)}`,
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
      console.error(theme.redBold(`[ERROR] Error al consultar inbox: ${err.message}`));
    }
    if (!options.noExit) {
      process.exit(1);
    }
  }
}
