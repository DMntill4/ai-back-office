import { Command } from "commander";
import { loginCommand } from "./commands/login";
import { logoutCommand, whoamiCommand } from "./commands/whoami";
import { stockCommand, ordersCommand } from "./commands/stock";
import { inboxCommand } from "./commands/inbox";
import { chatCommand, todayCommand } from "./commands/chat";
import { triggerScanApi } from "./client";
import { getSession } from "./keychain";

export const program = new Command();

program
  .name("mint")
  .description("🍃 Mint CLI - Coordinador Logístico Autónomo y Operaciones Back Office")
  .version("2.0.0");

// 1. mint login
program
  .command("login [email] [password]")
  .description("Inicia sesión contra el servidor y guarda el token cifrado en el keychain")
  .option("--json", "Salida en formato JSON")
  .action((email, password, options) => loginCommand(email, password, options));

// 2. mint logout
program
  .command("logout")
  .description("Cierra sesión y elimina el token del keychain seguro")
  .option("--json", "Salida en formato JSON")
  .action((options) => logoutCommand(options));

// 3. mint whoami
program
  .command("whoami")
  .description("Muestra el usuario y empresa activa almacenada en el keychain")
  .option("--json", "Salida en formato JSON")
  .action((options) => whoamiCommand(options));

// 4. mint stock
program
  .command("stock")
  .description("Consulta existencias reales de inventario y estado de quiebre de stock")
  .option("--json", "Salida en formato JSON")
  .action((options) => stockCommand(options));

// 5. mint orders
program
  .command("orders")
  .description("Consulta las órdenes de compra emitidas a proveedores homologados")
  .option("--json", "Salida en formato JSON")
  .action((options) => ordersCommand(options));

// 6. mint inbox
program
  .command("inbox [action] [id]")
  .description("Bandeja de decisiones (HITL): mint inbox | mint inbox approve <id> | mint inbox reject <id>")
  .option("--json", "Salida en formato JSON")
  .action((action, id, options) => inboxCommand(action, id, options));

// 7. mint chat
program
  .command("chat <message...>")
  .description("Envía una consulta operativa al Agente Autónomo Mint")
  .option("--json", "Salida en formato JSON")
  .action((words, options) => {
    const msg = Array.isArray(words) ? words.join(" ") : words;
    return chatCommand(msg, options);
  });

// 8. mint plan today / mint today
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
    if (target === "today" || !target) {
      return todayCommand(options);
    }
    console.log(`Plan para '${target}' no reconocido. Usa 'mint plan today'.`);
  });

// 9. mint scan
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
        console.log(`\n🔍 Escaneo completado para empresa: ${companyId}`);
        console.log(`   Desabastos encontrados: ${res.stockDeficitsFound}`);
        console.log(`   Envíos retrasados:      ${res.delayedShipmentsFound}`);
        console.log(`   Eventos disparados:     ${res.eventsTriggered}`);
        console.log(`   Decisiones evaluadas:   ${res.processedDecisions.length}\n`);
      }
    } catch (err: any) {
      console.error(`❌ Error en escaneo: ${err.message}`);
    }
  });

// 10. mint source add / list
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

export function runCli(argv = process.argv) {
  program.parse(argv);
}

if (require.main === module) {
  runCli();
}
