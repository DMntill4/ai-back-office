import { Command } from "commander";
import { startGraphServer } from "../graph/server";
import { runTuiGraph } from "../graph/tuiGraph";
import { loadRealGraphData } from "../graph/dataLoader";
import { getSession } from "../keychain";

export const graphCommand = new Command("graph")
  .description("Visualiza a MINT trabajando en vivo como un grafo interactivo estilo Obsidian (Solo Lectura)")
  .option("--tui", "Ejecutar versión simplificada en la terminal con caracteres Braille/ASCII (sin navegador)")
  .option("--demo", "Modo demostración con datos aislados y marca de agua [DEMO] (nunca mezclados con producción)")
  .option("--shadow", "Modo sombra: renderiza a la araña MINT en estilo fantasma (indica que no ejecuta en la BD)")
  .option("-p, --port <port>", "Puerto para el servidor local del grafo (por defecto: 3456)", "3456")
  .option("--no-open", "No abrir automáticamente el navegador tras iniciar el servidor local")
  .option("-c, --company <companyId>", "Filtrar por ID de empresa específica (respeta aislamiento multi-tenant)")
  .option("--json", "Exportar el payload del grafo en formato JSON estructurado y salir")
  .action(async (options) => {
    try {
      const port = parseInt(options.port, 10) || 3456;
      const isDemo = Boolean(options.demo);
      const isShadow = Boolean(options.shadow);
      const openBrowser = options.open !== false;
      const companyIdOverride = options.company;

      // 1. Exportación JSON si se especifica --json
      if (options.json) {
        let session = await getSession();
        if (!session && !isDemo) {
          console.error(JSON.stringify({ error: "No hay sesión activa. Ejecuta 'mint login' primero." }));
          process.exit(1);
        }
        const companyId = companyIdOverride || (session ? session.companyId : "DEMO_COMPANY");
        const payload = await loadRealGraphData(companyId, {
          isDemo,
          isShadow,
          userRole: session ? session.role : "operador",
        });
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      // 2. Variante TUI para entornos sin navegador
      if (options.tui) {
        await runTuiGraph({
          isDemo,
          isShadow,
          companyIdOverride,
        });
        return;
      }

      // 3. Servidor Local del Grafo + Apertura de Navegador
      await startGraphServer({
        port,
        openBrowser,
        isDemo,
        isShadow,
        companyIdOverride,
      });

    } catch (err: any) {
      console.error("\x1b[31m[ERROR] Fallo al iniciar MINT Graph:\x1b[0m", err.message);
      process.exit(1);
    }
  });
