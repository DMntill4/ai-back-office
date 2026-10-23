import * as readline from "readline";
import { theme } from "../ui/theme";
import { printBanner } from "../ui/banner";
import { getSession } from "../keychain";

export async function consoleCommand() {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  printBanner({ companyId });

  console.log(theme.mintBold("Interactive Mint Agent Console (REPL)"));
  console.log(theme.dim("Escribe un comando o 'help' para ver opciones. Presiona Ctrl+C o escribe 'exit' para salir.\n"));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${theme.mintBold("mint")} ${theme.dim("❯")} `,
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }

    if (trimmed === "exit" || trimmed === "quit") {
      console.log(theme.dim("Cerrando consola interactiva Mint. Hasta luego."));
      rl.close();
      return;
    }

    if (trimmed === "help") {
      console.log(theme.bold("\nComandos disponibles en la consola:"));
      console.log(`  ${theme.mintBold("status / dashboard")}  Ver panel general del sistema y métricas`);
      console.log(`  ${theme.mintBold("stock")}               Consultar existencias y quiebres de stock`);
      console.log(`  ${theme.mintBold("orders")}              Ver órdenes de compra vigentes`);
      console.log(`  ${theme.mintBold("inbox")}               Bandeja de decisiones pendientes HITL`);
      console.log(`  ${theme.mintBold("scan")}                Ejecutar escaneo de desabasto y envíos`);
      console.log(`  ${theme.mintBold("simulate [tipo]")}     Simular escenario what-if (stockout, delay, price-spike)`);
      console.log(`  ${theme.mintBold("chat <mensaje>")}      Consultar al agente autónomo`);
      console.log(`  ${theme.mintBold("autonomy <nivel>")}    Ver o cambiar autonomía (dry-run, assisted, auto)`);
      console.log(`  ${theme.mintBold("pause / resume")}      Interruptor de emergencia`);
      console.log(`  ${theme.mintBold("exit")}                Salir de la consola\n`);
      rl.prompt();
      return;
    }

    const [cmd, ...args] = trimmed.split(/\s+/);

    try {
      switch (cmd.toLowerCase()) {
        case "status":
        case "dashboard": {
          const { dashboardCommand } = require("./dashboard");
          await dashboardCommand();
          break;
        }
        case "stock": {
          const { stockCommand } = require("./stock");
          await stockCommand();
          break;
        }
        case "orders": {
          const { ordersCommand } = require("./stock");
          await ordersCommand();
          break;
        }
        case "inbox": {
          const { inboxCommand } = require("./inbox");
          await inboxCommand(args[0] as any, args[1]);
          break;
        }
        case "explain": {
          const { explainCommand } = require("./explain");
          await explainCommand(args[0]);
          break;
        }
        case "simulate": {
          const { simulateCommand } = require("./simulate");
          await simulateCommand(args[0] || "stockout");
          break;
        }
        case "scan": {
          const { triggerScanApi } = require("../client");
          console.log(theme.muted("🔍 Ejecutando escaneo autónomo..."));
          const res = await triggerScanApi(companyId);
          console.log(`✔ Escaneo completado: ${res.stockDeficitsFound} desabastos, ${res.delayedShipmentsFound} retrasos.`);
          break;
        }
        case "autonomy": {
          const { autonomyGetCommand, autonomySetCommand } = require("./autonomy");
          if (args[0]) {
            await autonomySetCommand(args[0]);
          } else {
            await autonomyGetCommand();
          }
          break;
        }
        case "chat": {
          const { chatCommand } = require("./chat");
          await chatCommand(args.join(" "));
          break;
        }
        case "pause": {
          const { pauseCommand } = require("./daemon");
          await pauseCommand();
          break;
        }
        case "resume": {
          const { resumeCommand } = require("./daemon");
          await resumeCommand();
          break;
        }
        default:
          console.log(theme.amber(`Comando '${cmd}' no reconocido. Escribe 'help' para ver la lista.`));
      }
    } catch (err: any) {
      console.error(theme.redBold(`Error ejecutando '${cmd}': ${err.message}`));
    }

    console.log("");
    rl.prompt();
  });
}
