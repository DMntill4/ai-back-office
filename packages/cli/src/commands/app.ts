import { spawn } from "node:child_process";
import * as http from "node:http";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function launchDesktopAppWindow(url: string) {
  const platform = process.platform;
  try {
    if (platform === "win32") {
      // 1. Intentar abrir en modo app de Chrome/Edge si está disponible
      const chromeCommand = `start msedge --app="${url}" || start chrome --app="${url}" || start ${url}`;
      spawn("cmd.exe", ["/c", chromeCommand], { detached: true, stdio: "ignore" }).unref();
    } else if (platform === "darwin") {
      spawn("open", ["-n", "-a", "Google Chrome", "--args", `--app=${url}`], {
        detached: true,
        stdio: "ignore",
      }).unref();
    } else {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    }
  } catch {
    // Silencioso si no puede abrir navegador en background
  }
}

export async function appCommand(options: { open?: boolean } = { open: true }) {
  const { ensureEnterpriseDatabaseActive } = await import("../services/dockerDatabaseOrchestrator");
  await ensureEnterpriseDatabaseActive();
  console.log("\n" + drawDivider("MINT DESKTOP APPLICATION // CENTRO DE CONTROL", 84));

  const isServerUp = await checkPort(3001);
  if (!isServerUp) {
    console.log(`  ${theme.mint("[INICIO] Iniciando Motor de la App de Escritorio...")} (Puerto 3001)`);
    const serverProc = spawn("npx", ["tsx", "packages/api/src/index.ts"], {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
      shell: true,
    });
    serverProc.unref();
    await new Promise((r) => setTimeout(r, 1200));
  } else {
    console.log(`  ${theme.success("[OK]")} Motor de la App de Escritorio activo y enlazado.`);
  }

  const appUrl = "http://localhost:3001";
  if (options.open !== false) {
    console.log(`  ${theme.cyanBold("[APP] Abriendo Ventana Nativa de la App de Escritorio...")}`);
    launchDesktopAppWindow(appUrl);
  }

  console.log("");
  console.log(
    drawCard(
      [
        `${theme.dim("Aplicación:")}    ${theme.mintBold("MINT DESKTOP APP (Standalone Native Window)")}`,
        `${theme.dim("Localhost:")}     ${theme.cyan("http://localhost:3001")}`,
        `${theme.dim("Características:")}Centro de control de canales (Discord / Slack / Telegram),`,
        `                 catálogo de existencias en tiempo real, bandeja de compras HITL,`,
        `                 y pruebas interactivas de envío de avisos.`,
        `${theme.dim("Persistencia:")}   Directa en PostgreSQL (Drizzle ORM) por empresa y usuario.`,
      ],
      {
        title: "[MINT] MINT DESKTOP APP INICIADA",
        borderColor: theme.mint,
      },
    ),
  );
  console.log(`  ${theme.dim("Presiona Ctrl+C en cualquier momento para regresar o salir.")}\n`);
}
