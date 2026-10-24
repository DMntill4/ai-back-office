import * as readline from "readline";
import { theme, renderSystemHeader } from "../ui/theme";
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
  businessConfig,
  analyzeDynamicCatalogHealth,
  buildConsolidatedLoadPlans,
} from "@mint/core";
import { eq, and } from "drizzle-orm";

export async function consoleCommand() {
  let session = await getSession();

  // Si no hay sesión activa y estamos en una terminal interactiva, iniciar el asistente de bienvenida automáticamente
  if (!session && process.stdin.isTTY) {
    const { runOnboardingWizard } = require("./onboarding");
    session = await runOnboardingWizard();
  }

  const companyId = session?.companyId || "comp_default";
  const userName = session?.name || "operator";
  const companyDisplayName = session?.companyName || "Ferretería Industrial Santandereana S.A.S.";

  console.clear();

  let dbConnected = true;
  let autonomyLevel = "dry-run";
  let prodsCount = 0;
  let activeShipsCount = 0;
  let ropAlertsCount = 0;
  let whCity = "Bucaramanga";
  let pendingCount = 0;
  let initialScanFindings: string[] = [];

  try {
    const [prods, whs, ships, pendingDecs, health, bConfigs] = await Promise.all([
      db.select().from(products).where(eq(products.companyId, companyId)),
      db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
      db.select().from(shipments).where(eq(shipments.companyId, companyId)),
      db
        .select()
        .from(decisions)
        .where(and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "pending_approval"))),
      analyzeDynamicCatalogHealth(companyId).catch(() => []),
      db.select().from(businessConfig).where(eq(businessConfig.companyId, companyId)).catch(() => []),
    ]);

    prodsCount = prods.length;
    pendingCount = pendingDecs.length;
    activeShipsCount = ships.filter((s) => s.status === "en_transito" || s.status === "retrasado").length;
    const ropAlerts = health.filter((h) => h.needsReorder);
    ropAlertsCount = ropAlerts.length;
    whCity = whs[0]?.city || whs[0]?.location || "Bucaramanga";
    const autoCfg = bConfigs.find((c) => c.key === "autonomy_level");
    if (autoCfg?.value) autonomyLevel = autoCfg.value;

    if (ropAlerts.length > 0) {
      initialScanFindings.push(
        `${theme.amberBold("[STOCK BAJO ROP]")} ${ropAlerts.length} productos críticos: ${ropAlerts.slice(0, 3).map((r) => r.name).join(", ")}`,
      );
    }
    const delayed = ships.filter((s) => s.status === "retrasado");
    if (delayed.length > 0) {
      initialScanFindings.push(
        `${theme.redBold("[ALERTA ENVÍO]")} Guía ${delayed[0].trackingNumber} retrasada (${delayed[0].carrier || "Transportista"}).`,
      );
    }
  } catch {
    dbConnected = false;
  }

  const daemon = getDaemonStatus();
  console.log("");
  console.log(
    renderSystemHeader({
      dbConnected,
      companyName: companyDisplayName,
      daemonActive: daemon.isRunning && !daemon.isPaused,
      autonomyLevel,
      pendingCount,
    }),
  );
  console.log(
    `  ${theme.dim("Catálogo:")} ${theme.smokeBold(String(prodsCount))} SKUs  │  ${theme.dim("Sede:")} ${theme.smoke(whCity)}  │  ${theme.dim("Bajo ROP:")} ${ropAlertsCount > 0 ? theme.amberBold(String(ropAlertsCount)) : theme.mint("0")}  │  ${theme.dim("En Tránsito:")} ${activeShipsCount}  │  ${theme.dim("Inbox:")} ${pendingCount}`,
  );
  console.log(
    `  ${theme.dim("Comandos:")} ${theme.mintBold("/goal")}  ${theme.mint("/logistics")}  ${theme.mint("/dispatch")}  ${theme.mint("/stock")}  ${theme.mint("/inbox")}  ${theme.mint("/approve")}  ${theme.mint("/daemon")}  ${theme.mint("/help")}`,
  );
  console.log(theme.charcoal("  " + "─".repeat(82)));

  // Diagnóstico autónomo inicial al arranque
  if (initialScanFindings.length > 0) {
    console.log(`\n  ${theme.mintBold("[DIAGNÓSTICO AUTÓNOMO INICIAL]")}`);
    initialScanFindings.forEach((finding, idx) => {
      const isLast = idx === initialScanFindings.length - 1 && pendingCount === 0;
      console.log(`  ${theme.charcoal(isLast ? "└─" : "├─")} ${finding}`);
    });
    if (pendingCount > 0) {
      console.log(`  ${theme.charcoal("└─")} ${theme.smoke(`Propuestas formuladas en /inbox. Usa ${theme.mintBold("/inbox")} o ${theme.mintBold("/approve <id>")} para autorizarlas.`)}`);
    }
    console.log("");
  }

  console.log("");

  const promptPrefix = `${theme.mintBold(userName)}@${theme.cyan("mint")}:${theme.dim(`[${companyId}]`)} > `;

  return new Promise<void>((resolve) => {
    const slashCommands = [
      "/goal",
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
      "/invoice",
      "/vouchers",
      "/daemon",
      "/agent",
      "/explain",
      "/simulate",
      "/scan",
      "/orders",
      "/auto",
      "/pause",
      "/resume",
      "/matrix",
      "/whoami",
      "/login",
      "/logout",
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

    // Pulso silencioso en segundo plano (solo imprime si hay alerta nueva)
    let isScanning = false;
    const runAutonomousHeartbeat = async (isStartup = false) => {
      if (isScanning) return;
      isScanning = true;
      try {
        const { runFullOperationalEventScan } = await import("@mint/core");
        const scan = await runFullOperationalEventScan(companyId);
        const timeStr = new Date().toLocaleTimeString();

        if (!isStartup && (scan.stockDeficitsFound > 0 || scan.delayedShipmentsFound > 0)) {
          console.log(
            `\n  ${theme.amberBold("[ALERTA]")} ${theme.dim(timeStr)} ${scan.stockDeficitsFound} desabasto(s) / ${scan.delayedShipmentsFound} retraso(s). ${scan.processedDecisions.length} propuesta(s) en /inbox.`,
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

      if (trimmed === "1") trimmed = "/logistics";
      else if (trimmed === "2") trimmed = "/dispatch";
      else if (trimmed === "3") trimmed = "/consolidate";
      else if (trimmed === "4") trimmed = "/inbox";
      else if (trimmed === "5") trimmed = "/app";
      else if (trimmed === "6") trimmed = "/db";

      const [rawCmd, ...args] = trimmed.split(/\s+/);
      const cmd = rawCmd.startsWith("/") ? rawCmd.slice(1).toLowerCase() : rawCmd.toLowerCase();

      if (cmd === "exit" || cmd === "quit" || cmd === "q") {
        console.log(theme.dim("\nDesconectando terminal de control. Hasta luego.\n"));
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
            console.log("\n" + drawDivider("COMANDOS DEL COORDINADOR LOGISTICO", 84));
            console.log(`  ${theme.mintBold("/goal <objetivo>")}          Formular plan cuantitativo de ahorro (-30%) y encolar propuestas`);
            console.log(`  ${theme.mintBold("/logistics")}                Estado de bodegas GPS, embarques y ROP`);
            console.log(`  ${theme.mintBold("/dispatch")}                 Despachar envio a cliente (ruta OSRM + guia)`);
            console.log(`  ${theme.mintBold("/receive <guia|po>")}        Recibir mercancia en almacen y sumar stock`);
            console.log(`  ${theme.mintBold("/consolidate")}              Consolidacion multi-SKU y Landed Cost`);
            console.log(`  ${theme.mintBold("/rebalance")}                Transferencias entre almacenes (Cross-Docking)`);
            console.log(`  ${theme.mintBold("/stock")}                    Tabla de existencias en tiempo real`);
            console.log(`  ${theme.mintBold("/inbox")}                    Propuestas pendientes de aprobacion (HITL)`);
            console.log(`  ${theme.mintBold("/approve <id>")}             Aprobar propuesta, emitir orden y factura electronica`);
            console.log(`  ${theme.mintBold("/invoice [id]")}             Visualizar factura electronica y comprobante fiscal`);
            console.log(`  ${theme.mintBold("/daemon | /agent")}          Explicacion y estado del agente autonomo 24/7`);
            console.log(`  ${theme.mintBold("/db [status|sync|switch]")}  Conectar o sincronizar base de datos`);
            console.log(`  ${theme.mintBold("/channels")}                 Gestionar canales Discord / Telegram / Slack`);
            console.log(`  ${theme.mintBold("/app")}                      Abrir aplicacion de escritorio (Control Tower)`);
            console.log(`  ${theme.mintBold("/whoami | /logout")}         Ver sesion activa o cerrar sesion\n`);
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
            console.log(`\n  ${theme.mint("[TERMINAL-FIRST]")} Mint opera exclusivamente en modo terminal/consola en esta rama.`);
            console.log(`  Ejecuta ${theme.bold("dashboard")} o ${theme.bold("status")} para ver la torre de control en tiempo real.\n`);
            break;
          }

          case "setup":
          case "init": {
            const { setupCommand } = require("./setup");
            await setupCommand({ file: args[0] });
            break;
          }

          case "matrix": {
            console.log("\n" + drawDivider("ARQUITECTURA DE AGENTES ESPECIALISTAS", 80));
            console.log(`  1. Coordinador Central      Orquesta eventos de inventario, despacho y compras.`);
            console.log(`  2. Especialista Inventario  Calcula burn rate, cobertura y ROP dinamico.`);
            console.log(`  3. Especialista Compras     Evalua proveedores o RFQ con Landed Cost (OSRM).`);
            console.log(`  4. Especialista Transporte  Geocodifica nodos GPS y gestiona guias Inbound/Outbound.`);
            console.log(`  5. Auditor de Riesgo        Verifica duplicados, sobrecostos y solvencia.`);
            console.log(`  6. Motor de Politicas       Autoejecuta bajo umbral o escala a HITL.\n`);
            break;
          }

          case "harness": {
            console.log(theme.dim("\nEjecutando Harness Multi-Agente..."));
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

            console.log("\n" + drawDivider(`DELIBERACION MULTI-AGENTE [${hResult.harnessId}]`, 80));
            console.log("\n" + theme.mintBold(hResult.asciiReasoningTree) + "\n");

            if (hResult.recommendedScenario) {
              const sc = hResult.recommendedScenario;
              console.log(
                drawCard(
                  [
                    `${theme.dim("Estrategia:")}  ${theme.bold(sc.title)}`,
                    `${theme.dim("Proveedor:")}   ${theme.cyanBold(sc.supplierName)} (${sc.deliveryDays} dias)`,
                    `${theme.dim("Monto:")}       $${sc.totalCostMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
                    `${theme.dim("Riesgo:")}      ${(sc.riskScore * 100).toFixed(0)}%`,
                    `${theme.dim("Veredicto:")}   ${theme.bold(sc.policyDecision.toUpperCase())}`,
                  ],
                  {
                    title: "PROPUESTA SINTETIZADA",
                    borderColor: theme.mint,
                  },
                ),
              );
            }
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
              console.log(theme.amber("Especifica el ID de la decision. Ej: /approve dec_123"));
            } else {
              const { inboxCommand } = require("./inbox");
              await inboxCommand("approve", args[0], { noExit: true });
            }
            break;
          }

          case "reject": {
            if (!args[0]) {
              console.log(theme.amber("Especifica el ID de la decision. Ej: /reject dec_123"));
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
            console.log(theme.muted("Ejecutando escaneo de stock, ROP y transporte..."));
            const res = await runFullOperationalEventScan(companyId);
            console.log(
              `  [OK] ${res.stockDeficitsFound} desabastos, ${res.delayedShipmentsFound} retrasos, ${res.processedDecisions.length} propuestas en /inbox.`,
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

          case "whoami": {
            const { whoamiCommand } = require("./whoami");
            await whoamiCommand();
            break;
          }

          case "logout": {
            const { logoutCommand } = require("./whoami");
            await logoutCommand();
            console.log(theme.dim("  Sesion cerrada. Ejecuta 'npm start' para registrar o iniciar otra cuenta.\n"));
            rl.close();
            return;
          }

          case "login": {
            const { loginCommand } = require("./login");
            rl.close();
            await loginCommand(args[0], args[1]);
            return;
          }

          case "goal":
          case "meta":
          case "objetivo": {
            const { goalCommand } = require("./goal");
            await goalCommand(args.join(" ") || "bajar gastos en un 30%", { noExit: true });
            break;
          }

          case "agent":
          case "daemon":
          case "autonomo": {
            console.log("\n" + drawDivider("ARQUITECTURA Y ESTADO DEL AGENTE AUTÓNOMO MINT", 82));
            console.log(
              drawCard(
                [
                  `${theme.bold("Mint NO es un simple chatbot de preguntas y respuestas.")}`,
                  `${theme.dim("Es un agente back-office autónomo que vigila las operaciones de tu empresa 24/7.")}`,
                  "",
                  `${theme.mintBold("1. Daemon Proactivo de Fondo:")}`,
                  `   Escanea permanentemente PostgreSQL y canales externos en ciclos automáticos.`,
                  `   Audita el punto de reorden (ROP), stock bajo umbral y retrasos en despachos.`,
                  "",
                  `${theme.mintBold("2. Deliberación Multi-Agente Especializada:")}`,
                  `   - Coordinador: Orquesta eventos y sintetiza el árbol de decisión.`,
                  `   - Inventario: Calcula tasa de consumo diario (burn rate) y cobertura de días.`,
                  `   - Compras: Cotiza proveedores y calcula Landed Cost con flete OSRM.`,
                  `   - Transporte: Geocodifica bodegas y calcula rutas óptimas multi-parada.`,
                  `   - Auditor de Riesgo: Bloquea compras duplicadas o sobrecostos anormales.`,
                  "",
                  `${theme.mintBold("3. Gobernanza Human-in-the-Loop (HITL):")}`,
                  `   CERO compras unilaterales a ciegas. El agente formula la propuesta óptima,`,
                  `   la documenta con evidencia y la deja en /inbox para tu autorización con /approve.`,
                  "",
                  `${theme.mintBold("4. Motor de Objetivos Estratégicos (/goal):")}`,
                  `   Calcula planes cuantitativos (ej: -30% en gastos) y encola las acciones necesarias.`,
                  "",
                  `${theme.mintBold("5. Facturación y Auditoría Criptográfica:")}`,
                  `   Al aprobar una compra, emite la Factura Electrónica con sello SHA-256 en /receipts.`,
                ],
                {
                  title: "SISTEMA OPERATIVO AUTÓNOMO",
                  badge: "AUTONOMOUS BACK-OFFICE",
                  badgeColor: "mint",
                  borderColor: theme.mint,
                },
              ),
            );
            break;
          }

          case "invoice":
          case "factura":
          case "voucher":
          case "vouchers":
          case "receipt":
          case "receipts": {
            const fs = require("node:fs");
            const path = require("node:path");
            const receiptsDir = path.join(process.cwd(), "receipts");
            if (!fs.existsSync(receiptsDir)) {
              console.log(theme.amber("\n  [AVISO] No hay comprobantes generados aún en ./receipts. Aprueba una orden con /approve.\n"));
              break;
            }

            const files = fs.readdirSync(receiptsDir).filter((f: string) => f.endsWith(".json"));
            if (files.length === 0) {
              console.log(theme.amber("\n  [AVISO] No hay facturas en ./receipts. Aprueba una decisión con /approve para generar una.\n"));
              break;
            }

            let targetFile = "";
            if (args[0]) {
              const direct = path.join(receiptsDir, args[0].endsWith(".json") ? args[0] : `${args[0]}.json`);
              if (fs.existsSync(direct)) {
                targetFile = direct;
              } else {
                const match = files.find((f: string) => f.toLowerCase().includes(args[0].toLowerCase()));
                if (match) targetFile = path.join(receiptsDir, match);
              }
            }

            if (!targetFile) {
              targetFile = path.join(receiptsDir, files[files.length - 1]);
            }

            try {
              const voucherData = JSON.parse(fs.readFileSync(targetFile, "utf-8"));
              const { renderInvoiceVoucher } = require("../ui/voucher");
              console.log("\n" + renderInvoiceVoucher(voucherData) + "\n");
              if (files.length > 1) {
                console.log(theme.dim(`  Comprobantes disponibles en disco (${files.length}):`));
                for (const f of files.slice(-5)) {
                  console.log(`    ${theme.cyan("/invoice " + f.replace(".json", ""))}`);
                }
                console.log("");
              }
            } catch (err: any) {
              console.error(theme.redBold(`  [ERROR] No se pudo leer la factura: ${err.message}`));
            }
            break;
          }

          default: {
            if (rawCmd.startsWith("/")) {
              console.log(
                theme.amber(`Comando '${rawCmd}' no reconocido. Escribe ${theme.mintBold("/help")} para ver la lista.`),
              );
            } else {
              const lower = trimmed.toLowerCase();
              if (/bajar gastos|reducir gastos|reducir costos|ahorrar|objetivo|meta/i.test(lower)) {
                const { goalCommand } = require("./goal");
                await goalCommand(trimmed, { noExit: true });
              } else if (/c[oó]mo funciona el agente|qu[eé] hace el agente|eres un chatbot|qu[eé] haces|qui[eé]n eres/i.test(lower)) {
                console.log("\n" + drawDivider("ARQUITECTURA Y ESTADO DEL AGENTE AUTÓNOMO MINT", 82));
                console.log(
                  drawCard(
                    [
                      `${theme.bold("Mint NO es un chatbot tradicional de charla.")}`,
                      `${theme.dim("Es un agente logístico y operativo autónomo de back-office.")}`,
                      "",
                      `${theme.mintBold("¿Qué hace automáticamente en segundo plano?")}`,
                      `  1. ${theme.bold("Vigilancia Continua:")} Monitorea stock, calcula ROP dinámico y detecta retrasos GPS.`,
                      `  2. ${theme.bold("Deliberación Multi-Agente:")} 5 especialistas (Inventario, Compras, Transporte, Riesgo, Coordinador).`,
                      `  3. ${theme.bold("Gobernanza HITL:")} Formula propuestas completas con cálculo de Landed Cost y las coloca en /inbox.`,
                      `  4. ${theme.bold("Ejecución y Facturación:")} Al aprobarse (/approve), genera órdenes de compra, guías de envío y factura electrónica formal con sello criptográfico.`,
                      `  5. ${theme.bold("Metas de Ahorro:")} Ejecuta planes estratégicos (/goal bajar gastos en un 30%).`,
                    ],
                    {
                      title: "AGENTE AUTÓNOMO DE BACK-OFFICE",
                      badge: "SISTEMA OPERATIVO",
                      badgeColor: "mint",
                      borderColor: theme.mint,
                    },
                  ),
                );
              } else {
                const { chatCommand } = require("./chat");
                await chatCommand(trimmed, { noExit: true });
              }
            }
            break;
          }
        }
      } catch (err: any) {
        console.error(theme.redBold(`[ERROR] '${cmd}': ${err.message}`));
      }

      console.log("");
      rl.prompt();
    });
  });
}
