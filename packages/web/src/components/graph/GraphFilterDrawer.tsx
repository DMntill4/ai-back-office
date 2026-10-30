import React from "react";
import { MintNodeType, MintRelationType } from "../../types/graph";
import { NODE_TYPE_COLORS, RELATION_LABELS } from "../../data/graphTheme";
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
  { type: "execution", label: "Aprobaciones humanas" },
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
    <div className="absolute top-16 left-4 w-80 max-h-[calc(100vh-140px)] rounded-container bg-panel border border-border shadow-popover z-30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-4 duration-150">
      {/* Header del Panel */}
      <div className="p-base border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-label font-semibold text-primary">
            Filtros del Grafo
          </h3>
          <p className="text-caption text-secondary">
            Ajusta los tipos de entidad y relaciones visibles
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-hairline rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contenido con Scroll */}
      <div className="p-base space-y-group overflow-y-auto custom-scrollbar flex-1 text-label">
        {/* Sección: Tipo de Nodo */}
        <div>
          <div className="flex items-center justify-between mb-compact">
            <span className="text-caption font-mono text-secondary font-semibold">
              Tipo de Nodo
            </span>
            <span className="text-caption text-brand font-mono">
              {selectedNodeTypes.length}/{ALL_NODE_TYPES.length}
            </span>
          </div>

          <div className="space-y-hairline">
            {ALL_NODE_TYPES.map(({ type, label }) => {
              const isChecked = selectedNodeTypes.includes(type);
              const color = NODE_TYPE_COLORS[type];

              return (
                <button
                  key={type}
                  onClick={() => onToggleNodeType(type)}
                  className={`w-full flex items-center justify-between px-compact py-hairline rounded-control border transition-all text-left ${isChecked
                    ? "bg-brand-surface border-brand/40 text-primary"
                    : "bg-panel border-border text-muted hover:border-border-strong"
                    }`}
                >
                  <div className="flex items-center gap-compact">
                    <span
                      className="w-2.5 h-2.5 rounded-pill"
                      style={{ backgroundColor: isChecked ? color.stroke : "var(--color-muted)" }}
                    />
                    <span className="text-label">{label}</span>
                  </div>
                  {isChecked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-brand" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-muted" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sección: Relaciones */}
        <div>
          <div className="flex items-center justify-between mb-compact">
            <span className="text-caption font-mono text-secondary font-semibold">
              Relaciones
            </span>
            <span className="text-caption text-brand font-mono">
              {selectedRelationTypes.length}/{ALL_RELATIONS.length}
            </span>
          </div>

          <div className="space-y-hairline">
            {ALL_RELATIONS.map((rel) => {
              const isChecked = selectedRelationTypes.includes(rel);
              const label = RELATION_LABELS[rel];

              return (
                <button
                  key={rel}
                  onClick={() => onToggleRelationType(rel)}
                  className={`w-full flex items-center justify-between px-compact py-hairline rounded-control border transition-all text-left ${isChecked
                    ? "bg-brand-surface border-brand/40 text-primary"
                    : "bg-panel border-border text-muted hover:border-border-strong"
                    }`}
                >
                  <span className="text-label font-mono">{label}</span>
                  {isChecked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-brand" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-muted" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer de Acciones Rápidas */}
      <div className="p-compact border-t border-border bg-raised flex items-center justify-between gap-compact">
        <button
          onClick={onSelectAll}
          className="flex-1 py-hairline px-compact rounded-control text-label font-semibold text-secondary hover:text-primary bg-panel border border-border hover:border-border-strong transition-colors"
        >
          Seleccionar todos
        </button>
        <button
          onClick={onResetFilters}
          className="flex items-center gap-hairline py-hairline px-compact rounded-control text-label font-semibold text-brand hover:text-brand bg-brand-surface border border-brand/40 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restablecer</span>
        </button>
      </div>
    </div>
  );
};
