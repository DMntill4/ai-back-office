import { theme } from "../ui/theme";
import { drawDivider, drawCard } from "../ui/box";
import { spawn } from "node:child_process";
import * as http from "node:http";

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, () => resolve(true));
    req.on("error", () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function openUrl(url: string) {
  try {
    if (process.platform === "win32") {
      spawn("cmd.exe", ["/c", "start", url], { detached: true, stdio: "ignore" }).unref();
    } else if (process.platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    } else {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    }
  } catch {}
}

export async function webCommand(options: { open?: boolean } = { open: true }) {
  console.log("\n" + drawDivider("MINT VISUAL DASHBOARD & CHANNELS", 84));

  const isBackendUp = await checkPort(3001);
  if (!isBackendUp) {
    console.log(`  ${theme.mint("🚀 Iniciando Servidor API Backend...")} (Puerto 3001)`);
    const serverProcess = spawn("npx", ["tsx", "src/server.ts"], {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
      shell: true,
    });
    serverProcess.unref();
  } else {
    console.log(`  ${theme.success("✔")} Servidor API Backend ya se encuentra activo en http://localhost:3001`);
  }

  const isFrontendUp = await new Promise<boolean>((resolve) => {
    const req = http.get(`http://localhost:5173`, () => resolve(true));
    req.on("error", () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });

  if (!isFrontendUp) {
    console.log(`  ${theme.cyanBold("🎨 Iniciando Dashboard Web (React 19 + Vite)...")} (Puerto 5173)`);
    const viteProcess = spawn("npm", ["run", "dev", "--prefix", "frontend"], {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
      shell: true,
    });
    viteProcess.unref();
  } else {
    console.log(`  ${theme.success("✔")} Dashboard Web ya se encuentra activo en http://localhost:5173`);
  }

  const url = "http://localhost:5173";
  if (options.open !== false) {
    setTimeout(() => {
      openUrl(url);
    }, 1500);
  }

  console.log(
    drawCard(
      [
        `${theme.dim("Dashboard Web:")}   ${theme.mintBold("http://localhost:5173")}`,
        `${theme.dim("Backend API:")}     ${theme.cyan("http://localhost:3001")}`,
        `${theme.dim("Módulos Activos:")} Centro de Control 70/30, Catálogo, Desabastos,`,
        `                 Bandeja HITL de Decisiones, y Canales (Discord / Slack).`,
        `${theme.dim("Persistencia:")}    PostgreSQL / Drizzle con aislamiento por empresa.`,
      ],
      {
        title: "CENTRO DE CONTROL VISUAL MINT",
        borderColor: theme.mint,
      },
    ),
  );
  console.log(`  ${theme.dim("Presiona Ctrl+C en cualquier momento para volver a la terminal.")}\n`);
}
