import React, { useRef, useState, useMemo, useCallback, useEffect } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import {
  useAgentTelemetry,
  UseAgentTelemetryOptions,
} from "../../hooks/useAgentTelemetry";
import {
  TelemetryGraphNode,
  TelemetryGraphLink,
  AgentTelemetryAction,
} from "../../types/telemetry";
import { RAW_MINT_NODES, RAW_MINT_EDGES } from "../../data/graphData";
import {
  Activity,
  Play,
  RotateCcw,
  Wifi,
  WifiOff,
  Maximize2,
  Sparkles,
  Layers,
  X,
  Compass,
} from "lucide-react";

export type AgentState = "IDLE" | "READING" | "THINKING" | "MUTATING";

// Paleta Sobria de Alta Precisión (Estilo Linear, Stripe & Vercel)
const THEME = {
  canvasBg: "#090D16",
  gridLine: "rgba(255, 255, 255, 0.02)",
  nodeRestFill: "#121824",
  nodeRestStroke: "#262F40",
  nodeInactiveOpacity: 0.3,
  linkRest: "rgba(255, 255, 255, 0.07)",
  linkActive: "rgba(16, 185, 129, 0.45)",
  mascotContainerBg: "#111C16",
  textPrimary: "#E2E8F0",
  textMuted: "#94A3B8",
  pillBg: "rgba(15, 20, 28, 0.92)",
  pillBorder: "rgba(255, 255, 255, 0.08)",
  stateColors: {
    IDLE: "#10B981",
    READING: "#14B8A6",   // Teal / Cian preciso al leer
    THINKING: "#10B981",  // Esmeralda sobrio al interpretar
    MUTATING: "#22C55E",  // Verde limpio al mutar
  },
};

const ACTION_COLORS: Record<AgentTelemetryAction, string> = {
  read: "#14B8A6",
  write: "#22C55E",
  query: "#14B8A6",
  execute: "#22C55E",
  spawn: "#10B981",
};

// Dataset Demo de Alta Precisión
const DEMO_GRAPH_NODES: TelemetryGraphNode[] = [
  {
    id: "mod_inventario",
    label: "Módulo Inventario",
    group: "node",
    interactionCount: 14,
    bytesOrRowsTotal: 2450,
    metadata: { hasAlert: true, status: "alerta", category: "Inventario Físico" },
  },
  {
    id: "mod_aprobaciones",
    label: "Módulo Aprobaciones",
    group: "node",
    interactionCount: 8,
    bytesOrRowsTotal: 1200,
    metadata: { hasAlert: true, status: "alerta", category: "Gobernanza HITL" },
  },
  {
    id: "mod_logistica",
    label: "Módulo Logística",
    group: "node",
    interactionCount: 5,
    bytesOrRowsTotal: 840,
    metadata: { hasAlert: false, status: "normal", category: "Despachos & Rutas" },
  },
  {
    id: "mod_proveedores",
    label: "Módulo Proveedores",
    group: "node",
    interactionCount: 9,
    bytesOrRowsTotal: 1890,
    metadata: { hasAlert: false, status: "normal", category: "Catálogo Homologado" },
  },
  {
    id: "sku_disc7",
    label: "SKU-COR-DISC7",
    group: "file",
    interactionCount: 22,
    bytesOrRowsTotal: 450,
    metadata: {
      hasAlert: true,
      sku: "SKU-COR-DISC7",
      name: "Disco Diamantado 7' Concreto",
      stock: 8,
      minStock: 25,
      unitPriceCop: 45000,
      status: "alerta_quiebre",
    },
  },
  {
    id: "sku_sm400",
    label: "SKU-MAN-SM400",
    group: "file",
    interactionCount: 16,
    bytesOrRowsTotal: 320,
    metadata: {
      hasAlert: false,
      sku: "SKU-MAN-SM400",
      name: "Martillo Demoledor SDS-Max 1500W",
      stock: 3,
      minStock: 12,
      unitPriceCop: 1560000,
    },
  },
  {
    id: "alm_bucaramanga",
    label: "Bodega Matriz Bucaramanga",
    group: "warehouse",
    interactionCount: 11,
    bytesOrRowsTotal: 3200,
    metadata: { hasAlert: false, city: "Bucaramanga", capacity: "1.200 m³" },
  },
  {
    id: "prov_ferr_bog",
    label: "Ferreterías Unidas Bogotá",
    group: "supplier",
    interactionCount: 15,
    bytesOrRowsTotal: 4100,
    metadata: { hasAlert: false, rating: "4.8★", leadTimeDays: 3, city: "Bogotá" },
  },
  {
    id: "dec_po_2026_0089",
    label: "Decisión PO-2026-0089",
    group: "database",
    interactionCount: 28,
    bytesOrRowsTotal: 6500,
    metadata: {
      hasAlert: true,
      decisionId: "PO-2026-0089",
      targetEntity: "SKU-COR-DISC7",
      suggestedUnits: 30,
      totalCop: 1350000,
      status: "pendiente_aprobacion",
    },
  },
  {
    id: "agent_coordinator",
    label: "Mint Autonomous Agent",
    group: "agent",
    interactionCount: 42,
    bytesOrRowsTotal: 18500,
    metadata: { role: "Orquestador Autónomo ReAct", mascotHome: true },
  },
];

