import * as readline from "readline";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { getSession } from "../keychain";
import { getDaemonStatus } from "@mint/daemon";
import {
  runBackOfficeHarness,
  db,
  products,
  decisions,
  shipments,
  warehouses,
  analyzeDynamicCatalogHealth,
  buildConsolidatedLoadPlans,
} from "@mint/core";
import { eq, and } from "drizzle-orm";

export async function consoleCommand() {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";
  const userName = session?.name || "operator";

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
      theme.cyanBold("AUTONOMOUS LOGISTICS CONTROL TOWER") +
      theme.dim(" // ") +
      theme.muted("MULTI-AGENT SUPPLY CHAIN & GPS COORDINATOR") +
      theme.dim(" ─┐"),
  );

  const daemon = getDaemonStatus();
  const daemonBadge = daemon.isPaused
    ? theme.badge("PAUSED (EMERGENCY)", "red")
    : daemon.isRunning
      ? theme.badge(`ONLINE (PID ${daemon.pid || process.pid})`, "mint")
      : theme.badge("STANDBY", "gray");

  const companyDisplayName = session?.companyName || companyId;
  console.log("");
  console.log(
    `  ${theme.mintBold("● MINT AI")} ${theme.dim("v2.5.0")} │ ${theme.bold(companyDisplayName)} [${theme.dim(companyId)}] │ ${daemonBadge} │ ${theme.cyan("AUTONOMOUS 24/7")}`,
  );

  // Flight-Deck Startup Snapshot (Live Telemetry)
  try {
    const [prods, whs, ships, pendingDecs, health, loads] = await Promise.all([
      db.select().from(products).where(eq(products.companyId, companyId)),
      db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
      db.select().from(shipments).where(eq(shipments.companyId, companyId)),
      db
        .select()
        .from(decisions)
        .where(and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "escalated_to_human"))),
      analyzeDynamicCatalogHealth(companyId).catch(() => []),
      buildConsolidatedLoadPlans(companyId).catch(() => []),
    ]);

    const activeShips = ships.filter((s) => s.status === "en_transito" || s.status === "retrasado");
    const ropAlerts = health.filter((h) => h.needsReorder);
    const whCity = whs[0]?.city || whs[0]?.location || "Ciudad de México";
    const whCoords =
      whs[0]?.latitude && whs[0]?.longitude
        ? `${Number(whs[0].latitude).toFixed(2)}, ${Number(whs[0].longitude).toFixed(2)}`
        : "GPS Activo";

    console.log(
      "\n" +
        drawCard(
          [
            `📦 ${theme.bold("Catálogo Auditado:")} ${theme.mintBold(String(prods.length))} SKUs reales │ 📍 ${theme.bold("Almacén:")} ${whCity} (${whCoords})`,
            `🚨 ${theme.bold("Alertas ROP Dinámico:")} ${ropAlerts.length > 0 ? theme.amberBold(`${ropAlerts.length} SKU(s) bajo punto de reorden`) : theme.mint("0 déficits")} │ 📥 ${theme.bold("Bandeja HITL (/inbox):")} ${pendingDecs.length} propuestas`,
            `🚚 ${theme.bold("Embarques en Tránsito:")} ${activeShips.length} guía(s) activas │ 📦 ${theme.bold("Cargas Consolidadas:")} ${loads.length} camión(es) sugeridos`,
            theme.dim("─".repeat(82)),
            `${theme.bold("ACCIONES RÁPIDAS (Escribe el número 1-6, un comando /slash o habla con el coordinador):")}`,
            `  ${theme.mintBold("[1] /logistics")}   Torre Logística, GPS, Rutas OSRM y Embarques Inbound/Outbound`,
            `  ${theme.cyanBold("[2] /dispatch")}    Despachar pedido de cliente desde la bodega más cercana con stock`,
            `  ${theme.mintBold("[3] /consolidate")} Consolidar cargas multi-SKU por proveedor y ver Landed Cost`,
            `  ${theme.amberBold("[4] /inbox")}       Revisar y aprobar propuestas de compra (${pendingDecs.length} pendientes)`,
            `  ${theme.cyanBold("[5] /app")}         Abrir Torre de Control Visual (Desktop App en http://localhost:4321)`,
            `  ${theme.dim("[6] /db")}          Conectar o sincronizar otra base de datos / archivo (.sql, .csv, .sqlite)`,
          ],
          {
            title: "🛫 FLIGHT DECK // CENTRO DE MANDO LOGÍSTICO",
            borderColor: theme.mint,
            width: 90,
          },
        ),
    );
  } catch {
    // Continuar si la BD aún no tiene tablas inicializadas
  }

  console.log("");

  const promptPrefix = `${theme.mintBold(userName)}@${theme.cyan("mint")}:${theme.dim(`[${companyId}]`)} ${theme.mintBold("❯")} `;

  return new Promise<void>((resolve) => {
    const slashCommands = [
      "/logistics",
      "/dispatch",
      "/receive",
      "/consolidate",
      "/rebalance",
      "/setup",
      "/status",
      "/dash",
      "/today",
      "/stock",
      "/db",
      "/database",
      "/resync",
      "/app",
      "/channels",
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
        const prods = await db.select().from(products).where(eq(products.companyId, companyId));
        const scan = await runFullOperationalEventScan(companyId);
        const timeStr = new Date().toLocaleTimeString();

        if (isStartup) {
          console.log(
            `  ${theme.mint("⚡ [Autonomous Coordinator]")} ${theme.dim(timeStr)} Escaneo inicial: ${prods.length} SKUs auditados en tiempo real, ${scan.stockDeficitsFound} desabastos detectados. Escuchando eventos 24/7...`,
          );
          rl.prompt(true);
        } else if (scan.stockDeficitsFound > 0 || scan.delayedShipmentsFound > 0) {
          console.log(
            `\n  ${theme.amberBold("⚠️  [Autonomous Alert]")} ${theme.dim(timeStr)} Desabasto o incidencia logística detectada. ${scan.processedDecisions.length} propuesta(s) generadas en /inbox y notificadas a canales activos.`,
          );
          rl.prompt(true);
        }
      } catch {
        // Ignorar errores de red transitorios
      } finally {
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
      let trimmed = line.trim();
      if (!trimmed) {
        rl.prompt();
        return;
      }

      // Atajos numéricos del Flight Deck [1] a [6]
      if (trimmed === "1") trimmed = "/logistics";
      else if (trimmed === "2") trimmed = "/dispatch";
      else if (trimmed === "3") trimmed = "/consolidate";
      else if (trimmed === "4") trimmed = "/inbox";
      else if (trimmed === "5") trimmed = "/app";
      else if (trimmed === "6") trimmed = "/db";

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
            console.log("\n" + drawDivider("⚡ MINT AUTONOMOUS LOGISTICS CONTROL TOWER // GUÍA DEL SISTEMA", 88));
            console.log(
              drawCard(
                [
                  `${theme.bold("¿QUÉ HACE EL COORDINADOR LOGÍSTICO MINT?")}`,
                  `Mint no es un chatbot pasivo: es una Torre de Control Logística multi-agente que calcula`,
                  `Puntos de Reorden Dinámicos (ROP), evalúa Rebalanceo Inter-Almacén (Cross-Docking),`,
                  `consolida cargas multi-SKU con Landed Cost (Producto + Flete OSRM) y despacha guías GPS.`,
                  ``,
                  `${theme.bold("18 HERRAMIENTAS DEL COORDINADOR (REACT + OSRM GPS):")}`,
                  `  • consultar_stock                 • despachar_envio_cliente (Outbound + OSRM)`,
                  `  • recibir_mercancia_envio         • consolidar_cargas_y_rebalancear`,
                  `  • configurar_nodo_logistico_gps   • calcular_ruta_logistica (OSRM + Geocoding)`,
                  `  • enviar_notificacion_operativa   • evaluar_proveedores (con fallback RFQ)`,
                  `  • crear_orden_compra (+ Guía IN)  • consultar_envios / ajustar_stock`,
                  `  • pronosticar_demanda             • simular_escenario / auditar_anomalias`,
                ],
                {
                  title: "🍃 ARQUITECTURA DE TORRE LOGÍSTICA",
                  borderColor: theme.mint,
                },
              ),
            );

            console.log(
              drawCard(
                [
                  `  ${theme.mintBold("/logistics")}                Panel de Torre Logística, Nodos GPS y Embarques`,
                  `  ${theme.mintBold("/dispatch")}                 Despachar pedido a cliente (bodega óptima + ruta OSRM + guía)`,
                  `  ${theme.mintBold("/receive <guía|po>")}        Recibir embarque en almacén y sumar stock físico`,
                  `  ${theme.mintBold("/consolidate")}              Planes de consolidación multi-SKU y Landed Cost`,
                  `  ${theme.mintBold("/rebalance")}                Evaluar/ejecutar transferencias entre almacenes (Cross-Docking)`,
                  `  ${theme.mintBold("/stock")}                    Existencias en tiempo real de tu catálogo`,
                  `  ${theme.mintBold("/db [status|sync|switch]")}  Conectar o sincronizar cualquier base de datos (.sql, .csv, .sqlite)`,
                  `  ${theme.mintBold("/app")}                      Abrir Mint Desktop App (Torre de Control Visual)`,
                  `  ${theme.mintBold("/channels")}                 Ver, agregar y probar webhooks (Discord / Telegram / Slack)`,
                  `  ${theme.mintBold("/inbox")}                    Bandeja de propuestas esperando autorización (HITL)`,
                  `  ${theme.mintBold("/approve <id>")}             Aprobar propuesta (crea Orden + Embarque Inbound con ETA)`,
                  `  ${theme.mintBold("/scan")}                     Ejecutar escaneo proactivo y notificar a Discord/Telegram`,
                ],
                {
                  title: "⚡ COMANDOS DE OPERACIÓN",
                  borderColor: theme.cyan,
                },
              ),
            );
            console.log("");
            break;
          }

          case "logistics":
          case "logistica":
          case "gps": {
            const { logisticsCommand } = require("./logistics");
            await logisticsCommand(cmd === "gps" ? "gps" : args[0], cmd === "gps" ? args : args.slice(1));
            break;
          }

          case "dispatch":
          case "despachar": {
            const { logisticsCommand } = require("./logistics");
            await logisticsCommand("dispatch", args);
            break;
          }

          case "receive":
          case "recibir": {
            const { logisticsCommand } = require("./logistics");
            await logisticsCommand("receive", args);
            break;
          }

          case "consolidate":
          case "consolidar": {
            const { logisticsCommand } = require("./logistics");
            await logisticsCommand("consolidate", args);
            break;
          }

          case "rebalance":
          case "rebalancear": {
            const { logisticsCommand } = require("./logistics");
            await logisticsCommand("rebalance", args);
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
                  `   Recibe eventos de inventario, despacho y telemetría; evalúa Cross-Docking y Compras.`,
                  ``,
                  `${theme.cyanBold("2. ESPECIALISTA EN INVENTARIO Y ROP DINÁMICO:")}`,
                  `   Calcula tasa de consumo (burn rate), días de cobertura, ROP dinámico y EOQ.`,
                  ``,
                  `${theme.violet("3. ESPECIALISTA EN COMPRAS Y LANDED COST:")}`,
                  `   Evalúa proveedores homologados o RFQ directo, consolidando carga + flete OSRM.`,
                  ``,
                  `${theme.mintBold("4. ESPECIALISTA EN TRANSPORTE, GPS Y DESPACHOS:")}`,
                  `   Geocodifica ubicaciones, traza rutas viales OSRM y gestiona guías Inbound/Outbound.`,
                  ``,
                  `${theme.amberBold("5. ESPECIALISTA EN RIESGO Y AUDITORÍA (Adversarial):")}`,
                  `   Abogado del diablo: audita duplicados en 72h, solvencia y sobreprecios.`,
                  ``,
                  `${theme.redBold("6. MOTOR DE POLÍTICAS DETERMINISTA (Gatekeeper):")}`,
                  `   Código matemático puro que autoejecuta, bloquea o escala a HITL + Discord/Telegram.`,
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
            console.log(theme.muted("🔍 Ejecutando escaneo proactivo de stock, ROP y transporte en base de datos..."));
            const res = await runFullOperationalEventScan(companyId);
            console.log(
              `\n${theme.success("✔")} Escaneo completado: ${theme.bold(res.stockDeficitsFound)} desabastos detectados, ${theme.bold(res.delayedShipmentsFound)} retrasos de transporte, ${theme.bold(res.processedDecisions.length)} propuestas enviadas a /inbox y notificadas a canales activos.\n`,
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
              console.log(
                theme.amber(`Comando '${rawCmd}' no reconocido. Escribe ${theme.mintBold("/help")} para ver los comandos disponibles.`),
              );
            } else {
              // Conversación directa con el Coordinador Logístico en lenguaje natural
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
