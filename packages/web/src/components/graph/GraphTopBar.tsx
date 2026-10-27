import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  Settings2,
  ChevronDown,
  Globe2,
  Compass,
  GitFork,
  Activity,
  X,
} from "lucide-react";

interface GraphTopBarProps {
  currentMode: "global" | "local" | "workflow" | "execution" | "telemetry";
  onSelectMode: (mode: "global" | "local" | "workflow" | "execution" | "telemetry") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  activeFilterCount: number;
  onOpenSettings: () => void;
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
  onOpenSettings,
  totalNodes,
  totalEdges,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const modeOptions = [
    {
      id: "global" as const,
      label: "Global graph",
      description: "Relaciones completas del sistema logístico",
      icon: Globe2,
    },
    {
      id: "telemetry" as const,
      label: "Live Telemetry (WebSockets)",
      description: "Interacciones del agente en tiempo real con D3 Canvas",
      icon: Activity,
    },
    {
      id: "local" as const,
      label: "Local graph",
      description: "Subgrafo enfocado en el nodo activo (1-hop)",
      icon: Compass,
    },
    {
      id: "workflow" as const,
      label: "Workflow graph",
      description: "Agentes, herramientas y fuentes de datos",
      icon: GitFork,
    },
    {
      id: "execution" as const,
      label: "Execution graph",
      description: "Trazabilidad de órdenes, decisiones y HITL",
      icon: Activity,
    },
  ];

  const currentOption = modeOptions.find((m) => m.id === currentMode) || modeOptions[0];
  const CurrentIcon = currentOption.icon;

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="h-14 border-b border-[#14261c] bg-[#070c09] px-4 flex items-center justify-between gap-4 z-20 flex-shrink-0">
      {/* 1. Izquierda: Título y Selector de Modo de Grafo */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tracking-tight text-white hidden sm:inline-block">
          Graph
        </span>

        {/* Dropdown Selector tipo Obsidian */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1a13] border border-[#1d3a29] text-xs font-medium text-gray-200 hover:text-white hover:border-mint-600/70 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
          >
            <CurrentIcon className="w-3.5 h-3.5 text-mint-400" />
            <span className="font-semibold text-mint-200">{currentOption.label}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Menú Flotante */}
          {isDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-xl bg-[#0a140e] border border-[#1f422e] shadow-[0_12px_30px_rgba(0,0,0,0.7)] p-1.5 z-30">
              <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase text-gray-400 tracking-wider">
                Perspectiva de Visualización
              </div>
              <div className="space-y-1">
                {modeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = opt.id === currentMode;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        onSelectMode(opt.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? "bg-[#142d1e] text-mint-200 border border-mint-600/40"
                          : "hover:bg-[#0f1f16] text-gray-300"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          isSelected ? "text-mint-400" : "text-gray-500"
                        }`}
                      />
                      <div>
                        <p className="text-xs font-semibold">{opt.label}</p>
                        <p className="text-[11px] text-gray-400 leading-tight">
                          {opt.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Contador de Nodos y Relaciones */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0a130e] border border-[#16291e] text-[11px] font-mono text-gray-400">
          <span className="text-mint-400 font-semibold">{totalNodes}</span> nodos
          <span className="text-gray-600">•</span>
          <span className="text-emerald-400 font-semibold">{totalEdges}</span> conexiones
        </div>
      </div>

      {/* 2. Centro: Barra de Búsqueda Rápida */}
      <div className="flex-1 max-w-md relative">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar nodos, SKUs, agentes, herramientas..."
            className="w-full bg-[#0a130e] border border-[#193223] rounded-lg pl-9 pr-8 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-mint-500 focus:ring-1 focus:ring-mint-500 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 p-0.5 text-gray-500 hover:text-gray-300 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Derecha: Botones de Acción (Filtros y Ajustes) */}
      <div className="flex items-center gap-2">
        {/* Toggle Filtros */}
        <button
          onClick={onToggleFilter}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            isFilterOpen
              ? "bg-[#142e1f] text-mint-200 border-mint-500/70 shadow-[0_0_12px_rgba(34,197,94,0.2)]"
              : "bg-[#0b1610] text-gray-300 border-[#1a3123] hover:text-white hover:border-[#274b35]"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-mint-400" />
          <span>Filtros</span>
          {activeFilterCount > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-mint-950 text-mint-300 border border-mint-600">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Modal Ajustes */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg bg-[#0b1610] text-gray-400 hover:text-white border border-[#1a3123] hover:border-[#274b35] transition-all"
          title="Ajustes de Física y Visualización"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
