import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { spawn, type ChildProcess } from "node:child_process";
import { verifyRuntimeEnvironment } from "@mint/core";
import { readDaemonState, writeDaemonState, tickOnce } from "@mint/daemon";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
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

export async function startCommand(options: StartOptions = {}) {
  const report = await verifyRuntimeEnvironment();
  if (!report.compatible) {
    console.error(theme.redBold("\n[ERROR] No se puede iniciar Mint Back Office. Diagnostico fallido:"));
    for (const diag of report.diagnostics) {
      console.error(`  ${diag}`);
    }
    process.exit(1);
  }

  let session = await getSession();

  if (!session && !options.headless && process.stdin.isTTY) {
    const { runOnboardingWizard } = require("./onboarding");
    session = await runOnboardingWizard();
  }

  const companyId = session?.companyId || "comp_default";
  const port = options.port || process.env.PORT || "3000";

  const logDir = path.join(os.homedir(), ".mint", "logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const serverLogPath = path.join(logDir, "server.log");
  const serverLogStream = fs.openSync(serverLogPath, "a");

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

  const interactive = !options.headless && !options.json && process.stdin.isTTY;
  if (interactive) {
    // Consola interactiva: el servidor de webhooks sube en segundo plano sin bloquear el prompt.
    void waitForServer(port, 40);
  } else {
    await waitForServer(port, 15);
  }

  const daemonState = readDaemonState();
  daemonState.isRunning = true;
  daemonState.pid = process.pid;
  daemonState.companyId = companyId;
  daemonState.startedAt = new Date().toISOString();
  writeDaemonState(daemonState);

  // En modo interactivo, consoleCommand maneja su propio ciclo de escaneo con alertas
  // El ticker de fondo solo se activa en modo headless para evitar bucles competidores
  let tickerInterval: NodeJS.Timeout | null = null;
  if (options.headless || !process.stdin.isTTY) {
    tickerInterval = setInterval(async () => {
      try {
        await tickOnce(companyId);
      } catch {}
    }, 30000);
  }

  // Primer ciclo del daemon sin bloquear la consola
  tickOnce(companyId).catch(() => {});

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (tickerInterval) clearInterval(tickerInterval);
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
          autonomy: "active",
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

  if (options.headless || !process.stdin.isTTY) {
    console.log(`\n${theme.mintBold("[MINT HEADLESS]")} API: http://localhost:${port} | Empresa: ${companyId}`);
    console.log(theme.dim("  Presiona Ctrl+C para detener los servicios.\n"));
    await new Promise(() => {});
  } else {
    try {
      await consoleCommand();
    } finally {
      cleanup();
    }
  }
}
