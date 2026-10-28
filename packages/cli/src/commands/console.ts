import * as readline from "readline";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { drawFrame, type FrameRow } from "../ui/frame";
import { getSession } from "../keychain";
import { getDaemonStatus } from "@mint/daemon";
import {
  runBackOfficeHarness,
  db,
  products,
  decisions,
  warehouses,
  suppliers,
  companies,
  businessConfig,
  notificationChannels,
  runPreflightCheck,
} from "@mint/core";
import { eq, and, sql } from "drizzle-orm";

async function countRows(table: any, where: any): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(table).where(where);
  return Number(row?.n ?? 0);
}

/** Carga conteos livianos en paralelo con un tope de tiempo para no bloquear el arranque. */
async function loadHeaderStats(companyId: string) {
  const work = Promise.all([
    countRows(products, eq(products.companyId, companyId)),
    countRows(suppliers, eq(suppliers.companyId, companyId)),
    countRows(warehouses, eq(warehouses.companyId, companyId)),
    countRows(notificationChannels, eq(notificationChannels.companyId, companyId)),
    countRows(decisions, and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "pending_approval"))),
    db.select().from(companies).where(eq(companies.id, companyId)).limit(1),
    db
      .select()
      .from(businessConfig)
      .where(and(eq(businessConfig.companyId, companyId), eq(businessConfig.key, "autonomy_level")))
      .limit(1),
  ]);
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), 2500));
  const res = await Promise.race([work, timeout]);
  if (!res) return null;
  const [prods, supps, whs, chans, pending, comp, autonomy] = res;
  return {
    prods,
    supps,
    whs,
    chans,
    pending,
    country: (comp[0] as any)?.country as string | undefined,
    currency: (comp[0] as any)?.currency as string | undefined,
    autonomy: ((autonomy[0] as any)?.value as string | undefined) ?? "dry-run",
  };
}

