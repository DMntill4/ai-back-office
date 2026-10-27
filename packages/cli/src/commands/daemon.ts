import {
  getDaemonStatus,
  pauseDaemon,
  resumeDaemon,
  tickOnce,
  generateDailyPlan,
  readDaemonState,
  writeDaemonState,
} from "@mint/daemon";
import { getSession } from "../keychain";
import { db, decisions } from "@mint/core";
import { eq, desc } from "drizzle-orm";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";

export async function daemonStartCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const state = readDaemonState();
    state.isRunning = true;
    state.pid = process.pid;
    state.startedAt = new Date().toISOString();
    state.companyId = companyId;
    writeDaemonState(state);

    if (options.json) {
      console.log(JSON.stringify({ success: true, status: "started", pid: process.pid, companyId }));
      return;
    }

    console.log("");
    console.log(
      drawCard(
        [
          `${theme.dim("PID:")}         ${theme.bold(process.pid)}`,
          `${theme.dim("Empresa:")}     ${theme.bold(companyId)}`,
          `${theme.dim("Modo:")}        Segundo plano autónomo`,
          `${theme.dim("Vigilancia:")}  Fuentes de datos CSV/SQL, desabastos de stock y retrasos en tránsito.`,
        ],
        {
          title: "DAEMON AUTÓNOMO MINT INICIADO",
          badge: "ONLINE",
          badgeColor: "mint",
          borderColor: theme.mint,
        },
      ),
    );
    console.log(theme.dim("\nPresiona Ctrl+C o ejecuta 'mint daemon stop' para detener el proceso.\n"));

    // Ejecutar un ciclo inicial
    const initialTick = await tickOnce(companyId);
    console.log(
      `  ${theme.success("[OK]")} Ciclo inicial: ${initialTick.stockDeficitsTriggered} desabastos detectados, ${initialTick.shipmentDelaysTriggered} retrasos evaluados.\n`,
    );
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(theme.redBold(`[ERROR] Error al iniciar daemon: ${err.message}`));
    }
    process.exit(1);
  }
}

export async function daemonStopCommand(options: { json?: boolean } = {}) {
  try {
    const state = readDaemonState();
    state.isRunning = false;
    state.pid = null;
    writeDaemonState(state);

    if (options.json) {
      console.log(JSON.stringify({ success: true, status: "stopped" }));
      return;
    }

    console.log(`\n${theme.warning("[STOP] ")} ${theme.bold("DAEMON MINT DETENIDO")}`);
    console.log(`   El proceso autónomo en segundo plano ha finalizado correctamente.\n`);
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(theme.redBold(`[ERROR] Error al detener daemon: ${err.message}`));
    }
    process.exit(1);
  }
}

export async function daemonStatusCommand(options: { json?: boolean } = {}) {
  try {
    const status = getDaemonStatus();

    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    const stateBadge = status.isPaused
      ? theme.badge("PAUSADO (EMERGENCIA)", "red")
      : status.isRunning
        ? theme.badge("ACTIVO", "mint")
        : theme.badge("DETENIDO", "gray");

    console.log("");
    console.log(
      drawCard(
        [
          `${theme.dim("Estado:")}       ${stateBadge}`,
          `${theme.dim("PID:")}          ${status.pid ?? "Ninguno (Inactivo)"}`,
          `${theme.dim("Empresa:")}      ${status.companyId}`,
          `${theme.dim("Iniciado:")}     ${status.startedAt ? new Date(status.startedAt).toLocaleString("es-MX") : "N/A"}`,
          `${theme.dim("Último ciclo:")} ${status.lastTickAt ? new Date(status.lastTickAt).toLocaleString("es-MX") : "N/A"}`,
          `${theme.dim("Actividad:")}    ${status.stats.ticksCount} ciclos completados │ ${status.stats.eventsFired} eventos disparados`,
        ],
        {
          title: "ESTADO DEL PROCESO DAEMON",
          badge: status.isRunning ? "RUNNING" : "STOPPED",
          badgeColor: status.isRunning ? "mint" : "gray",
          borderColor: status.isRunning ? theme.mint : theme.gray,
        },
      ),
    );
    console.log("");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(theme.redBold(`[ERROR] Error al consultar daemon: ${err.message}`));
    }
    process.exit(1);
  }
}

export async function pauseCommand(options: { json?: boolean } = {}) {
  try {
    pauseDaemon();
    if (options.json) {
      console.log(JSON.stringify({ success: true, isPaused: true }));
      return;
    }
    console.log(`\n${theme.badge("INTERRUPTOR DE EMERGENCIA ACTIVADO", "red")}`);
    console.log(`   ${theme.redBold("La autonomía del daemon ha sido PAUSADA.")}`);
    console.log(`   ${theme.muted("Ningún agente ejecutará ni evaluará nuevas propuestas hasta reanudar con 'mint resume'.")}\n`);
  } catch (err: any) {
    console.error(theme.redBold(`[ERROR] Error al pausar: ${err.message}`));
    process.exit(1);
  }
}

