import { Command } from "commander";
import { printBanner } from "./ui/banner";
import { theme } from "./ui/theme";

export const program = new Command();

program
  .name("mint")
  .description("Mint CLI - Coordinador Logistico Autonomo y Operaciones Back Office")
  .version("2.5.0");

// Banner hook en invocación interactiva vacía
program.hook("preAction", (thisCommand, actionCommand) => {
  if (actionCommand.opts().json || thisCommand.opts().json) {
    return;
  }
});

// 0. mint start / mint agent
program
  .command("start")
  .alias("agent")
  .description("Inicia el sistema autónomo Mint (Daemon de fondo, Canales y Consola de Control)")
  .option("--headless", "Corre en segundo plano sin consola interactiva (ideal para servidores)")
  .option("--port <port>", "Puerto para el servidor de webhooks y API (por defecto: 3000)")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { startCommand } = require("./commands/start");
    return startCommand(options);
  });

// 0.1 mint setup [file]
program
  .command("setup [file]")
  .description("Configuración ultrarrápida de 1 paso en 2 segundos (empresa, almacén, catálogo, proveedores)")
  .option("--company <name>", "Nombre personalizado de la empresa")
  .option("--json", "Salida en formato JSON")
  .action((file, options) => {
    const { setupCommand } = require("./commands/setup");
    return setupCommand({ file, companyName: options.company, ...options });
  });

// 0.2 mint doctor / mint env
program
  .command("doctor")
  .alias("env")
  .description("Diagnóstico integral: entorno, PostgreSQL, API keys, canales, roles y mapeo de esquema")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { doctorCommand } = require("./commands/doctor");
    return doctorCommand(options);
  });

// 1. mint track <query>
program
  .command("track <query> [subaction]")
  .alias("rastreo")
  .description("Seguimiento en tiempo real de envíos, camiones, ETA y detección de incidencias")
  .option("--open", "Abre la ruta directamente en el navegador web")
  .option("--json", "Salida en formato JSON")
  .action((query, subaction, options) => {
    const { trackCommand } = require("./commands/track");
    return trackCommand(query, subaction, options);
  });

// 2. mint map [action] [table]
program
  .command("map [action] [table]")
  .alias("mapping")
  .description("Descubrimiento y mapeo seguro de tablas preexistentes del cliente (Tarea 0)")
  .option("--json", "Salida en formato JSON")
  .action((action, table, options) => {
    const { mappingCommand } = require("./commands/mapping");
    return mappingCommand(action || "show", table, options);
  });

// 3. mint questions [action] [targetId] [answer]
program
  .command("questions [action] [targetId] [answer...]")
  .alias("preguntas")
  .description("Banco de preguntas pendientes de datos faltantes en la BD (Verdad de datos)")
  .option("--json", "Salida en formato JSON")
  .action((action, targetId, answerWords, options) => {
    const { questionsCommand } = require("./commands/questions");
    const answer = Array.isArray(answerWords) ? answerWords.join(" ") : undefined;
    return questionsCommand(action || "list", targetId, answer, options);
  });

// 4. mint cancel <id>
program
  .command("cancel <id>")
  .description("Cancela una propuesta o acción pendiente en la bandeja antes de ejecutarse")
  .option("--json", "Salida en formato JSON")
  .action((id, options) => {
    const { inboxCommand } = require("./commands/inbox");
    return inboxCommand("cancel", id, options);
  });

// 5. mint reports [type] [format]
program
  .command("reports [type] [format]")
  .alias("reportes")
  .description("Reportes ejecutivos de tienda y finanzas: mint reports [briefing|stock|sales|orders|profit] [csv|pdf]")
  .action((type, format) => {
    const { reportsCommand } = require("./commands/reports");
    return reportsCommand(type, format);
  });

// 6. mint dashboard / mint status
program
  .command("dashboard")
  .alias("status")
  .description("Panel de control unificado: inventario, casos activos, daemon y notificaciones")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { dashboardCommand } = require("./commands/dashboard");
    return dashboardCommand(options);
  });

// 7. mint explain <id>
program
  .command("explain <id>")
  .description("Explica la deliberación multi-agente, evidencia y regla de política tras una decisión")
  .option("--json", "Salida en formato JSON")
  .action((id, options) => {
    const { explainCommand } = require("./commands/explain");
    return explainCommand(id, options);
  });

// 8. mint simulate [scenario]
program
  .command("simulate [scenario]")
  .description("Simula un escenario logístico what-if en sandbox (stockout, delay, price-spike)")
  .option("--sku <sku>", "SKU específico para la simulación")
  .option("--json", "Salida en formato JSON")
  .action((scenario, options) => {
    const { simulateCommand } = require("./commands/simulate");
    return simulateCommand(scenario || "stockout", options);
  });

// 9. mint console / mint repl
program
  .command("console")
  .alias("repl")
  .description("Consola interactiva con prompt permanente para operaciones continuas")
  .action(() => {
    const { consoleCommand } = require("./commands/console");
    return consoleCommand();
  });