export async function consoleCommand() {
  let session = await getSession();

  // Si no hay sesión activa y estamos en una terminal interactiva, iniciar el asistente de bienvenida automáticamente
  if (!session && process.stdin.isTTY) {
    const { runOnboardingWizard } = require("./onboarding");
    session = await runOnboardingWizard();
  }

  const companyId = session?.companyId || "comp_default";
  const userName = session?.name || "operator";
  const companyDisplayName = session?.companyName || companyId;

  console.clear();

  const daemon = getDaemonStatus();
  const daemonLabel = daemon.isPaused ? "PAUSADO" : daemon.isRunning ? "ONLINE" : "STANDBY";

  let preflight = null;
  try {
    preflight = await runPreflightCheck(companyId);
  } catch {
    // Continuar en modo degradado sin bloquear el arranque si la BD está inaccesible
  }

  const preflightBadgeColor =
    preflight?.overallStatus === "OK"
      ? theme.mint
      : preflight?.overallStatus === "DEGRADADO"
      ? theme.amber
      : theme.red;

  const rows: FrameRow[] = [
    { key: "Empresa", value: companyDisplayName },
    { key: "Rol", value: session?.role || "sin sesión" },
  ];

  if (preflight) {
    const cfg = preflight.components.config.details;
    const dbStatus = preflight.components.database.status;
    const dbLatency = preflight.components.database.details?.latencyMs;

    rows.push(
      {
        key: "Salud / Preflight",
        value: `${preflight.overallStatus} (BD: ${dbStatus} ${dbLatency ? `${dbLatency}ms` : ""})`,
        color: preflightBadgeColor,
      },
      {
        key: "País / Moneda",
        value: `${cfg.country || "sin definir"} / ${cfg.currency || "sin definir"} (${cfg.timezone || "sin definir"})`,
        color: cfg.country && cfg.country !== "sin definir" ? undefined : theme.amber,
      },
      {
        key: "Módulos Activos",
        value: `${preflight.activeModules.length} activos [${preflight.activeModules.join(", ")}]`,
        color: preflight.activeModules.length > 0 ? theme.cyan : theme.amber,
      },
      {
        key: "Inbox Pendiente",
        value: preflight.summarySinceLastSession.pendingDecisions > 0
          ? `${preflight.summarySinceLastSession.pendingDecisions} aprobaciones`
          : "al día",
        color: preflight.summarySinceLastSession.pendingDecisions > 0 ? theme.amber : theme.mint,
      },
      {
        key: "Cuarentena / Memoria",
        value: `${preflight.summarySinceLastSession.quarantinedCount} en cuarentena | ${preflight.summarySinceLastSession.unansweredQuestions} preguntas`,
        color: preflight.summarySinceLastSession.quarantinedCount > 0 ? theme.amber : undefined,
      },
    );
  } else {
    rows.push({ key: "Datos", value: "no disponibles (arranque en modo supervivencia)", color: theme.amber });
  }

  rows.push({ key: "Daemon", value: daemonLabel, color: daemon.isRunning && !daemon.isPaused ? theme.mint : theme.gray });

  console.log("");
  console.log(
    drawFrame({
      title: `${userName}@${companyId}`,
      rows,
      footerLeft: theme.dim("escribe en lenguaje natural o /help"),
      footerRight: theme.dim(`v2.5.0  ${new Date().toLocaleTimeString()}`),
    }),
  );

  if (preflight && preflight.degradedModules.length > 0) {
    console.log(
      theme.amber(
        `\n[AVISO] MODO DEGRADADO ACTIVO: ${preflight.degradedModules.map((m) => `${m.module} (${m.reason})`).join(" | ")}`
      )
    );
  }

  if (preflight && preflight.summarySinceLastSession.quarantinedCount > 0) {
    console.log(
      theme.amber(
        `[AVISO] CUARENTENA: ${preflight.summarySinceLastSession.quarantinedCount} registros corruptos aislados de clientes. Ejecuta /quarantine para inspeccionar.`
      )
    );
  }

  if (preflight && preflight.summarySinceLastSession.unansweredQuestions > 0) {
    console.log(
      theme.cyan(
        `[INFO] VERDAD DE DATOS: ${preflight.summarySinceLastSession.unansweredQuestions} preguntas pendientes para operar con total certeza. Ejecuta /questions.`
      )
    );
  }

  console.log("");

  const promptPrefix = `${theme.mintBold(userName)}@${theme.cyan("mint")}:${theme.dim(`[${companyId}]`)} > `;

  return new Promise<void>((resolve) => {
    const slashCommands = [
      "/agents",
      "/orchestrate",
      "/feed",
      "/live",
      "/audit",
      "/sales",
      "/profit",
      "/reports",
      "/track",
      "/map",
      "/questions",
      "/doctor",
      "/data-health",
      "/quarantine",
      "/briefing",
      "/reconcile",
      "/intel",
      "/fleet",
      "/suppliers",
      "/customers",
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
      "/cancel",
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
    let lastHeartbeatError: string | undefined;
    const runAutonomousHeartbeat = async (isStartup = false) => {
      if (isScanning) return;
      isScanning = true;
      try {
        const { runFullOperationalEventScan } = await import("@mint/core");
        const scan = await runFullOperationalEventScan(companyId);
        const timeStr = new Date().toLocaleTimeString();

        if (!isStartup && scan.processedDecisions.length > 0) {
          console.log(
            `\n  ${theme.amberBold("[ALERTA]")} ${theme.dim(timeStr)} ${scan.processedDecisions.length} propuesta(s) nueva(s) en /inbox (${scan.stockDeficitsFound} desabasto(s), ${scan.delayedShipmentsFound} retraso(s)).`,
          );
          rl.prompt(true);
        }
      } catch (err: any) {
        // No se oculta el fallo: se avisa una vez por mensaje distinto
        if (lastHeartbeatError !== err?.message) {
          lastHeartbeatError = err?.message;
          console.log(`\n  ${theme.amberBold("[AVISO]")} Heartbeat fallo: ${err?.message || "error desconocido"}`);
          rl.prompt(true);
        }
      } finally {
        isScanning = false;
      }
    };

    setTimeout(() => runAutonomousHeartbeat(true), 8000);
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
            console.log("\n" + drawDivider("COMANDOS DEL COORDINADOR LOGISTICO", 80));
            console.log(`  ${theme.mintBold("/logistics")}                Estado de bodegas GPS, embarques y ROP`);
            console.log(`  ${theme.mintBold("/track <guia|pedido|camion>")} Rastreo en tiempo real, ETA, incidencias y mapa`);
            console.log(`  ${theme.mintBold("/map [discover|confirm]")}    Convivencia y mapeo seguro de tablas del cliente (Tarea 0)`);
            console.log(`  ${theme.mintBold("/questions [answer|dismiss]")} Banco de preguntas pendientes (Verdad de datos)`);
            console.log(`  ${theme.mintBold("/intel [quiebre|overstock|abc]")} Inteligencia: días de quiebre, rotación y sobrestock`);
            console.log(`  ${theme.mintBold("/fleet [track|drivers]")}     Control de flota, conductores y rastreo de envíos`);
            console.log(`  ${theme.mintBold("/suppliers [add|<id>]")}      Directorio de proveedores y catálogo de precios`);
            console.log(`  ${theme.mintBold("/orders [<id>|open|recibida]")} Órdenes de compra emitidas y estado de recepción`);
            console.log(`  ${theme.mintBold("/customers")}                Demanda de clientes y canales comerciales`);
            console.log(`  ${theme.mintBold("/reports [briefing|profit|csv]")} Reportes ejecutivos, ganancias y exportación`);
            console.log(`  ${theme.mintBold("/dispatch")}                 Despachar envio a cliente (ruta OSRM + guia)`);
            console.log(`  ${theme.mintBold("/receive <guia|po>")}        Recibir mercancia en almacen y sumar stock`);
            console.log(`  ${theme.mintBold("/consolidate")}              Consolidacion multi-SKU y Landed Cost`);
            console.log(`  ${theme.mintBold("/rebalance")}                Transferencias entre almacenes (Cross-Docking)`);
            console.log(`  ${theme.mintBold("/stock")}                    Tabla de existencias en tiempo real`);
            console.log(`  ${theme.mintBold("/inbox [all|<id>|clean]")}   Propuestas pendientes (lista, todas, detalle o archivar duplicadas)`);
            console.log(`  ${theme.mintBold("/approve <id>")}             Aprobar propuesta (solo admin distinto al solicitante)`);
            console.log(`  ${theme.mintBold("/cancel <id>")}              Cancelar propuesta pendiente antes de ejecutarse`);
            console.log(`  ${theme.mintBold("/audit")}                    Canal en vivo de decisiones autónomas [OBSERVE, DECIDE, EXECUTE, VERIFY]`);
            console.log(`  ${theme.mintBold("/team [list|invite|remove]")} Control de acceso RBAC y roles de la empresa`);
            console.log(`  ${theme.mintBold("/config [set|minstock|tz]")}  Configuración, zona horaria y umbrales por producto`);
            console.log(`  ${theme.mintBold("/db [status|sync|switch]")}  Conectar o sincronizar base de datos`);
            console.log(`  ${theme.mintBold("/channels")}                 Gestionar canales Discord / Telegram / Slack`);
            console.log(`  ${theme.mintBold("/data-health")}             Salud de datos por módulo, calidad y compuerta de decisión`);
            console.log(`  ${theme.mintBold("/quarantine [resolve|ignore]")} Mesa de registros corruptos aislados`);
            console.log(`  ${theme.mintBold("/shadow [on|off]")}           Modo sombra: simulación sin riesgo y comparación`);
            console.log(`  ${theme.mintBold("/briefing")}                 Resumen diario ejecutivo: ventas, quiebres y retrasos`);
            console.log(`  ${theme.mintBold("/reconcile")}                Conciliación 3 vías: ventas vs pagos vs despachos`);
            console.log(`  ${theme.mintBold("/backup")}                   Exportar copia de seguridad de configuración y memoria`);
            console.log(`  ${theme.mintBold("/demo [enter|exit]")}         Modo demo sandbox con datos aislados de prueba`);
            console.log(`  ${theme.mintBold("/selftest")}                 Verificación integral del sistema [OK/ERROR] con evidencia`);
            console.log(`  ${theme.mintBold("/whoami | /logout")}         Ver sesion activa y matriz de permisos o cerrar sesion\n`);
            break;
          }

          case "intel":
          case "rotacion":
          case "quiebre":
          case "overstock":
          case "abc": {
            const { intelCommand } = require("./intel");
            const sub = cmd === "intel" ? args[0] : cmd;
            const target = cmd === "intel" ? args[1] : args[0];
            await intelCommand(sub, target);
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
          case "config":
          case "thresholds":
          case "minstock": {
            const { configCommand } = require("./config");
            if (cmd === "thresholds") {
              await configCommand("thresholds");
            } else if (cmd === "minstock") {
              await configCommand("minstock", args[0], ...args.slice(1));
            } else {
              await configCommand(args[0], args[1], ...args.slice(2));
            }
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
              const { getCompanyConfig } = await import("@mint/core");
              const cfg = await getCompanyConfig(companyId);
              console.log(
                drawCard(
                  [
                    `${theme.dim("Estrategia:")}  ${theme.bold(sc.title)}`,
                    `${theme.dim("Proveedor:")}   ${theme.cyanBold(sc.supplierName)} (${sc.deliveryDays} dias)`,
                    `${theme.dim("Monto:")}       $${sc.totalCostMxn.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${cfg.currency}`,
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

          case "agents":
          case "agentes":
          case "orchestrate":
          case "orquestador": {
            const { agentsCommand } = require("./agents");
            await agentsCommand(args[0]);
            break;
          }

          case "feed":
          case "live":
          case "watch": {
            const { watchCommand } = require("./daemon");
            await watchCommand();
            break;
          }

          case "audit":
          case "auditoria":
          case "logs": {
            const { auditCommand } = require("./audit");
            let limit = 50;
            let user: string | undefined;
            let date: string | undefined;
            let moduleName: string | undefined;

            for (let i = 0; i < args.length; i++) {
              const arg = args[i];
              if (arg === "--user" && args[i + 1]) {
                user = args[++i];
              } else if (arg === "--date" && args[i + 1]) {
                date = args[++i];
              } else if (arg === "--module" && args[i + 1]) {
                moduleName = args[++i];
              } else if (!isNaN(parseInt(arg, 10)) && limit === 50) {
                limit = parseInt(arg, 10);
              }
            }

            await auditCommand({ limit, user, date, module: moduleName });
            break;
          }

          case "profile":
          case "perfil": {
            const { profileCommand } = require("./profile");
            await profileCommand();
            break;
          }

          case "questions":
          case "preguntas": {
            const { questionsCommand } = require("./questions");
            await questionsCommand(args[0], args[1], args.slice(2).join(" "));
            break;
          }

          case "track":
          case "rastreo":
          case "rastrear": {
            const { trackCommand } = require("./track");
            await trackCommand(args[0], args[1]);
            break;
          }

          case "map":
          case "mapping":
          case "esquema": {
            const { mappingCommand } = require("./mapping");
            await mappingCommand(args[0], args[1]);
            break;
          }

          case "cancel":
          case "cancelar": {
            const { inboxCommand } = require("./inbox");
            await inboxCommand("cancel", args[0], { noExit: true });
            break;
          }

          case "status":
          case "dash":
          case "dashboard": {
            const { dashboardCommand } = require("./dashboard");
            await dashboardCommand({ noExit: true });
            break;
          }

          case "today": {
            const { todayCommand } = require("./chat");
            await todayCommand({ noExit: true });
            break;
          }

          case "briefing": {
            const { briefingCommand } = require("./briefing");
            await briefingCommand();
            break;
          }

          case "reconcile":
          case "conciliar": {
            const { reconcileCommand } = require("./reconcile");
            await reconcileCommand();
            break;
          }

          case "customers":
          case "clientes": {
            const { customersCommand } = require("./customers");
            await customersCommand();
            break;
          }

          case "backup":
          case "respaldo": {
            const { backupCommand } = require("./briefing");
            await backupCommand();
            break;
          }

          case "data-health":
          case "datahealth":
          case "salud": {
            const { dataHealthCommand } = require("./dataHealth");
            await dataHealthCommand();
            break;
          }

          case "quarantine":
          case "cuarentena": {
            const { quarantineCommand } = require("./dataHealth");
            await quarantineCommand(args);
            break;
          }

          case "shadow":
          case "sombra": {
            const { shadowCommand } = require("./shadow");
            await shadowCommand(args);
            break;
          }

          case "stock": {
            const { stockCommand } = require("./stock");
            await stockCommand({ noExit: true });
            break;
          }

          case "orders":
          case "pedidos":
          case "compras": {
            const { ordersCommand } = require("./stock");
            await ordersCommand(args[0], { noExit: true });
            break;
          }

          case "fleet":
          case "flota":
          case "shipments":
          case "envios": {
            const { fleetCommand } = require("./fleet");
            await fleetCommand(args[0], args[1]);
            break;
          }

          case "suppliers":
          case "proveedores":
          case "supplier": {
            const { suppliersCommand } = require("./suppliers");
            await suppliersCommand(args[0], args[1], ...args.slice(2));
            break;
          }


          case "reports":
          case "reportes": {
            const { reportsCommand } = require("./reports");
            await reportsCommand(args[0], args[1]);
            break;
          }

          case "sales":
          case "ventas": {
            const { reportsCommand } = require("./reports");
            await reportsCommand("sales", args[0]);
            break;
          }

          case "profit":
          case "ganancias":
          case "margen": {
            const { reportsCommand } = require("./reports");
            await reportsCommand("profit", args[0]);
            break;
          }

          case "selftest":
          case "test": {
            const { selftestCommand } = require("./selftest");
            await selftestCommand();
            break;
          }

          case "demo": {
            const { demoCommand } = require("./demo");
            await demoCommand(args[0]);
            break;
          }

          case "doctor": {
            const { doctorCommand } = require("./doctor");
            await doctorCommand();
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
              `  [OK] ${res.stockDeficitsFound} desabasto(s), ${res.delayedShipmentsFound} retraso(s) detectados.`,
            );
            console.log(
              `  ${res.processedDecisions.length} propuesta(s) nueva(s)  ·  ${res.alreadyOpen} ya tenían propuesta abierta  ·  ${res.deferred} diferida(s) al siguiente ciclo.`,
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

          default: {
            if (rawCmd.startsWith("/")) {
              console.log(
                theme.amber(`Comando '${rawCmd}' no reconocido. Escribe ${theme.mintBold("/help")} para ver la lista.`),
              );
            } else {
              const { chatCommand } = require("./chat");
              await chatCommand(trimmed, { noExit: true });
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
