import React, { useState, useMemo } from "react";
import {
  MintNodeType,
  MintRelationType,
  GraphPhysicsSettings,
} from "../../types/graph";
import {
  RAW_MINT_NODES,
  RAW_MINT_EDGES,
  filterGraphData,
} from "../../data/graphData";
import { GraphTopBar } from "../graph/GraphTopBar";
import { KnowledgeGraphCanvas } from "../graph/KnowledgeGraphCanvas";
import { GraphFilterDrawer } from "../graph/GraphFilterDrawer";
import { GraphInspectorDrawer } from "../graph/GraphInspectorDrawer";
import { GraphSettingsModal } from "../graph/GraphSettingsModal";
import { LiveObsidianGraph } from "../graph/LiveObsidianGraph";

const ALL_NODE_TYPES: MintNodeType[] = [
  "agent",
  "tool",
  "database",
  "warehouse",
  "sku",
  "supplier",
  "decision",
  "purchase_order",
  "execution",
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

const DEFAULT_PHYSICS: GraphPhysicsSettings = {
  repulsion: 450,
  springLength: 115,
  gravity: 0.038,
  damping: 0.88,
  showAllLabels: false,
  showGrid: true,
};

interface KnowledgeGraphViewProps {
  onNavigateToHitl?: () => void;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  onNavigateToHitl,
}) => {
  // Estados de Vista y Modo (por defecto en Telemetría en Vivo)
  const [mode, setMode] = useState<"global" | "local" | "workflow" | "execution" | "telemetry">("telemetry");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("agent_coordinator");
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  // Filtros
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<MintNodeType[]>(ALL_NODE_TYPES);
  const [selectedRelationTypes, setSelectedRelationTypes] = useState<MintRelationType[]>(ALL_RELATIONS);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Ajustes de Física
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [physicsSettings, setPhysicsSettings] = useState<GraphPhysicsSettings>(DEFAULT_PHYSICS);

  // Proyección de datos filtrados
  const graphData = useMemo(() => {
    return filterGraphData(RAW_MINT_NODES, RAW_MINT_EDGES, {
      mode: mode === "telemetry" ? "global" : mode,
      focusNodeId: selectedNodeId || undefined,
      nodeTypes: selectedNodeTypes.length === ALL_NODE_TYPES.length ? undefined : selectedNodeTypes,
      relationTypes: selectedRelationTypes.length === ALL_RELATIONS.length ? undefined : selectedRelationTypes,
      searchQuery,
    });
  }, [mode, selectedNodeId, selectedNodeTypes, selectedRelationTypes, searchQuery]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return RAW_MINT_NODES.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId]);

  // Manejadores de Filtros
  const handleToggleNodeType = (type: MintNodeType) => {
    setSelectedNodeTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleToggleRelationType = (rel: MintRelationType) => {
    setSelectedRelationTypes((prev) =>
      prev.includes(rel) ? prev.filter((r) => r !== rel) : [...prev, rel]
    );
  };

  const handleResetFilters = () => {
    setSelectedNodeTypes(ALL_NODE_TYPES);
    setSelectedRelationTypes(ALL_RELATIONS);
    setSearchQuery("");
  };

  const handleSelectAll = () => {
    setSelectedNodeTypes(ALL_NODE_TYPES);
    setSelectedRelationTypes(ALL_RELATIONS);
  };

  const activeFilterCount =
    (ALL_NODE_TYPES.length - selectedNodeTypes.length) +
    (ALL_RELATIONS.length - selectedRelationTypes.length);

  // Centrar cámara en nodo
  const handleCenterNode = (nodeId: string) => {
    setFocusNodeId(nodeId);
    setTimeout(() => setFocusNodeId(null), 500);
  };

  // Cambiar a vista local
  const handleSwitchToLocalMode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setMode("local");
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative bg-[#060a08]">
      {/* 1. Barra Superior Obsidian-style */}
      <GraphTopBar
        currentMode={mode}
        onSelectMode={(newMode) => {
          setMode(newMode);
          if (newMode === "local" && !selectedNodeId) {
            setSelectedNodeId("agent_coordinator");
          }
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
        activeFilterCount={activeFilterCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
        totalNodes={graphData.nodes.length}
        totalEdges={graphData.edges.length}
      />

      {/* 2. Área Central: Telemetría en Vivo (WebSockets) o Topología de Conocimiento */}
      {mode === "telemetry" ? (
        <div className="flex-1 relative overflow-hidden">
          <LiveObsidianGraph />
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          <KnowledgeGraphCanvas
            nodes={graphData.nodes}
            edges={graphData.edges}
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => setSelectedNodeId(id)}
            physicsSettings={physicsSettings}
            focusNodeId={focusNodeId}
          />

          {/* 3. Panel de Filtros Plegable */}
          <GraphFilterDrawer
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            selectedNodeTypes={selectedNodeTypes}
            onToggleNodeType={handleToggleNodeType}
            selectedRelationTypes={selectedRelationTypes}
            onToggleRelationType={handleToggleRelationType}
            onResetFilters={handleResetFilters}
            onSelectAll={handleSelectAll}
          />

          {/* 4. Inspector Contextual de Nodo Seleccionado */}
          {selectedNode && (
            <GraphInspectorDrawer
              selectedNode={selectedNode}
              allNodes={RAW_MINT_NODES}
              edges={RAW_MINT_EDGES}
              onClose={() => setSelectedNodeId(null)}
              onSelectNode={(id) => {
                setSelectedNodeId(id);
                handleCenterNode(id);
              }}
              onCenterNode={handleCenterNode}
              onSwitchToLocalMode={handleSwitchToLocalMode}
              onNavigateToHitl={onNavigateToHitl}
            />
          )}
        </div>
      )}

      {/* 5. Modal de Ajustes */}
      <GraphSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={physicsSettings}
        onUpdateSettings={(updates) =>
          setPhysicsSettings((prev) => ({ ...prev, ...updates }))
        }
        onResetDefaults={() => setPhysicsSettings(DEFAULT_PHYSICS)}
      />
    </div>
  );
};
export default KnowledgeGraphView;