const DEMO_GRAPH_LINKS: TelemetryGraphLink[] = [
  { id: "l1", source: "agent_coordinator", target: "mod_inventario", action: "query", interactionCount: 12 },
  { id: "l2", source: "agent_coordinator", target: "mod_logistica", action: "execute", interactionCount: 8 },
  { id: "l3", source: "agent_coordinator", target: "mod_aprobaciones", action: "write", interactionCount: 15 },
  { id: "l4", source: "agent_coordinator", target: "mod_proveedores", action: "read", interactionCount: 9 },
  { id: "l5", source: "mod_inventario", target: "sku_disc7", action: "read", interactionCount: 18 },
  { id: "l6", source: "mod_inventario", target: "sku_sm400", action: "read", interactionCount: 10 },
  { id: "l7", source: "mod_logistica", target: "alm_bucaramanga", action: "query", interactionCount: 11 },
  { id: "l8", source: "mod_proveedores", target: "prov_ferr_bog", action: "query", interactionCount: 14 },
  { id: "l9", source: "mod_aprobaciones", target: "dec_po_2026_0089", action: "write", interactionCount: 20 },
  { id: "l10", source: "sku_disc7", target: "dec_po_2026_0089", action: "execute", interactionCount: 16 },
  { id: "l11", source: "prov_ferr_bog", target: "dec_po_2026_0089", action: "query", interactionCount: 12 },
  { id: "l12", source: "alm_bucaramanga", target: "dec_po_2026_0089", action: "query", interactionCount: 8 },
];

interface LiveObsidianGraphProps {
  options?: UseAgentTelemetryOptions;
}