// 10. mint team [list|invite|remove]
program
  .command("team [action] [arg]")
  .description("Gestión de equipo y control de acceso (RBAC): mint team list | mint team invite <email> | mint team remove <id>")
  .option("--name <name>", "Nombre completo del usuario")
  .option("--role <role>", "Rol en la organización: owner, admin, operator, driver, viewer")
  .option("--json", "Salida en formato JSON")
  .action((action, arg, options) => {
    const { teamCommand } = require("./commands/team");
    return teamCommand(action || "list", arg, options);
  });

// 11. mint login
program
  .command("login [email] [password]")
  .description("Inicia sesión contra el servidor y guarda el token cifrado en el keychain")
  .option("--json", "Salida en formato JSON")
  .action((email, password, options) => {
    const { loginCommand } = require("./commands/login");
    return loginCommand(email, password, options);
  });

// 12. mint logout
program
  .command("logout")
  .description("Cierra sesión y elimina el token del keychain seguro")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { logoutCommand } = require("./commands/whoami");
    return logoutCommand(options);
  });

// 13. mint whoami
program
  .command("whoami")
  .description("Muestra el usuario y empresa activa almacenada en el keychain")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { whoamiCommand } = require("./commands/whoami");
    return whoamiCommand(options);
  });

// 14. mint stock
program
  .command("stock")
  .description("Consulta existencias reales de inventario y estado de quiebre de stock")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { stockCommand } = require("./commands/stock");
    return stockCommand(options);
  });

// 15. mint db / mint database
program
  .command("db [subcommand] [args...]")
  .alias("database")
  .description("Gestión, re-sincronización y cambio de base de datos o catálogo (mint db [status|sync|switch])")
  .action((subcommand, args) => {
    const { databaseCommand } = require("./commands/database");
    const combined = subcommand ? [subcommand, ...(args || [])] : [];
    return databaseCommand(combined);
  });

// 16. mint app / mint desktop
program
  .command("app")
  .alias("desktop")
  .alias("web")
  .description("Abre la Mint Desktop App (Torre de Control Logística Visual)")
  .option("--no-open", "No abrir la ventana de la aplicación automáticamente")
  .action((options) => {
    const { appCommand } = require("./commands/app");
    return appCommand(options);
  });

// 17. mint logistics
program
  .command("logistics [subcommand] [args...]")
  .alias("gps")
  .description("Torre de Control Logística: mint logistics [overview|dispatch|receive|consolidate|rebalance|gps|route]")
  .action((subcommand, args) => {
    const { logisticsCommand } = require("./commands/logistics");
    return logisticsCommand(subcommand, args || []);
  });

// 18. mint channels
program
  .command("channels [action] [arg1] [arg2]")
  .alias("channel")
  .alias("webhooks")
  .description("Administra y prueba canales y webhooks (Discord / Slack / Telegram): mint channels [list|add|test|remove]")
  .action((action, arg1, arg2) => {
    const { channelsCommand } = require("./commands/channels");
    return channelsCommand(action, arg1, arg2);
  });

// 19. mint settings / mint config
program
  .command("settings")
  .alias("config")
  .description("Muestra y audita la configuración operativa, canales de alerta y gobernanza HITL")
  .action(() => {
    const { settingsCommand } = require("./commands/channels");
    return settingsCommand();
  });

// 20. mint orders -> Redirigido a propuestas de recomendacion en inbox
program
  .command("orders")
  .description("Consulta las propuestas y recomendaciones de reabastecimiento en el Inbox")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    if (!options.json) {
      console.log(theme.dim("\n[AVISO] MINT no emite órdenes ni contacta directamente a proveedores."));
      console.log(theme.mint("Mostrando propuestas de recomendación de reabastecimiento en el Inbox:\n"));
    }
    const { inboxCommand } = require("./commands/inbox");
    return inboxCommand("list", undefined, options);
  });

// 21. mint inbox
program
  .command("inbox [action] [id]")
  .description("Bandeja de decisiones (HITL): mint inbox | mint inbox approve <id> | mint inbox reject <id>")
  .option("--json", "Salida en formato JSON")
  .action((action, id, options) => {
    const { inboxCommand } = require("./commands/inbox");
    return inboxCommand(action, id, options);
  });

// 22. mint chat
program
  .command("chat <message...>")
  .description("Envía una consulta operativa al Agente Autónomo Mint")
  .option("--json", "Salida en formato JSON")
  .action((words, options) => {
    const { chatCommand } = require("./commands/chat");
    const msg = Array.isArray(words) ? words.join(" ") : words;
    return chatCommand(msg, options);
  });

// 23. mint today
program
  .command("today")
  .description("Resumen diario de decisiones autónomas y presupuesto gestionado")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { todayCommand } = require("./commands/chat");
    return todayCommand(options);
  });

// 24. mint data-health
program
  .command("data-health")
  .alias("datahealth")
  .description("Auditoría de calidad y salud de datos por módulo con compuerta de decisión")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { dataHealthCommand } = require("./commands/dataHealth");
    return dataHealthCommand(options);
  });

