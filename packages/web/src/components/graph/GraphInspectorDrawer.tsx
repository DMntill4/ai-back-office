import React from "react";
import { MintGraphNode, MintGraphEdge } from "../../types/graph";
import { NODE_TYPE_COLORS, RELATION_LABELS } from "../../data/graphData";
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
    <aside className="absolute top-16 right-4 w-96 max-h-[calc(100vh-140px)] rounded-2xl bg-[#08110d]/95 border border-[#1b3424] shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-md z-30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-150">
      {/* Header del Inspector */}
      <div className="p-4 border-b border-[#16291d] flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
            style={{
              backgroundColor: colors.fill,
              borderColor: colors.stroke,
              boxShadow: `0 0 16px ${colors.glow}`,
            }}
          >
            {renderIcon(selectedNode.type)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold border"
                style={{
                  backgroundColor: colors.fill,
                  borderColor: colors.stroke,
                  color: colors.stroke,
                }}
              >
                {selectedNode.type.replace("_", " ")}
              </span>
              {selectedNode.status === "warning" ? (
                <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400">
                  <AlertTriangle className="w-3 h-3" />
                  Alerta
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-mono text-mint-400">
                  <CheckCircle2 className="w-3 h-3" />
                  Operativo
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold text-white mt-1 leading-snug">
              {selectedNode.label}
            </h2>
            {selectedNode.sublabel && (
              <p className="text-xs text-gray-400 mt-0.5">{selectedNode.sublabel}</p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#122419] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contenido con Scroll */}
      <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
        {/* Contexto Operativo Santandereana */}
        <div className="p-3 rounded-xl bg-[#0c1912] border border-[#1b3625]">
          <span className="text-[10px] font-mono uppercase text-gray-400 font-semibold tracking-wider">
            Contexto del Sistema
          </span>
          <p className="text-xs text-mint-300 font-medium mt-1">
            Ferretería Industrial Santandereana S.A.S.
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
            <span>Conexión: Hub Principal Bucaramanga</span>
            <span>•</span>
            <span className="text-emerald-400 font-mono">
              Grado: {selectedNode.degree || 1}
            </span>
          </div>
        </div>

        {/* Relaciones Salientes (→) */}
        <div>
          <span className="text-[10px] font-mono uppercase text-gray-400 font-semibold tracking-wider block mb-2">
            → Relaciones Salientes ({outgoingEdges.length})
          </span>
          {outgoingEdges.length === 0 ? (
            <p className="text-[11px] text-gray-500 italic px-2">Sin conexiones salientes</p>
          ) : (
            <div className="space-y-1.5">
              {outgoingEdges.map((e) => {
                const targetNode = nodesMap.get(e.target);
                if (!targetNode) return null;
                const targetColor = NODE_TYPE_COLORS[targetNode.type] || NODE_TYPE_COLORS.sku;
                const relLabel = RELATION_LABELS[e.relation] || e.relation;

                return (
                  <button
                    key={e.id}
                    onClick={() => onSelectNode(targetNode.id)}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-[#0a140f] border border-[#162b1e] hover:border-mint-600/60 hover:bg-[#102217] transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <ArrowRight className="w-3.5 h-3.5 text-mint-400 flex-shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] font-mono text-gray-400 block">
                          {relLabel} {e.label ? `(${e.label})` : ""}
                        </span>
                        <span className="text-xs font-semibold text-gray-200 group-hover:text-white truncate">
                          {targetNode.label}
                        </span>
                      </div>
                    </div>
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 ml-2"
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
          <span className="text-[10px] font-mono uppercase text-gray-400 font-semibold tracking-wider block mb-2">
            ← Consultado o Alimentado por ({incomingEdges.length})
          </span>
          {incomingEdges.length === 0 ? (
            <p className="text-[11px] text-gray-500 italic px-2">Sin conexiones entrantes</p>
          ) : (
            <div className="space-y-1.5">
              {incomingEdges.map((e) => {
                const sourceNode = nodesMap.get(e.source);
                if (!sourceNode) return null;
                const sourceColor = NODE_TYPE_COLORS[sourceNode.type] || NODE_TYPE_COLORS.sku;
                const relLabel = RELATION_LABELS[e.relation] || e.relation;

                return (
                  <button
                    key={e.id}
                    onClick={() => onSelectNode(sourceNode.id)}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-[#0a140f] border border-[#162b1e] hover:border-mint-600/60 hover:bg-[#102217] transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <ArrowLeft className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] font-mono text-gray-400 block">
                          {relLabel} {e.label ? `(${e.label})` : ""}
                        </span>
                        <span className="text-xs font-semibold text-gray-200 group-hover:text-white truncate">
                          {sourceNode.label}
                        </span>
                      </div>
                    </div>
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 ml-2"
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
          <div className="p-3 rounded-xl bg-[#09130e] border border-[#172c1e]">
            <span className="text-[10px] font-mono uppercase text-gray-400 font-semibold tracking-wider block mb-2">
              Atributos de Base de Datos
            </span>
            <div className="space-y-1.5 font-mono text-[11px]">
              {Object.entries(selectedNode.metadata).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center text-gray-300">
                  <span className="text-gray-400">{key}:</span>
                  <span className="text-gray-200 font-semibold truncate max-w-[190px]">
                    {typeof val === "object" ? JSON.stringify(val) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer con Acciones Contextuales */}
      <div className="p-3 border-t border-[#16291d] bg-[#070d0a] space-y-2">
        <div className="flex items-center gap-2">
          {/* Centrar Cámara */}
          <button
            onClick={() => onCenterNode(selectedNode.id)}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-gray-200 bg-[#0d1c14] border border-[#1f3f2a] hover:border-mint-600 hover:text-white flex items-center justify-center gap-1.5 transition-all"
          >
            <Crosshair className="w-3.5 h-3.5 text-mint-400" />
            <span>Centrar en este nodo</span>
          </button>

          {/* Aislar en Modo Local */}
          <button
            onClick={() => onSwitchToLocalMode(selectedNode.id)}
            className="py-2 px-3 rounded-lg text-xs font-semibold text-mint-300 bg-[#12281c] border border-mint-700/60 hover:bg-[#163423] flex items-center justify-center gap-1.5 transition-all"
            title="Aislar nodo y vecinos inmediatos en vista local"
          >
            <Compass className="w-3.5 h-3.5 text-mint-400" />
            <span>Modo Local</span>
          </button>
        </div>

        {/* Si es Decisión o PO: Botón para ir a Bandeja HITL */}
        {(selectedNode.type === "decision" || selectedNode.type === "purchase_order") && onNavigateToHitl && (
          <button
            onClick={onNavigateToHitl}
            className="w-full py-2 px-3 rounded-lg text-xs font-bold text-black bg-gradient-to-r from-mint-500 to-emerald-400 hover:from-mint-400 hover:to-emerald-300 flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(34,197,94,0.25)] transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir Decisión en Bandeja HITL</span>
          </button>
        )}
      </div>
    </aside>
  );
};
