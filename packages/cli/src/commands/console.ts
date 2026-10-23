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

  console.log(
    drawCard(
      [
        `${theme.dim("Operador:")}   ${theme.bold(userName)} (${userRole.toUpperCase()})  ${theme.dim("│")}  ${theme.dim("Tenant:")} ${theme.mintBold(companyId)}`,
        `${theme.dim("Daemon:")}     ${daemonBadge}  ${theme.dim("│")}  ${theme.dim("Memoria:")} ${memMb} MB`,
        `${theme.dim("Harness:")}    Agentes Paralelos: Inventario, Compras, Transporte, Riesgo Adversarial`,
        `${theme.dim("Comandos:")}   Escribe ${theme.mintBold("help")} para comandos, ${theme.mintBold("matrix")} para ver agentes, o ${theme.mintBold("exit")} para salir.`,
      ],
      {
        title: "KALI-GRADE AGENT CONTROL CENTER",
        borderColor: theme.mint,
      },
    ),
  );
  console.log("");

  const promptPrefix = `${theme.mintBold(userName)}@${theme.cyan("mint")}:${theme.dim(`[${companyId}]`)} ${theme.mintBold("❯")} `;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: promptPrefix,
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }

    if (trimmed === "exit" || trimmed === "quit" || trimmed === "q") {
      console.log(theme.dim("\nDesconectando terminal de control autónomo. Hasta luego.\n"));
      rl.close();
      return;
    }

    if (trimmed === "clear" || trimmed === "cls") {
      console.clear();
      rl.prompt();
      return;
    }

    const [cmd, ...args] = trimmed.split(/\s+/);

    try {
      switch (cmd.toLowerCase()) {
        case "help":
        case "?": {
          console.log("\n" + drawDivider("MANUAL DE COMANDOS DEL OPERADOR (CLI HARNESS)", 80));
          console.log(`  ${theme.mintBold("harness [sku]")}            Ejecutar harness autónomo con árbol de resolución ASCII`);
          console.log(`  ${theme.mintBold("matrix")}                   Visualizar matriz de especialistas y sus responsabilidades`);
          console.log(`  ${theme.mintBold("status / dashboard")}       Panel unificado de inventario, casos y canales`);
          console.log(`  ${theme.mintBold("stock")}                    Existencias en tiempo real y detección de quiebres`);
          console.log(`  ${theme.mintBold("orders")}                   Órdenes de compra registradas y en tránsito`);
          console.log(`  ${theme.mintBold("inbox")}                    Bandeja HITL de decisiones pendientes de firma`);
          console.log(`  ${theme.mintBold("explain <id>")}             Explicación profunda de razonamiento y regla de política`);
          console.log(`  ${theme.mintBold("simulate [shock]")}         Simular choques what-if (stockout, delay, price-spike)`);
          console.log(`  ${theme.mintBold("team [list|invite]")}       Gestión de usuarios y permisos RBAC del tenant`);
          console.log(`  ${theme.mintBold("scan")}                     Disparar escaneo proactivo de stock y transporte`);
          console.log(`  ${theme.mintBold("autonomy [nivel]")}         Consultar o fijar nivel (dry-run, assisted, auto)`);
          console.log(`  ${theme.mintBold("pause / resume")}           Interruptor de emergencia del daemon`);
          console.log(`  ${theme.mintBold("chat <mensaje>")}           Conversación directa con el Coordinador ReAct`);
          console.log(`  ${theme.mintBold("clear")}                    Limpiar pantalla`);
          console.log(`  ${theme.mintBold("exit")}                     Salir de la consola interactiva\n`);
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
          console.log(theme.muted("🔍 Ejecutando escaneo proactivo de stock y transporte..."));
          const res = await triggerScanApi(companyId);
          console.log(
            `\n${theme.success("✔")} Escaneo completado: ${theme.bold(res.stockDeficitsFound)} desabastos, ${theme.bold(res.delayedShipmentsFound)} retrasos, ${theme.bold(res.processedDecisions.length)} decisiones procesadas.\n`,
          );
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
          await chatCommand(args.join(" "));
          break;
        }

        default:
          console.log(theme.amber(`Comando '${cmd}' no reconocido. Escribe 'help' para ver los comandos disponibles.`));
      }
    } catch (err: any) {
      console.error(theme.redBold(`❌ Error ejecutando '${cmd}': ${err.message}`));
    }

    console.log("");
    rl.prompt();
  });
}
