import { theme } from "../ui/theme";
import { drawDivider, drawCard } from "../ui/box";
import { spawn } from "node:child_process";
import * as http from "node:http";
import * as fs from "node:fs";

function checkPortHealth(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(500, () => {
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
    spawn("cmd.exe", ["/c", "start", url], { detached: true, stdio: "ignore" }).unref();
  } else if (process.platform === "darwin") {
    spawn("open", ["-n", "-a", "Google Chrome", "--args", `--app=${url}`], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  }
}

export async function appCommand(options: { open?: boolean } = { open: true }) {
  const { ensureEnterpriseDatabaseActive } = await import("../services/dockerDatabaseOrchestrator");
  await ensureEnterpriseDatabaseActive();
  console.log("\n" + drawDivider("MINT DESKTOP APPLICATION // TORRE DE CONTROL VISUAL", 84));

  const isAlreadyRunning = await checkPortHealth(4200);

  if (isAlreadyRunning) {
    console.log(`  ${theme.mintBold("[OK]")} Torre de Control Visual ya activa en http://localhost:4200`);
    if (options.open !== false) {
      console.log(`  ${theme.cyanBold("[APP]")} Abriendo ventana de la aplicación...`);
      launchDesktopAppWindow("http://localhost:4200");
    }
    console.log(`\n  ${theme.dim("Aplicación lista y enlazada.")}\n`);
    process.exit(0);
  }

  // Si no está corriendo, arrancar el servidor Fastify
  console.log(`  ${theme.mint("[INICIO] Iniciando Motor de la App de Escritorio...")} (Puerto 4200)`);
  
  try {
    const { startAppServer } = require("../../../app/server");
    await startAppServer();
  } catch (err: any) {
    console.error(`  ${theme.redBold("[ERROR]")} No se pudo iniciar el servidor: ${err.message}`);
    process.exit(1);
  }

  const appUrl = "http://localhost:4200";
  if (options.open !== false) {
    console.log(`  ${theme.cyanBold("[APP]")} Abriendo Ventana de la Torre de Control Visual...`);
    launchDesktopAppWindow(appUrl);
  }

  console.log("");
  console.log(
    drawCard(
      [
        `${theme.dim("Aplicación:")}    ${theme.mintBold("MINT DESKTOP APP (Torre de Control Visual)")}`,
        `${theme.dim("URL Local:")}      ${theme.cyan("http://localhost:4200")}`,
        `${theme.dim("Vistas:")}         Diagnóstico de Datos (5 Pilares), Ingesta Universal,`,
        `                 Proveedores, Cuarentena & Seguridad, Flota & Rutas GPS (OSRM).`,
        `${theme.dim("Persistencia:")}   Conectada a PostgreSQL local (misma base que el CLI).`,
        "",
        theme.mintBold("Servidor activo. Presiona Ctrl+C para detener la aplicación."),
      ],
      {
        title: "[MINT] APP INICIADA AUTOMÁTICAMENTE",
        borderColor: theme.mint,
      },
    ),
  );
  console.log("");
}
