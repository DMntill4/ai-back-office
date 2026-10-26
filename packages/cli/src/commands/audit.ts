import { db, operationalEvents, decisions, cases } from "@mint/core";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawDivider } from "../ui/box";

export async function auditCommand(options: { limit?: number; json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";
  const limit = options.limit || 20;

  try {
    const events = await db
      .select()
      .from(operationalEvents)
      .where(eq(operationalEvents.companyId, companyId))
      .orderBy(desc(operationalEvents.createdAt))
      .limit(limit);

    if (options.json) {
      console.log(JSON.stringify(events, null, 2));
      return;
    }

    console.log("\n" + drawDivider(`CANAL DE AUDITORÍA AUTÓNOMA // LOGS INMUTABLES [${companyId}]`, 88));
    console.log(`  ${theme.dim("Ciclo autónomo continuo: [👁 OBSERVE] → [🧠 DECIDE] → [⚡ EXECUTE] → [🛡 VERIFY]")}\n`);

    if (events.length === 0) {
      console.log(`  ${theme.dim("Sin eventos registrados aún. El motor autónomo registra cada ciclo cada 45s.")}`);
      console.log(`  ${theme.dim("Ejecuta '/scan' o interactúa con el inventario para generar trazas de auditoría.\n")}`);
      return;
    }

    // Mostrar de más antiguo a más reciente para lectura cronológica
    const chronological = [...events].reverse();

    for (const ev of chronological) {
      const timeStr = ev.createdAt ? new Date(ev.createdAt).toLocaleTimeString("es-MX", { hour12: false }) : "--:--:--";
      let phase: "OBSERVE" | "DECIDE" | "EXECUTE" | "VERIFY" = "OBSERVE";

      if (ev.eventType.includes("DECIDE") || ev.eventType.includes("PRICE_ANOMALY")) {
        phase = "DECIDE";
      } else if (ev.eventType.includes("EXECUTE") || ev.eventType.includes("ORDER_CREATED")) {
        phase = "EXECUTE";
      } else if (ev.eventType.includes("VERIFY") || ev.eventType.includes("STOCK_VERIFIED")) {
        phase = "VERIFY";
      } else if (ev.eventType.includes("OBSERVE") || ev.eventType.includes("STOCK_CRITICAL")) {
        phase = "OBSERVE";
      }

      const detail = `${theme.dim(timeStr)} ${ev.description || ev.title}`;
      console.log(`  ${theme.audit(phase, detail)}`);
    }

    console.log(`\n  ${theme.dim(`Mostrando ${events.length} evento(s) reciente(s). Presiona Enter para continuar.`)}\n`);
  } catch (err: any) {
    console.error(theme.redBold(`\n❌ Error al consultar bitácora de auditoría: ${err.message}\n`));
  }
}
