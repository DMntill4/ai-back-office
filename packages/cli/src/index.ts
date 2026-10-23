import { Command } from "commander";
import { loginCommand } from "./commands/login";
import { logoutCommand, whoamiCommand } from "./commands/whoami";
import { stockCommand, ordersCommand } from "./commands/stock";
import { inboxCommand } from "./commands/inbox";
import { chatCommand, todayCommand } from "./commands/chat";
import { explainCommand } from "./commands/explain";
import { simulateCommand } from "./commands/simulate";
import { dashboardCommand } from "./commands/dashboard";
import { consoleCommand } from "./commands/console";
import { triggerScanApi } from "./client";
import { getSession } from "./keychain";
import { theme } from "./ui/theme";
import { printBanner } from "./ui/banner";

export const program = new Command();

program
  .name("mint")
  .description("🍃 Mint CLI - Coordinador Logístico Autónomo y Operaciones Back Office")
  .version("2.5.0");

// Banner hook on empty invocation
program.hook("preAction", (thisCommand, actionCommand) => {
  // If json flag is set, avoid printing banners
  if (actionCommand.opts().json || thisCommand.opts().json) {
    return;
  }
});

// 1. mint dashboard / mint status
program
  .command("dashboard")
  .alias("status")
  .description("Panel de control unificado: inventario, casos activos, daemon y notificaciones")
  .option("--json", "Salida en formato JSON")
  .action((options) => dashboardCommand(options));

// 2. mint explain <id>
program
  .command("explain <id>")
  .description("Explica la deliberación multi-agente, evidencia y regla de política tras una decisión")
  .option("--json", "Salida en formato JSON")
  .action((id, options) => explainCommand(id, options));

// 3. mint simulate [scenario]
program
  .command("simulate [scenario]")
  .description("Simula un escenario logístico what-if en sandbox (stockout, delay, price-spike)")
  .option("--sku <sku>", "SKU específico para la simulación")
  .option("--json", "Salida en formato JSON")
  .action((scenario, options) => simulateCommand(scenario || "stockout", options));

// 4. mint console / mint repl
program
  .command("console")
  .alias("repl")
  .description("Consola interactiva con prompt permanente para operaciones continuas")
  .action(() => consoleCommand());

// 5. mint login
program
  .command("login [email] [password]")
  .description("Inicia sesión contra el servidor y guarda el token cifrado en el keychain")
  .option("--json", "Salida en formato JSON")
  .action((email, password, options) => loginCommand(email, password, options));

// 6. mint logout
program
  .command("logout")
  .description("Cierra sesión y elimina el token del keychain seguro")
  .option("--json", "Salida en formato JSON")
  .action((options) => logoutCommand(options));

// 7. mint whoami
program
  .command("whoami")
  .description("Muestra el usuario y empresa activa almacenada en el keychain")
  .option("--json", "Salida en formato JSON")
  .action((options) => whoamiCommand(options));

// 8. mint stock
program
  .command("stock")
  .description("Consulta existencias reales de inventario y estado de quiebre de stock")
  .option("--json", "Salida en formato JSON")
  .action((options) => stockCommand(options));

// 9. mint orders
program
  .command("orders")
  .description("Consulta las órdenes de compra emitidas a proveedores homologados")
  .option("--json", "Salida en formato JSON")
  .action((options) => ordersCommand(options));

// 10. mint inbox
program
  .command("inbox [action] [id]")
  .description("Bandeja de decisiones (HITL): mint inbox | mint inbox approve <id> | mint inbox reject <id>")
  .option("--json", "Salida en formato JSON")
  .action((action, id, options) => inboxCommand(action, id, options));

// 11. mint chat
program
  .command("chat <message...>")
  .description("Envía una consulta operativa al Agente Autónomo Mint")
  .option("--json", "Salida en formato JSON")
  .action((words, options) => {
    const msg = Array.isArray(words) ? words.join(" ") : words;
    return chatCommand(msg, options);
  });

// 12. mint plan today / mint today
program
  .command("today")
  .description("Resumen diario de decisiones autónomas y presupuesto gestionado")
  .option("--json", "Salida en formato JSON")
  .action((options) => todayCommand(options));

program
  .command("plan [target]")
  .description("Plan de operaciones ('mint plan today')")
  .option("--json", "Salida en formato JSON")
  .action((target, options) => {
    const { planTodayCommand } = require("./commands/daemon");
    if (target === "today" || !target) {
      return planTodayCommand(options);
    }
    console.log(`Plan para '${target}' no reconocido. Usa 'mint plan today'.`);
  });