export async function resumeCommand(options: { json?: boolean } = {}) {
  try {
    resumeDaemon();
    if (options.json) {
      console.log(JSON.stringify({ success: true, isPaused: false }));
      return;
    }
    console.log(`\n${theme.badge("AUTONOMÍA REANUDADA", "mint")}`);
    console.log(`   ${theme.mintBold("El daemon ha retomado la vigilancia y coordinación autónoma.")}\n`);
  } catch (err: any) {
    console.error(theme.redBold(`[ERROR] Error al reanudar: ${err.message}`));
    process.exit(1);
  }
}

export async function planTodayCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const plan = await generateDailyPlan(companyId);

    if (options.json) {
      console.log(JSON.stringify(plan, null, 2));
      return;
    }

    console.log("\n" + drawDivider(`RESUMEN DEL DÍA // MINT OPERATIONAL BRIEFING [${companyId}]`, 86));

    console.log("");
    console.log(
      drawCard(
        [
          `${theme.dim("Casos Activos:")}           ${theme.bold(plan.activeCasesCount)} casos logísticos en curso`,
          `${theme.dim("Decisiones Pendientes:")}   ${plan.pendingDecisionsCount > 0 ? theme.amberBold(`${plan.pendingDecisionsCount} esperando autorización en inbox`) : theme.success("0 pendientes")}`,
          `${theme.dim("Productos con Desabasto:")} ${plan.productsAtRiskCount > 0 ? theme.redBold(`${plan.productsAtRiskCount} SKUs en riesgo de stockout`) : theme.success("0 en riesgo")}`,
        ],
        {
          title: "SÍNTESIS DE OPERACIONES",
          borderColor: plan.pendingDecisionsCount > 0 ? theme.amber : theme.mint,
        },
      ),
    );

    const { getCompanyConfig, formatCompanyDate } = await import("@mint/core");
    const config = await getCompanyConfig(companyId);
    const currency = config.currency;

    if (plan.decisions.length > 0) {
      console.log(`\n${theme.amberBold("[LISTA] DECISIONES ESPERANDO APROBACIÓN:")}`);
      for (const d of plan.decisions) {
        console.log(
          `   ${theme.amber("•")} [${theme.bold(d.id)}] ${d.title} (${theme.mintBold(`$${Number(d.costMxn).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}`)}) - Por ${theme.cyanBold(d.proposingAgent)}`,
        );
      }
      console.log(`\n${theme.dim("Para autorizar:")} ${theme.mintBold("mint inbox approve <id>")} │ ${theme.dim("Para auditar:")} ${theme.cyanBold("mint explain <id>")}`);
    } else {
      console.log(`\n  ${theme.success("[OK] No hay decisiones pendientes de aprobación en este momento.")}`);
    }
    console.log("");
  } catch (err: any) {
    console.error(theme.redBold(`[ERROR] Error al consultar plan diario: ${err.message}`));
    process.exit(1);
  }
}

export async function watchCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  if (!options.json) {
    console.log(`\n${theme.badge("● LIVE FEED", "mint")} ${theme.bold(`Vigilando eventos y decisiones autónomas [${companyId}]`)}`);
    console.log(theme.dim("   Presiona Ctrl+C para salir.\n"));
  }

  try {
    const { getCompanyConfig, formatCompanyDate } = await import("@mint/core");
    const config = await getCompanyConfig(companyId);
    const currency = config.currency;

    const recentDecisions = await db
      .select()
      .from(decisions)
      .where(eq(decisions.companyId, companyId))
      .orderBy(desc(decisions.createdAt))
      .limit(8);

    if (options.json) {
      console.log(JSON.stringify(recentDecisions, null, 2));
      return;
    }

    if (recentDecisions.length === 0) {
      console.log(theme.dim("   (Aún no hay decisiones registradas en el feed)\n"));
      return;
    }

    for (const d of recentDecisions.reverse()) {
      const timeStr = formatCompanyDate(new Date(d.createdAt), config.timezone, true);
      const badgeType =
        d.policyDecision === "auto_executed"
          ? "mint"
          : d.policyDecision === "pending_approval"
            ? "amber"
            : "red";

      console.log(
        `${theme.dim(`[${timeStr}]`)} ${theme.badge(d.policyDecision.toUpperCase(), badgeType)} ${theme.bold(d.title)}`,
      );
      console.log(
        `   ${theme.dim("Agente:")} ${theme.cyanBold(d.proposingAgent)} │ ${theme.dim("Monto:")} $${Number(d.costMxn).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency} │ ${theme.dim("Razón:")} ${theme.muted(d.policyReason || "")}\n`,
      );
    }
  } catch (err: any) {
    console.error(theme.redBold(`[ERROR] Error en feed en vivo: ${err.message}`));
  }
}
