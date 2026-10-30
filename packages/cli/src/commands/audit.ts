import { db, operationalEvents, decisions, cases } from "@mint/core";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawDivider } from "../ui/box";

export interface AuditCommandOptions {
  limit?: number;
  json?: boolean;
  user?: string;
  date?: string;
  module?: string;
}

export async function auditCommand(options: AuditCommandOptions = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";
  const limit = options.limit || 50;

  try {
    const rawEvents = await db
      .select()
      .from(operationalEvents)
      .where(eq(operationalEvents.companyId, companyId))
      .orderBy(desc(operationalEvents.createdAt))
      .limit(limit * 2);

    const rawDecisions = await db
      .select()
      .from(decisions)
      .where(eq(decisions.companyId, companyId))
      .orderBy(desc(decisions.createdAt))
      .limit(limit * 2);

    // Unificar y normalizar eventos y decisiones
    let unified = [
      ...rawEvents.map((ev) => {
        const payload = (ev.payload as any) || {};
        const actor = payload.userId || payload.operator || payload.actor || payload.source || "MINT";
        return {
          id: ev.id,
          type: "EVENT",
          category: ev.eventType,
          actor: String(actor),
          description: ev.description || ev.title,
          severity: ev.severity,
          createdAt: ev.createdAt ? new Date(ev.createdAt) : new Date(),
          details: payload,
        };
      }),
      ...rawDecisions.map((dec) => {
        return {
          id: dec.id,
          type: "DECISION",
          category: dec.actionType,
          actor: dec.approvedBy || dec.requesterUserId || dec.proposingAgent,
          description: `${dec.title} [Estado: ${dec.policyDecision}]`,
          severity: dec.riskScore && parseFloat(dec.riskScore.toString()) > 0.5 ? "HIGH" : "MEDIUM",
          createdAt: dec.createdAt ? new Date(dec.createdAt) : new Date(),
          details: dec.evidencePayload,
        };
      }),
    ];

    // Filtro por usuario (E4.3)
    if (options.user) {
      const u = options.user.toLowerCase().trim();
      unified = unified.filter(
        (item) =>
          item.actor.toLowerCase().includes(u) ||
          item.description.toLowerCase().includes(u) ||
          JSON.stringify(item.details).toLowerCase().includes(u),
      );
    }

    // Filtro por fecha (E4.3, formato YYYY-MM-DD)
    if (options.date) {
      const targetDate = options.date.trim();
      unified = unified.filter((item) => {
        const itemIso = item.createdAt.toISOString().slice(0, 10);
        return itemIso === targetDate;
      });
    }

    // Filtro por módulo (E4.3, stock, ventas, logistica, compras, config, etc.)
    if (options.module) {
      const m = options.module.toLowerCase().trim();
      unified = unified.filter((item) => {
        const cat = item.category.toLowerCase();
        const desc = item.description.toLowerCase();
        if (m === "stock" || m === "inventario") return cat.includes("stock") || cat.includes("inv") || desc.includes("stock");
        if (m === "ventas" || m === "sales") return cat.includes("sale") || cat.includes("order") || cat.includes("venta");
        if (m === "logistica" || m === "envios" || m === "fleet") return cat.includes("ship") || cat.includes("route") || cat.includes("envio");
        if (m === "compras" || m === "proveedores") return cat.includes("compra") || cat.includes("supplier") || cat.includes("purchase");
        if (m === "config" || m === "umbrales") return cat.includes("config") || cat.includes("threshold");
        return cat.includes(m) || desc.includes(m);
      });
    }

    // Ordenar cronológicamente descendente y cortar al límite
    unified.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const results = unified.slice(0, limit);

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    console.log("\n" + drawDivider(`CANAL DE AUDITORÍA AUTÓNOMA // LOGS INMUTABLES [${companyId}]`, 88));
    const activeFilters: string[] = [];
    if (options.user) activeFilters.push(`Usuario: '${options.user}'`);
    if (options.date) activeFilters.push(`Fecha: '${options.date}'`);
    if (options.module) activeFilters.push(`Módulo: '${options.module}'`);

    if (activeFilters.length > 0) {
      console.log(`  ${theme.cyanBold("[FILTROS ACTIVOS]")} ${activeFilters.join(" │ ")}\n`);
    } else {
      console.log(`  ${theme.dim("Filtros disponibles: --user <usuario> --date <YYYY-MM-DD> --module <stock|ventas|logistica|compras|config>")}\n`);
    }

    if (results.length === 0) {
      console.log(`  ${theme.amberBold("[SIN RESULTADOS]")} No se encontraron eventos de auditoría con los criterios especificados.`);
      console.log(`  ${theme.dim("Ejecuta '/audit' sin filtros para ver el registro completo de actividades.\n")}`);
      return;
    }

    // Mostrar de más antiguo a más reciente para lectura cronológica
    const chronological = [...results].reverse();

    for (const ev of chronological) {
      const dateStr = ev.createdAt.toISOString().slice(0, 10);
      const timeStr = ev.createdAt.toLocaleTimeString("es-MX", { hour12: false });
      let phase: "OBSERVE" | "DECIDE" | "EXECUTE" | "VERIFY" = "OBSERVE";

      if (ev.category.includes("DECIDE") || ev.category.includes("PRICE_ANOMALY") || ev.type === "DECISION") {
        phase = "DECIDE";
      } else if (ev.category.includes("EXECUTE") || ev.category.includes("ORDER_CREATED") || ev.category.includes("CONFIG_CHANGE")) {
        phase = "EXECUTE";
      } else if (ev.category.includes("VERIFY") || ev.category.includes("STOCK_VERIFIED")) {
        phase = "VERIFY";
      } else {
        phase = "OBSERVE";
      }

      const detail = `${theme.dim(`${dateStr} ${timeStr}`)} [${theme.bold(ev.actor)}] ${ev.description}`;
      console.log(`  ${theme.audit(phase, detail)}`);
    }

    console.log(`\n  ${theme.dim(`Mostrando ${results.length} de ${unified.length} registro(s) auditados.`)}\n`);
  } catch (err: any) {
    console.error(theme.redBold(`\n[ERROR] Error al consultar bitácora de auditoría: ${err.message}\n`));
  }
}