export const LiveObsidianGraph: React.FC<LiveObsidianGraphProps> = ({ options }) => {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const {
    status,
    graphData: wsGraphData,
    events,
    lastEvent,
    triggerSimulation,
    clearGraph,
  } = useAgentTelemetry(options);

  // Selector de dataset: "demo" vs "full"
  const [datasetMode, setDatasetMode] = useState<"demo" | "full">("demo");

  // Filtros de grupos
  const [activeGroups, setActiveGroups] = useState<Set<string>>(
    new Set(["agent", "node", "file", "database", "warehouse", "supplier", "tool"])
  );

  // Nodo seleccionado y nodo bajo cursor (hover)
  const [selectedNode, setSelectedNode] = useState<TelemetryGraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<TelemetryGraphNode | null>(null);

  // Control manual de estados y objetivo
  const [manualState, setManualState] = useState<AgentState | null>(null);
  const [manualTargetId, setManualTargetId] = useState<string | null>(null);

  // Modo Mascota Viajera (desplazamiento suave entre nodos)
  const [mascotFlightEnabled, setMascotFlightEnabled] = useState<boolean>(true);

  // Estado del Orquestador de Solicitud en Vivo
  const [requestRunning, setRequestRunning] = useState<boolean>(false);
  const [requestStep, setRequestStep] = useState<number>(0);
  const [requestStory, setRequestStory] = useState<{
    title: string;
    description: string;
    targetId: string;
    state: AgentState;
  } | null>(null);

  // 1. Precarga de la textura de la Guanábana (Mascota MINT)
  const mascotImg = useMemo(() => {
    if (typeof window === "undefined") return null;
    const img = new Image();
    img.src = "/assets/mint-mascot-glow.svg";
    return img;
  }, []);

  // 2. Construcción de Nodos y Aristas
  const activeBaseData = useMemo(() => {
    if (datasetMode === "demo") {
      return {
        nodes: DEMO_GRAPH_NODES,
        links: DEMO_GRAPH_LINKS,
      };
    }

    const fullNodes: TelemetryGraphNode[] = RAW_MINT_NODES.map((n) => {
      let grp: TelemetryGraphNode["group"] = "node";
      if (n.type === "agent") grp = "agent";
      else if (n.type === "database") grp = "database";
      else if (n.type === "tool") grp = "tool";
      else if (n.type === "warehouse") grp = "warehouse";
      else if (n.type === "supplier") grp = "supplier";
      else if (n.type === "sku") grp = "file";
      else if (n.type === "decision") grp = "database";

      return {
        id: n.id,
        label: n.label,
        group: grp,
        interactionCount: Math.max(3, n.degree || 4),
        bytesOrRowsTotal: 1000,
        metadata: {
          ...n.metadata,
          hasAlert: n.status === "warning",
        },
      };
    });

    const fullLinks: TelemetryGraphLink[] = RAW_MINT_EDGES.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      action: e.relation === "modifies" ? "write" : e.relation === "queries" ? "read" : "execute",
      interactionCount: 2,
    }));

    return { nodes: fullNodes, links: fullLinks };
  }, [datasetMode]);

  // Combinar eventos WebSocket reales con datos base
  const combinedGraphData = useMemo(() => {
    if (wsGraphData.nodes.length > 0 && datasetMode === "full") {
      const mergedNodesMap = new Map<string, TelemetryGraphNode>();
      activeBaseData.nodes.forEach((n) => mergedNodesMap.set(n.id, n));
      wsGraphData.nodes.forEach((n) => mergedNodesMap.set(n.id, n));

      const mergedLinksMap = new Map<string, TelemetryGraphLink>();
      activeBaseData.links.forEach((l) => mergedLinksMap.set(l.id, l));
      wsGraphData.links.forEach((l) => mergedLinksMap.set(l.id, l));

      return {
        nodes: Array.from(mergedNodesMap.values()),
        links: Array.from(mergedLinksMap.values()),
      };
    }
    return activeBaseData;
  }, [activeBaseData, wsGraphData, datasetMode]);

  // Filtrado de nodos
  const filteredData = useMemo(() => {
    const validNodes = combinedGraphData.nodes.filter((n) => activeGroups.has(n.group));
    const validNodeIds = new Set(validNodes.map((n) => n.id));
    const validLinks = combinedGraphData.links.filter((l) => {
      const sourceId = typeof l.source === "object" ? (l.source as any).id : l.source;
      const targetId = typeof l.target === "object" ? (l.target as any).id : l.target;
      return validNodeIds.has(sourceId) && validNodeIds.has(targetId);
    });

    return {
      nodes: validNodes,
      links: validLinks,
    };
  }, [combinedGraphData, activeGroups]);

  // 3. Máquina de Estados del Agente
  const { currentAgentState, activeTargetId } = useMemo(() => {
    if (requestRunning && requestStory) {
      return {
        currentAgentState: requestStory.state,
        activeTargetId: requestStory.targetId,
      };
    }

    if (manualState) {
      const target = manualTargetId
        ? filteredData.nodes.find((n) => n.id === manualTargetId)
        : filteredData.nodes.find((n) => n.id === "dec_po_2026_0089") ||
          filteredData.nodes.find((n) => n.group !== "agent");

      return {
        currentAgentState: manualState,
        activeTargetId: target ? target.id : null,
      };
    }

    if (lastEvent && Date.now() - lastEvent.timestamp < 4000) {
      let st: AgentState = "THINKING";
      if (lastEvent.action === "read" || lastEvent.action === "query") {
        st = "READING";
      } else if (lastEvent.action === "write" || lastEvent.action === "execute") {
        st = "MUTATING";
      }
      return { currentAgentState: st, activeTargetId: lastEvent.target.id };
    }

    return {
      currentAgentState: "IDLE" as AgentState,
      activeTargetId: manualTargetId || "dec_po_2026_0089",
    };
  }, [requestRunning, requestStory, manualState, manualTargetId, lastEvent, filteredData.nodes]);

  // Cinemática limpia de la Mascota Viajera
  const mascotKinematics = useRef<{
    x: number;
    y: number;
    rotation: number;
    walkCycle: number;
    trail: Array<{ x: number; y: number; alpha: number }>;
    initialized: boolean;
  }>({
    x: 0,
    y: 0,
    rotation: 0,
    walkCycle: 0,
    trail: [],
    initialized: false,
  });

  // 4. Ajuste de Fuerzas D3 (Física ordenada, simétrica y espaciada)
  useEffect(() => {
    if (fgRef.current) {
      // Repulsión equilibrada para evitar superposición de nodos y etiquetas
      fgRef.current.d3Force("charge")?.strength(-380);
      fgRef.current.d3Force("link")?.distance(115);
    }
  }, [filteredData]);

  // 5. Orquestador de Solicitud en Vivo
  const handleRunLiveRequest = useCallback(() => {
    setRequestRunning(true);
    setRequestStep(1);

    // PASO 1: LEYENDO (READING)
    setRequestStory({
      title: "Paso 1/3: Lectura Sensorial",
      description: "Mint consulta existencias y demanda en SKU-COR-DISC7.",
      targetId: "sku_disc7",
      state: "READING",
    });

    const t1 = setTimeout(() => {
      // PASO 2: INTERPRETANDO (THINKING)
      setRequestStep(2);
      setRequestStory({
        title: "Paso 2/3: Interpretación de Políticas",
        description: "Mint evalúa reglas de abastecimiento y margen en Ferreterías Unidas Bogotá.",
        targetId: "prov_ferr_bog",
        state: "THINKING",
      });
    }, 4000);

    const t2 = setTimeout(() => {
      // PASO 3: CAMBIANDO / MUTANDO (MUTATING)
      setRequestStep(3);
      setRequestStory({
        title: "Paso 3/3: Mutación y Decisión",
        description: "Mint genera y persiste la decisión PO-2026-0089 en la base de datos.",
        targetId: "dec_po_2026_0089",
        state: "MUTATING",
      });
    }, 8200);

    const t3 = setTimeout(() => {
      setRequestStep(4);
      setRequestStory({
        title: "Solicitud Completada",
        description: "Decisión PO-2026-0089 registrada y lista para firma en Bandeja HITL.",
        targetId: "dec_po_2026_0089",
        state: "IDLE",
      });
      setTimeout(() => {
        setRequestRunning(false);
      }, 2500);
    }, 12500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const toggleGroup = (group: string) => {
    setActiveGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        if (next.size > 1) next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const handleResetZoom = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(350, 60);
    }
  }, []);

  // 6. Pre-renderizado de Grilla Sutil en Canvas (`rgba(255, 255, 255, 0.02)`)
  const onRenderFramePre = useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
    ctx.save();
    ctx.strokeStyle = THEME.gridLine;
    ctx.lineWidth = 1 / Math.max(0.2, globalScale);

    const gridSize = 40;
    const bound = 1600;

    ctx.beginPath();
    for (let x = -bound; x <= bound; x += gridSize) {
      ctx.moveTo(x, -bound);
      ctx.lineTo(x, bound);
    }
    for (let y = -bound; y <= bound; y += gridSize) {
      ctx.moveTo(-bound, y);
      ctx.lineTo(bound, y);
    }
    ctx.stroke();
    ctx.restore();
  }, []);

  // 7. Renderizado de Nodos Sobrio (Linear & Stripe Precision)
  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const gNode = node as TelemetryGraphNode;
      const isSelected = selectedNode?.id === gNode.id;
      const isHovered = hoveredNode?.id === gNode.id;
      const isTarget = Boolean(activeTargetId && gNode.id === activeTargetId);
      const isAgentNest = gNode.group === "agent";

      ctx.save();

      // --- NODO CENTRAL: MINT AUTONOMOUS AGENT ---
      if (isAgentNest) {
        const radius = 22;
        const stateColor = THEME.stateColors[currentAgentState] || THEME.stateColors.IDLE;

        // Círculo contenedor con bordes definidos (#111C16)
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = THEME.mascotContainerBg;
        ctx.fill();

        // 1. Anillo exterior limpio de 1.5px con color de estado exacto
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = stateColor;
        ctx.stroke();

        // 2. Segundo anillo concéntrico fino de 0.5px con ligera expansión controlada
        if (currentAgentState !== "IDLE") {
          const expansion = 4 + Math.sin(Date.now() / 250) * 1.5;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + expansion, 0, 2 * Math.PI);
          ctx.lineWidth = 0.5;
          ctx.strokeStyle = `${stateColor}66`; // Opacidad controlada al 40%
          ctx.stroke();
        }

        // Si la mascota está fija al centro (sin vuelo), renderizarla contenida
        if (!mascotFlightEnabled) {
          drawContainedMascot(ctx, node.x, node.y, radius * 1.6, mascotImg);
        }

        ctx.restore();

        // Píldora de estado del agente (siempre visible)
        drawMinimalistPill(
          ctx,
          node.x,
          node.y + radius + 11,
          `Mint · ${currentAgentState}`,
          stateColor
        );
        return;
      }

      // --- RESTO DE NODOS (PostgreSQL, Módulos, SKUs, Bodegas, Decisiones) ---
      const hasAlert = Boolean(gNode.metadata?.hasAlert);
      const radius = gNode.group === "node" ? 16 : gNode.group === "database" ? 15 : 12;

      // Nodos inactivos / históricos: opacidad limpia del 30%
      const isInactive = !isTarget && !isSelected && !isHovered && currentAgentState !== "IDLE";
      if (isInactive) {
        ctx.globalAlpha = THEME.nodeInactiveOpacity;
      }

      // Si es el nodo objetivo activo
      if (isTarget) {
        const targetColor = THEME.stateColors[currentAgentState] || THEME.stateColors.READING;

        // Relleno sólido mate
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#162032";
        ctx.fill();

        // Borde fino nítido de 1.5px
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = targetColor;
        ctx.stroke();

        // Segundo anillo fino concéntrico de 0.5px
        const exp = 3 + Math.sin(Date.now() / 250) * 1.2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + exp, 0, 2 * Math.PI);
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = `${targetColor}55`;
        ctx.stroke();

        ctx.restore();

        // Badge contextual superior limpio ("Leyendo...", "Interpretando...", "Mutando...")
        const badgeLabel =
          currentAgentState === "READING"
            ? "Leyendo"
            : currentAgentState === "THINKING"
            ? "Interpretando"
            : "Mutando";
        drawMinimalistBadge(ctx, node.x, node.y - radius - 11, badgeLabel, targetColor);

      } else {
        // Nodos en reposo: Relleno sólido oscuro (#121824) con borde fino de 1px en gris pizarra (#262F40)
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = THEME.nodeRestFill;
        ctx.fill();

        ctx.lineWidth = isSelected || isHovered ? 1.5 : 1.0;
        ctx.strokeStyle = isSelected
          ? "#10B981"
          : isHovered
          ? "#64748B"
          : hasAlert
          ? "#F59E0B"
          : THEME.nodeRestStroke;
        ctx.stroke();

        // Alerta sutil: punto ámbar fino de 2.5px si tiene alerta activa
        if (hasAlert && !isInactive) {
          ctx.beginPath();
          ctx.arc(node.x + radius * 0.7, node.y - radius * 0.7, 2.5, 0, 2 * Math.PI);
          ctx.fillStyle = "#F59E0B";
          ctx.fill();
        }

        ctx.restore();
      }

      // --- ETIQUETAS TIPOGRÁFICAS (ANTI-CLUTTER) ---
      // Se muestran siempre para Mint y el nodo objetivo.
      // Para el resto: solo si zoom > 1.3 o si está en hover / seleccionado.
      const shouldShowLabel = isTarget || isSelected || isHovered || globalScale > 1.3;

      if (shouldShowLabel) {
        drawMinimalistLabel(
          ctx,
          node.x,
          node.y + radius + 10,
          gNode.label,
          isTarget ? THEME.stateColors[currentAgentState] : undefined
        );
      }
    },
    [currentAgentState, activeTargetId, mascotImg, selectedNode, hoveredNode, mascotFlightEnabled]
  );

  // 8. Hook Posterior: Cinemática Limpia de la Mascota Viajera
  const onRenderFramePost = useCallback(
    (ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (!mascotFlightEnabled) return;

      const nodes = filteredData.nodes;
      if (nodes.length === 0) return;

      let targetNode = nodes.find((n) => n.id === activeTargetId);
      if (!targetNode) {
        targetNode = nodes.find((n) => n.group === "agent") || nodes[0];
      }

      const km = mascotKinematics.current;

      if (!km.initialized && targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
        km.x = targetNode.x;
        km.y = targetNode.y;
        km.initialized = true;
      }

      // Desplazamiento cinemático suave (Lerp)
      if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
        const dx = targetNode.x - km.x;
        const dy = targetNode.y - km.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 1.2) {
          const speed = Math.min(dist * 0.1, 8.0);
          km.x += (dx / dist) * speed;
          km.y += (dy / dist) * speed;
          km.rotation = Math.atan2(dy, dx);
          km.walkCycle += speed * 0.3;

          km.trail.push({ x: km.x, y: km.y, alpha: 0.6 });
        } else {
          km.walkCycle += 0.04;
        }
      }

      // Desvanecer estela
      for (let i = km.trail.length - 1; i >= 0; i--) {
        km.trail[i].alpha -= 0.05;
        if (km.trail[i].alpha <= 0) {
          km.trail.splice(i, 1);
        }
      }

      // A. Estela sutil (sin halo difuso)
      for (const t of km.trail) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${t.alpha * 0.3})`;
        ctx.fill();
      }

      // B. Haz de escaneo sobrio si está LEYENDO (línea fina de 1px)
      if (currentAgentState === "READING" && targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(km.x, km.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.strokeStyle = "rgba(20, 184, 166, 0.4)";
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.restore();
      }

      // C. Renderizado Contenido de la Mascota Mint
      const stateColor = THEME.stateColors[currentAgentState] || THEME.stateColors.IDLE;
      const mascotRadius = 18;

      ctx.save();
      // Contenedor circular (#111C16)
      ctx.beginPath();
      ctx.arc(km.x, km.y, mascotRadius, 0, 2 * Math.PI);
      ctx.fillStyle = THEME.mascotContainerBg;
      ctx.fill();

      // Anillo exterior limpio de 1.5px
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = stateColor;
      ctx.stroke();

      // Segundo anillo concéntrico de 0.5px con ligera expansión controlada
      if (currentAgentState !== "IDLE") {
        const expansion = 3 + Math.sin(Date.now() / 250) * 1.2;
        ctx.beginPath();
        ctx.arc(km.x, km.y, mascotRadius + expansion, 0, 2 * Math.PI);
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = `${stateColor}55`;
        ctx.stroke();
      }

      // Asset de la Guanábana contenido nítidamente
      drawContainedMascot(ctx, km.x, km.y, mascotRadius * 1.6, mascotImg);
      ctx.restore();

      // D. Píldora de estado minimalista debajo de la mascota
      drawMinimalistPill(
        ctx,
        km.x,
        km.y + mascotRadius + 11,
        `Mint · ${currentAgentState}`,
        stateColor
      );
    },
    [filteredData.nodes, activeTargetId, currentAgentState, mascotImg, mascotFlightEnabled]
  );

  return (
    <div className="relative w-full h-full flex flex-col bg-[#090D16] select-none overflow-hidden font-sans">
      {/* 1. Barra de Control Sobria (Linear Precision) */}
      <div className="h-13 border-b border-[#172033] bg-[#0A0E18] px-4 flex items-center justify-between gap-3 z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-200 tracking-tight flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-mint-400" />
              Telemetría Operativa
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101926] text-mint-400 border border-[#1C2A3E]">
              Guanábana
            </span>
          </div>

          {/* Toggle de Dataset: Demo vs Topología Completa */}
          <div className="hidden sm:flex items-center rounded-md bg-[#0D1424] border border-[#1E2838] p-0.5 text-[11px] font-mono">
            <button
              onClick={() => setDatasetMode("demo")}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                datasetMode === "demo"
                  ? "bg-[#182338] text-gray-100 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Demo Solicitud
            </button>
            <button
              onClick={() => setDatasetMode("full")}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                datasetMode === "full"
                  ? "bg-[#182338] text-gray-100 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Topología Completa
            </button>
          </div>

          {/* Toggle Vuelo de la Mascota */}
          <button
            onClick={() => setMascotFlightEnabled(!mascotFlightEnabled)}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-mono transition-all ${
              mascotFlightEnabled
                ? "bg-[#101C18] border-[#164E37] text-mint-300"
                : "bg-[#0D1424] border-[#1E2838] text-gray-400"
            }`}
            title="Activa el desplazamiento dinámico de Mint hacia los nodos"
          >
            <Compass className="w-3.5 h-3.5 text-mint-400" />
            <span>Vuelo: {mascotFlightEnabled ? "ON" : "OFF"}</span>
          </button>
        </div>

        {/* Acciones de Estado y Ejecución */}
        <div className="flex items-center gap-2">
          {/* Selector de Estados */}
          <div className="hidden xl:flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0D1424] border border-[#1E2838]">
            {(["IDLE", "READING", "THINKING", "MUTATING"] as AgentState[]).map((st) => {
              const isCurrent = currentAgentState === st;
              const color = THEME.stateColors[st];
              return (
                <button
                  key={st}
                  onClick={() => setManualState(manualState === st ? null : st)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all ${
                    isCurrent
                      ? "bg-[#182338] text-white border border-[#2B3A54]"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                  style={{
                    color: isCurrent ? color : undefined,
                  }}
                >
                  {st}
                </button>
              );
            })}
          </div>

          {/* Botón Sobrio de Solicitud en Vivo */}
          <button
            onClick={handleRunLiveRequest}
            disabled={requestRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              requestRunning
                ? "bg-[#182436] text-mint-300 border border-[#23354E]"
                : "bg-mint-500 hover:bg-mint-400 text-slate-950 font-bold active:scale-98 shadow-sm"
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${requestRunning ? "animate-spin" : ""}`} />
            <span>{requestRunning ? `Paso ${requestStep}/3...` : "Ejecutar Solicitud"}</span>
          </button>

          {/* Reset Zoom */}
          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded bg-[#0D1424] text-gray-400 hover:text-white border border-[#1E2838] transition-all"
            title="Centrar Grafo"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Banner Discreto de Solicitud en Curso */}
      {requestRunning && requestStory && (
        <div className="bg-[#0C1420] border-b border-[#1C2C42] px-4 py-2 flex items-center justify-between gap-3 text-xs font-mono animate-in slide-in-from-top-1 duration-150 z-10">
          <div className="flex items-center gap-2.5">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-black"
              style={{
                backgroundColor: THEME.stateColors[requestStory.state],
              }}
            >
              {requestStory.state}
            </span>
            <span className="font-semibold text-gray-200">{requestStory.title}:</span>
            <span className="text-gray-400 hidden sm:inline">{requestStory.description}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
            <span>Recurso:</span>
            <span className="font-mono text-gray-200 bg-[#141F30] px-1.5 py-0.5 rounded border border-[#202F46]">
              {requestStory.targetId}
            </span>
          </div>
        </div>
      )}

      {/* 3. Barra de Filtros Sutil */}
      <div className="h-9 border-b border-[#141B2B] bg-[#0A0E18]/80 px-4 flex items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
          <span className="text-gray-500 text-[10px] uppercase font-semibold mr-1">Filtros:</span>
          {[
            { id: "agent", label: "Mint Core" },
            { id: "node", label: "Módulos" },
            { id: "file", label: "SKUs" },
            { id: "warehouse", label: "Bodegas" },
            { id: "supplier", label: "Proveedores" },
            { id: "database", label: "Decisiones / BD" },
          ].map((grp) => {
            const isActive = activeGroups.has(grp.id);
            return (
              <button
                key={grp.id}
                onClick={() => toggleGroup(grp.id)}
                className={`px-2 py-0.5 rounded border text-[10px] transition-all ${
                  isActive
                    ? "bg-[#141E2F] border-[#25354E] text-gray-200 font-medium"
                    : "bg-transparent border-[#172032] text-gray-600 opacity-60"
                }`}
              >
                {grp.label}
              </button>
            );
          })}
        </div>

        {/* Indicador de Estado */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
          <span>Estado del Grafo:</span>
          <span
            className="font-medium px-2 py-0.5 rounded border"
            style={{
              color: THEME.stateColors[currentAgentState],
              backgroundColor: "#0D1424",
              borderColor: "#1E2838",
            }}
          >
            {currentAgentState}
          </span>
        </div>
      </div>

      {/* 4. Canvas Principal ForceGraph2D con Física D3 */}
      <div className="flex-1 relative overflow-hidden">
        <ForceGraph2D
          ref={fgRef}
          graphData={filteredData}
          onRenderFramePre={onRenderFramePre}
          nodeCanvasObject={nodeCanvasObject}
          onRenderFramePost={onRenderFramePost}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            const r = 20;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.fill();
          }}
          // --- ENLACES Y TELEMETRÍA DE PRECISIÓN ---
          // Enlaces en reposo: 1px en rgba(255, 255, 255, 0.07)
          // Enlace activo: 1.5px en rgba(16, 185, 129, 0.45)
          linkColor={(link: any) => {
            const sourceId = typeof link.source === "object" ? link.source.id : link.source;
            const targetId = typeof link.target === "object" ? link.target.id : link.target;
            const isTargetLink =
              Boolean(activeTargetId && (sourceId === activeTargetId || targetId === activeTargetId));
            return isTargetLink ? THEME.linkActive : THEME.linkRest;
          }}
          linkWidth={(link: any) => {
            const sourceId = typeof link.source === "object" ? link.source.id : link.source;
            const targetId = typeof link.target === "object" ? link.target.id : link.target;
            const isTargetLink =
              Boolean(activeTargetId && (sourceId === activeTargetId || targetId === activeTargetId));
            return isTargetLink ? 1.5 : 1.0;
          }}
          // --- PARTÍCULAS NÍTIDAS (width: 2.5, sin halo difuso) ---
          linkDirectionalParticles={(link: any) => {
            const sourceId = typeof link.source === "object" ? link.source.id : link.source;
            const targetId = typeof link.target === "object" ? link.target.id : link.target;
            const isTargetLink =
              Boolean(activeTargetId && (sourceId === activeTargetId || targetId === activeTargetId));

            if (!isTargetLink || currentAgentState === "IDLE" || currentAgentState === "THINKING") {
              return 0; // Reposo
            }
            return currentAgentState === "MUTATING" ? 5 : 4;
          }}
          linkDirectionalParticleSpeed={() => {
            if (currentAgentState === "READING") {
              return -0.016; // Negativa: viajan hacia Mint
            }
            if (currentAgentState === "MUTATING") {
              return 0.026;  // Positiva: viajan hacia recurso
            }
            return 0;
          }}
          linkDirectionalParticleWidth={2.5}
          linkDirectionalParticleColor={() =>
            currentAgentState === "MUTATING" ? THEME.stateColors.MUTATING : THEME.stateColors.READING
          }
          backgroundColor={THEME.canvasBg}
          onNodeClick={(node: any) => {
            setSelectedNode(node as TelemetryGraphNode);
            setManualTargetId(node.id);
          }}
          onNodeHover={(node: any) => {
            setHoveredNode(node ? (node as TelemetryGraphNode) : null);
          }}
          onBackgroundClick={() => {
            setSelectedNode(null);
            setHoveredNode(null);
          }}
          cooldownTicks={140}
          d3VelocityDecay={0.35}
        />

        {/* 5. Inspector Lateral Sobrio */}
        {selectedNode && (
          <aside className="absolute top-4 right-4 w-76 max-h-[calc(100vh-190px)] rounded-xl bg-[#0D1424]/95 border border-[#1E2838] shadow-2xl backdrop-blur-md z-30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-3 duration-120 font-sans">
            <div className="p-3.5 border-b border-[#1A2536] flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#162032] text-mint-400 border border-[#24354D] font-medium">
                  {selectedNode.group}
                </span>
                <h3 className="text-xs font-semibold text-gray-100 mt-1.5 leading-snug">
                  {selectedNode.label}
                </h3>
                <p className="text-[10px] font-mono text-gray-500">ID: {selectedNode.id}</p>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#182338] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3.5 space-y-3 overflow-y-auto text-xs font-mono flex-1">
              {/* Acciones de Inspección */}
              <div className="p-2.5 rounded-lg bg-[#0A0F1A] border border-[#1A2536] space-y-2">
                <span className="text-[10px] text-gray-400 uppercase block font-semibold">
                  Acción Operativa:
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => {
                      setManualTargetId(selectedNode.id);
                      setManualState("READING");
                    }}
                    className="px-2 py-1 rounded bg-[#0F2228] text-teal-300 border border-[#1A3E47] text-[10px] font-medium hover:bg-[#16333C]"
                  >
                    Leer
                  </button>
                  <button
                    onClick={() => {
                      setManualTargetId(selectedNode.id);
                      setManualState("THINKING");
                    }}
                    className="px-2 py-1 rounded bg-[#0D2218] text-mint-300 border border-[#184632] text-[10px] font-medium hover:bg-[#133324]"
                  >
                    Evaluar
                  </button>
                  <button
                    onClick={() => {
                      setManualTargetId(selectedNode.id);
                      setManualState("MUTATING");
                    }}
                    className="px-2 py-1 rounded bg-[#132B1E] text-green-300 border border-[#1F5438] text-[10px] font-medium hover:bg-[#1A3B29]"
                  >
                    Mutar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-[#0A0F1A] border border-[#1A2536]">
                  <span className="text-[10px] text-gray-500 uppercase block">Eventos</span>
                  <span className="font-semibold text-gray-200">
                    {selectedNode.interactionCount}
                  </span>
                </div>
                <div className="p-2 rounded bg-[#0A0F1A] border border-[#1A2536]">
                  <span className="text-[10px] text-gray-500 uppercase block">Tráfico</span>
                  <span className="font-semibold text-gray-200">
                    {selectedNode.bytesOrRowsTotal.toLocaleString()} B
                  </span>
                </div>
              </div>

              {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                <div className="p-2.5 rounded-lg bg-[#0A0F1A] border border-[#1A2536] space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase block mb-1">
                    Metadatos
                  </span>
                  {Object.entries(selectedNode.metadata).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 capitalize">{k}:</span>
                      <span className="text-gray-300 truncate max-w-[140px] font-mono">
                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* 6. Barra Inferior Discreta */}
      <div className="h-8 border-t border-[#141B2B] bg-[#0A0E18] px-4 flex items-center justify-between text-[10px] font-mono text-gray-500 z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span>
            Núcleo: <strong className="text-gray-300">Mint Autonomous Agent</strong>
          </span>
          <span>•</span>
          <span>
            Objetivo:{" "}
            <strong className="text-gray-300">
              {activeTargetId || "En reposo"}
            </strong>
          </span>
        </div>
        <div>
          <span>Telemetría de Precisión • Linear Style</span>
        </div>
      </div>
    </div>
  );
};

// --- RENDERIZADORES SOBRIOS EN CANVAS 2D ---

/**
 * Renderiza la mascota Guanábana contenida limpiamente dentro del círculo
 */
function drawContainedMascot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  mascotImg: HTMLImageElement | null
) {
  if (mascotImg && mascotImg.complete && mascotImg.naturalWidth > 0) {
    ctx.drawImage(mascotImg, x - size / 2, y - size / 2, size, size);
  } else {
    // Fallback vectorial limpio y contenido
    const r = size * 0.35;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = "#10B981";
    ctx.fill();

    // Ojos discretos
    ctx.fillStyle = "#0A0E18";
    ctx.beginPath();
    ctx.arc(x - 3, y - 1, 1.5, 0, 2 * Math.PI);
    ctx.arc(x + 3, y - 1, 1.5, 0, 2 * Math.PI);
    ctx.fill();
  }
}

/**
 * Píldora Minimalista (Fondo sólido casi opaco, borde neutro de 1px, esquinas de 4px)
 */
function drawMinimalistPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  accentColor: string
) {
  ctx.save();
  ctx.font = '500 10px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const textWidth = ctx.measureText(text).width;
  const paddingX = 7;
  const height = 18;
  const totalWidth = textWidth + paddingX * 2 + 8; // espacio para dot indicador

  // Fondo sólido casi opaco
  ctx.fillStyle = THEME.pillBg;
  ctx.strokeStyle = THEME.pillBorder;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(x - totalWidth / 2, y - height / 2, totalWidth, height, 4);
  ctx.fill();
  ctx.stroke();

  // Punto indicador fino de 2px
  const dotX = x - totalWidth / 2 + 7;
  ctx.beginPath();
  ctx.arc(dotX, y, 2.0, 0, 2 * Math.PI);
  ctx.fillStyle = accentColor;
  ctx.fill();

  // Texto nítido
  ctx.fillStyle = THEME.textPrimary;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, dotX + 5, y);
  ctx.restore();
}

/**
 * Badge Minimalista Contextual encima del nodo activo ("Leyendo", "Interpretando", "Mutando")
 */
function drawMinimalistBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  accentColor: string
) {
  ctx.save();
  ctx.font = '500 9px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
  const textWidth = ctx.measureText(text).width;
  const totalWidth = textWidth + 12;
  const height = 15;

  ctx.fillStyle = THEME.pillBg;
  ctx.strokeStyle = `${accentColor}44`;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(x - totalWidth / 2, y - height / 2, totalWidth, height, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Etiqueta Minimalista de Nodos Secundarios
 */
function drawMinimalistLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  accentColor?: string
) {
  ctx.save();
  ctx.font = '500 10px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const textWidth = ctx.measureText(text).width;
  const paddingX = 6;
  const height = 17;
  const totalWidth = textWidth + paddingX * 2;

  ctx.fillStyle = THEME.pillBg;
  ctx.strokeStyle = accentColor ? `${accentColor}55` : THEME.pillBorder;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(x - totalWidth / 2, y - height / 2, totalWidth, height, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accentColor || THEME.textPrimary;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

export default LiveObsidianGraph;
