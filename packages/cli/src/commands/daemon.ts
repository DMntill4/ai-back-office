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
import { db, operationalEvents, cases, decisions } from "@mint/core";
import { eq, desc } from "drizzle-orm";

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

    console.log(`\n🚀 DAEMON MINT INICIADO`);
    console.log(`   PID:         ${process.pid}`);
    console.log(`   Empresa:     ${companyId}`);
    console.log(`   Modo:        Segundo plano`);
    console.log(`   Vigilando:   Fuentes de datos, desabastos de stock y retrasos en tránsito.`);
    console.log(`\nPresiona Ctrl+C o ejecuta 'mint daemon stop' para detenerlo.\n`);

    // Ejecutar un ciclo inicial
    const initialTick = await tickOnce(companyId);
    console.log(`[DAEMON] Ciclo inicial completado. Desabastos: ${initialTick.stockDeficitsTriggered}, Retrasos: ${initialTick.shipmentDelaysTriggered}`);
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(`❌ Error al iniciar daemon: ${err.message}`);
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

    console.log(`\n🛑 DAEMON MINT DETENIDO`);
    console.log(`   El proceso autónomo en segundo plano ha finalizado correctamente.\n`);
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(`❌ Error al detener daemon: ${err.message}`);
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

    console.log(`\n📊 ESTADO DEL DAEMON MINT`);
    console.log(`   Ejecución:     ${status.isRunning ? "🟢 ACTIVO" : "⚪ DETENIDO"}`);
    console.log(`   Interrupción:  ${status.isPaused ? "⏸️ PAUSADO (EMERGENCIA)" : "▶️ REANUDADO"}`);
    console.log(`   PID:           ${status.pid ?? "Ninguno"}`);
    console.log(`   Empresa:       ${status.companyId}`);
    console.log(`   Iniciado:      ${status.startedAt ? new Date(status.startedAt).toLocaleString("es-MX") : "N/A"}`);
    console.log(`   Último ciclo:  ${status.lastTickAt ? new Date(status.lastTickAt).toLocaleString("es-MX") : "N/A"}`);
    console.log(`   Estadísticas:  ${status.stats.ticksCount} ciclos, ${status.stats.eventsFired} eventos disparados.\n`);
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(`❌ Error al consultar daemon: ${err.message}`);
    }
    process.exit(1);
  }
}

export async function pauseCommand(options: { json?: boolean } = {}) {
  try {
    const state = pauseDaemon();
    if (options.json) {
      console.log(JSON.stringify({ success: true, isPaused: true }));
      return;
    }
    console.log(`\n⏸️ INTERRUPTOR DE EMERGENCIA ACTIVADO`);
    console.log(`   La autonomía del daemon ha sido PAUSADA.`);
    console.log(`   Ningún agente ejecutará ni evaluará nuevas propuestas hasta reanudar con 'mint resume'.\n`);
  } catch (err: any) {
    console.error(`❌ Error al pausar: ${err.message}`);
    process.exit(1);
  }
}

export async function resumeCommand(options: { json?: boolean } = {}) {
  try {
    const state = resumeDaemon();
    if (options.json) {
      console.log(JSON.stringify({ success: true, isPaused: false }));
      return;
    }
    console.log(`\n▶️ AUTONOMÍA REANUDADA`);
    console.log(`   El daemon ha retomado la vigilancia y coordinación autónoma.\n`);
  } catch (err: any) {
    console.error(`❌ Error al reanudar: ${err.message}`);
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

    console.log(`\n📅 RESUMEN DEL DÍA — MINT OPERATIONAL BRIEFING`);
    console.log(`   Empresa:                 ${companyId}`);
    console.log(`   Casos Activos:           ${plan.activeCasesCount}`);
    console.log(`   Decisiones Pendientes:   ${plan.pendingDecisionsCount}`);
    console.log(`   Productos con Desabasto: ${plan.productsAtRiskCount}`);

    if (plan.decisions.length > 0) {
      console.log(`\n📋 DECISIONES ESPERANDO APROBACIÓN:`);
      for (const d of plan.decisions) {
        console.log(`   • [${d.id}] ${d.title} ($${Number(d.costMxn).toLocaleString("es-MX")} MXN) - Por ${d.proposingAgent}`);
      }
    } else {
      console.log(`\n✨ No hay decisiones pendientes de aprobación en este momento.`);
    }
    console.log("");
  } catch (err: any) {
    console.error(`❌ Error al consultar plan diario: ${err.message}`);
    process.exit(1);
  }
}

export async function watchCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  console.log(`\n📡 MINT LIVE FEED [Vigilando eventos y decisiones de ${companyId}]`);
  console.log(`   Presiona Ctrl+C para salir.\n`);

  try {
    const recentDecisions = await db
      .select()
      .from(decisions)
      .where(eq(decisions.companyId, companyId))
      .orderBy(desc(decisions.createdAt))
      .limit(5);

    for (const d of recentDecisions.reverse()) {
      console.log(`[${new Date(d.createdAt).toLocaleTimeString("es-MX")}] [${d.policyDecision.toUpperCase()}] ${d.title}`);
      console.log(`    Agente: ${d.proposingAgent} | Monto: $${Number(d.costMxn).toLocaleString("es-MX")} MXN`);
      console.log(`    Razón:  ${d.policyReason}\n`);
    }
  } catch (err: any) {
    console.error(`❌ Error en feed en vivo: ${err.message}`);
  }
}