// 13. mint scan
program
  .command("scan")
  .description("Dispara un escaneo de desabastos y retrasos de transporte reales")
  .option("--json", "Salida en formato JSON")
  .action(async (options) => {
    const session = await getSession();
    const companyId = session?.companyId || "comp_default";
    try {
      const res = await triggerScanApi(companyId);
      if (options.json) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        console.log(`\n${theme.mintBold("🔍 ESCANEO PROACTIVO COMPLETADO")} [${companyId}]`);
        console.log(`   ${theme.dim("Desabastos encontrados:")} ${theme.bold(res.stockDeficitsFound)}`);
        console.log(`   ${theme.dim("Envíos retrasados:")}      ${theme.bold(res.delayedShipmentsFound)}`);
        console.log(`   ${theme.dim("Eventos disparados:")}     ${theme.bold(res.eventsTriggered)}`);
        console.log(`   ${theme.dim("Decisiones evaluadas:")}   ${theme.bold(res.processedDecisions.length)}\n`);
      }
    } catch (err: any) {
      console.error(theme.redBold(`❌ Error en escaneo: ${err.message}`));
    }
  });

// 14. mint source add / list
const sourceCmd = program.command("source").description("Gestión de fuentes de datos (CSV, SQL y Postgres solo lectura)");

sourceCmd
  .command("add <path>")
  .description("Conecta e importa un archivo CSV o fuente con mapeo asistido")
  .option("--name <name>", "Nombre personalizado para la fuente de datos")
  .option("--json", "Salida en formato JSON")
  .action((path, options) => {
    const { sourceAddCommand } = require("./commands/source");
    return sourceAddCommand(path, options);
  });

sourceCmd
  .command("list")
  .description("Lista las fuentes de datos conectadas para la empresa")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { sourceListCommand } = require("./commands/source");
    return sourceListCommand(options);
  });

// 15. mint autonomy get / set dry-run|assisted|auto
const autonomyCmd = program.command("autonomy").description("Control del nivel de autonomía del sistema (dry-run, assisted, auto)");

autonomyCmd
  .command("get")
  .description("Muestra el nivel de autonomía activo")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { autonomyGetCommand } = require("./commands/autonomy");
    return autonomyGetCommand(options);
  });

autonomyCmd
  .command("set <level>")
  .description("Establece el nivel de autonomía: dry-run, assisted, o auto")
  .option("--json", "Salida en formato JSON")
  .action((level, options) => {
    const { autonomySetCommand } = require("./commands/autonomy");
    return autonomySetCommand(level, options);
  });

// 16. mint daemon start|stop|status
const daemonCmd = program.command("daemon").description("Gestión del proceso autónomo en segundo plano");

daemonCmd
  .command("start")
  .description("Inicia el proceso en segundo plano que vigila fuentes y stock")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { daemonStartCommand } = require("./commands/daemon");
    return daemonStartCommand(options);
  });

daemonCmd
  .command("stop")
  .description("Detiene el proceso autónomo en segundo plano")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { daemonStopCommand } = require("./commands/daemon");
    return daemonStopCommand(options);
  });

daemonCmd
  .command("status")
  .description("Consulta el estado del proceso daemon")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { daemonStatusCommand } = require("./commands/daemon");
    return daemonStatusCommand(options);
  });

// 17. mint pause / resume
program
  .command("pause")
  .description("Interruptor de emergencia: pausa de inmediato la autonomía operativa")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { pauseCommand } = require("./commands/daemon");
    return pauseCommand(options);
  });

program
  .command("resume")
  .description("Reanuda la autonomía operativa pausada")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { resumeCommand } = require("./commands/daemon");
    return resumeCommand(options);
  });

// 18. mint watch
program
  .command("watch")
  .description("Feed en vivo de eventos, decisiones y acciones tomadas")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { watchCommand } = require("./commands/daemon");
    return watchCommand(options);
  });

// 19. mint notify add|test|list
const notifyCmd = program.command("notify").description("Gestión de notificaciones remotas y botones interactivos (Telegram, Slack, Gmail)");

notifyCmd
  .command("add <type>")
  .description("Agrega un canal de notificación: telegram, slack, o gmail")
  .option("--name <name>", "Nombre personalizado del canal")
  .option("--token <token>", "Token de bot (Telegram)")
  .option("--chat-id <chatId>", "Chat ID de destino (Telegram)")
  .option("--webhook <webhook>", "Webhook URL (Slack)")
  .option("--email <email>", "Correo electrónico (Gmail)")
  .option("--quiet-start <time>", "Inicio de horario silencioso (ej: 22:00)")
  .option("--quiet-end <time>", "Fin de horario silencioso (ej: 07:00)")
  .option("--json", "Salida en formato JSON")
  .action((type, options) => {
    const { notifyAddCommand } = require("./commands/notify");
    return notifyAddCommand(type, options);
  });

notifyCmd
  .command("test [type]")
  .description("Envía una notificación de prueba interactiva con botones firmados")
  .option("--json", "Salida en formato JSON")
  .action((type, options) => {
    const { notifyTestCommand } = require("./commands/notify");
    return notifyTestCommand(type || "telegram", options);
  });

notifyCmd
  .command("list")
  .description("Lista los canales de notificación configurados")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { notifyListCommand } = require("./commands/notify");
    return notifyListCommand(options);
  });

export function runCli(argv = process.argv) {
  if (argv.length <= 2) {
    printBanner();
  }
  program.parse(argv);
}

if (require.main === module) {
  runCli();
}
