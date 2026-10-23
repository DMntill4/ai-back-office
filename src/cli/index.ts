#!/usr/bin/env node
import { db } from "../db/client";
import { decisions, operationalEvents, products, inventory } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { runFullOperationalEventScan } from "../events/eventEngine";
import { executeAndVerifyDecision, rejectDecision } from "../services/decisionExecutionService";
import * as readline from "node:readline";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  emerald: "\x1b[38;2;16;185;129m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
  bgDark: "\x1b[48;2;15;20;25m",
};

function banner() {
  console.log(`
${ANSI.emerald}${ANSI.bold}╔═══════════════════════════════════════════════════════════════╗
║                   🍃 MINT CLI v2.0 - BACK OFFICE              ║
║         Event-Driven Multi-Agent Autonomous Operations        ║
╚═══════════════════════════════════════════════════════════════╝${ANSI.reset}
`);
}

async function handleWatch(companyId: string = "comp_default") {
  banner();
  console.log(`${ANSI.cyan}📡 Conectado al Event Stream de PostgreSQL. Monitoreando en tiempo real...${ANSI.reset}`);
  console.log(`${ANSI.gray}Presiona Ctrl+C para salir.\n${ANSI.reset}`);

  let lastSeenId: string | null = null;

  const poll = async () => {
    try {
      const events = await db
        .select()
        .from(operationalEvents)
        .where(eq(operationalEvents.companyId, companyId))
        .orderBy(desc(operationalEvents.createdAt))
        .limit(5);

      if (events.length > 0 && events[0].id !== lastSeenId) {
        lastSeenId = events[0].id;
        const ev = events[0];
        const time = new Date(ev.createdAt).toLocaleTimeString("es-MX");
        const severityColor =
          ev.severity === "CRITICAL"
            ? ANSI.red
            : ev.severity === "HIGH"
              ? ANSI.yellow
              : ANSI.cyan;

        console.log(
          `${ANSI.gray}[${time}]${ANSI.reset} ${severityColor}${ANSI.bold}[${ev.eventType}]${ANSI.reset} ${ev.title}`,
        );
        console.log(`   ${ANSI.dim}${ev.description}${ANSI.reset}`);
        console.log(`   ${ANSI.gray}Estado: ${ev.status} • Case: ${ev.caseId || "N/A"}${ANSI.reset}\n`);
      }
    } catch (err: any) {
      console.error(`${ANSI.red}Error en stream:${ANSI.reset}`, err.message);
    }
  };

  await poll();
  setInterval(poll, 3000);
}

async function handleInbox(companyId: string = "comp_default") {
  banner();
  console.log(`${ANSI.bold}📥 BANDEJA DE DECISIONES PENDIENTES (HUMAN-IN-THE-LOOP)${ANSI.reset}\n`);

  const pending = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "pending_approval")))
    .orderBy(desc(decisions.createdAt));

  if (pending.length === 0) {
    console.log(`${ANSI.emerald}✨ No hay decisiones pendientes. El sistema está operando al 100% en autonomía.${ANSI.reset}\n`);
    process.exit(0);
  }

  console.log(`${ANSI.yellow}Se encontraron ${pending.length} decisión(es) esperando tu autorización:${ANSI.reset}\n`);

  for (let i = 0; i < pending.length; i++) {
    const d = pending[i];
    const evidence = (d.evidencePayload as any) || {};
    const risk = (d.riskPayload as any) || {};

    console.log(`${ANSI.bold}#${i + 1}. [${d.id}] ${d.title}${ANSI.reset}`);
    console.log(`   ${ANSI.emerald}Costo Total:${ANSI.reset} $${parseFloat(d.costMxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`);
    console.log(`   ${ANSI.yellow}Riesgo Evaluado:${ANSI.reset} ${(parseFloat(d.riskScore) * 100).toFixed(0)}%`);
    console.log(`   ${ANSI.cyan}Motivo de Política:${ANSI.reset} ${d.policyReason}`);
    console.log(`   ${ANSI.dim}Evidencia: Stock=${evidence.currentStock ?? "N/A"}u | Déficit=${evidence.deficit ?? "N/A"}u | Proveedor=${evidence.supplierName ?? "N/A"}${ANSI.reset}`);
    if (risk.redFlags && risk.redFlags.length > 0) {
      console.log(`   ${ANSI.red}Banderas Rojas: ${risk.redFlags.join("; ")}${ANSI.reset}`);
    }
    console.log("");
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    `${ANSI.bold}Selecciona número a resolver o presiona Enter para salir (ej: '1 a' para aprobar #1, '1 r' para rechazar): ${ANSI.reset}`,
    async (answer) => {
      rl.close();
      const parts = answer.trim().split(" ");
      if (parts.length >= 2) {
        const index = parseInt(parts[0], 10) - 1;
        const action = parts[1].toLowerCase();

        if (index >= 0 && index < pending.length) {
          const target = pending[index];
          if (action === "a" || action === "aprobar") {
            console.log(`\n${ANSI.cyan}⏳ Ejecutando y verificando en PostgreSQL...${ANSI.reset}`);
            const res = await executeAndVerifyDecision(target.id, "CLI_OPERATOR", "Aprobado vía Mint CLI.");
            if (res.success) {
              console.log(`${ANSI.emerald}✅ ${res.message}${ANSI.reset}`);
            } else {
              console.log(`${ANSI.red}❌ Error: ${res.message}${ANSI.reset}`);
            }
          } else if (action === "r" || action === "rechazar") {
            const res = await rejectDecision(target.id, "CLI_OPERATOR", "Rechazado vía Mint CLI.");
            console.log(`${ANSI.yellow}⚠️ ${res.message}${ANSI.reset}`);
          }
        }
      }
      process.exit(0);
    },
  );
}

