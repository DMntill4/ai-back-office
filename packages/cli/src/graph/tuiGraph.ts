import * as readline from "node:readline";
import { loadRealGraphData } from "./dataLoader";
import { mintSpiderEventBus } from "./eventBus";
import { getSession } from "../keychain";
import { MintSpiderEvent, MintCliGraphPayload } from "./graph.types";

export interface TuiGraphOptions {
  isDemo?: boolean;
  isShadow?: boolean;
  companyIdOverride?: string;
}

/**
 * Visualizador de Terminal (TUI) para `mint graph --tui`
 * Renderiza el grafo de MINT mediante caracteres Unicode (Braille y bloques)
 * para terminales headless o servidores sin navegador.
 */
export async function runTuiGraph(options: TuiGraphOptions = {}) {
  const isDemo = Boolean(options.isDemo);
  const isShadow = Boolean(options.isShadow);

  const session = await getSession();
  if (!session && !isDemo) {
    console.error("\x1b[31m[ERROR]\x1b[0m No hay sesión activa en MINT.");
    console.error("Debes autenticarte primero con: \x1b[32mmint login\x1b[0m o ejecutar con \x1b[33m--demo\x1b[0m\n");
    process.exit(1);
  }

  const companyId = options.companyIdOverride || (session ? session.companyId : "DEMO_COMPANY");
  const role = session ? session.role : "operador";

  // Cargar datos
  const payload: MintCliGraphPayload = await loadRealGraphData(companyId, {
    isDemo,
    isShadow,
    userRole: role,
  });

  const eventFeed: MintSpiderEvent[] = [...payload.historyEvents.slice(-6)];
  let currentEvent: MintSpiderEvent | null = eventFeed.length > 0 ? eventFeed[eventFeed.length - 1] : null;
  let spiderState = currentEvent ? currentEvent.type : "descanso";
  let spiderLocation = currentEvent ? currentEvent.targetNodeId : "Centro Operativo";
  let spiderSummary = currentEvent ? currentEvent.summary : "MINT descansa. Sin actividad real pendiente.";
  let auditRef = currentEvent ? currentEvent.auditRef : "AUDIT_IDLE";

  // Configurar terminal interactiva
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  function render() {
    // Limpiar pantalla
    process.stdout.write("\x1b[2J\x1b[H");

    const width = Math.min(process.stdout.columns || 80, 100);
    const border = "═".repeat(width - 2);

    console.log(`\x1b[32m╔${border}╗\x1b[0m`);
    console.log(`\x1b[32m║\x1b[0m \x1b[1mMINT OPERATIONAL GRAPH [TUI] — VISTA EN VIVO DEL AGENTE\x1b[0m`);
    console.log(`\x1b[32m║\x1b[0m Empresa: \x1b[36m${payload.companyName}\x1b[0m | Rol: \x1b[33m${payload.userRole}\x1b[0m | Modo: ${isDemo ? "\x1b[41m DEMO \x1b[0m" : "\x1b[32mREAL\x1b[0m"} ${isShadow ? "\x1b[35m[SOMBRA]\x1b[0m" : ""}`);
    console.log(`\x1b[32m╚${border}╝\x1b[0m\n`);

    // CASO BASE DE DATOS VACÍA
    if (payload.nodes.length === 0) {
      console.log("\x1b[33m┌─────────────────────────────────────────────────────────────────┐\x1b[0m");
      console.log("\x1b[33m│  [!] BASE DE DATOS SIN REGISTROS                                │\x1b[0m");
      console.log("\x1b[33m│                                                                 │\x1b[0m");
      console.log("\x1b[33m│  No existen productos ni entidades registradas para esta empresa│\x1b[0m");
      console.log("\x1b[33m│  en PostgreSQL.                                                 │\x1b[0m");
      console.log("\x1b[33m│                                                                 │\x1b[0m");
      console.log("\x1b[33m│  Prohibido inventar datos de relleno. La araña MINT descansa.   │\x1b[0m");
      console.log("\x1b[33m└─────────────────────────────────────────────────────────────────┘\x1b[0m\n");
      console.log("\x1b[90mPresiona 'q' o Ctrl+C para salir.\x1b[0m");
      return;
    }

    // PANEL DE LA ARAÑA (MINT)
    const spiderGlyph = isShadow ? "[SOMBRA-MINT]" : "[MINT]";
    let stateColor = "\x1b[32m";
    if (spiderState === "analiza") stateColor = "\x1b[35m";
    else if (spiderState === "decide") stateColor = "\x1b[33m";
    else if (spiderState === "espera_aprobacion") stateColor = "\x1b[41m\x1b[37m";
    else if (spiderState === "bloqueado" || spiderState === "error") stateColor = "\x1b[31m";
    else if (spiderState === "descanso") stateColor = "\x1b[90m";

    console.log(`\x1b[1mESTADO DEL AGENTE:\x1b[0m`);
    console.log(`  ${spiderGlyph}  Estado: ${stateColor}${spiderState.toUpperCase()}\x1b[0m`);
    console.log(`  Nodo Actual:  \x1b[36m${spiderLocation}\x1b[0m`);
    console.log(`  Acción:       ${spiderSummary}`);
    console.log(`  Ref. Auditor: \x1b[90m${auditRef}\x1b[0m\n`);

    // DIAGRAMA EN BRAILLE Y BLOQUES (TOPOLOGÍA RESUMIDA)
    console.log(`\x1b[1mTOPOLOGÍA DE NODOS ACTIVOS:\x1b[0m (${payload.nodes.length} nodos, ${payload.edges.length} aristas)`);
    console.log("  ┌─────────────────────────────────────────────────────────────┐");

    const modules = payload.nodes.filter(n => n.entityType === "modulo");
    const entities = payload.nodes.filter(n => n.entityType !== "modulo").slice(0, 6);

    let mLine = "  │ ";
    for (const m of modules) {
      const activeMarker = (m.id === spiderLocation) ? "*" : "⠶";
      mLine += `[${activeMarker} ${m.label.replace("[DEMO] ", "").replace("Módulo ", "")}] ── `;
    }
    console.log(mLine.slice(0, -4) + " │");

    console.log("  │          │                        │                         │");

    for (const e of entities) {
      const isAtNode = (e.id === spiderLocation);
      const marker = isAtNode ? "\x1b[32m[AQUÍ]\x1b[0m" : "\x1b[90m⠋\x1b[0m";
      const healthTag = e.health === "confiable" ? "\x1b[32m[OK]\x1b[0m" : "\x1b[31m[ALERTA]\x1b[0m";
      const statusTag = e.status === "alerta" ? "\x1b[33m[ALERTA]\x1b[0m" : "";
      console.log(`  │   ${marker} ${healthTag} \x1b[1m${e.label.padEnd(26)}\x1b[0m (${e.entityType}) ${statusTag}`);
    }

    if (payload.nodes.length > entities.length + modules.length) {
      console.log(`  │   \x1b[90m... y ${payload.nodes.length - entities.length - modules.length} nodos adicionales agrupados en clúster\x1b[0m`);
    }
    console.log("  └─────────────────────────────────────────────────────────────┘\n");

    // FEED EN TIEMPO REAL DEL REGISTRO DE AUDITORÍA
    console.log(`\x1b[1mREGISTRO DE EVENTOS (EN VIVO / AUDITORÍA REAL):\x1b[0m`);
    if (eventFeed.length === 0) {
      console.log("  \x1b[90m(Sin eventos recientes. El agente está en reposo.)\x1b[0m");
    } else {
      for (const ev of eventFeed) {
        const timeStr = new Date(ev.timestamp).toLocaleTimeString();
        console.log(`  \x1b[90m[${timeStr}]\x1b[0m \x1b[33m${ev.type.padEnd(17)}\x1b[0m \x1b[36m${ev.sourceNodeId}\x1b[0m ──> \x1b[32m${ev.targetNodeId}\x1b[0m`);
        console.log(`              └─ ${ev.summary} \x1b[90m(${ev.auditRef})\x1b[0m`);
      }
    }

    console.log(`\n\x1b[90mComandos: [q] Salir | [d] Modo Demo | [s] Alternar Sombra | [r] Recargar datos\x1b[0m`);
  }

  // Suscribirse a eventos en vivo del bus
  const onNewEvent = (ev: MintSpiderEvent) => {
    if (!isDemo && ev.companyId !== companyId) return;

    eventFeed.push(ev);
    if (eventFeed.length > 8) eventFeed.shift();

    currentEvent = ev;
    spiderState = ev.type;
    spiderLocation = ev.targetNodeId;
    spiderSummary = ev.summary;
    auditRef = ev.auditRef;

    render();
  };

  const channel = isDemo ? "event" : `company:${companyId}`;
  mintSpiderEventBus.on(channel, onNewEvent);

  // Manejador de teclado
  process.stdin.on("keypress", async (str, key) => {
    if (key.ctrl && key.name === "c") {
      cleanupAndExit();
    }
    if (key.name === "q") {
      cleanupAndExit();
    }
    if (key.name === "r") {
      const refreshed = await loadRealGraphData(companyId, { isDemo, isShadow, userRole: role });
      payload.nodes = refreshed.nodes;
      payload.edges = refreshed.edges;
      render();
    }
  });

  function cleanupAndExit() {
    mintSpiderEventBus.off(channel, onNewEvent);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdout.write("\x1b[?25h\n"); // Mostrar cursor
    console.log("\x1b[32m[MINT CLI]\x1b[0m Visor TUI cerrado. El agente continúa su ejecución en segundo plano.");
    process.exit(0);
  }

  render();
}
