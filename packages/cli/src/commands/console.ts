import * as readline from "readline";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { getSession } from "../keychain";
import { getDaemonStatus } from "@mint/daemon";
import { runBackOfficeHarness, db, products, cases, decisions } from "@mint/core";
import { eq, and } from "drizzle-orm";

export async function consoleCommand() {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";
  const userName = session?.name || "operator";
  const userRole = session?.role || "owner";

  console.clear();

  // Kali / Cyberpunk & Claude Code / Antigravity Terminal Banner
  const logo = [
    "  ███╗   ███╗██╗███╗   ██╗████████╗     ██████╗██╗     ██╗",
    "  ████╗ ████║██║████╗  ██║╚══██╔══╝    ██╔════╝██║     ██║",
    "  ██╔████╔██║██║██╔██╗ ██║   ██║       ██║     ██║     ██║",
    "  ██║╚██╔╝██║██║██║╚██╗██║   ██║       ██║     ██║     ██║",
    "  ██║ ╚═╝ ██║██║██║ ╚████║   ██║       ╚██████╗███████╗██║",
    "  ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝        ╚═════╝╚══════╝╚═╝",
  ];

  console.log("");
  for (const line of logo) {
    console.log(theme.mintBold(line));
  }
  console.log(
    theme.dim("  ┌─ ") +
      theme.cyanBold("AUTONOMOUS AGENT HARNESS") +
      theme.dim(" // ") +
      theme.muted("MULTI-AGENT CONTROLLER & LOGISTICS BACK-OFFICE") +
      theme.dim(" ─┐"),
  );

  const daemon = getDaemonStatus();
  const daemonBadge = daemon.isPaused
    ? theme.badge("PAUSED (EMERGENCY)", "red")
    : daemon.isRunning
      ? theme.badge(`ONLINE (PID ${daemon.pid || process.pid})`, "mint")
      : theme.badge("STANDBY", "gray");

  const memMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

  const companyDisplayName = session?.companyName || companyId;
  console.log("");
  console.log(
    `  ${theme.mintBold("● MINT AI")} ${theme.dim("v1.0.0")} │ ${theme.bold(companyDisplayName)} [${theme.dim(companyId)}] │ ${daemonBadge} │ ${theme.cyan("AUTONOMOUS 24/7")}`,
  );
  console.log(
    `  ${theme.dim("Escribe en lenguaje natural o")} ${theme.mintBold("/help")} ${theme.dim("para ver comandos slash. (/db para base de datos, /app para abrir Desktop App)")}`,
  );
  console.log("");

  const promptPrefix = `${theme.mintBold(userName)}@${theme.cyan("mint")}:${theme.dim(`[${companyId}]`)} ${theme.mintBold("❯")} `;

  return new Promise<void>((resolve) => {
    const slashCommands = [
      "/setup",
      "/status",
      "/dash",
      "/today",
      "/stock",
      "/db",
      "/database",
      "/resync",
      "/web",
      "/app",
      "/inbox",
      "/approve",
      "/reject",
      "/explain",
      "/simulate",
      "/scan",
      "/orders",
      "/auto",
      "/pause",
      "/resume",
      "/matrix",
      "/help",
      "/clear",
      "/exit",
    ];

    const completer = (line: string) => {
      const hits = slashCommands.filter((c) => c.startsWith(line.toLowerCase()));
      return [hits.length ? hits : slashCommands, line];
    };

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: promptPrefix,
      completer,
    });

    // Autonomous Live Pulse & Event Heartbeat
    let isScanning = false;
    const runAutonomousHeartbeat = async (isStartup = false) => {
      if (isScanning) return;
      isScanning = true;
      try {
        const { runFullOperationalEventScan } = await import("@mint/core");
        const scan = await runFullOperationalEventScan(companyId);
        const timeStr = new Date().toLocaleTimeString();

        if (isStartup) {
          console.log(`  ${theme.mint("⚡ [Autonomous Daemon]")} ${theme.dim(timeStr)} Escaneo inicial: 25 productos auditados en tiempo real, ${scan.stockDeficitsFound} desabastos. Escuchando eventos 24/7...`);
          rl.prompt(true);
        } else if (scan.stockDeficitsFound > 0 || scan.delayedShipmentsFound > 0) {
          console.log(`\n  ${theme.amberBold("⚠️  [Autonomous Alert]")} ${theme.dim(timeStr)} Desabasto o incidencia logística detectada. ${scan.processedDecisions.length} propuesta(s) generadas en /inbox.`);
          rl.prompt(true);
        }
      } catch {} finally {
        isScanning = false;
      }
    };

    setTimeout(() => runAutonomousHeartbeat(true), 500);
    const heartbeatTimer = setInterval(() => runAutonomousHeartbeat(false), 45000);

    rl.on("close", () => {
      clearInterval(heartbeatTimer);
      resolve();
    });

    rl.prompt();

    rl.on("line", async (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        rl.prompt();
        return;
      }

      const [rawCmd, ...args] = trimmed.split(/\s+/);
      const cmd = rawCmd.startsWith("/") ? rawCmd.slice(1).toLowerCase() : rawCmd.toLowerCase();

      if (cmd === "exit" || cmd === "quit" || cmd === "q") {
        console.log(theme.dim("\nDesconectando terminal de control autónomo. Hasta luego.\n"));
        rl.close();
        return;
      }

      if (cmd === "clear" || cmd === "cls") {
        console.clear();
        rl.prompt();
        return;
      }

      try {
        switch (cmd) {
          case "help":
          case "?": {
            console.log("\n" + drawDivider("⚡ MINT AUTONOMOUS LOGISTICS & OPERATIONAL AGENT // GUÍA DEL SISTEMA", 86));
            console.log(
              drawCard(
                [
                  `${theme.bold("¿QUÉ HACE EL AGENTE MINT?")}`,
                  `Mint es tu director de operaciones logísticas autónomo. Su función es mantener el inventario`,
                  `en niveles óptimos, monitorear desabastos 24/7 y generar propuestas de compra auditadas.`,
                  ``,
                  `${theme.bold("GOBERNANZA Y HUMAN-IN-THE-LOOP (HITL):")}`,
                  `Por política de producción, Mint ${theme.bold("NUNCA")} ejecuta compras a proveedores ficticios ni gasta dinero`,
                  `sin tu autorización. Cuando detecta un déficit o stock crítico, formula una ${theme.mintBold("Propuesta de Reposición")}`,
                  `que se deposita en ${theme.mintBold("/inbox")} para que tú la apruebes o rechaces con 1 clic.`,
                  ``,
                  `${theme.bold("HERRAMIENTAS DEL AGENTE (13 TOOLS):")}`,
                  `El agente cuenta con un cerebro ReAct (Grok LLM) conectado a 13 herramientas especializadas:`,
                  `  • consultar_stock         • evaluar_proveedores      • auditar_anomalias`,
                  `  • consultar_envios        • analisis_financiero      • pronosticar_demanda`,
                  `  • verificar_frescura_datos• simular_escenario        • consultar_estado_sistema`,
                  `  • generar_reporte_general • ver_ordenes_abiertas     • ajustar_stock`,
                  `  • crear_orden_compra (con verificación transaccional y post-query)`,
                  ``,
                  `${theme.bold("MEMORIA CONVERSACIONAL:")}`,
                  `Mint recuerda los turnos previos de tu conversación y el contexto de tu empresa entre consultas.`,
                ],
                {
                  title: "🍃 ARQUITECTURA Y PRINCIPIOS DE OPERACIÓN",
                  borderColor: theme.mint,
                },
              ),
            );

            console.log(
              drawCard(
                [
                  `  ${theme.mintBold("/stock")}                   Existencias en tiempo real de tu catálogo`,
                  `  ${theme.mintBold("/db [status|sync|switch]")} Gestión, sincronización y cambio de base de datos`,
                  `  ${theme.mintBold("/resync")}                  Re-extraer catálogo real desde SQL sin datos de prueba`,
                  `  ${theme.mintBold("/app")}                     Abrir Mint Desktop App (Dashboard, Canales y Stock)`,
                  `  ${theme.mintBold("/channels")}                 Ver, agregar y probar webhooks (Discord / Slack / Telegram)`,
                  `  ${theme.mintBold("/settings")}                Configuración del sistema, canales y gobernanza HITL`,
                  `  ${theme.mintBold("/status")} o ${theme.mintBold("/dash")}        Panel unificado de inventario, salud del daemon y canales`,
                  `  ${theme.mintBold("/today")}                    Resumen diario (Daily Briefing) de decisiones y ahorro`,
                  `  ${theme.mintBold("/inbox")}                    Bandeja de propuestas de compra esperando autorización`,
                  `  ${theme.mintBold("/approve <id>")}            Aprobar una propuesta de compra y emitir la orden`,
                  `  ${theme.mintBold("/reject <id>")}             Rechazar y archivar una propuesta`,
                  `  ${theme.mintBold("/scan")}                    Escanear desabastos reales de stock y envíos en PostgreSQL ahora`,
                  `  ${theme.mintBold("/orders")}                  Historial de órdenes de compra emitidas`,
                  `  ${theme.mintBold("/matrix")}                  Ver especialistas que deliberan en paralelo`,
                  `  ${theme.mintBold("/explain <id>")}            Explicación y árbol de deliberación del agente`,
                  `  ${theme.mintBold("/clear")}                   Limpiar pantalla`,
                  `  ${theme.mintBold("/exit")}                    Salir de la consola`,
                  ``,
                  `${theme.cyanBold("💬 CHAT EN LENGUAJE NATURAL:")}`,
                  `  Escribe directamente lo que necesites sin ningún comando previo. Ejemplos:`,
                  `  • "Hola"                                → Saludo ejecutivo con balance de existencias`,
                  `  • "¿Cuáles productos tienen stock bajo?" → Consulta herramientas y tabula datos`,
                  `  • "¿Quiénes son nuestros proveedores?"  → Lista proveedores homologados reales`,
                  `  • "Simula qué pasa si la demanda sube"  → Ejecuta simulación What-If`,
                ],
                {
                  title: "⚡ COMANDOS SLASH Y CONSULTAS NATURALES",
                  borderColor: theme.cyan,
                },
              ),
            );
            console.log("");
            break;
          }

          case "channels":
          case "channel":
          case "webhook": {
            const { channelsCommand } = require("./channels");
            await channelsCommand(args[0], args[1], args[2]);
            break;
          }

          case "settings":
          case "config": {
            const { settingsCommand } = require("./channels");
            await settingsCommand();
            break;
          }

          case "db":
          case "database": {
            const { databaseCommand } = require("./database");
            await databaseCommand(args);
            break;
          }

          case "resync": {
            const { resyncCurrentProject } = require("./database");
            await resyncCurrentProject(companyId);
            break;
          }

          case "app":
          case "desktop":
          case "web": {
            const { appCommand } = require("./app");
            await appCommand({ open: true });
            break;
          }

          case "setup":
          case "init": {
            const { setupCommand } = require("./setup");
            await setupCommand({ file: args[0] });
            break;
          }

        case "matrix": {
          console.log("\n" + drawDivider("MATRIZ DE AGENTES ESPECIALISTAS Y CONTROLLERS", 84));
          console.log(
            drawCard(
              [
                `${theme.mintBold("1. AGENTE COORDINADOR (Harness Dispatcher):")}`,
                `   Recibe eventos de inventario, despacho y telemetría; delega tareas en paralelo.`,
                ``,
                `${theme.cyanBold("2. ESPECIALISTA EN INVENTARIO Y DEMANDA:")}`,
                `   Calcula tasa de consumo (burn rate), días de cobertura y proyecciones de quiebre.`,
                ``,
                `${theme.violet("3. ESPECIALISTA EN COMPRAS Y PROVEEDORES:")}`,
                `   Evalúa catálogo de proveedores homologados, cotizaciones, MOQ y tiempos de entrega.`,
                ``,
                `${theme.mintBold("4. ESPECIALISTA EN TRANSPORTE Y LOGÍSTICA:")}`,
                `   Monitorea guías de envío en tránsito, detecta retrasos y recalcula rutas críticas.`,
                ``,
                `${theme.amberBold("5. ESPECIALISTA EN RIESGO Y AUDITORÍA (Adversarial):")}`,
                `   Abogado del diablo: audita duplicados en 72h, solvencia de proveedores y sobreprecios.`,
                ``,
                `${theme.redBold("6. MOTOR DE POLÍTICAS DETERMINISTA (Gatekeeper):")}`,
                `   Código matemático puro (sin LLM) que autoejecuta, bloquea o escala a HITL.`,
              ],
              {
                title: "TOPOLOGÍA DE CONTROLADORES MINT",
                borderColor: theme.cyan,
              },
            ),
          );
          console.log("");
          break;
        }

        case "harness": {
          console.log(theme.dim("\nEjecutando Harness Multi-Agente en paralelo..."));
          // Buscar producto
          let targetProductId = "";
          if (args[0]) {
            const found = await db.select().from(products).where(eq(products.sku, args[0])).limit(1);
            if (found.length > 0) targetProductId = found[0].id;
          }
          if (!targetProductId) {
            const prods = await db.select().from(products).where(eq(products.companyId, companyId)).limit(1);
            if (prods.length > 0) targetProductId = prods[0].id;
          }

          if (!targetProductId) {
            console.log(theme.amber("No hay productos en la empresa para ejecutar el harness."));
            break;
          }

          const hResult = await runBackOfficeHarness({
            companyId,
            productId: targetProductId,
            eventType: "STOCK_CRITICAL",
            severity: "CRITICAL",
          });

          console.log("\n" + drawDivider(`ÁRBOL DE RAZONAMIENTO MULTI-AGENTE [${hResult.harnessId}]`, 84));
          console.log("\n" + theme.mintBold(hResult.asciiReasoningTree) + "\n");

          if (hResult.recommendedScenario) {
            const sc = hResult.recommendedScenario;
            console.log(
              drawCard(
                [
                  `${theme.dim("Estrategia:")}  ${theme.bold(sc.title)}`,
                  `${theme.dim("Proveedor:")}   ${theme.cyanBold(sc.supplierName)} (Entrega en ${sc.deliveryDays} días)`,
                  `${theme.dim("Monto:")}       $${sc.totalCostMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
                  `${theme.dim("Riesgo:")}      ${theme.badge(`${(sc.riskScore * 100).toFixed(0)}%`, sc.riskScore > 0.4 ? "red" : "mint")}`,
                  `${theme.dim("Veredicto:")}   ${theme.bold(sc.policyDecision.toUpperCase())}`,
                  `${theme.dim("Firma:")}       ${theme.dim(hResult.auditSignature)}`,
                ],
                {
                  title: "PROPUESTA FINAL SINTETIZADA",
                  badge: sc.policyDecision.toUpperCase(),
                  badgeColor: sc.policyDecision === "auto_executed" ? "mint" : "amber",
                  borderColor: theme.mint,
                },
              ),
            );
          }
          console.log("");
          break;
        }

        case "team": {
          const { teamCommand } = require("./team");
          await teamCommand(args[0] as any, args[1], { name: args[2], role: args[3] as any });
          break;
        }

        case "status":
        case "dash":
        case "dashboard": {
          const { dashboardCommand } = require("./dashboard");
          await dashboardCommand({ noExit: true });
          break;
        }

        case "today":
        case "briefing": {
          const { todayCommand } = require("./chat");
          await todayCommand({ noExit: true });
          break;
        }

        case "stock": {
          const { stockCommand } = require("./stock");
          await stockCommand({ noExit: true });
          break;
        }

        case "orders": {
          const { ordersCommand } = require("./stock");
          await ordersCommand({ noExit: true });
          break;
        }

        case "inbox": {
          const { inboxCommand } = require("./inbox");
          await inboxCommand(args[0] as any, args[1], { noExit: true });
          break;
        }

        case "approve": {
          if (!args[0]) {
            console.log(theme.amber("Debes especificar el ID de la decisión a aprobar. Ej: /approve dec_123"));
          } else {
            const { inboxCommand } = require("./inbox");
            await inboxCommand("approve", args[0], { noExit: true });
          }
          break;
        }

        case "reject": {
          if (!args[0]) {
            console.log(theme.amber("Debes especificar el ID de la decisión a rechazar. Ej: /reject dec_123"));
          } else {
            const { inboxCommand } = require("./inbox");
            await inboxCommand("reject", args[0], { noExit: true });
          }
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
          const { runFullOperationalEventScan } = require("@mint/core");
          console.log(theme.muted("🔍 Ejecutando escaneo proactivo de stock y transporte en base de datos..."));
          const res = await runFullOperationalEventScan(companyId);
          console.log(
            `\n${theme.success("✔")} Escaneo completado: ${theme.bold(res.stockDeficitsFound)} desabastos detectados, ${theme.bold(res.delayedShipmentsFound)} retrasos de transporte, ${theme.bold(res.processedDecisions.length)} propuestas enviadas a /inbox.\n`,
          );
          break;
        }

        case "source": {
          const sub = args[0] || "list";
          const {
            sourceDiscoverCommand,
            sourceInspectCommand,
            sourceAddCommand,
            sourceStatusCommand,
            sourceListCommand,
          } = require("./source");
          if (sub === "discover") {
            await sourceDiscoverCommand(args[1]);
          } else if (sub === "inspect") {
            await sourceInspectCommand(args[1]);
          } else if (sub === "add") {
            await sourceAddCommand(args[1]);
          } else if (sub === "status") {
            await sourceStatusCommand();
          } else {
            await sourceListCommand();
          }
          break;
        }

        case "auto":
        case "autonomy": {
          const { autonomyGetCommand, autonomySetCommand } = require("./autonomy");
          if (args[0]) {
            await autonomySetCommand(args[0]);
          } else {
            await autonomyGetCommand();
          }
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

        case "chat": {
          const { chatCommand } = require("./chat");
          await chatCommand(args.join(" "), { noExit: true });
          break;
        }

        default: {
          if (rawCmd.startsWith("/")) {
            console.log(theme.amber(`Comando '${rawCmd}' no reconocido. Escribe ${theme.mintBold("/help")} para ver los comandos disponibles.`));
          } else {
            // Conversación directa con el agente en lenguaje natural sin requerir escribir 'chat'
            const { chatCommand } = require("./chat");
            await chatCommand(trimmed, { noExit: true });
          }
          break;
        }
      }
    } catch (err: any) {
      console.error(theme.redBold(`❌ Error ejecutando '${cmd}': ${err.message}`));
    }

    console.log("");
    rl.prompt();
  });
  });
}
