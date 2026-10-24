import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { spawn, type ChildProcess } from "node:child_process";
import { verifyRuntimeEnvironment } from "@mint/core";
import { readDaemonState, writeDaemonState, tickOnce } from "@mint/daemon";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard } from "../ui/box";
import { consoleCommand } from "./console";

export interface StartOptions {
  headless?: boolean;
  port?: string;
  json?: boolean;
}

async function waitForServer(port: string | number, maxAttempts = 15): Promise<boolean> {
  const url = `http://127.0.0.1:${port}/health`;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

/**
 * mint start / npm start
 * Inicia TODO el sistema autónomo (Servidor Backend, Daemon de vigilancia,
 * Canales de venta y Consola Interactiva) con CERO frontend web.
 */
export async function startCommand(options: StartOptions = {}) {
  // 1. Diagnóstico previo de entorno y compatibilidad
  const report = await verifyRuntimeEnvironment();
  if (!report.compatible) {
    console.error(theme.redBold("\n❌ No se puede iniciar Mint Back Office. Diagnóstico fallido:"));
    for (const diag of report.diagnostics) {
      console.error(`  ${diag}`);
    }
    process.exit(1);
  }

  let session = await getSession();

  // First-time execution: Friendly interactive onboarding wizard in English
  if (!session && !options.headless && process.stdin.isTTY) {
    const { runOnboardingWizard } = require("./onboarding");
    session = await runOnboardingWizard();
  }

  const companyId = session?.companyId || "comp_default";
  const port = options.port || process.env.PORT || "3000";

  // 2. Directorio de logs para procesos de fondo
  const logDir = path.join(os.homedir(), ".mint", "logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const serverLogPath = path.join(logDir, "server.log");
  const serverLogStream = fs.openSync(serverLogPath, "a");

  // 3. Levantar Servidor Fastify (Transporte HTTP, Webhooks, Canales remotos)
  const serverScript = path.resolve(__dirname, "../../../../src/server.ts");
  const tsxCli = require.resolve("tsx/cli");

  const serverProc: ChildProcess = spawn(
    process.execPath,
    [tsxCli, serverScript],
    {
      env: { ...process.env, PORT: String(port) },
      stdio: ["ignore", serverLogStream, serverLogStream],
      shell: false,
      detached: false,
    }
  );

  // Esperar a que el servidor Fastify esté escuchando activamente en el puerto
  await waitForServer(port, 15);

  // 4. Iniciar estado y bucle del Daemon autónomo
  const daemonState = readDaemonState();
  daemonState.isRunning = true;
  daemonState.pid = process.pid;
  daemonState.companyId = companyId;
  daemonState.startedAt = new Date().toISOString();
  writeDaemonState(daemonState);

  // Ticker periódico de vigilancia (cada 30s)
  const tickerInterval = setInterval(async () => {
    try {
      await tickOnce(companyId);
    } catch {
      // Ignorar fallos de tick individuales para no interrumpir el proceso
    }
  }, 30000);

  // Ejecutar un ciclo inicial
  try {
    await tickOnce(companyId);
  } catch {}

  // Limpieza al cerrar (Graceful Shutdown)
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

    if (serverProc && !serverProc.killed) {
      try {
        if (process.platform === "win32" && serverProc.pid) {
          spawn("taskkill", ["/pid", String(serverProc.pid), "/f", "/t"]);
        } else {
          serverProc.kill("SIGTERM");
        }
      } catch {}
    }
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
          serverPid: serverProc.pid,
          port,
          companyId,
          frontend: "DISABLED (Terminal-only)",
        },
        null,
        2
      )
    );
    if (options.headless) {
      cleanup();
      process.exit(0);
    }
  }

  // 5. Presentación visual en consola
  console.log("");
  console.log(
    drawCard(
      [
        `${theme.dim("Servidor API:")}      ${theme.mintBold(`http://localhost:${port}`)} (Webhooks, Canales y REST)`,
        `${theme.dim("Daemon Autónomo:")}   ${theme.badge("ACTIVO", "mint")} Vigilando stock, retrasos y fuentes locales`,
        `${theme.dim("Base de Datos:")}     ${theme.bold(report.postgres.provider || "PostgreSQL Cloud")}`,
        `${theme.dim("Frontend Web:")}      ${theme.badge("OMITIDO / DESHABILITADO", "gray")} (Modo 100% Terminal)`,
        `${theme.dim("Logs de Servicio:")}  ${theme.dim(serverLogPath)}`,
      ],
      {
        title: "🍃 MINT AUTONOMOUS AGENT SYSTEM INICIADO",
        badge: "HEADLESS ONLINE",
        badgeColor: "mint",
        borderColor: theme.mint,
      }
    )
  );

  if (options.headless || !process.stdin.isTTY) {
    console.log(`\n${theme.mintBold("● MINT CORRIENDO EN MODO HEADLESS.")}`);
    console.log(theme.dim("  El agente está vigilando y listo para recibir ventas de Telegram/Slack/Discord."));
    console.log(theme.dim("  Presiona Ctrl+C para detener todos los servicios.\n"));

    // Mantener proceso vivo
    await new Promise(() => {});
  } else {
    // Modo interactivo: Entrar directamente a la consola REPL de Mint
    console.log(theme.dim("\nIniciando consola interactiva de operaciones...\n"));
    try {
      await consoleCommand();
    } finally {
      cleanup();
    }
  }
}
