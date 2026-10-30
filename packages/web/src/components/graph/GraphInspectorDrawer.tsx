import React from "react";
import { MintGraphNode, MintGraphEdge } from "../../types/graph";
import { NODE_TYPE_COLORS, RELATION_LABELS } from "../../data/graphTheme";
import {
  X,
  Crosshair,
  Compass,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Layers,
  Database,
  Cpu,
  Wrench,
  Building2,
  Package,
  Truck,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface GraphInspectorDrawerProps {
  selectedNode: MintGraphNode | null;
  allNodes: MintGraphNode[];
  edges: MintGraphEdge[];
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  onCenterNode: (nodeId: string) => void;
  onSwitchToLocalMode: (nodeId: string) => void;
  onNavigateToHitl?: () => void;
}

export const GraphInspectorDrawer: React.FC<GraphInspectorDrawerProps> = ({
  selectedNode,
  allNodes,
  edges,
  onClose,
  onSelectNode,
  onCenterNode,
  onSwitchToLocalMode,
  onNavigateToHitl,
}) => {
  if (!selectedNode) return null;

  const colors = NODE_TYPE_COLORS[selectedNode.type] || NODE_TYPE_COLORS.sku;

  // Encontrar conexiones entrantes y salientes directas
  const incomingEdges = edges.filter((e) => e.target === selectedNode.id);
  const outgoingEdges = edges.filter((e) => e.source === selectedNode.id);

  // Mapear a los nodos correspondientes
  const nodesMap = new Map(allNodes.map((n) => [n.id, n]));

  // Icono según tipo de entidad
  const renderIcon = (type: string) => {
    switch (type) {
      case "agent":
        return <Cpu className="w-5 h-5 text-mint-400" />;
      case "tool":
        return <Wrench className="w-5 h-5 text-sky-400" />;
      case "database":
        return <Database className="w-5 h-5 text-purple-400" />;
      case "warehouse":
        return <Building2 className="w-5 h-5 text-amber-400" />;
      case "sku":
        return <Package className="w-5 h-5 text-rose-400" />;
      case "supplier":
        return <Truck className="w-5 h-5 text-teal-400" />;
      case "decision":
      case "purchase_order":
      case "execution":
        return <FileCheck2 className="w-5 h-5 text-orange-400" />;
      default:
        return <Layers className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <aside className="absolute top-16 right-4 w-96 max-h-[calc(100vh-140px)] rounded-container bg-panel border border-border shadow-popover z-30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-150">
      {/* Header del Inspector */}
      <div className="p-base border-b border-border flex items-start justify-between gap-compact">
        <div className="flex items-start gap-compact">
          <div
            className="w-10 h-10 rounded-control flex items-center justify-center flex-shrink-0 border"
            style={{
              backgroundColor: colors.fill,
              borderColor: colors.stroke,
              boxShadow: `0 0 16px ${colors.glow}`,
            }}
          >
            {renderIcon(selectedNode.type)}
          </div>
          <div>
            <div className="flex items-center gap-compact">
              <span
                className="text-caption font-mono px-compact py-hairline rounded-pill font-semibold border"
                style={{
                  backgroundColor: colors.fill,
                  borderColor: colors.stroke,
                  color: colors.stroke,
                }}
              >
                {selectedNode.type.replace("_", " ")}
              </span>
              {selectedNode.status === "warning" ? (
                <span className="flex items-center gap-hairline text-caption font-mono text-state-attention">
                  <AlertTriangle className="w-3 h-3" />
                  Alerta
                </span>
              ) : (
                <span className="flex items-center gap-hairline text-caption font-mono text-brand">
                  <CheckCircle2 className="w-3 h-3" />
                  Operativo
                </span>
              )}
            </div>
            <h2 className="text-label font-semibold text-primary mt-hairline leading-snug">
              {selectedNode.label}
            </h2>
            {selectedNode.sublabel && (
              <p className="text-label text-secondary mt-hairline">{selectedNode.sublabel}</p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-hairline rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contenido con Scroll */}
      <div className="p-base space-y-base overflow-y-auto custom-scrollbar flex-1 text-label">
        {/* Contexto Operativo Santandereana */}
        <div className="p-compact rounded-control bg-raised border border-border">
          <span className="text-caption font-mono text-secondary font-semibold">
            Contexto del Sistema
          </span>
          <p className="text-label text-brand font-medium mt-hairline">
            Ferretería Industrial Santandereana S.A.S.
          </p>
          <div className="flex items-center gap-compact mt-compact text-caption text-secondary">
            <span>Conexión: Hub Principal Bucaramanga</span>
            <span>•</span>
            <span className="text-brand font-mono">
              Grado: {selectedNode.degree || 1}
            </span>
          </div>
        </div>

        {/* Relaciones Salientes (→) */}
        <div>
          <span className="text-caption font-mono text-secondary font-semibold block mb-compact">
            → Relaciones Salientes ({outgoingEdges.length})
          </span>
          {outgoingEdges.length === 0 ? (
            <p className="text-caption text-muted italic px-compact">Sin conexiones salientes</p>
          ) : (
            <div className="space-y-hairline">
              {outgoingEdges.map((e) => {
                const targetNode = nodesMap.get(e.target);
                if (!targetNode) return null;
                const targetColor = NODE_TYPE_COLORS[targetNode.type] || NODE_TYPE_COLORS.sku;
                const relLabel = RELATION_LABELS[e.relation] || e.relation;

                return (
                  <button
                    key={e.id}
                    onClick={() => onSelectNode(targetNode.id)}
                    className="w-full flex items-center justify-between p-compact rounded-control bg-panel border border-border hover:border-brand/40 hover:bg-raised transition-all text-left group"
                  >
                    <div className="flex items-center gap-compact overflow-hidden">
                      <ArrowRight className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                      <div className="truncate">
                        <span className="text-caption font-mono text-secondary block">
                          {relLabel} {e.label ? `(${e.label})` : ""}
                        </span>
                        <span className="text-label font-semibold text-primary truncate">
                          {targetNode.label}
                        </span>
                      </div>
                    </div>
                    <span
                      className="w-2 h-2 rounded-pill flex-shrink-0 ml-compact"
                      style={{ backgroundColor: targetColor.stroke }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Relaciones Entrantes (←) */}
        <div>
          <span className="text-caption font-mono text-secondary font-semibold block mb-compact">
            ← Consultado o Alimentado por ({incomingEdges.length})
          </span>
          {incomingEdges.length === 0 ? (
            <p className="text-caption text-muted italic px-compact">Sin conexiones entrantes</p>
          ) : (
            <div className="space-y-hairline">
              {incomingEdges.map((e) => {
                const sourceNode = nodesMap.get(e.source);
                if (!sourceNode) return null;
                const sourceColor = NODE_TYPE_COLORS[sourceNode.type] || NODE_TYPE_COLORS.sku;
                const relLabel = RELATION_LABELS[e.relation] || e.relation;

                return (
                  <button
                    key={e.id}
                    onClick={() => onSelectNode(sourceNode.id)}
                    className="w-full flex items-center justify-between p-compact rounded-control bg-panel border border-border hover:border-brand/40 hover:bg-raised transition-all text-left group"
                  >
                    <div className="flex items-center gap-compact overflow-hidden">
                      <ArrowLeft className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                      <div className="truncate">
                        <span className="text-caption font-mono text-secondary block">
                          {relLabel} {e.label ? `(${e.label})` : ""}
                        </span>
                        <span className="text-label font-semibold text-primary truncate">
                          {sourceNode.label}
                        </span>
                      </div>
                    </div>
                    <span
                      className="w-2 h-2 rounded-pill flex-shrink-0 ml-compact"
                      style={{ backgroundColor: sourceColor.stroke }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Metadata Específica del Registro */}
        {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
          <div className="p-compact rounded-control bg-raised border border-border">
            <span className="text-caption font-mono text-secondary font-semibold block mb-compact">
              Atributos de Base de Datos
            </span>
            <div className="space-y-hairline font-mono text-caption">
              {Object.entries(selectedNode.metadata).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center text-secondary">
                  <span className="text-muted">{key}:</span>
                  <span className="text-primary font-semibold truncate max-w-[190px]">
                    {typeof val === "object" ? JSON.stringify(val) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer con Acciones Contextuales */}
      <div className="p-compact border-t border-border bg-raised space-y-compact">
        <div className="flex items-center gap-compact">
          {/* Centrar Cámara */}
          <button
            onClick={() => onCenterNode(selectedNode.id)}
            className="flex-1 py-compact px-compact rounded-control text-label font-semibold text-primary bg-panel border border-border hover:border-border-strong flex items-center justify-center gap-hairline transition-all"
          >
            <Crosshair className="w-3.5 h-3.5 text-brand" />
            <span>Centrar en este nodo</span>
          </button>

          {/* Aislar en Modo Local */}
          <button
            onClick={() => onSwitchToLocalMode(selectedNode.id)}
            className="py-compact px-compact rounded-control text-label font-semibold text-brand bg-brand-surface border border-brand/40 hover:bg-brand-surface flex items-center justify-center gap-hairline transition-all"
            title="Aislar nodo y vecinos inmediatos en vista local"
          >
            <Compass className="w-3.5 h-3.5 text-brand" />
            <span>Modo Local</span>
          </button>
        </div>

        {/* Si es Decisión o PO: Botón para ir a Bandeja de Aprobaciones */}
        {(selectedNode.type === "decision" || selectedNode.type === "purchase_order") && onNavigateToHitl && (
          <button
            onClick={onNavigateToHitl}
            className="w-full py-compact px-compact rounded-control text-label font-semibold text-canvas bg-brand hover:bg-brand flex items-center justify-center gap-hairline shadow-card transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir Decisión en Bandeja de Aprobaciones</span>
          </button>
        )}
      </div>
    </aside>
  );
};
