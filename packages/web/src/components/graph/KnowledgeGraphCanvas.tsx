import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  MintGraphNode,
  MintGraphEdge,
  MintGraphData,
  SimNode,
  SimEdge,
  GraphPhysicsSettings,
} from "../../types/graph";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface KnowledgeGraphCanvasProps {
  nodes?: MintGraphNode[];
  data?: MintGraphData;
  onHoverNode?: (node: MintGraphNode | null) => void;
  edges?: MintGraphEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  physicsSettings: GraphPhysicsSettings;
  focusNodeId?: string | null;
}

// Semillas deterministas para la nube de puntos de la guanábana en el nodo del agente
const AGENT_CLOUD_PARTICLES = Array.from({ length: 42 }, (_, i) => {
  const goldenAngle = i * 2.399963229728653;
  const r = Math.sqrt((i + 0.5) / 42) * 0.82;
  const isSeed = i % 7 === 0;
  const isLime = i % 3 === 0;
  return {
    baseAngle: goldenAngle,
    baseRadius: r,
    phase: i * 0.45,
    size: isSeed ? 1.8 : isLime ? 2.1 : 1.7,
    color: isSeed ? "#0F1612" : isLime ? "#9DE342" : "#2BB656",
  };
});

export const KnowledgeGraphCanvas: React.FC<KnowledgeGraphCanvasProps> = ({
  nodes: passedNodes,
  data,
  edges: passedEdges,
  selectedNodeId,
  onSelectNode,
  physicsSettings,
  focusNodeId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Validación defensiva: el motor de fuerzas nunca debe recibir `undefined`,
  // entradas sin `id` ni aristas con extremos inválidos. Un solo nodo corrupto
  // puede dejar la simulación en un bucle infinito y congelar el hilo principal.
  const rawNodes = useMemo(() => {
    const source = passedNodes ?? data?.nodes ?? [];
    if (!Array.isArray(source)) return [];
    const seen = new Set<string>();
    return source.filter((node) => {
      if (!node || typeof node !== "object") return false;
      const id = typeof node.id === "string" ? node.id.trim() : "";
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [passedNodes, data]);

  const rawEdges = useMemo(() => {
    const source = passedEdges ?? data?.edges ?? [];
    if (!Array.isArray(source)) return [];
    const ids = new Set(rawNodes.map((n) => n.id));
    return source.filter((edge) => {
      if (!edge || typeof edge !== "object") return false;
      const sourceId = typeof edge.source === "string" ? edge.source.trim() : "";
      const targetId = typeof edge.target === "string" ? edge.target.trim() : "";
      return (
        sourceId !== "" &&
        targetId !== "" &&
        sourceId !== targetId &&
        ids.has(sourceId) &&
        ids.has(targetId)
      );
    });
  }, [passedEdges, data, rawNodes]);

  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const simEdgesRef = useRef<SimEdge[]>([]);
  const animationFrameId = useRef<number | null>(null);

  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const isDraggingCanvas = useRef(false);
  const draggedNodeId = useRef<string | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // 1. Inicializar nodos y aristas en la simulación física
  useEffect(() => {
    const currentSimNodes = simNodesRef.current;
    const newSimNodes = new Map<string, SimNode>();

    rawNodes.forEach((node, index) => {
      const existing = currentSimNodes.get(node.id);
      const degree = node.degree || 1;
      const baseRadius =
        node.type === "agent" ? 30 : node.type === "warehouse" ? 18 : 14;
      const radius =
        node.type === "agent"
          ? 32
          : Math.min(26, baseRadius + Math.sqrt(degree) * 2);

      if (existing) {
        newSimNodes.set(node.id, {
          ...existing,
          ...node,
          radius,
        });
      } else {
        // El agente se ubica en el centro; los demás se distribuyen en una corona amplia
        if (node.type === "agent") {
          newSimNodes.set(node.id, {
            ...node,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            radius,
          });
        } else {
          const nonAgentCount = Math.max(1, rawNodes.length - 1);
          const angle = ((index - 1) / nonAgentCount) * Math.PI * 2 - Math.PI / 2;
          const initialDist = 175 + (index % 2) * 85;
          newSimNodes.set(node.id, {
            ...node,
            x: Math.cos(angle) * initialDist * 1.25,
            y: Math.sin(angle) * initialDist * 0.9,
            vx: 0,
            vy: 0,
            radius,
          });
        }
      }
    });

    simNodesRef.current = newSimNodes;

    const newSimEdges: SimEdge[] = [];
    rawEdges.forEach((edge) => {
      const sourceNode = newSimNodes.get(edge.source);
      const targetNode = newSimNodes.get(edge.target);
      if (sourceNode && targetNode) {
        newSimEdges.push({
          id: edge.id,
          source: sourceNode,
          target: targetNode,
          relation: edge.relation,
          label: edge.label,
          weight: edge.weight,
        });
      }
    });

    simEdgesRef.current = newSimEdges;
  }, [rawNodes, rawEdges]);

  // Centrar cámara cuando cambia focusNodeId
  useEffect(() => {
    if (!focusNodeId) return;
    const target = simNodesRef.current.get(focusNodeId);
    if (target) {
      setCamera((prev) => ({
        x: -target.x * prev.zoom,
        y: -target.y * prev.zoom,
        zoom: prev.zoom,
      }));
    }
  }, [focusNodeId]);

  // 2. Bucle de física y renderizado en Canvas 2D
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;
    let time = 0;

    const {
      repulsion = 5200,
      springLength = 235,
      gravity = 0.005,
      damping = 0.82,
      showGrid = true,
      showAllLabels = false,
    } = physicsSettings;
    const linkStrength = 0.032;
    // Distancia mínima de colisión entre centros de nodos (px de simulación).
    const MIN_NODE_DISTANCE = 96;
    // Padding mínimo entre centros de etiquetas adyacentes (px).
    const LABEL_COLLISION_PADDING = 24;

    const render = () => {
      if (!isRunning) return;
      time += 0.025;

      const nodes = Array.from(simNodesRef.current.values());
      const edges = simEdgesRef.current;

      // A. Simulación de fuerzas
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);

          if (dist < 420) {
            const force = repulsion / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (!n1.isDragging) {
              n1.vx -= fx;
              n1.vy -= fy;
            }
            if (!n2.isDragging) {
              n2.vx += fx;
              n2.vy += fy;
            }
          }

          // Colisión dura: garantiza separación mínima entre centros de nodos
          // para que las etiquetas no se solapen.
          if (dist < MIN_NODE_DISTANCE && dist > 0.001) {
            const overlap = (MIN_NODE_DISTANCE - dist) * 0.5;
            const nx = dx / dist;
            const ny = dy / dist;
            if (!n1.isDragging) {
              n1.x -= nx * overlap;
              n1.y -= ny * overlap;
            }
            if (!n2.isDragging) {
              n2.x += nx * overlap;
              n2.y += ny * overlap;
            }
          }
        }
      }

      for (const edge of edges) {
        const s = edge.source;
        const t = edge.target;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const displacement = dist - springLength;
        const force = displacement * linkStrength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!s.isDragging) {
          s.vx += fx;
          s.vy += fy;
        }
        if (!t.isDragging) {
          t.vx -= fx;
          t.vy -= fy;
        }
      }

      for (const n of nodes) {
        if (!n.isDragging) {
          if (n.type === "agent") {
            n.x = 0;
            n.y = 0;
            n.vx = 0;
            n.vy = 0;
          } else {
            n.vx -= n.x * gravity;
            n.vy -= n.y * gravity;
            n.vx *= damping;
            n.vy *= damping;
            n.x += n.vx;
            n.y += n.vy;
          }
        }

        // Guarda anti-NaN: una coordenada corrupta envenenaría toda la
        // simulación (los nodos se vuelven invisibles y el bucle no converge).
        if (
          !Number.isFinite(n.x) ||
          !Number.isFinite(n.y) ||
          !Number.isFinite(n.vx) ||
          !Number.isFinite(n.vy)
        ) {
          n.x = 0;
          n.y = 0;
          n.vx = 0;
          n.vy = 0;
        }
      }

      // B. Renderizado con paleta oficial de Mint-DESIGN.md
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Fondo --color-canvas (#0F1612)
      ctx.fillStyle = "#0F1612";
      ctx.fillRect(0, 0, width, height);

      // Cuadrícula sutil
      if (showGrid) {
        ctx.strokeStyle = "rgba(238, 242, 236, 0.035)";
        ctx.lineWidth = 1;
        const gridSize = 44 * cameraRef.current.zoom;
        const offsetX = (cameraRef.current.x + width / 2) % gridSize;
        const offsetY = (cameraRef.current.y + height / 2) % gridSize;

        ctx.beginPath();
        for (let x = offsetX; x < width; x += gridSize) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = offsetY; y < height; y += gridSize) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
      }

      ctx.translate(
        width / 2 + cameraRef.current.x,
        height / 2 + cameraRef.current.y
      );
      ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom);

      const activeHighlightId = selectedNodeId || hoveredNodeId;
      const highlightedNodeIds = new Set<string>();
      const highlightedEdgeIds = new Set<string>();

      if (activeHighlightId) {
        highlightedNodeIds.add(activeHighlightId);
        edges.forEach((edge) => {
          if (
            edge.source.id === activeHighlightId ||
            edge.target.id === activeHighlightId
          ) {
            highlightedNodeIds.add(edge.source.id);
            highlightedNodeIds.add(edge.target.id);
            highlightedEdgeIds.add(edge.id);
          }
        });
      }

      // 1. Dibujar Aristas Nítidas y Encendidas
      edges.forEach((edge) => {
        const isHighlighted = highlightedEdgeIds.has(edge.id);
        const hasSelection = Boolean(activeHighlightId);

        ctx.beginPath();
        ctx.moveTo(edge.source.x, edge.source.y);
        ctx.lineTo(edge.target.x, edge.target.y);

        if (isHighlighted) {
          ctx.strokeStyle = "#2BB656";
          ctx.lineWidth = 2.2;
          ctx.globalAlpha = 1.0;
        } else if (hasSelection) {
          ctx.strokeStyle = "#3A4B41";
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = 0.65;
        } else {
          ctx.strokeStyle = "#3A4B41";
          ctx.lineWidth = 1.4;
          ctx.globalAlpha = 0.9;
        }
        ctx.stroke();

        // Flecha direccional en conexiones activas
        if (isHighlighted) {
          const midX = (edge.source.x + edge.target.x) / 2;
          const midY = (edge.source.y + edge.target.y) / 2;
          const angle = Math.atan2(
            edge.target.y - edge.source.y,
            edge.target.x - edge.source.x
          );
          const arrowSize = 5.5;

          ctx.fillStyle = "#9DE342";
          ctx.beginPath();
          ctx.moveTo(midX, midY);
          ctx.lineTo(
            midX - arrowSize * Math.cos(angle - Math.PI / 6),
            midY - arrowSize * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            midX - arrowSize * Math.cos(angle + Math.PI / 6),
            midY - arrowSize * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
      });

      // 2. Dibujar Nodos con Colores Semánticos y Nube de Guanábana en el Agente
      // Registro de etiquetas ya dibujadas para resolver colisiones.
      const placedLabels: { x: number; y: number; w: number }[] = [];
      nodes.forEach((node) => {
        const isSelected = node.id === selectedNodeId;
        const isHovered = node.id === hoveredNodeId;
        const isConnected = highlightedNodeIds.has(node.id);
        const hasSelection = Boolean(activeHighlightId);

        ctx.globalAlpha = hasSelection && !isConnected ? 0.65 : 1.0;

        if (node.type === "agent") {
          const radius = node.radius || 32;
          ctx.save();

          // Halo orgánico sutil del agente
          const grad = ctx.createRadialGradient(
            node.x,
            node.y,
            radius * 0.2,
            node.x,
            node.y,
            radius * 1.6
          );
          grad.addColorStop(0, "rgba(43, 182, 86, 0.24)");
          grad.addColorStop(1, "rgba(43, 182, 86, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 1.6, 0, Math.PI * 2);
          ctx.fill();

          // Fondo del nodo central (--color-panel #151E19)
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = "#151E19";
          ctx.fill();
          ctx.lineWidth = isSelected ? 2.5 : 1.75;
          ctx.strokeStyle = isSelected ? "#9DE342" : "#2BB656";
          ctx.stroke();

          // Nube de puntos de la Guanábana mediana dentro del nodo
          AGENT_CLOUD_PARTICLES.forEach((p) => {
            const breathe = Math.sin(time + p.phase) * 1.8;
            const angle = p.baseAngle + Math.cos(time * 0.5 + p.phase) * 0.08;
            // Contorno acorazonado de guanábana
            const soursopScale = 1 + 0.14 * Math.sin(angle * 2);
            const dist = p.baseRadius * (radius - 6) * soursopScale + breathe;
            const px = node.x + Math.cos(angle) * dist;
            const py = node.y + Math.sin(angle) * dist * 1.08;

            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
          });

          ctx.restore();
        } else {
          // Colores por estado o categoría según Mint-DESIGN.md
          let strokeColor = "#3A4B41";
          let dotColor = "#2DD4BF"; // --color-state-ok

          if (node.status === "warning") {
            strokeColor = "#F5B544"; // --color-state-attention
            dotColor = "#F5B544";
          } else if (node.type === "decision" || node.type === "purchase_order") {
            strokeColor = "#9AA2FF"; // --color-state-pending
            dotColor = "#9AA2FF";
          } else if (node.type === "warehouse") {
            strokeColor = "#2DD4BF";
            dotColor = "#2DD4BF";
          } else if (node.type === "supplier") {
            strokeColor = "#9AA9BC";
            dotColor = "#9AA9BC";
          }

          if (isSelected) {
            strokeColor = "#2BB656";
          } else if (isHovered) {
            strokeColor = "#EEF2EC";
          }

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? "#1C2822" : "#151E19";
          ctx.fill();
          ctx.lineWidth = isSelected ? 2.2 : 1.5;
          ctx.strokeStyle = strokeColor;
          ctx.stroke();

          // Núcleo interior nítido
          ctx.beginPath();
          ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = dotColor;
          ctx.fill();
        }

        // 3. Etiquetas legibles (12px Figtree, nunca menor a 12px)
        // Renderizado condicional: texto completo en zoom > 0.8x, hover o
        // selección. En vista macro se trunca con elipsis para evitar
        // solapamiento entre etiquetas adyacentes.
        const zoom = cameraRef.current.zoom;
        const isMacro = zoom <= 0.8;
        const shouldShowLabel =
          isSelected ||
          isHovered ||
          node.type === "agent" ||
          showAllLabels ||
          zoom > 0.8;

        if (shouldShowLabel) {
          ctx.save();
          const fontSize = 12;
          ctx.font = `500 ${fontSize}px Figtree, system-ui, -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Truncado con elipsis en vista macro o etiquetas muy largas.
          const maxChars = isMacro ? 14 : 26;
          let labelText = node.label;
          if (labelText.length > maxChars) {
            labelText = `${labelText.slice(0, maxChars - 1).trimEnd()}…`;
          }

          const textWidth = ctx.measureText(labelText).width;
          const labelY = node.y + node.radius + 14;
          const totalWidth = textWidth + 16;
          const pillHeight = 22;

          // Colisión de etiquetas: se omite la etiqueta si su centro queda a
          // menos de LABEL_COLLISION_PADDING px de otra ya dibujada, salvo
          // que el nodo esté seleccionado o en hover (prioridad visual).
          const hasCollision = placedLabels.some(
            (p) =>
              Math.abs(p.x - node.x) < (p.w + totalWidth) / 2 + LABEL_COLLISION_PADDING &&
              Math.abs(p.y - labelY) < pillHeight + LABEL_COLLISION_PADDING
          );

          if (hasCollision && !isSelected && !isHovered) {
            ctx.restore();
            return;
          }

          placedLabels.push({ x: node.x, y: labelY, w: totalWidth });

          ctx.fillStyle = isSelected ? "#1C2822" : "rgba(21, 30, 25, 0.94)";
          ctx.strokeStyle = isSelected ? "#2BB656" : "#26342C";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(
            node.x - totalWidth / 2,
            labelY - pillHeight / 2,
            totalWidth,
            pillHeight,
            6
          );
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#EEF2EC";
          ctx.fillText(labelText, node.x, labelY);
          ctx.restore();
        }
      });

      ctx.restore();
      animationFrameId.current = requestAnimationFrame(render);
    };

    animationFrameId.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [selectedNodeId, hoveredNodeId, physicsSettings]);

  // 3. Interacción con el puntero
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      const worldX =
        (clientX - canvas.clientWidth / 2 - cameraRef.current.x) /
        cameraRef.current.zoom;
      const worldY =
        (clientY - canvas.clientHeight / 2 - cameraRef.current.y) /
        cameraRef.current.zoom;

      const nodes = Array.from(simNodesRef.current.values());
      let hitNode: SimNode | null = null;

      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dist = Math.hypot(n.x - worldX, n.y - worldY);
        if (dist <= n.radius + 6) {
          hitNode = n;
          break;
        }
      }

      if (hitNode) {
        draggedNodeId.current = hitNode.id;
        hitNode.isDragging = true;
        hitNode.vx = 0;
        hitNode.vy = 0;
        onSelectNode(hitNode.id);
      } else {
        isDraggingCanvas.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    },
    [onSelectNode]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (draggedNodeId.current) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        const worldX =
          (clientX - canvas.clientWidth / 2 - cameraRef.current.x) /
          cameraRef.current.zoom;
        const worldY =
          (clientY - canvas.clientHeight / 2 - cameraRef.current.y) /
          cameraRef.current.zoom;

        const node = simNodesRef.current.get(draggedNodeId.current);
        if (node) {
          node.x = worldX;
          node.y = worldY;
          node.vx = 0;
          node.vy = 0;
        }
      } else if (isDraggingCanvas.current) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        setCamera((prev) => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy,
        }));
      } else {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const worldX =
          (clientX - canvas.clientWidth / 2 - cameraRef.current.x) /
          cameraRef.current.zoom;
        const worldY =
          (clientY - canvas.clientHeight / 2 - cameraRef.current.y) /
          cameraRef.current.zoom;

        const nodes = Array.from(simNodesRef.current.values());
        let hovered: string | null = null;

        for (let i = nodes.length - 1; i >= 0; i--) {
          const n = nodes[i];
          if (Math.hypot(n.x - worldX, n.y - worldY) <= n.radius + 6) {
            hovered = n.id;
            break;
          }
        }
        setHoveredNodeId(hovered);
      }
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    if (draggedNodeId.current) {
      const node = simNodesRef.current.get(draggedNodeId.current);
      if (node) {
        node.isDragging = false;
      }
      draggedNodeId.current = null;
    }
    isDraggingCanvas.current = false;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      setCamera((prev) => ({
        ...prev,
        zoom: Math.max(0.35, Math.min(2.8, prev.zoom * zoomFactor)),
      }));
    },
    []
  );

  const resetCamera = () => {
    setCamera({ x: 0, y: 0, zoom: 1 });
  };

  const handleZoom = (direction: "in" | "out") => {
    setCamera((prev) => ({
      ...prev,
      zoom:
        direction === "in"
          ? Math.min(2.8, prev.zoom * 1.2)
          : Math.max(0.35, prev.zoom * 0.85),
    }));
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-canvas">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full block ${draggedNodeId.current
          ? "cursor-grabbing"
          : hoveredNodeId
            ? "cursor-pointer"
            : "cursor-grab"
          }`}
      />

      {/* Controles de Cámara en la Esquina Inferior Derecha (sin superponerse con la leyenda) */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 p-1 rounded-control bg-panel border border-border shadow-popover z-10">
        <button
          onClick={() => handleZoom("in")}
          className="p-1.5 rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors cursor-pointer"
          title="Acercar vista"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom("out")}
          className="p-1.5 rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors cursor-pointer"
          title="Alejar vista"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-border my-auto" />
        <button
          onClick={resetCamera}
          className="p-1.5 rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors cursor-pointer"
          title="Restablecer vista"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="text-caption font-mono px-2 text-secondary tabular-nums">
          {Math.round(camera.zoom * 100)}%
        </span>
      </div>
    </div>
  );
};
