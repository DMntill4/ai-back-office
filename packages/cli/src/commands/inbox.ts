import { db, decisions, companies, executeAndVerifyDecision, hasPermission } from "@mint/core";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider, drawTable } from "../ui/box";

const DEFAULT_LIST_LIMIT = 15;

function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const mins = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 48) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, Math.max(0, max - 1)) + "…";
}

function money(value: number | string, currency: string): string {
  return `${currency} ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

async function getCompanyCurrency(companyId: string): Promise<string> {
  try {
    const [row] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    return ((row as any)?.currency as string) || "USD";
  } catch {
    return "USD";
  }
}

type PendingRow = typeof decisions.$inferSelect;

/** Agrupa por producto: deja la propuesta más reciente y cuenta las repetidas. */
function groupByProduct(rows: PendingRow[]) {
  const groups = new Map<string, { latest: PendingRow; duplicates: PendingRow[] }>();
  for (const d of rows) {
    const key = String((d.evidencePayload as any)?.productId ?? d.id);
    const g = groups.get(key);
    if (!g) {
      groups.set(key, { latest: d, duplicates: [] });
    } else if (new Date(d.createdAt) > new Date(g.latest.createdAt)) {
      g.duplicates.push(g.latest);
      g.latest = d;
    } else {
      g.duplicates.push(d);
    }
  }
  return [...groups.values()].sort((a, b) => new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime());
}

async function fetchPending(companyId: string): Promise<PendingRow[]> {
  return db
    .select()
    .from(decisions)
    .where(and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "pending_approval")))
    .orderBy(desc(decisions.createdAt));
}

async function showDetail(id: string, companyId: string) {
  const [d] = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, id), eq(decisions.companyId, companyId)))
    .limit(1);
  if (!d) {
    console.log(theme.amber(`\n  No existe la propuesta '${id}' en esta empresa.\n`));
    return;
  }
  const currency = await getCompanyCurrency(companyId);
  const evidence = (d.evidencePayload as any) || {};
  const risk = (d.riskPayload as any) || {};
  const lines = [
    `${theme.dim("ID:")}          ${theme.bold(d.id)}   ${theme.dim("Estado:")} ${d.policyDecision}`,
    `${theme.dim("Agente:")}      ${theme.mintBold(d.proposingAgent)}   ${theme.dim("Creada:")} hace ${timeAgo(d.createdAt)}`,
    `${theme.dim("Costo:")}       ${theme.bold(money(d.costMxn, currency))}   ${theme.dim("Riesgo:")} ${(Number(d.riskScore) * 100).toFixed(0)}%`,
    `${theme.dim("Producto:")}    ${evidence.productName ?? "sin dato"} (${evidence.sku ?? "sin SKU"})`,
    `${theme.dim("Stock:")}       ${evidence.currentStock ?? "sin dato"}u  ${theme.dim("M\u00ednimo:")} ${evidence.minStock ?? "sin dato"}u  ${theme.dim("D\u00e9ficit:")} ${evidence.deficit ?? "sin dato"}u`,
    `${theme.dim("Proveedor:")}   ${evidence.supplierName ?? "sin dato"}  ${theme.dim("Entrega:")} ${evidence.leadTimeDays ?? "sin dato"} d\u00edas`,
    `${theme.dim("Motivo:")}      ${d.policyReason ?? "sin dato"}`,
  ];
  if (risk.redFlags && risk.redFlags.length > 0) {
    lines.push(`${theme.danger("Banderas:")}    ${risk.redFlags.join("; ")}`);
  }
  console.log("");
  console.log(drawCard(lines, { title: d.title, borderColor: theme.mint }));
  console.log(`\n  ${theme.mintBold(`/approve ${d.id}`)}  ${theme.dim("\u2502")}  ${theme.amberBold(`/reject ${d.id}`)}  ${theme.dim("\u2502")}  ${theme.cyanBold(`/explain ${d.id}`)}\n`);
}

async function cleanDuplicates(companyId: string, json?: boolean) {
  const pending = await fetchPending(companyId);
  const groups = groupByProduct(pending);
  const toClose: { id: string; keptId: string }[] = [];
  for (const g of groups) {
    for (const dup of g.duplicates) toClose.push({ id: dup.id, keptId: g.latest.id });
  }

  if (toClose.length === 0) {
    if (json) console.log(JSON.stringify({ success: true, archived: 0 }));
    else console.log(`\n  ${theme.mint("[OK] No hay propuestas duplicadas.")}\n`);
    return;
  }

  // Se archivan como rechazadas con motivo; no se borra nada y queda trazabilidad.
  const BATCH = 500;
  for (let i = 0; i < toClose.length; i += BATCH) {
    const slice = toClose.slice(i, i + BATCH);
    await db
      .update(decisions)
      .set({
        policyDecision: "rejected",
        decidedAt: new Date(),
        approvedBy: "SISTEMA_DEDUPLICACION",
        feedback: "Duplicada: reemplazada por una propuesta m\u00e1s reciente del mismo producto.",
      })
      .where(
        and(
          eq(decisions.companyId, companyId),
          inArray(
            decisions.id,
            slice.map((s) => s.id),
          ),
        ),
      );
  }

  if (json) {
    console.log(JSON.stringify({ success: true, archived: toClose.length, remaining: groups.length }));
  } else {
    console.log(
      `\n  ${theme.mintBold("[OK]")} ${toClose.length} propuesta(s) duplicada(s) archivadas. Quedan ${theme.bold(groups.length)} propuesta(s) \u00fanicas.\n`,
    );
  }
}

export async function inboxCommand(
  action?: string,
  targetId?: string,
  options: { json?: boolean; interactive?: boolean; noExit?: boolean } = {},
) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  // 1. Aprobar directamente
  if (action === "approve" && targetId) {
    if (!hasPermission(session?.role, "approve")) {
      console.log(`\n  ${theme.redBold("[ACCESO DENEGADO]")} Tu rol '${session?.role}' no tiene permisos para autorizar compras. Se requiere rol 'owner', 'admin' o 'auditor'.\n`);
      return;
    }

    try {
      const approverUserId = (session as any)?.userId || session?.email || session?.name || "CLI_OPERATOR";
      const approverRole = session?.role || "operator";
      const res = await executeAndVerifyDecision(
        targetId,
        session?.name || "CLI_OPERATOR",
        undefined,
        approverUserId,
        approverRole,
      );
      if (options.json) {
        console.log(JSON.stringify(res));
      } else {
        if (res.success) {
          const orderMsg = res.orderId ? `Orden de compra: ${res.orderId}` : "";
          const trkMsg = res.trackingNumber ? `Guía de embarque: ${res.trackingNumber}` : "";
          const details = [orderMsg, trkMsg].filter(Boolean).join(" | ");

          console.log(`\n  ${theme.mintBold("[OK]")} Propuesta ${theme.bold(targetId)} ${theme.mintBold("APROBADA Y EJECUTADA")}.`);
          if (details) console.log(`  ${theme.mint(details)}`);

          if (res.notifiedPersonnel && res.notifiedPersonnel.length > 0) {
            const people = res.notifiedPersonnel.map((p) => `${p.name} <${p.email}> [${p.role.toUpperCase()}]`).join(", ");
            console.log(`  ${theme.cyanBold("Personal de Pagos/Tesorería asignado:")} ${people}`);
          }

          if (res.notifiedChannels && res.notifiedChannels > 0) {
            console.log(`  ${theme.dim(`Ficha de Dispersión de Pago enviada a ${res.notifiedChannels} canal(es) de mensajería (HTTP 200).\n`)}`);
          } else {
            console.log(`  ${theme.dim("Orden persistida en purchase_orders y guía en shipments. (Configura un canal con '/channels add' para enviar fichas de pago remotas).\n")}`);
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

  // 1.1 Cancelar acción pendiente (Tarea 5)
  if ((action === "cancel" || action === "cancelar") && targetId) {
    try {
      await db
        .update(decisions)
        .set({
          policyDecision: "rejected",
          decidedAt: new Date(),
          approvedBy: session?.name || "CLI_OPERATOR",
          feedback: `Cancelada antes de ejecución por ${session?.name || "operador"}.`,
        })
        .where(and(eq(decisions.id, targetId), eq(decisions.companyId, companyId)));

      if (options.json) {
        console.log(JSON.stringify({ success: true, message: `Decisión ${targetId} cancelada exitosamente.` }));
      } else {
        console.log(`\n  ${theme.mintBold("[OK]")} Decisión ${theme.bold(targetId)} ${theme.amberBold("CANCELADA")} antes de ejecutarse.\n`);
      }
      return;
    } catch (err: any) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: err.message }));
      } else {
        console.error(theme.redBold(`  [ERROR] ${err.message}`));
      }
      return;
    }
  }

  // 1.2 Posponer / Snooze
  if ((action === "snooze" || action === "posponer") && targetId) {
    try {
      const hours = 24;
      const newExpiresAt = new Date(Date.now() + hours * 3600 * 1000);
      await db
        .update(decisions)
        .set({
          expiresAt: newExpiresAt,
          feedback: `Pospuesta por ${hours}h por ${session?.name || "usuario"}.`,
        })
        .where(and(eq(decisions.id, targetId), eq(decisions.companyId, companyId)));

      if (options.json) {
        console.log(JSON.stringify({ success: true, message: `Decisión ${targetId} pospuesta 24h.` }));
      } else {
        console.log(`\n  ${theme.mintBold("[OK]")} Decisión ${theme.bold(targetId)} ${theme.cyanBold("POSPUESTA")} por 24 horas.\n`);
      }
      return;
    } catch (err: any) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: err.message }));
      } else {
        console.error(theme.redBold(`  [ERROR] ${err.message}`));
      }
      return;
    }
  }

  // 2. Rechazar directamente
  if (action === "reject" && targetId) {
    if (!hasPermission(session?.role, "approve")) {
      console.log(`\n  ${theme.redBold("[ACCESO DENEGADO]")} Tu rol '${session?.role}' no tiene permisos para rechazar propuestas. Se requiere rol 'owner', 'admin' o 'auditor'.\n`);
      return;
    }

    try {
      await db
        .update(decisions)
        .set({
          policyDecision: "rejected",
          decidedAt: new Date(),
          approvedBy: session?.name || "CLI_OPERATOR",
          feedback: `Rechazada desde /inbox por ${session?.name || "operador"}.`,
        })
        .where(and(eq(decisions.id, targetId), eq(decisions.companyId, companyId)));

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

  try {
    // 3. Limpiar duplicados existentes
    if (action === "clean") {
      await cleanDuplicates(companyId, options.json);
      return;
    }

    // 4. Detalle de una propuesta
    if (action && action !== "list" && action !== "all") {
      await showDetail(action, companyId);
      return;
    }

    // 5. Lista compacta agrupada por producto
    const pending = await fetchPending(companyId);

    if (options.json) {
      console.log(JSON.stringify(pending, null, 2));
      return;
    }

    console.log("\n" + drawDivider(`BANDEJA DE APROBACIONES [${companyId}]`, 84));

    if (pending.length === 0) {
      console.log(`\n  ${theme.mint("No hay propuestas pendientes.")}\n`);
      return;
    }

    const currency = await getCompanyCurrency(companyId);
    const groups = groupByProduct(pending);
    const hiddenDuplicates = pending.length - groups.length;
    const limit = action === "all" ? groups.length : DEFAULT_LIST_LIMIT;
    const shown = groups.slice(0, limit);

    const rows = shown.map((g) => {
      const d = g.latest;
      const ev = (d.evidencePayload as any) || {};
      return [
        d.id,
        clip(String(ev.productName ?? d.title), 34),
        String(ev.quantity ?? "-"),
        money(d.costMxn, currency),
        clip(String(ev.supplierName ?? "-"), 18),
        `${(Number(d.riskScore) * 100).toFixed(0)}%`,
        timeAgo(d.createdAt),
        g.duplicates.length > 0 ? `+${g.duplicates.length}` : "",
      ];
    });

    console.log("");
    console.log(drawTable(["ID", "Producto", "Cant", "Costo", "Proveedor", "Riesgo", "Edad", "Dup"], rows, [12, 34, 5, 16, 18, 6, 5, 5]));
    console.log("");

    const summary = [`${theme.bold(groups.length)} propuesta(s) \u00fanicas`];
    if (groups.length > shown.length) summary.push(`mostrando ${shown.length} (usa ${theme.mintBold("/inbox all")} para ver todas)`);
    console.log(`  ${summary.join("  \u00b7  ")}`);
    if (hiddenDuplicates > 0) {
      console.log(
        `  ${theme.amber(`${hiddenDuplicates} duplicada(s) ocultas.`)} Arch\u00edvalas con ${theme.mintBold("/inbox clean")}.`,
      );
    }
    console.log(
      `  ${theme.dim("Detalle:")} ${theme.cyanBold("/inbox <id>")}  ${theme.dim("\u2502")}  ${theme.mintBold("/approve <id>")}  ${theme.dim("\u2502")}  ${theme.amberBold("/reject <id>")}\n`,
    );
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`  [ERROR] Fallo al consultar la bandeja: ${err.message}`));
    }
    if (!options.noExit) {
      process.exit(1);
    }
  }
}
