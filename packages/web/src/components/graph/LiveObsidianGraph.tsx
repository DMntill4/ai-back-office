import React, { useEffect, useMemo, useRef } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { useAgentTelemetry, type UseAgentTelemetryOptions } from "../../hooks/useAgentTelemetry";
import { useLiveGraph } from "../../hooks/useLiveGraph";
import { EmptyState } from "../ui/EmptyState";
import { LoadingScreen } from "../ui/LoadingScreen";
import type { TelemetryGraphLink, TelemetryGraphNode } from "../../types/telemetry";

interface LiveObsidianGraphProps {
  options?: UseAgentTelemetryOptions;
}

export const LiveObsidianGraph: React.FC<LiveObsidianGraphProps> = ({ options }) => {
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const { graphData, loading, error, refresh } = useLiveGraph({ mode: "global" });
  const { traversals } = useAgentTelemetry(options);
  const currentTraversal = traversals[0];
  const activePathIds = new Set(currentTraversal?.path ?? []);

  const forceData = useMemo(() => {
    const nodes: TelemetryGraphNode[] = (graphData?.nodes ?? []).map((node) => ({
      id: node.id,
      label: node.label,
      group: node.type,
      metadata: node.metadata,
      interactionCount: 0,
      bytesOrRowsTotal: 0,
    }));
    const links: TelemetryGraphLink[] = (graphData?.edges ?? []).map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      action: edge.relation === "modifies" ? "write" : edge.relation === "queries" ? "read" : "execute",
      interactionCount: 0,
    }));
    return { nodes, links };
  }, [graphData]);

  const pathLink = (link: TelemetryGraphLink) => {
    const source = typeof link.source === "string" ? link.source : link.source.id;
    const target = typeof link.target === "string" ? link.target : link.target.id;
    return currentTraversal?.path.some(
      (id, index) =>
        index < (currentTraversal?.path.length ?? 0) - 1 &&
        ((id === source && currentTraversal?.path[index + 1] === target) ||
          (id === target && currentTraversal?.path[index + 1] === source)),
    ) ?? false;
  };

  useEffect(() => {
    graphRef.current?.d3Force("charge")?.strength(-320);
    graphRef.current?.d3Force("link")?.distance(120);
    graphRef.current?.zoomToFit(400, 48);
  }, [forceData]);

  if (loading) {
    return (
      <LoadingScreen
        title="Construyendo mapa de relaciones"
        subtitle="Cargando entidades reales desde PostgreSQL y el vault."
        fullScreen={false}
      />
    );
  }

  if (forceData.nodes.length === 0) {
    return (
      <EmptyState
        title={error ? "No se pudo cargar el grafo" : "Sin entidades para mostrar"}
        description={error ?? "No hay registros reales de negocio ni documentos indexados en el vault."}
        actionLabel="Volver a consultar"
        onAction={() => void refresh()}
      />
    );
  }

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-container border border-border bg-canvas">
      <ForceGraph2D
        ref={graphRef}
        graphData={forceData}
        nodeId="id"
        nodeLabel={(node) => (node as TelemetryGraphNode).label}
        nodeColor={(node) => {
          const current = node as TelemetryGraphNode;
          if (activePathIds.has(current.id)) {
            return currentTraversal?.status === "warning" ? "#F5B544" : "#2BB656";
          }
          if (current.group === "agent") return "#2BB656";
          if (current.group === "warehouse") return "#2DD4BF";
          if (current.group === "supplier") return "#9AA9BC";
          return "#9DE342";
        }}
        nodeRelSize={5}
        linkColor={(link) => pathLink(link as TelemetryGraphLink) ? "#2BB656" : "#26342C"}
        linkWidth={(link) => pathLink(link as TelemetryGraphLink) ? 2 : 1}
        linkDirectionalParticles={(link) => pathLink(link as TelemetryGraphLink) && currentTraversal?.status === "active" ? 2 : 0}
        linkDirectionalParticleWidth={3}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleColor={() => "#9DE342"}
        onNodeClick={(node) => {
          const position = node as TelemetryGraphNode & { x?: number; y?: number };
          if (Number.isFinite(position.x) && Number.isFinite(position.y)) {
            graphRef.current?.centerAt(position.x, position.y, 350);
            graphRef.current?.zoom(2.2, 350);
          }
        }}
        cooldownTicks={120}
        enableNodeDrag
        enableZoomInteraction
        enablePanInteraction
        backgroundColor="#090D0B"
      />
    </div>
  );
};

export default LiveObsidianGraph;
