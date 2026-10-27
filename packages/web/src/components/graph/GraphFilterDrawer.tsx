import React from "react";
import { MintNodeType, MintRelationType } from "../../types/graph";
import { NODE_TYPE_COLORS, RELATION_LABELS } from "../../data/graphData";
import { X, RotateCcw, CheckSquare, Square } from "lucide-react";

interface GraphFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNodeTypes: MintNodeType[];
  onToggleNodeType: (type: MintNodeType) => void;
  selectedRelationTypes: MintRelationType[];
  onToggleRelationType: (rel: MintRelationType) => void;
  onResetFilters: () => void;
  onSelectAll: () => void;
}

const ALL_NODE_TYPES: { type: MintNodeType; label: string }[] = [
  { type: "agent", label: "Agentes Autónomos" },
  { type: "tool", label: "Herramientas" },
  { type: "database", label: "Bases de Datos" },
  { type: "warehouse", label: "Bodegas & Centros" },
  { type: "sku", label: "Productos / SKUs" },
  { type: "supplier", label: "Proveedores" },
  { type: "decision", label: "Decisiones" },
  { type: "purchase_order", label: "Órdenes de Compra" },
  { type: "execution", label: "Aprobaciones HITL" },
];

const ALL_RELATIONS: MintRelationType[] = [
  "uses",
  "queries",
  "belongs_to",
  "generates",
  "depends_on",
  "modifies",
  "approved_by",
];

export const GraphFilterDrawer: React.FC<GraphFilterDrawerProps> = ({
  isOpen,
  onClose,
  selectedNodeTypes,
  onToggleNodeType,
  selectedRelationTypes,
  onToggleRelationType,
  onResetFilters,
  onSelectAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-16 left-4 w-80 max-h-[calc(100vh-140px)] rounded-2xl bg-[#09120e]/95 border border-[#1b3424] shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-md z-30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-4 duration-150">
      {/* Header del Panel */}
      <div className="p-4 border-b border-[#162a1d] flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Filtros del Grafo
          </h3>
          <p className="text-[11px] text-gray-400">
            Ajusta los tipos de entidad y relaciones visibles
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#122419] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contenido con Scroll */}
      <div className="p-4 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-xs">
        {/* Sección: Tipo de Nodo */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-mono uppercase text-gray-400 font-semibold tracking-wider">
              Tipo de Nodo
            </span>
            <span className="text-[10px] text-mint-400 font-mono">
              {selectedNodeTypes.length}/{ALL_NODE_TYPES.length}
            </span>
          </div>

          <div className="space-y-1.5">
            {ALL_NODE_TYPES.map(({ type, label }) => {
              const isChecked = selectedNodeTypes.includes(type);
              const color = NODE_TYPE_COLORS[type];

              return (
                <button
                  key={type}
                  onClick={() => onToggleNodeType(type)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all text-left ${
                    isChecked
                      ? "bg-[#112318] border-[#224831] text-gray-200"
                      : "bg-[#09120e] border-[#15271c] text-gray-500 hover:border-[#1d3827]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: isChecked ? color.stroke : "#475569" }}
                    />
                    <span className="text-xs">{label}</span>
                  </div>
                  {isChecked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-mint-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-gray-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sección: Relaciones */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-mono uppercase text-gray-400 font-semibold tracking-wider">
              Relaciones
            </span>
            <span className="text-[10px] text-mint-400 font-mono">
              {selectedRelationTypes.length}/{ALL_RELATIONS.length}
            </span>
          </div>

          <div className="space-y-1.5">
            {ALL_RELATIONS.map((rel) => {
              const isChecked = selectedRelationTypes.includes(rel);
              const label = RELATION_LABELS[rel];

              return (
                <button
                  key={rel}
                  onClick={() => onToggleRelationType(rel)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all text-left ${
                    isChecked
                      ? "bg-[#112318] border-[#224831] text-gray-200"
                      : "bg-[#09120e] border-[#15271c] text-gray-500 hover:border-[#1d3827]"
                  }`}
                >
                  <span className="text-xs font-mono">{label}</span>
                  {isChecked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-mint-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-gray-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer de Acciones Rápidas */}
      <div className="p-3 border-t border-[#162a1d] bg-[#070d0a] flex items-center justify-between gap-2">
        <button
          onClick={onSelectAll}
          className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white bg-[#0e1c14] border border-[#1d3a28] hover:border-mint-700 transition-colors"
        >
          Seleccionar todos
        </button>
        <button
          onClick={onResetFilters}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-mint-400 hover:text-mint-300 bg-[#12281b] border border-mint-700/60 hover:bg-[#163122] transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restablecer</span>
        </button>
      </div>
    </div>
  );
};
