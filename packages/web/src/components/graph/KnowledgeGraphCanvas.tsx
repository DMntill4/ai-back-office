import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  MintGraphNode,
  MintGraphEdge,
  MintGraphData,
  SimNode,
  SimEdge,
  GraphPhysicsSettings,
} from "../../types/graph";
import { NODE_TYPE_COLORS } from "../../data/graphData";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";

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
  const rawNodes = passedNodes || data?.nodes || [];
  const rawEdges = passedEdges || data?.edges || [];

  // Simulación y posiciones
  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const simEdgesRef = useRef<SimEdge[]>([]);
  const animationFrameId = useRef<number | null>(null);

  // Cámara (Pan & Zoom)
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  // Interacción de usuario
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const isDraggingCanvas = useRef(false);
  const draggedNodeId = useRef<string | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Precarga de la mascota Guanábana
  const mascotImgRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new Image();
    img.src = "/assets/mint-mascot-glow.svg";
    mascotImgRef.current = img;
  }, []);

  // 1. Inicializar / Sincronizar nodos en la simulación
  useEffect(() => {
    const currentSimNodes = simNodesRef.current;
    const newSimNodes = new Map<string, SimNode>();

    // Radio según grado de conexiones (Obsidian paradigm)
    rawNodes.forEach((node, index) => {
      const existing = currentSimNodes.get(node.id);
      const degree = node.degree || 1;
      // Diámetro variable: nodos centrales más grandes
      const baseRadius = node.type === "agent" || node.type === "database" ? 22 : 12;
      const radius = Math.min(32, baseRadius + Math.sqrt(degree) * 3);

      if (existing) {
        newSimNodes.set(node.id, {
          ...existing,
          ...node,
          radius,
        });
      } else {
        // Dispersión inicial circular
        const angle = (index / Math.max(1, rawNodes.length)) * Math.PI * 2;
        const initialDist = 180 + (index % 4) * 80;
        newSimNodes.set(node.id, {
          ...node,
          x: Math.cos(angle) * initialDist,
          y: Math.sin(angle) * initialDist,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          radius,
        });
      }
    });

    simNodesRef.current = newSimNodes;

    // Sincronizar aristas
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
        });
      }
    });
    simEdgesRef.current = newSimEdges;
  }, [rawNodes, rawEdges]);

  // Si focusNodeId cambia externamente, centrar la cámara suavemente
  useEffect(() => {
    if (focusNodeId) {
      const target = simNodesRef.current.get(focusNodeId);
      if (target) {
        setCamera((prev) => ({
          ...prev,
          x: -target.x * prev.zoom,
          y: -target.y * prev.zoom,
        }));
      }
    }
  }, [focusNodeId]);

  // 2. Loop de Simulación de Fuerzas Físicas & Renderizado Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const nodes = Array.from(simNodesRef.current.values());
      const edges = simEdgesRef.current;
      const { repulsion, springLength, gravity, damping, showAllLabels, showGrid } =
        physicsSettings;

      // --- A. FÍSICA FORCE-DIRECTED ---
      // 1. Repulsión entre todos los pares de nodos (Coulomb)
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 100;
          const dist = Math.sqrt(distSq);

          if (dist < 450) {
            const force = (repulsion * 50) / distSq;
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
        }
      }

      // 2. Atracción de Resortes a lo largo de las aristas (Hooke)
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const n1 = edge.source;
        const n2 = edge.target;
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = (dist - springLength) * 0.04;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!n1.isDragging) {
          n1.vx += fx;
          n1.vy += fy;
        }
        if (!n2.isDragging) {
          n2.vx -= fx;
          n2.vy -= fy;
        }
      }

      // 3. Gravedad Central & Amortiguación
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!n.isDragging) {
          // Fuerza de gravedad hacia el origen (0, 0)
          n.vx -= n.x * gravity;
          n.vy -= n.y * gravity;

          // Damping (fricción para estabilización)
          n.vx *= damping;
          n.vy *= damping;

          // Integración de posición (Euler)
          n.x += n.vx;
          n.y += n.vy;
        }
      }

      // --- B. RENDERIZADO VISUAL OBSIDIAN ---
      // Redimensionar canvas si el viewport cambia
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Fondo oscuro uniforme de alta precisión
      ctx.fillStyle = "#050806";
      ctx.fillRect(0, 0, width, height);

      // Cuadrícula tenue casi imperceptible
      if (showGrid) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
        ctx.lineWidth = 1;
        const gridSize = 40 * cameraRef.current.zoom;
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

      // Aplicar Transformación de Cámara
      ctx.translate(width / 2 + cameraRef.current.x, height / 2 + cameraRef.current.y);
      ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom);

      // Calcular conjunto de nodos directamente conectados al nodo seleccionado o en hover
      const activeHighlightId = selectedNodeId || hoveredNodeId;
      const highlightedNodeIds = new Set<string>();
      const highlightedEdgeIds = new Set<string>();

      if (activeHighlightId) {
        highlightedNodeIds.add(activeHighlightId);
        edges.forEach((edge) => {
          if (edge.source.id === activeHighlightId || edge.target.id === activeHighlightId) {
            highlightedNodeIds.add(edge.source.id);
            highlightedNodeIds.add(edge.target.id);
            highlightedEdgeIds.add(edge.id);
          }
        });
      }

      // --- 1. Dibujar Aristas (Conexiones Sobrias de 1px) ---
      edges.forEach((edge) => {
        const isHighlighted = highlightedEdgeIds.has(edge.id);
        const hasSelection = Boolean(activeHighlightId);

        ctx.beginPath();
        ctx.moveTo(edge.source.x, edge.source.y);
        ctx.lineTo(edge.target.x, edge.target.y);

        if (isHighlighted) {
          ctx.strokeStyle = "rgba(16, 185, 129, 0.45)"; // Enlace activo de precisión
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.95;
        } else if (hasSelection) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
          ctx.lineWidth = 0.8;
          ctx.globalAlpha = 0.15;
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.07)"; // Enlaces en reposo
          ctx.lineWidth = 1.0;
          ctx.globalAlpha = 0.85;
        }
        ctx.stroke();

        // Flecha direccional sutil si está destacada
        if (isHighlighted) {
          const midX = (edge.source.x + edge.target.x) / 2;
          const midY = (edge.source.y + edge.target.y) / 2;
          const angle = Math.atan2(edge.target.y - edge.source.y, edge.target.x - edge.source.x);
          const arrowSize = 4.5;

          ctx.fillStyle = "#10B981";
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

      // --- 2. Dibujar Nodos Sobrios ---
      nodes.forEach((node) => {
        const isSelected = node.id === selectedNodeId;
        const isHovered = node.id === hoveredNodeId;
        const isConnected = highlightedNodeIds.has(node.id);
        const hasSelection = Boolean(activeHighlightId);

        // Nodos inactivos: 30% de opacidad limpia
        let opacity = 1;
        if (hasSelection && !isConnected) {
          opacity = 0.3;
        }
        ctx.globalAlpha = opacity;

        // Círculo base del nodo o Mascota Guanábana si es el Agente
        if (node.type === "agent") {
          const radius = node.radius || 22;
          ctx.save();
          // Círculo contenedor con bordes definidos (#111C16)
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = "#111C16";
          ctx.fill();

          // Anillo exterior limpio de 1.5px en verde menta (#10B981)
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#10B981";
          ctx.stroke();

          // Segundo anillo concéntrico fino de 0.5px
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 3, 0, Math.PI * 2);
          ctx.lineWidth = 0.5;
          ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
          ctx.stroke();

          // Mascota Guanábana contenida limpiamente
          const assetSize = radius * 1.5;
          if (mascotImgRef.current && mascotImgRef.current.complete && mascotImgRef.current.naturalWidth > 0) {
            ctx.drawImage(mascotImgRef.current, node.x - assetSize / 2, node.y - assetSize / 2, assetSize, assetSize);
          } else {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = "#10b981";
            ctx.fill();
          }
          ctx.restore();
        } else {
          // Nodos en reposo: Relleno sólido oscuro (#121824) con borde fino de 1px en gris pizarra (#262F40)
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? "#162032" : "#121824";
          ctx.fill();

          ctx.lineWidth = isSelected ? 1.5 : isHovered ? 1.5 : 1.0;
          ctx.strokeStyle = isSelected ? "#10B981" : isHovered ? "#64748B" : node.status === "warning" ? "#F59E0B" : "#262F40";
          ctx.stroke();
        }

        // Indicador de advertencia (alerta sutil de 2.5px sin resplandor difuso)
        if (node.status === "warning" && opacity > 0.5) {
          ctx.beginPath();
          ctx.arc(node.x + node.radius * 0.7, node.y - node.radius * 0.7, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#F59E0B";
          ctx.fill();
        }

        // --- 3. Etiquetas Minimalistas (Anti-clutter) ---
        // Se muestran para el agente, nodo seleccionado/hover, o con zoom > 1.3
        const shouldShowLabel =
          isSelected ||
          isHovered ||
          showAllLabels ||
          node.type === "agent" ||
          cameraRef.current.zoom > 1.3;

        if (shouldShowLabel && opacity > 0.25) {
          ctx.save();
          const fontSize = 10;
          ctx.font = `500 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const labelText = node.label;
          const textWidth = ctx.measureText(labelText).width;
          const labelY = node.y + node.radius + fontSize + 4;
          const totalWidth = textWidth + 12;
          const height = 17;

          // Píldora minimalista: fondo sólido casi opaco, borde neutro 1px, radio 4px
          ctx.fillStyle = "rgba(15, 20, 28, 0.92)";
          ctx.strokeStyle = isSelected ? "#10B981" : "rgba(255, 255, 255, 0.08)";
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.roundRect(node.x - totalWidth / 2, labelY - height / 2, totalWidth, height, 4);
          ctx.fill();
          ctx.stroke();

          // Texto limpio #E2E8F0
          ctx.fillStyle = isSelected ? "#10B981" : "#E2E8F0";
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

  // 3. Manejadores de Eventos del Ratón
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convertir de coordenadas de pantalla a coordenadas del mundo del grafo
    const worldX = (clientX - canvas.clientWidth / 2 - cameraRef.current.x) / cameraRef.current.zoom;
    const worldY = (clientY - canvas.clientHeight / 2 - cameraRef.current.y) / cameraRef.current.zoom;

    // Buscar si se hizo click sobre algún nodo
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
  }, [onSelectNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (draggedNodeId.current) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      const worldX = (clientX - canvas.clientWidth / 2 - cameraRef.current.x) / cameraRef.current.zoom;
      const worldY = (clientY - canvas.clientHeight / 2 - cameraRef.current.y) / cameraRef.current.zoom;

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
      // Hover detection
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const worldX = (clientX - canvas.clientWidth / 2 - cameraRef.current.x) / cameraRef.current.zoom;
      const worldY = (clientY - canvas.clientHeight / 2 - cameraRef.current.y) / cameraRef.current.zoom;

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
  }, []);

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

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setCamera((prev) => ({
      ...prev,
      zoom: Math.max(0.25, Math.min(3.5, prev.zoom * zoomFactor)),
    }));
  }, []);

  const resetCamera = () => {
    setCamera({ x: 0, y: 0, zoom: 1 });
  };

  const handleZoom = (direction: "in" | "out") => {
    setCamera((prev) => ({
      ...prev,
      zoom: direction === "in" ? Math.min(3.5, prev.zoom * 1.25) : Math.max(0.25, prev.zoom * 0.8),
    }));
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#060a08]">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full block ${draggedNodeId.current ? "cursor-grabbing" : hoveredNodeId ? "cursor-pointer" : "cursor-grab"
          }`}
      />

      {/* Mini HUD de Controles Flotantes en Esquina Inferior Izquierda */}
      <div className="absolute bottom-5 left-5 flex items-center gap-1.5 p-1 rounded-xl bg-[#09110d]/90 border border-[#182d20] shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md z-10">
        <button
          onClick={() => handleZoom("in")}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#122419] transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom("out")}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#122419] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-[#1a2d22] my-auto" />
        <button
          onClick={resetCamera}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#122419] transition-colors"
          title="Restablecer Cámara"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono px-2 text-gray-400">
          {Math.round(camera.zoom * 100)}%
        </span>
      </div>

      {/* Hint de Navegación en Esquina Superior Derecha */}
      <div className="absolute top-4 right-4 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#070d0a]/70 border border-[#16291e] text-[11px] text-gray-400">
        <span>Arrastra para mover</span>
        <span className="text-gray-600">•</span>
        <span>Rueda para zoom</span>
        <span className="text-gray-600">•</span>
        <span>Click para enfocar</span>
      </div>
    </div>
  );
};
