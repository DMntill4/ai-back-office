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
  console.log(
    drawCard(
      [
        `${theme.dim("Welcome back,")} ${theme.bold(userName)}! (${userRole.toUpperCase()})  ${theme.dim("│")}  ${theme.dim("Company:")} ${theme.mintBold(companyDisplayName)} [${theme.dim(companyId)}]`,
        `${theme.dim("Daemon:")}       ${daemonBadge}  ${theme.dim("│")}  ${theme.dim("Memory:")} ${memMb} MB`,
        `${theme.dim("Status:")}       Autonomous agent is active, monitoring inventory and executing incoming sales.`,
        `${theme.dim("Commands:")}     ${theme.mintBold("/status")}  │  ${theme.mintBold("/stock")}  │  ${theme.mintBold("/orders")}  │  ${theme.mintBold("/inbox")}  │  ${theme.mintBold("/exit")}`,
      ],
      {
        title: "🍃 MINT AUTONOMOUS AGENT CONTROL CENTER",
        borderColor: theme.mint,
      },
    ),
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

    rl.on("close", () => {
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
            console.log("\n" + drawDivider("⚡ COMANDOS RÁPIDOS DEL AGENTE (SLASH COMMANDS)", 84));
            console.log(`  ${theme.mintBold("/setup")}                   Setup automático en 2 segundos (crea almacén, stock y proveedores)`);
            console.log(`  ${theme.mintBold("/status")} o ${theme.mintBold("/dash")}        Panel unificado de inventario, casos y alertas`);
            console.log(`  ${theme.mintBold("/today")}                    Resumen diario (Daily Briefing) de decisiones y gasto`);
            console.log(`  ${theme.mintBold("/stock")}                    Existencias en tiempo real de tu catálogo`);
            console.log(`  ${theme.mintBold("/inbox")}                    Bandeja de compras que esperan tu autorización`);
            console.log(`  ${theme.mintBold("/approve <id>")}            Aprobar una orden de compra pendiente`);
            console.log(`  ${theme.mintBold("/reject <id>")}             Rechazar una propuesta de compra`);
            console.log(`  ${theme.mintBold("/explain <id>")}            Explicación y árbol de deliberación del agente`);
            console.log(`  ${theme.mintBold("/simulate [shock]")}        Simular quiebre de stock en sandbox (what-if)`);
            console.log(`  ${theme.mintBold("/scan")}                    Disparar escaneo proactivo de stock y transporte ahora`);
            console.log(`  ${theme.mintBold("/orders")}                  Órdenes de compra registradas y en camino`);
            console.log(`  ${theme.mintBold("/auto [dry-run|assisted|auto]")} Cambiar nivel de autonomía`);
            console.log(`  ${theme.mintBold("/matrix")}                  Ver especialistas que deliberan en paralelo`);
            console.log(`  ${theme.mintBold("/clear")}                   Limpiar pantalla`);
            console.log(`  ${theme.mintBold("/exit")}                    Salir de la consola`);
            console.log(`\n  ${theme.cyanBold("💡 Tip:")} También puedes escribir directamente en lenguaje natural`);
            console.log(`     (ej: ${theme.dim('"¿hay stock bajo?"')}, ${theme.dim('"revisa los proveedores"')}) y el agente te responderá.\n`);
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
          const { triggerScanApi } = require("../client");
          console.log(theme.muted("🔍 Ejecutando escaneo proactivo de stock y transporte..."));
          const res = await triggerScanApi(companyId);
          console.log(
            `\n${theme.success("✔")} Escaneo completado: ${theme.bold(res.stockDeficitsFound)} desabastos, ${theme.bold(res.delayedShipmentsFound)} retrasos, ${theme.bold(res.processedDecisions.length)} decisiones procesadas.\n`,
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
