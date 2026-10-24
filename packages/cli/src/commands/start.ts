import {
  verifyRuntimeEnvironment,
  checkDatabaseHealth,
  ensureDecisionsTables,
  runMigrations,
  runProactiveAuditCycle,
  db,
  companies,
  warehouses,
  decisions,
  businessConfig,
} from "@mint/core";
import { readDaemonState, writeDaemonState, tickOnce, getDaemonStatus } from "@mint/daemon";
import { getSession } from "../keychain";
import { theme, renderSystemHeader } from "../ui/theme";
import { consoleCommand } from "./console";
import { eq, and } from "drizzle-orm";

export interface StartOptions {
  headless?: boolean;
  port?: string;
  json?: boolean;
}

export async function startCommand(options: StartOptions = {}) {
  // 1. Diagnóstico de entorno y compatibilidad
  const report = await verifyRuntimeEnvironment();
  if (!report.compatible) {
    console.error(theme.redBold("\n[ERROR] No se puede iniciar Mint Back Office. Diagnóstico fallido:"));
    for (const diag of report.diagnostics) {
      console.error(`  ${diag}`);
    }
    process.exit(1);
  }

  // 2. Verificación y preparación de base de datos PostgreSQL
  const dbHealth = await checkDatabaseHealth();
  if (!dbHealth.connected) {
    console.error(theme.redBold("\n[ERROR] No hay conexión con PostgreSQL. Revisa tu DATABASE_URL en .env"));
    process.exit(1);
  }

  try {
    await runMigrations().catch(() => null);
    await ensureDecisionsTables().catch(() => null);
  } catch {
    // Continuar si ya existen
  }

  // 3. Cargar sesión de empresa activa o ejecutar onboarding
  let session = await getSession();
  if (!session && !options.headless && process.stdin.isTTY) {
    const { runOnboardingWizard } = require("./onboarding");
    session = await runOnboardingWizard();
  }

  const companyId = session?.companyId || "comp_default";

  // 4. Cargar contexto real de la empresa en memoria
  let companyDisplayName = session?.companyName || "Ferretería Industrial Santandereana S.A.S.";
  let autonomyLevel = "dry-run";
  let pendingCount = 0;

  try {
    const [compRows, bConfigs, pendingDecs] = await Promise.all([
      db.select().from(companies).where(eq(companies.id, companyId)).limit(1),
      db.select().from(businessConfig).where(eq(businessConfig.companyId, companyId)),
      db.select().from(decisions).where(
        and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "pending_approval")),
      ),
    ]);
    if (compRows[0]?.name) {
      companyDisplayName = compRows[0].name;
    }
    const autoCfg = bConfigs.find((c) => c.key === "autonomy_level");
    if (autoCfg?.value) autonomyLevel = autoCfg.value;
    pendingCount = pendingDecs.length;
  } catch {}

  // 5. Iniciar y registrar el daemon en segundo plano (Terminal-First)
  const daemonState = readDaemonState();
  daemonState.isRunning = true;
  daemonState.pid = process.pid;
  daemonState.companyId = companyId;
  daemonState.startedAt = new Date().toISOString();
  writeDaemonState(daemonState);

  // Ciclo autónomo periódico de auditoría (cada 30s)
  const tickerInterval = setInterval(async () => {
    try {
      await tickOnce(companyId);
    } catch {}
  }, 30000);

  // 6. Diagnóstico autónomo inicial al arranque
  try {
    await tickOnce(companyId);
    await runProactiveAuditCycle().catch(() => null);
  } catch {}

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearInterval(tickerInterval);
    try {
      const state = readDaemonState();
      state.isRunning = false;
      state.pid = null;
      writeDaemonState(state);
    } catch {}
  };

  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          mode: options.headless ? "headless" : "interactive",
          companyId,
          autonomyLevel,
          dbConnected: true,
          pendingDecisions: pendingCount,
        },
        null,
        2,
      ),
    );
    if (options.headless) {
      cleanup();
      process.exit(0);
    }
  }

  // 7. Mostrar encabezado Linux minimalist y pasar a consola o modo headless
  if (options.headless || !process.stdin.isTTY) {
    console.log("");
    console.log(
      renderSystemHeader({
        dbConnected: true,
        companyName: companyDisplayName,
        daemonActive: true,
        autonomyLevel,
        pendingCount,
      }),
    );
    console.log(
      `\n  ${theme.mintBold("[MINT HEADLESS DAEMON]")} Empresa: ${theme.smokeBold(companyDisplayName)} [${companyId}]`,
    );
    console.log(`  ${theme.dim("Monitoreo continuo 24/7 activo. Presiona Ctrl+C para detener.")}\n`);
    await new Promise(() => {});
  } else {
    try {
      await consoleCommand();
    } finally {
      cleanup();
    }
  }
}
