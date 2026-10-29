import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";

// Estados posibles del agente Mint
export type AgentState = "IDLE" | "READING" | "THINKING" | "MUTATING";

export interface CustomNode {
  id: string;
  label: string;
  group: "agent" | "database" | "tool" | "decision" | "file" | "subagent" | "node";
  val?: number;
  state?: AgentState;
  targetNodeId?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface CustomLink {
  source: string | CustomNode;
  target: string | CustomNode;
  action?: string;
  active?: boolean;
}

export interface MintAgentGraphProps {
  graphData: {
    nodes: CustomNode[];
    links: CustomLink[];
  };
  currentAgentState?: AgentState;
  activeTargetId?: string | null;
  onSelectNode?: (node: CustomNode) => void;
  enableMascotFlight?: boolean; // Permite a la Guanábana volar hacia el nodo activo
}

export const MintAgentGraph: React.FC<MintAgentGraphProps> = ({
  graphData,
  currentAgentState = "IDLE",
  activeTargetId = null,
  onSelectNode,
  enableMascotFlight = true,
}) => {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

  // Posición flotante animada de la Guanábana (lerp suave entre nodos)
  const mascotPos = useRef<{ x: number; y: number; initialized: boolean }>({
    x: 0,
    y: 0,
    initialized: false,
  });

  // 1. Precarga de la textura de la Guanábana
  const mascotImg = useMemo(() => {
    if (typeof window === "undefined") return null;
    const img = new Image();
    img.src = "/assets/mint-mascot-glow.svg";
    return img;
  }, []);

  // 2. Renderizador personalizado por nodo (Canvas 2D)
  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const { x, y, group, label, id } = node;
      const isMint = group === "agent" || id === "agent_mint" || id === "node_main_agent";
      const isTarget = activeTargetId && id === activeTargetId;
      const time = Date.now() / 280;

      if (isMint) {
        // --- NODO CENTRAL: MASCOTA MINT (GUANÁBANA) ---
        const baseSize = 46;
        let pulseMultiplier = 1;
        let glowColor = "rgba(34, 197, 94, 0.4)"; // Verde menta suave por defecto
        let strokeColor = "#22c55e";

        // MÁQUINA DE 3 ESTADOS VISUALES
        if (currentAgentState === "READING") {
          glowColor = "rgba(45, 212, 191, 0.85)"; // Cian / Menta suave (#2dd4bf)
          strokeColor = "#2dd4bf";
          pulseMultiplier = 1 + Math.sin(time * 1.5) * 0.08;
        } else if (currentAgentState === "THINKING") {
          glowColor = "rgba(5, 150, 105, 0.9)"; // Verde esmeralda profundo (#059669)
          strokeColor = "#10b981";
          pulseMultiplier = 1 + Math.sin(time) * 0.16; // Pulso de respiración rítmica
        } else if (currentAgentState === "MUTATING") {
          glowColor = "rgba(74, 222, 128, 1)"; // Verde eléctrico neón (#4ade80)
          strokeColor = "#4ade80";
          pulseMultiplier = 1 + Math.abs(Math.sin(time * 3.5)) * 0.26; // Pulso eléctrico rápido
        }

        const size = baseSize * pulseMultiplier;

        ctx.save();

        // Si está en MUTATING: micro-ondas de choque concéntricas expansivas
        if (currentAgentState === "MUTATING") {
          const shockRatio = ((Date.now() % 800) / 800);
          const shockRadius = size * 0.6 + shockRatio * 38;
          ctx.beginPath();
          ctx.arc(x, y, shockRadius, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(74, 222, 128, ${Math.max(0, 0.9 - shockRatio)})`;
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }

        // Si está en READING: haz de escaneo hacia el nodo activo
        if (currentAgentState === "READING" && activeTargetId) {
          const targetNode = graphData.nodes.find((n) => n.id === activeTargetId);
          if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
            ctx.save();
            const beamGrad = ctx.createLinearGradient(x, y, targetNode.x, targetNode.y);
            beamGrad.addColorStop(0, "rgba(45, 212, 191, 0.7)");
            beamGrad.addColorStop(0.5, "rgba(45, 212, 191, 0.35)");
            beamGrad.addColorStop(1, "rgba(45, 212, 191, 0.05)");

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(targetNode.x, targetNode.y);
            ctx.strokeStyle = beamGrad;
            ctx.lineWidth = 3 + Math.sin(time * 4) * 1.5;
            ctx.stroke();
            ctx.restore();
          }
        }

        // Aura / Glow difuso exterior (Luxury Tech)
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = (currentAgentState === "MUTATING" ? 35 : 24) * pulseMultiplier;

        // Dibujar textura de la mascota si está cargada
        if (mascotImg && mascotImg.complete && mascotImg.naturalWidth > 0) {
          ctx.drawImage(
            mascotImg,
            x - size / 2,
            y - size / 2,
            size,
            size
          );
        } else {
          // Renderizador Vectorial Procedural de la Guanábana (Alta Fidelidad)
          drawProceduralGuanabana(ctx, x, y, size, currentAgentState, time);
        }

        ctx.restore();

        // Badge flotante con estado activo de Mint
        const badgeText = `Mint · ${currentAgentState}`;
        drawStatusPill(ctx, x, y + size / 2 + 10, badgeText, strokeColor, currentAgentState);

      } else {
        // --- RESTO DE NODOS (BD, Herramientas, Decisiones, Archivos) ---
        const radius = node.val || (group === "database" ? 16 : group === "tool" ? 14 : 11);
        ctx.save();

        // Efecto visual cuando Mint está interactuando con este nodo
        if (isTarget) {
          const isMutating = currentAgentState === "MUTATING";
          const targetGlow = isMutating ? "#4ade80" : "#2dd4bf";

          ctx.shadowColor = targetGlow;
          ctx.shadowBlur = 24;
          ctx.lineWidth = 2.8;
          ctx.strokeStyle = targetGlow;

          // Onda de choque en el nodo objetivo si está mutando
          if (isMutating) {
            const hitWave = ((Date.now() % 700) / 700) * 18;
            ctx.beginPath();
            ctx.arc(x, y, radius + hitWave, 0, 2 * Math.PI);
            ctx.strokeStyle = `rgba(74, 222, 128, ${Math.max(0, 0.8 - hitWave / 18)})`;
            ctx.stroke();
          }
        } else {
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        }

        // Relleno oscuro glassmorphic
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isTarget ? (currentAgentState === "MUTATING" ? "#062b18" : "#082822") : "#091218";
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Si es el nodo objetivo, mostrar badge contextual ("Leyendo..." o "Actualizando...")
        if (isTarget) {
          const targetBadge = currentAgentState === "MUTATING" ? "Actualizando..." : "Leyendo...";
          const badgeColor = currentAgentState === "MUTATING" ? "#4ade80" : "#2dd4bf";
          drawTargetBadge(ctx, x, y - radius - 12, targetBadge, badgeColor);
        }

        // Etiqueta tipográfica
        if (globalScale > 1.15 || isTarget) {
          drawTextLabel(ctx, x, y + radius + 9, label, isTarget, currentAgentState);
        }
      }
    },
    [currentAgentState, activeTargetId, mascotImg, graphData.nodes]
  );

  // Renderizador Vectorial Procedural de la Guanábana (Guanabana Cyber-Mascot)
  const drawProceduralGuanabana = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    state: AgentState,
    time: number
  ) => {
    ctx.save();
    ctx.translate(x, y);

    const r = size * 0.44;

    // 1. Cuerpo orgánico acorazonado de la Guanábana
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.bezierCurveTo(r * 1.1, -r * 0.85, r * 1.2, r * 0.5, 0, r * 1.05);
    ctx.bezierCurveTo(-r * 1.2, r * 0.5, -r * 1.1, -r * 0.85, 0, -r * 0.9);

    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r * 1.2);
    if (state === "MUTATING") {
      grad.addColorStop(0, "#86efac");
      grad.addColorStop(0.4, "#22c55e");
      grad.addColorStop(1, "#052e16");
    } else if (state === "READING") {
      grad.addColorStop(0, "#5eead4");
      grad.addColorStop(0.45, "#0d9488");
      grad.addColorStop(1, "#042f2e");
    } else {
      grad.addColorStop(0, "#34d399");
      grad.addColorStop(0.5, "#059669");
      grad.addColorStop(1, "#064e3b");
    }

    ctx.fillStyle = grad;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = state === "MUTATING" ? "#4ade80" : state === "READING" ? "#2dd4bf" : "#34d399";
    ctx.stroke();

    // 2. Espinas / Púas suaves bioluminiscentes (Soursop Spikes)
    const spineOffsets = [
      { a: -2.2, l: 0.95 },
      { a: -1.7, l: 1.05 },
      { a: -1.0, l: 1.02 },
      { a: -0.4, l: 0.98 },
      { a: 0.4, l: 0.98 },
      { a: 1.0, l: 1.02 },
      { a: 1.7, l: 1.05 },
      { a: 2.2, l: 0.95 },
    ];

    ctx.fillStyle = state === "MUTATING" ? "#bbf7d0" : "#6ee7b7";
    for (const sp of spineOffsets) {
      const sx = Math.cos(sp.a) * (r * sp.l);
      const sy = Math.sin(sp.a) * (r * sp.l);
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // 3. Tallo superior y hojita
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.quadraticCurveTo(4, -r * 1.2, 2, -r * 1.35);
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Hoja verde menta
    ctx.beginPath();
    ctx.ellipse(r * 0.35, -r * 1.15, 6, 3, Math.PI / 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#4ade80";
    ctx.fill();

    // 4. Ojos / Visor Cyber-Mascota
    const eyeOffsetY = -r * 0.05;
    const eyeSpacing = r * 0.38;

    // Pupila izquierda y derecha
    for (const side of [-1, 1]) {
      const ex = side * eyeSpacing;
      const ey = eyeOffsetY;

      ctx.beginPath();
      ctx.ellipse(ex, ey, 4.5, state === "THINKING" ? 2.5 : 5.5, 0, 0, 2 * Math.PI);
      ctx.fillStyle = state === "MUTATING" ? "#ffffff" : "#022c22";
      ctx.fill();
      ctx.strokeStyle = state === "MUTATING" ? "#4ade80" : "#2dd4bf";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Brillo en los ojos
      ctx.beginPath();
      ctx.arc(ex - 1.2, ey - 1.5, 1.6, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }

    // Sonrisa sutil
    ctx.beginPath();
    ctx.arc(0, r * 0.22, 4.5, 0.15, Math.PI - 0.15);
    ctx.strokeStyle = state === "MUTATING" ? "#ffffff" : "#a7f3d0";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.restore();
  };

  // Cápsula flotante estilizada para el estado de Mint
  const drawStatusPill = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    accentColor: string,
    state: AgentState
  ) => {
    ctx.save();
    ctx.font = "700 11px Inter, system-ui, sans-serif";
    const textWidth = ctx.measureText(text).width;
    const paddingX = 9;
    const height = 19;

    // Fondo oscuro glassmorphic
    ctx.fillStyle = "rgba(4, 12, 8, 0.92)";
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(x - textWidth / 2 - paddingX, y, textWidth + paddingX * 2, height, 9.5);
    ctx.fill();
    ctx.stroke();

    // Dot pulsante dentro de la píldora
    const dotX = x - textWidth / 2 - 2;
    const dotY = y + height / 2;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = accentColor;
    ctx.fill();

    // Texto
    ctx.fillStyle = "#f0fdf4";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + 4, y + height / 2);
    ctx.restore();
  };

  // Badge en el nodo destino cuando está siendo leído o mutado
  const drawTargetBadge = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    color: string
  ) => {
    ctx.save();
    ctx.font = "600 10px Inter, system-ui, sans-serif";
    const textWidth = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(6, 15, 11, 0.9)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - textWidth / 2 - 6, y - 8, textWidth + 12, 16, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  const drawTextLabel = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    isHighlighted: boolean,
    state: AgentState
  ) => {
    ctx.save();
    ctx.font = isHighlighted ? "600 12px Inter, sans-serif" : "400 10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = isHighlighted
      ? state === "MUTATING"
        ? "#86efac"
        : "#5eead4"
      : "#94a3b8";
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  return (
    <div className="w-full h-full relative bg-[#040806] select-none overflow-hidden">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeCanvasObject={drawNode}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, (node.val || 16) + 6, 0, 2 * Math.PI);
          ctx.fill();
        }}
        onNodeClick={(node: any) => {
          if (onSelectNode) onSelectNode(node);
        }}
        // DINÁMICA DE FLUJO DE PARTÍCULAS:
        // 1. Activa partículas en el enlace que conecta con el objetivo
        linkDirectionalParticles={(link: any) => {
          const isConnectedToTarget =
            activeTargetId &&
            (link.source.id === activeTargetId ||
              link.target.id === activeTargetId ||
              link.source === activeTargetId ||
              link.target === activeTargetId);

          if (currentAgentState === "IDLE" || currentAgentState === "THINKING") {
            return 0; // Enlaces en reposo
          }
          return isConnectedToTarget || link.active ? (currentAgentState === "MUTATING" ? 6 : 4) : 0;
        }}
        // 2. Inversión de Partículas:
        // Si READING: velocidad negativa (-0.014), las partículas viajan HACIA la Guanábana (ingesta).
        // Si MUTATING: viajan a alta velocidad positiva (+0.026) hacia el recurso.
        linkDirectionalParticleSpeed={(link: any) => {
          if (currentAgentState === "READING") {
            return -0.014; // Flujo inverso hacia la boca/núcleo de Mint
          }
          if (currentAgentState === "MUTATING") {
            return 0.026; // Salida rápida hacia el recurso
          }
          return 0.008;
        }}
        // Color de partículas según estado
        linkDirectionalParticleColor={(link: any) =>
          currentAgentState === "MUTATING" ? "#4ade80" : "#2dd4bf"
        }
        linkDirectionalParticleWidth={(link: any) => (currentAgentState === "MUTATING" ? 3.5 : 2.6)}
        linkColor={(link: any) => {
          const isTargetLink =
            activeTargetId &&
            (link.source.id === activeTargetId ||
              link.target.id === activeTargetId ||
              link.source === activeTargetId ||
              link.target === activeTargetId);

          if (isTargetLink) {
            return currentAgentState === "MUTATING"
              ? "rgba(74, 222, 128, 0.45)"
              : "rgba(45, 212, 191, 0.45)";
          }
          return "rgba(255, 255, 255, 0.08)";
        }}
        linkWidth={(link: any) => {
          const isTargetLink =
            activeTargetId &&
            (link.source.id === activeTargetId ||
              link.target.id === activeTargetId ||
              link.source === activeTargetId ||
              link.target === activeTargetId);
          return isTargetLink ? 2.2 : 1;
        }}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
    </div>
  );
};

export default MintAgentGraph;