async function handleToday(companyId: string = "comp_default") {
  banner();
  console.log(`${ANSI.bold}☀️ RESUMEN DIARIO OPERATIVO (DAILY BRIEFING)${ANSI.reset}\n`);

  const allDecisions = await db.select().from(decisions).where(eq(decisions.companyId, companyId));

  const autoExecuted = allDecisions.filter((d) => d.policyDecision === "auto_executed" || d.policyDecision === "approved");
  const pending = allDecisions.filter((d) => d.policyDecision === "pending_approval");
  const blocked = allDecisions.filter((d) => d.policyDecision === "blocked");

  const totalSpend = autoExecuted.reduce((sum, d) => sum + parseFloat(d.costMxn), 0);
  const estimatedSavings = totalSpend * 0.12;

  console.log(`┌────────────────────────────────────────────────────────┐`);
  console.log(`│ ${ANSI.bold}MÉTRICAS CLAVE DE AUTONOMÍA${ANSI.reset}                           │`);
  console.log(`├────────────────────────────────────────────────────────┤`);
  console.log(`│ Decisiones Procesadas:     ${autoExecuted.length.toString().padEnd(28)}│`);
  console.log(`│ Esperando Decisión Humana: ${pending.length.toString().padEnd(28)}│`);
  console.log(`│ Operaciones Bloqueadas:    ${blocked.length.toString().padEnd(28)}│`);
  console.log(`│ Dinero Gestionado:         $${totalSpend.toLocaleString("es-MX", { minimumFractionDigits: 2 }).padEnd(24)} MXN │`);
  console.log(`│ Ahorro Logístico Estimado: $${estimatedSavings.toLocaleString("es-MX", { minimumFractionDigits: 2 }).padEnd(24)} MXN │`);
  console.log(`└────────────────────────────────────────────────────────┘\n`);

  process.exit(0);
}

async function handleScan(companyId: string = "comp_default") {
  banner();
  console.log(`${ANSI.cyan}🔍 Iniciando escaneo de eventos sobre datos reales en PostgreSQL...${ANSI.reset}\n`);

  const result = await runFullOperationalEventScan(companyId);

  console.log(`${ANSI.emerald}✅ Escaneo completado con éxito:${ANSI.reset}`);
  console.log(`- Desabastos críticos descubiertos: ${result.stockDeficitsFound}`);
  console.log(`- Envíos retrasados detectados:     ${result.delayedShipmentsFound}`);
  console.log(`- Eventos operacionales creados:    ${result.eventsTriggered}`);
  console.log(`- Decisiones generadas:             ${result.processedDecisions.length}\n`);

  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "today";

  switch (command) {
    case "watch":
      await handleWatch();
      break;
    case "inbox":
      await handleInbox();
      break;
    case "today":
    case "plan":
      await handleToday();
      break;
    case "scan":
      await handleScan();
      break;
    default:
      banner();
      console.log(`Comandos disponibles:`);
      console.log(`  ${ANSI.emerald}mint watch${ANSI.reset}     Stream de eventos y telemetría de agentes en vivo`);
      console.log(`  ${ANSI.emerald}mint inbox${ANSI.reset}     Bandeja interactiva de decisiones pendientes (a/r)`);
      console.log(`  ${ANSI.emerald}mint today${ANSI.reset}     Resumen ejecutivo diario`);
      console.log(`  ${ANSI.emerald}mint scan${ANSI.reset}      Dispara escaneo de desabastos y retrasos reales en BD\n`);
      process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