// 25. mint quarantine [action] [id]
program
  .command("quarantine [action] [id]")
  .alias("cuarentena")
  .description("Gestión de registros corruptos o hostiles aislados en mesa de cuarentena")
  .action((action, id) => {
    const { quarantineCommand } = require("./commands/dataHealth");
    return quarantineCommand([action, id].filter(Boolean));
  });

// mint feed / live
program
  .command("feed")
  .alias("live")
  .description("Canal de escucha reactivo: Live feed de eventos y decisiones autónomas en tiempo real")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { watchCommand } = require("./commands/daemon");
    return watchCommand(options);
  });

// mint agents [action]
program
  .command("agents [action]")
  .alias("agentes")
  .description("Panel de control y ejecución de orquestación de los 4 subagentes especialistas")
  .action((action) => {
    const { agentsCommand } = require("./commands/agents");
    return agentsCommand(action);
  });

// 26. mint shadow [action] [days]
program
  .command("shadow [action] [days]")
  .description("Control y reporte del Modo Sombra (simulación sin riesgo y comparación)")
  .action((action, days) => {
    const { shadowCommand } = require("./commands/shadow");
    return shadowCommand([action, days].filter(Boolean));
  });

// 27. mint briefing
program
  .command("briefing")
  .description("Resumen ejecutivo diario: ventas, ganancias, quiebres inminentes y retrasos")
  .action(() => {
    const { briefingCommand } = require("./commands/briefing");
    return briefingCommand();
  });

// 28. mint reconcile
program
  .command("reconcile")
  .alias("conciliar")
  .description("Conciliación de 3 vías: ventas vs cobros vs despachos")
  .action(() => {
    const { reconcileCommand } = require("./commands/reconcile");
    return reconcileCommand();
  });

// 29. mint backup
program
  .command("backup")
  .description("Exportación de copia de seguridad de configuración y memoria MINT")
  .action(() => {
    const { backupCommand } = require("./commands/briefing");
    return backupCommand();
  });

// 30. mint memory / mint obsidian
program
  .command("memory [action] [target]")
  .alias("obsidian")
  .description("Gestión de memoria viva y persistente en Obsidian Vault (Markdown y WikiLinks)")
  .option("--json", "Salida en formato JSON")
  .action((action, target, options) => {
    const { memoryCommand } = require("./commands/memory");
    return memoryCommand(action, target, options);
  });

// 31. mint source [subcommand] [target]
program
  .command("source [subcommand] [target]")
  .description("Gestión e ingestión de fuentes de datos (discover, inspect, add, status, list, test)")
  .option("--sheet <sheet>", "Nombre de hoja de Excel")
  .option("--table <table>", "Nombre de tabla SQLite o PostgreSQL")
  .option("--name <name>", "Nombre personalizado para la fuente")
  .option("--force", "Aceptar cambio de esquema (drift)")
  .option("--json", "Salida en formato JSON")
  .action((subcommand, target, options) => {
    const {
      sourceDiscoverCommand,
      sourceInspectCommand,
      sourceAddCommand,
      sourceStatusCommand,
      sourceListCommand,
      sourceTestCommand,
    } = require("./commands/source");

    const sub = (subcommand || "list").toLowerCase();
    if (sub === "discover") return sourceDiscoverCommand(target, options);
    if (sub === "inspect") return sourceInspectCommand(target, options);
    if (sub === "add") return sourceAddCommand(target, options);
    if (sub === "status") return sourceStatusCommand(options);
    if (sub === "test") return sourceTestCommand(target, options);
    return sourceListCommand(options);
  });

// 32. mint demo [action]
program
  .command("demo [action]")
  .description("Modo demo sandbox con datos aislados de prueba (enter, exit)")
  .option("--json", "Salida en formato JSON")
  .action((action, options) => {
    const { demoCommand } = require("./commands/demo");
    return demoCommand(action, options);
  });

// 33. mint selftest
program
  .command("selftest")
  .description("Verificación y aserción de producción: BD, memoria, canales, roles y agentes [OK/ERROR]")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { selftestCommand } = require("./commands/selftest");
    return selftestCommand(options);
  });

// 34. mint audit
program
  .command("audit")
  .alias("auditoria")
  .description("Canal de auditoría inmutable de eventos y decisiones operativas")
  .option("--limit <number>", "Límite de registros a mostrar", "50")
  .option("--user <name>", "Filtrar por usuario o actor")
  .option("--date <YYYY-MM-DD>", "Filtrar por fecha específica")
  .option("--module <module>", "Filtrar por módulo (stock, ventas, logistica, compras, config)")
  .option("--json", "Salida en formato JSON")
  .action((options) => {
    const { auditCommand } = require("./commands/audit");
    return auditCommand({
      limit: parseInt(options.limit, 10) || 50,
      user: options.user,
      date: options.date,
      module: options.module,
      json: options.json,
    });
  });

// 35. mint customers
program
  .command("customers")
  .alias("clientes")
  .description("Cartera de clientes, clientes en riesgo de abandono y top de mayor valor")
  .action(() => {
    const { customersCommand } = require("./commands/customers");
    return customersCommand();
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
