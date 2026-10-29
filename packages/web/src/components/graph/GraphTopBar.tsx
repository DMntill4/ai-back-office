import React from "react";
import { Search, SlidersHorizontal, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

interface GraphTopBarProps {
  currentMode: "global" | "local" | "workflow" | "execution" | "telemetry";
  onSelectMode: (mode: "global" | "local" | "workflow" | "execution" | "telemetry") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  activeFilterCount: number;
  totalNodes: number;
  totalEdges: number;
}

export const GraphTopBar: React.FC<GraphTopBarProps> = ({
  currentMode,
  onSelectMode,
  searchQuery,
  onSearchChange,
  isFilterOpen,
  onToggleFilter,
  activeFilterCount,
  totalNodes,
  totalEdges,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-full bg-forest-surface border border-forest-border shadow-subtle">
      {/* Izquierda: Búsqueda en píldora */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar entidad, SKU o proveedor..."
          className="w-full h-8 pl-8 pr-3 text-xs bg-forest-card text-txt-primary border border-forest-border hover:border-forest-borderBright rounded-full placeholder:text-txt-tertiary focus:border-brand transition-colors"
        />
      </div>

      {/* Centro: Modos de vista en conmutador de píldora */}
      <div className="flex items-center gap-1 p-0.5 rounded-full bg-forest-card border border-forest-border text-xs">
        <button
          onClick={() => onSelectMode("global")}
          className={`px-3 py-1 rounded-full font-medium transition-all ${
            currentMode === "global" || currentMode === "telemetry"
              ? "bg-forest-surface text-txt-primary font-semibold border border-forest-borderBright shadow-subtle"
              : "text-txt-secondary hover:text-txt-primary"
          }`}
        >
          Vista completa
        </button>
        <button
          onClick={() => onSelectMode("workflow")}
          className={`px-3 py-1 rounded-full font-medium transition-all ${
            currentMode === "workflow"
              ? "bg-forest-surface text-txt-primary font-semibold border border-forest-borderBright shadow-subtle"
              : "text-txt-secondary hover:text-txt-primary"
          }`}
        >
          Agente y herramientas
        </button>
        <button
          onClick={() => onSelectMode("execution")}
          className={`px-3 py-1 rounded-full font-medium transition-all ${
            currentMode === "execution"
              ? "bg-forest-surface text-txt-primary font-semibold border border-forest-borderBright shadow-subtle"
              : "text-txt-secondary hover:text-txt-primary"
          }`}
        >
          Órdenes y proveedores
        </button>
      </div>

      {/* Derecha: Métricas y Filtros */}
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono text-[11px] text-txt-tertiary tabular-nums hidden sm:inline px-2">
          {totalNodes} entidades · {totalEdges} relaciones
        </span>

        <button
          onClick={onToggleFilter}
          className={`h-8 px-3 rounded-full border text-xs font-medium transition-all flex items-center gap-1.5 ${
            isFilterOpen || activeFilterCount > 0
              ? "bg-forest-card text-brand border-brand/40 shadow-subtle font-semibold"
              : "bg-forest-card text-txt-secondary border-forest-border hover:border-forest-borderBright hover:text-txt-primary"
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>Filtros</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-brand/20 text-brand text-[10px] font-mono flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
