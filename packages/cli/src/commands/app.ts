import { theme } from "../ui/theme";
import { drawDivider, drawCard } from "../ui/box";
import { spawn } from "node:child_process";
import * as http from "node:http";
import * as fs from "node:fs";

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/dashboard`, () => resolve(true));
    req.on("error", () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function launchDesktopAppWindow(url: string) {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

  const appArgs = [`--app=${url}`, "--window-size=1280,820", "--app-id=mint-desktop-app"];

  if (process.platform === "win32") {
    if (fs.existsSync(edgePath)) {
      spawn(edgePath, appArgs, { detached: true, stdio: "ignore" }).unref();
      return;
    }
    if (fs.existsSync(chromePath)) {
      spawn(chromePath, appArgs, { detached: true, stdio: "ignore" }).unref();
      return;
    }
    // Fallback on windows
    spawn("cmd.exe", ["/c", "start", url], { detached: true, stdio: "ignore" }).unref();
  } else if (process.platform === "darwin") {
    spawn("open", ["-n", "-a", "Google Chrome", "--args", `--app=${url}`], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  }
}

export async function appCommand(options: { open?: boolean } = { open: true }) {
  console.log("\n" + drawDivider("MINT DESKTOP APPLICATION // CENTRO DE CONTROL", 84));

  const isServerUp = await checkPort(4200);
  if (!isServerUp) {
    console.log(`  ${theme.mint("[INICIANDO] Motor de la App de Escritorio...")} (Puerto 4200)`);
    const serverProc = spawn("npx", ["tsx", "packages/app/server.ts"], {
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

  const appUrl = "http://localhost:4200";
  if (options.open !== false) {
    console.log(`  ${theme.cyanBold("[ABRIENDO] Ventana Nativa de la App de Escritorio...")}`);
    launchDesktopAppWindow(appUrl);
  }

  console.log("");
  console.log(
    drawCard(
      [
        `${theme.dim("Aplicación:")}    ${theme.mintBold("MINT DESKTOP APP (Standalone Native Window)")}`,
        `${theme.dim("Localhost:")}     ${theme.cyan("http://localhost:4200")}`,
        `${theme.dim("Características:")}Centro de control de canales (Discord / Slack / Telegram),`,
        `                 catálogo de existencias en tiempo real, bandeja de compras HITL,`,
        `                 y pruebas interactivas de envío de avisos.`,
        `${theme.dim("Persistencia:")}   Directa en PostgreSQL (Drizzle ORM) por empresa y usuario.`,
      ],
      {
        title: "MINT DESKTOP APP INICIADA",
        borderColor: theme.mint,
      },
    ),
  );
  console.log("");
}
