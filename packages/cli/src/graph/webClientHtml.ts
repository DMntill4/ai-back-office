/**
 * Cliente Web Autónomo para MINT CLI Graph (Servido 100% en local, CERO CDNs)
 * Contiene el motor Canvas 2D con física de fuerzas Euler/Verlet, el renderizador procedimental
 * de la araña (MINT) con sus 8 estados animados, estela, timeline y panel de inspección.
 */
export function getWebClientHtml(token: string, companyId: string, isDemo: boolean, isShadow: boolean): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MINT Graph — Mapa Operativo Autónomo</title>
  <style>
    :root {
      --bg: #060a08;
      --panel-bg: rgba(9, 17, 13, 0.94);
      --border: #162c1e;
      --mint: #22c55e;
      --mint-glow: rgba(34, 197, 94, 0.4);
      --text: #e2e8f0;
      --text-muted: #64748b;
      --danger: #ef4444;
      --warning: #f59e0b;
      --info: #38bdf8;
      --purple: #a855f7;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    /* Header Bar */
    header {
      height: 52px;
      background: #08110c;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 30;
      flex-shrink: 0;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-badge {
      background: #11261a;
      color: var(--mint);
      border: 1px solid var(--mint);
      font-family: monospace;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .demo-tag {
      background: #7c2d12;
      color: #fed7aa;
      border: 1px solid #ea580c;
      font-family: monospace;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      animation: pulseDemo 2s infinite;
    }
    @keyframes pulseDemo {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    .search-box {
      background: #0b1710;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 6px 12px;
      color: var(--text);
      font-size: 12px;
      width: 240px;
      outline: none;
    }
    .search-box:focus {
      border-color: var(--mint);
    }
    .controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    button.btn {
      background: #0d1e15;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    button.btn:hover {
      background: #132a1d;
      border-color: var(--mint);
      color: #fff;
    }
    button.btn.active {
      background: #143220;
      border-color: var(--mint);
      color: #86efac;
    }
    /* Main Canvas Stage */
    #stage-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    canvas#viewport {
      display: block;
      width: 100%;
      height: 100%;
      cursor: grab;
    }
    canvas#viewport:active {
      cursor: grabbing;
    }
    /* Overlay Panels */
    .overlay-panel {
      position: absolute;
      background: var(--panel-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 20;
    }
    /* Panel Ahora Mismo */
    #now-panel {
      top: 14px;
      right: 14px;
      width: 320px;
      max-height: calc(100vh - 140px);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .now-title {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.05em;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .spider-status-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: monospace;
      text-transform: uppercase;
    }
    .status-observando { background: #0c4a6e; color: #7dd3fc; border: 1px solid #0284c7; }
    .status-analizando { background: #581c87; color: #d8b4fe; border: 1px solid #9333ea; }
    .status-decidiendo { background: #78350f; color: #fde68a; border: 1px solid #d97706; }
    .status-propone { background: #134e4a; color: #5eead4; border: 1px solid #0d9488; }
    .status-espera_aprobacion { background: #7c2d12; color: #fdba74; border: 1px solid #ea580c; }
    .status-ejecuta { background: #14532d; color: #86efac; border: 1px solid #22c55e; }
    .status-bloqueado { background: #7f1d1d; color: #fca5a5; border: 1px solid #dc2626; }
    .status-error { background: #450a0a; color: #f87171; border: 1px solid #991b1b; }
    .status-descanso { background: #1e293b; color: #94a3b8; border: 1px solid #475569; }
    .now-target {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
    }
    .now-desc {
      font-size: 12px;
      color: #cbd5e1;
      line-height: 1.4;
    }
    .audit-link {
      font-family: monospace;
      font-size: 10px;
      color: var(--mint);
      background: #081a10;
      padding: 3px 6px;
      border-radius: 4px;
      border: 1px dashed #1f492e;
      display: inline-block;
      margin-top: 4px;
    }
    /* Node Inspector */
    #inspector-panel {
      bottom: 60px;
      right: 14px;
      width: 320px;
      display: none;
    }
    /* Bottom Timeline Bar */
    footer {
      height: 48px;
      background: #070d09;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 30;
      font-size: 12px;
      flex-shrink: 0;
    }
    .timeline-scrubber {
      flex: 1;
      max-width: 500px;
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 16px;
    }
    input[type=range] {
      flex: 1;
      accent-color: var(--mint);
      background: #11261a;
      height: 4px;
      border-radius: 2px;
      cursor: pointer;
    }
    /* Empty State */
    #empty-state {
      position: absolute;
      inset: 0;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(6, 10, 8, 0.95);
      z-index: 15;
      text-align: center;
      padding: 24px;
    }
    #empty-state h2 { font-size: 18px; color: #fff; margin-bottom: 8px; }
    #empty-state p { font-size: 13px; color: var(--text-muted); max-width: 420px; line-height: 1.5; }
  </style>
</head>
<body>
  <!-- 1. Header Bar -->
  <header>
    <div class="brand">
      <span style="font-size: 15px; font-weight: 800; color: #fff;">MINT Graph</span>
      <span class="brand-badge">CLI LIVE</span>
      ${isDemo ? '<span class="demo-tag">[MODO DEMO]</span>' : ""}
      ${isShadow ? '<span style="background:#164e63; color:#67e8f9; font-size:10px; font-family:monospace; padding:2px 6px; border-radius:4px; border:1px solid #0891b2;">MODO SOMBRA</span>' : ""}
      <span style="font-size: 11px; color: var(--text-muted); margin-left: 6px;" id="company-label">${companyId}</span>
    </div>

    <input type="text" id="search-input" class="search-box" placeholder="Buscar nodo, SKU o proveedor..." />

    <div class="controls">
      <button class="btn" id="btn-follow" title="La cámara sigue automáticamente al agente">
        <span>[CAM] Seguir Agente</span>
      </button>
      <button class="btn" id="btn-reduced-motion" title="Accesibilidad: reducir animaciones físicas">
        <span>Movimiento Suave</span>
      </button>
      <button class="btn" id="btn-recenter" title="Centrar cámara en el grafo">
        <span>Centrar</span>
      </button>
    </div>
  </header>

  <!-- 2. Main Canvas Viewport -->
  <div id="stage-container">
    <canvas id="viewport"></canvas>

    <!-- Panel "Ahora mismo" -->
    <div class="overlay-panel" id="now-panel">
      <div class="now-title">
        <span>Ahora Mismo</span>
        <span id="queue-badge" style="display:none; background:#1e3a29; color:var(--mint); font-family:monospace; padding:1px 6px; border-radius:4px;">0 en cola</span>
      </div>
      <div id="spider-status-container">
        <span class="spider-status-chip status-descanso" id="spider-badge">● DESCANSO</span>
      </div>
      <div class="now-target" id="spider-target-label">En reposo central</div>
      <div class="now-desc" id="spider-summary">MINT está a la espera de eventos del registro de auditoría. Sin actividad real, la araña descansa.</div>
      <div class="audit-link" id="spider-audit-ref">REF: AUDIT_IDLE</div>
    </div>

    <!-- Inspector de Nodo Seleccionado -->
    <div class="overlay-panel" id="inspector-panel">
      <div class="now-title">
        <span>Detalle del Nodo</span>
        <button id="close-inspector" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">X</button>
      </div>
      <div class="now-target" id="insp-label">Nombre del Nodo</div>
      <div style="font-size: 11px; font-family: monospace; color: var(--mint);" id="insp-type">TIPO</div>
      <div class="now-desc" id="insp-desc" style="margin-top:6px;">Detalles operativos...</div>
      <div id="insp-meta" style="font-size: 11px; font-family: monospace; color: #94a3b8; margin-top: 6px;"></div>
    </div>

    <!-- Estado Vacío (Base de datos sin registros) -->
    <div id="empty-state">
      <div style="font-size: 28px; margin-bottom: 12px; font-weight: bold; color: var(--mint);">[GRAFO]</div>
      <h2>Sin datos en la base de datos</h2>
      <p>No se encontraron productos, almacenes ni decisiones registradas en PostgreSQL para la empresa <strong id="empty-comp">${companyId}</strong>.<br><br>
      Por directiva de gobernanza de MINT, está <strong>prohibido inventar nodos o datos de relleno</strong>. Registra inventario o ejecuta un caso para observar el grafo.</p>
    </div>
  </div>

  <!-- 3. Bottom Timeline Bar -->
  <footer>
    <div style="display: flex; align-items: center; gap: 8px;">
      <button class="btn" id="btn-play-pause">Pausar</button>
      <button class="btn" id="btn-rewind">Rebobinar -10s</button>
      <span id="clock" style="font-family: monospace; color: var(--text-muted);">--:--:--</span>
    </div>

    <div class="timeline-scrubber">
      <span style="font-size: 10px; color: var(--text-muted);">Línea de tiempo</span>
      <input type="range" id="time-slider" min="0" max="100" value="100" />
      <span id="event-counter" style="font-family: monospace; font-size: 11px; color: var(--mint);">0 eventos</span>
    </div>

    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 11px; color: var(--text-muted);">Velocidad:</span>
      <button class="btn" id="btn-speed">1x</button>
    </div>
  </footer>

  <!-- 4. Spider & Graph Engine (Self-contained, Vanilla Canvas 2D + Euler Physics) -->
  <script>
    // Parámetros de sesión
    const TOKEN = "${token}";
    const COMPANY = "${companyId}";
    const IS_DEMO = ${isDemo};
    const IS_SHADOW = ${isShadow};

    // Estado del Grafo
    let graphNodes = [];
    let graphEdges = [];
    let eventHistory = [];
    let eventQueue = [];
    let isPaused = false;
    let followSpider = true;
    let reducedMotion = false;
    let playbackSpeed = 1.0;

    // Cámara Pan & Zoom
    let camera = { x: 0, y: 0, zoom: 1.0 };
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let draggedNode = null;
    let selectedNode = null;

    // Estado de la Araña (MINT)
    const spider = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      state: "descanso",
      summary: "MINT está en descanso. A la espera de actividad real de auditoría.",
      targetLabel: "Centro Operativo",
      auditRef: "AUDIT_IDLE",
      rotation: 0,
      walkCycle: 0,
      trail: [], // Estela que se desvanece
      animPulse: 0,
      lastEventTimestamp: Date.now(),
    };

    // Canvas
    const canvas = document.getElementById("viewport");
    const ctx = canvas.getContext("2d");
    const stage = document.getElementById("stage-container");

    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = stage.clientWidth * dpr;
      canvas.height = stage.clientHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // 1. Cargar datos iniciales desde el servidor local
    async function loadGraphData() {
      try {
        const res = await fetch(\`/api/graph?token=\${TOKEN}\`);
        if (res.status === 401) {
          alert("Acceso denegado: Token de sesión inválido o expirado.");
          return;
        }
        const data = await res.json();
        graphNodes = data.nodes || [];
        graphEdges = data.edges || [];
        eventHistory = data.historyEvents || [];

        document.getElementById("company-label").textContent = data.companyName || COMPANY;

        // Comprobar si la BD está vacía (sin nodos de relleno)
        if (graphNodes.length === 0) {
          document.getElementById("empty-state").style.display = "flex";
          return;
        } else {
          document.getElementById("empty-state").style.display = "none";
        }

        // Distribución física inicial
        initNodePositions();
        centerCamera();

        // Encolar eventos históricos para reproducción inicial si existen
        if (eventHistory.length > 0) {
          eventQueue = [...eventHistory];
          document.getElementById("event-counter").textContent = \`\${eventHistory.length} eventos\`;
        }

        connectSSE();
      } catch (err) {
        console.error("Fallo al conectar con el servidor MINT CLI:", err);
      }
    }

    // 2. Conectar al Streaming SSE en Vivo
    function connectSSE() {
      const evtSource = new EventSource(\`/api/events/stream?token=\${TOKEN}\`);

      evtSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === "keepalive") return;

          // Deduplicación en el cliente
          if (!eventHistory.some(h => h.id === event.id)) {
            eventHistory.push(event);
            eventQueue.push(event);
            document.getElementById("event-counter").textContent = \`\${eventHistory.length} eventos\`;
          }
        } catch {}
      };

      evtSource.onerror = () => {
        // Auto-reconexión automática
        setTimeout(() => connectSSE(), 3000);
      };
    }

    // 3. Inicialización Física de Nodos (Euler Force Simulation)
    function initNodePositions() {
      const count = graphNodes.length;
      graphNodes.forEach((node, i) => {
        const angle = (i / count) * Math.PI * 2;
        const radius = node.entityType === "modulo" ? 120 : 240 + (i % 3) * 50;
        node.x = Math.cos(angle) * radius;
        node.y = Math.sin(angle) * radius;
        node.vx = 0;
        node.vy = 0;
      });
      spider.x = 0;
      spider.y = 0;
      spider.targetX = 0;
      spider.targetY = 0;
    }

    function centerCamera() {
      camera.x = stage.clientWidth / 2;
      camera.y = stage.clientHeight / 2;
      camera.zoom = 1.0;
    }

    // 4. Bucle de Física Force-Directed (Coulomb + Hooke)
    function updatePhysics() {
      if (reducedMotion) return; // Accesibilidad

      const kRepulsion = 1600;
      const kSpring = 0.04;
      const springLength = 110;
      const damping = 0.88;

      // Repulsión
      for (let i = 0; i < graphNodes.length; i++) {
        const n1 = graphNodes[i];
        for (let j = i + 1; j < graphNodes.length; j++) {
          const n2 = graphNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 320) {
            const force = kRepulsion / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            if (n1 !== draggedNode) { n1.vx -= fx; n1.vy -= fy; }
            if (n2 !== draggedNode) { n2.vx += fx; n2.vy += fy; }
          }
        }
      }

      // Conexiones de resorte
      const nodesMap = new Map(graphNodes.map(n => [n.id, n]));
      for (const edge of graphEdges) {
        const n1 = nodesMap.get(edge.source);
        const n2 = nodesMap.get(edge.target);
        if (n1 && n2) {
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - springLength) * kSpring;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (n1 !== draggedNode) { n1.vx += fx; n1.vy += fy; }
          if (n2 !== draggedNode) { n2.vx -= fx; n2.vy -= fy; }
        }
      }

      // Integración y gravedad hacia el centro
      for (const n of graphNodes) {
        if (n !== draggedNode) {
          n.vx -= n.x * 0.015;
          n.vy -= n.y * 0.015;
          n.vx *= damping;
          n.vy *= damping;
          n.x += n.vx;
          n.y += n.vy;
        }
      }
    }

    // 5. Procesamiento de la Cola de Eventos de la Araña
    function processSpiderEvents() {
      if (isPaused || eventQueue.length === 0) return;

      const badge = document.getElementById("queue-badge");
      if (eventQueue.length > 1) {
        badge.style.display = "inline-block";
        badge.textContent = \`+\${eventQueue.length} en cola\`;
      } else {
        badge.style.display = "none";
      }

      // Si la araña ya llegó a su objetivo actual, despachar el siguiente
      const distToTarget = Math.hypot(spider.targetX - spider.x, spider.targetY - spider.y);
      if (distToTarget < 12) {
        const nextEv = eventQueue.shift();
        if (nextEv) {
          dispatchSpiderMovement(nextEv);
        } else {
          // Si no hay más eventos, vuelve al reposo central
          spider.state = "descanso";
          spider.targetX = 0;
          spider.targetY = 0;
          updateNowPanel("descanso", "Centro Operativo", "MINT está en reposo. Sin actividad real, la araña descansa.", "IDLE");
        }
      }
    }

    function dispatchSpiderMovement(ev) {
      const target = graphNodes.find(n => n.id === ev.targetNodeId) ||
                     graphNodes.find(n => n.id === ev.sourceNodeId) ||
                     graphNodes[0];

      if (target) {
        spider.targetX = target.x;
        spider.targetY = target.y;
        spider.state = ev.type;
        spider.summary = ev.summary;
        spider.targetLabel = target.label;
        spider.auditRef = ev.auditRef;

        updateNowPanel(ev.type, target.label, ev.summary, ev.auditRef);
      }
    }

    function updateNowPanel(type, target, summary, ref) {
      const badge = document.getElementById("spider-badge");
      badge.className = \`spider-status-chip status-\${type}\`;
      badge.textContent = \`● \${type.toUpperCase()}\`;

      document.getElementById("spider-target-label").textContent = target;
      document.getElementById("spider-summary").textContent = summary;
      document.getElementById("spider-audit-ref").textContent = \`REF: \${ref}\`;
    }

    // 6. Actualización cinemática de la araña (Desplazamiento, estela y patas)
    function updateSpider() {
      const dx = spider.targetX - spider.x;
      const dy = spider.targetY - spider.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 2) {
        const speed = Math.min(dist * 0.08, 6.0 * playbackSpeed);
        spider.x += (dx / dist) * speed;
        spider.y += (dy / dist) * speed;
        spider.rotation = Math.atan2(dy, dx);
        spider.walkCycle += speed * 0.3;

        // Estela bioluminiscente
        spider.trail.push({ x: spider.x, y: spider.y, alpha: 1.0 });
      }

      // Desvanecer estela
      for (let i = spider.trail.length - 1; i >= 0; i--) {
        spider.trail[i].alpha -= 0.035;
        if (spider.trail[i].alpha <= 0) {
          spider.trail.splice(i, 1);
        }
      }

      spider.animPulse += 0.05;

      // Modo Seguimiento de Cámara
      if (followSpider && dist > 5) {
        const targetCamX = stage.clientWidth / 2 - spider.x * camera.zoom;
        const targetCamY = stage.clientHeight / 2 - spider.y * camera.zoom;
        camera.x += (targetCamX - camera.x) * 0.08;
        camera.y += (targetCamY - camera.y) * 0.08;
      }
    }

    // 7. Renderizado Canvas 2D
    function draw() {
      ctx.clearRect(0, 0, stage.clientWidth, stage.clientHeight);

      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);

      // A. Estela de la araña
      for (const t of spider.trail) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = IS_SHADOW
          ? \`rgba(103, 232, 249, \${t.alpha * 0.5})\`
          : \`rgba(34, 197, 94, \${t.alpha * 0.6})\`;
        ctx.fill();
      }

      // B. Aristas
      const nodesMap = new Map(graphNodes.map(n => [n.id, n]));
      for (const edge of graphEdges) {
        const n1 = nodesMap.get(edge.source);
        const n2 = nodesMap.get(edge.target);
        if (n1 && n2) {
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.strokeStyle = "rgba(100, 116, 139, 0.22)";
          ctx.lineWidth = Math.min(3, 1 + edge.frequency * 0.5);
          ctx.stroke();
        }
      }

      // C. Nodos
      for (const n of graphNodes) {
        const isSelected = selectedNode === n;
        const radius = n.importance || 12;

        // Anillo de Estado
        if (n.status === "alerta") {
          ctx.beginPath();
          ctx.arc(n.x, n.y, radius + 5, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(245, 158, 11, 0.8)";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (n.status === "pendiente_aprobacion") {
          ctx.beginPath();
          ctx.arc(n.x, n.y, radius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(234, 88, 12, 0.8)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Círculo sólido
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);

        let fillColor = "#1e293b";
        let strokeColor = "#475569";
        if (n.entityType === "modulo") { fillColor = "#14532d"; strokeColor = "#22c55e"; }
        else if (n.entityType === "producto") { fillColor = "#0c4a6e"; strokeColor = "#0284c7"; }
        else if (n.entityType === "proveedor") { fillColor = "#134e4a"; strokeColor = "#0d9488"; }
        else if (n.entityType === "almacen") { fillColor = "#78350f"; strokeColor = "#d97706"; }
        else if (n.entityType === "decision") { fillColor = "#581c87"; strokeColor = "#9333ea"; }

        if (n.health === "no_confiable") strokeColor = "#ef4444";

        ctx.fillStyle = isSelected ? "#15803d" : fillColor;
        ctx.strokeStyle = isSelected ? "#4ade80" : strokeColor;
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.fill();
        ctx.stroke();

        // Etiqueta de texto
        ctx.font = \`600 \${n.entityType === "modulo" ? 11 : 9}px ui-sans-serif, system-ui, sans-serif\`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isSelected ? "#86efac" : "#cbd5e1";
        ctx.fillText(n.label, n.x, n.y + radius + 10);
      }

      // D. Dibujar a MINT (La Araña)
      drawSpider(ctx, spider);

      ctx.restore();
    }

    // Dibujo Procedimental de la Araña con sus 8 patas articuladas
    function drawSpider(ctx, s) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);

      if (IS_SHADOW) {
        ctx.globalAlpha = 0.45; // Modo Sombra / Fantasma
      }

      // Hilos de interacción si está analizando o proponiendo
      if (s.state === "analizando" || s.state === "ejecuta") {
        ctx.beginPath();
        ctx.arc(0, 0, 24 + Math.sin(s.animPulse * 3) * 6, 0, Math.PI * 2);
        ctx.strokeStyle = s.state === "analizando" ? "rgba(168, 85, 247, 0.6)" : "rgba(34, 197, 94, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 8 Patas Articuladas
      ctx.strokeStyle = IS_SHADOW ? "#67e8f9" : "#22c55e";
      ctx.lineWidth = 1.8;

      for (let i = 0; i < 4; i++) {
        const sideAngles = [-0.9, -0.4, 0.4, 0.9];
        const baseAngle = sideAngles[i];
        const stepOffset = Math.sin(s.walkCycle + i * 1.5) * 4;

        // Pata izquierda
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(-8 + stepOffset, -14);
        ctx.lineTo(-14 + stepOffset, -20);
        ctx.stroke();

        // Pata derecha
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.lineTo(-8 - stepOffset, 14);
        ctx.lineTo(-14 - stepOffset, 20);
        ctx.stroke();
      }

      // Abdomen posterior
      ctx.beginPath();
      ctx.ellipse(-8, 0, 9, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = IS_SHADOW ? "#083344" : "#092416";
      ctx.fill();
      ctx.strokeStyle = IS_SHADOW ? "#06b6d4" : "#166534";
      ctx.stroke();

      // Cefalotórax (Cabeza)
      ctx.beginPath();
      ctx.arc(4, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = IS_SHADOW ? "#0e7490" : "#14532d";
      ctx.fill();
      ctx.strokeStyle = IS_SHADOW ? "#67e8f9" : "#22c55e";
      ctx.stroke();

      // Ojos verdes esmeralda bioluminiscentes
      ctx.fillStyle = IS_SHADOW ? "#a5f3fc" : "#4ade80";
      ctx.beginPath();
      ctx.arc(7, -2.5, 1.8, 0, Math.PI * 2);
      ctx.arc(7, 2.5, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Indicador de estado especial sobre la araña
      if (s.state === "espera_aprobacion") {
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(-4, -26, 8, 8); // Candado
      } else if (s.state === "bloqueado") {
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-6, -26, 12, 4); // Barrera roja
      }

      ctx.restore();
    }

    // 8. Main Loop
    function loop() {
      updatePhysics();
      processSpiderEvents();
      updateSpider();
      draw();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // 9. Interacción de Ratón (Pan, Zoom, Drag Nodos)
    canvas.addEventListener("mousedown", (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left - camera.x) / camera.zoom;
      const my = (e.clientY - rect.top - camera.y) / camera.zoom;

      // Buscar si clickeó un nodo
      for (let i = graphNodes.length - 1; i >= 0; i--) {
        const n = graphNodes[i];
        if (Math.hypot(n.x - mx, n.y - my) <= (n.importance || 12) + 4) {
          draggedNode = n;
          selectedNode = n;
          showInspector(n);
          return;
        }
      }

      isDragging = true;
      dragStart = { x: e.clientX - camera.x, y: e.clientY - camera.y };
      selectedNode = null;
      document.getElementById("inspector-panel").style.display = "none";
    });

    window.addEventListener("mousemove", (e) => {
      if (draggedNode) {
        const rect = canvas.getBoundingClientRect();
        draggedNode.x = (e.clientX - rect.left - camera.x) / camera.zoom;
        draggedNode.y = (e.clientY - rect.top - camera.y) / camera.zoom;
        draggedNode.vx = 0;
        draggedNode.vy = 0;
      } else if (isDragging) {
        camera.x = e.clientX - dragStart.x;
        camera.y = e.clientY - dragStart.y;
      }
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
      draggedNode = null;
    });

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      camera.zoom = Math.max(0.2, Math.min(3.5, camera.zoom * zoomFactor));
    });

    function showInspector(n) {
      const p = document.getElementById("inspector-panel");
      p.style.display = "block";
      document.getElementById("insp-label").textContent = n.label;
      document.getElementById("insp-type").textContent = \`\${n.entityType.toUpperCase()} • SALUD: \${n.health.toUpperCase()}\`;
      document.getElementById("insp-desc").textContent = n.sublabel || "Sin descripción adicional.";

      const metaEl = document.getElementById("insp-meta");
      metaEl.innerHTML = "";
      if (n.metadata) {
        for (const [k, v] of Object.entries(n.metadata)) {
          const row = document.createElement("div");
          row.textContent = \`\${k}: \${typeof v === "object" ? JSON.stringify(v) : v}\`;
          metaEl.appendChild(row);
        }
      }
    }

    document.getElementById("close-inspector").onclick = () => {
      document.getElementById("inspector-panel").style.display = "none";
    };

    // 10. Controles de UI
    document.getElementById("btn-follow").onclick = function() {
      followSpider = !followSpider;
      this.classList.toggle("active", followSpider);
    };
    document.getElementById("btn-follow").classList.toggle("active", followSpider);

    document.getElementById("btn-reduced-motion").onclick = function() {
      reducedMotion = !reducedMotion;
      this.classList.toggle("active", reducedMotion);
    };

    document.getElementById("btn-recenter").onclick = centerCamera;

    document.getElementById("btn-play-pause").onclick = function() {
      isPaused = !isPaused;
      this.textContent = isPaused ? "Reanudar" : "Pausar";
    };

    document.getElementById("btn-speed").onclick = function() {
      playbackSpeed = playbackSpeed === 1.0 ? 2.0 : playbackSpeed === 2.0 ? 0.5 : 1.0;
      this.textContent = \`\${playbackSpeed}x\`;
    };

    document.getElementById("btn-rewind").onclick = function() {
      // Rebobinar últimos 10 eventos
      const recent = eventHistory.slice(-10);
      eventQueue = [...recent, ...eventQueue];
    };

    // Búsqueda instantánea con autoenfoque
    document.getElementById("search-input").addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) return;
      const match = graphNodes.find(n => n.label.toLowerCase().includes(q) || (n.sublabel && n.sublabel.toLowerCase().includes(q)));
      if (match) {
        selectedNode = match;
        showInspector(match);
        camera.x = stage.clientWidth / 2 - match.x * camera.zoom;
        camera.y = stage.clientHeight / 2 - match.y * camera.zoom;
      }
    });

    // Reloj
    setInterval(() => {
      document.getElementById("clock").textContent = new Date().toLocaleTimeString();
    }, 1000);

    // Iniciar carga
    loadGraphData();
  </script>
</body>
</html>`;
}
