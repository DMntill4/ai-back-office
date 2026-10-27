import React, { useState } from "react";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { WorkflowCanvas } from "./components/canvas/WorkflowCanvas";
import { PropertiesPanel } from "./components/panels/PropertiesPanel";
import { CliTerminalPanel } from "./components/panels/CliTerminalPanel";
import { LiveLogsPanel } from "./components/panels/LiveLogsPanel";
import { HitlApprovalsView } from "./components/views/HitlApprovalsView";
import { ObjectivesView } from "./components/views/ObjectivesView";
import { HistoryView } from "./components/views/HistoryView";
import { SettingsView } from "./components/views/SettingsView";
import { KnowledgeGraphView } from "./components/views/KnowledgeGraphView";
import { MemoryVaultView } from "./components/views/MemoryVaultView";
import { StockInventoryView } from "./components/views/StockInventoryView";
import { AddToolModal } from "./components/modals/AddToolModal";

import {
  TabId,
  ModeTab,
  NodeData,
  AgentTool,
  LogStep,
  HitlDecision,
  WorkflowObjective,
} from "./types/workflow";
import {
  INITIAL_NODES,
  INITIAL_TOOLS,
  INITIAL_LOG_STEPS,
  INITIAL_HITL_DECISIONS,
} from "./data/mockData";
import { Activity, Terminal, Layers } from "lucide-react";

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabId>("workflows");
  const [currentMode, setCurrentMode] = useState<ModeTab>("editor");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Canvas Nodes & Tools State
  const [nodes, setNodes] = useState<NodeData[]>(INITIAL_NODES);
  const [tools, setTools] = useState<AgentTool[]>(INITIAL_TOOLS);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("node_main_agent");
  const [isToolModalOpen, setIsToolModalOpen] = useState<boolean>(false);

  // Operational State
  const [activeObjectiveId, setActiveObjectiveId] = useState<string>("obj_rop_audit");
  const [decisions, setDecisions] = useState<HitlDecision[]>(INITIAL_HITL_DECISIONS);
  const [logs, setLogs] = useState<LogStep[]>(INITIAL_LOG_STEPS);

  // Dock & Flyout States (Progressive Disclosure)
  const [isTerminalExpanded, setIsTerminalExpanded] = useState<boolean>(false);
  const [isLogsOpen, setIsLogsOpen] = useState<boolean>(false);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const pendingApprovalsCount = decisions.filter((d) => d.status === "pendiente").length;

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleToggleTool = (toolId: string) => {
    setTools((prev) =>
      prev.map((t) => (t.id === toolId ? { ...t, isActive: !t.isActive } : t))
    );
  };

  const handleUpdateNodeProperties = (
    nodeId: string,
    updates: Partial<NodeData["properties"]>
  ) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              properties: {
                ...n.properties,
                ...updates,
              },
            }
          : n
      )
    );
  };

  const handleSelectObjective = (obj: WorkflowObjective) => {
    setActiveObjectiveId(obj.id);
    handleUpdateNodeProperties("node_main_agent", {
      objectiveId: obj.id,
      description: obj.systemGoal,
      model: obj.recommendedModel,
      maxIterations: obj.defaultMaxIterations,
    });
    // Return to workflow canvas
    setCurrentTab("workflows");
  };

  const handleApproveDecision = (decisionId: string) => {
    setDecisions((prev) =>
      prev.map((d) =>
        d.id === decisionId ? { ...d, status: "aprobado" } : d
      )
    );
  };

  const handleRejectDecision = (decisionId: string) => {
    setDecisions((prev) =>
      prev.map((d) =>
        d.id === decisionId ? { ...d, status: "rechazado" } : d
      )
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#060a08] text-gray-100 font-sans">
      {/* 1. Left Sidebar Navigation (Organized by Operational Tasks) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingApprovalsCount={pendingApprovalsCount}
        onNewWorkflow={() => {
          setSelectedNodeId("node_main_agent");
          setCurrentTab("workflows");
        }}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header Bar */}
        <Header
          currentMode={currentMode}
          onSelectMode={setCurrentMode}
          isActive={isActive}
          onToggleActive={() => setIsActive(!isActive)}
          onSave={handleSave}
          isSaved={isSaved}
        />

        {/* View Switcher based on currentTab */}
        <div className="flex-1 flex overflow-hidden">
          {/* TAB 1: LIENZO OPERATIVO (WORKFLOW CANVAS & ORCHESTRATION) */}
          {currentTab === "workflows" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
              {/* Upper Canvas Workspace */}
              <div className="flex-1 flex overflow-hidden relative">
                {/* Visual Workflow Canvas */}
                <WorkflowCanvas
                  nodes={nodes}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={(id) => setSelectedNodeId(id)}
                  onAddToolClick={() => setIsToolModalOpen(true)}
                  onResetCanvas={() => setNodes(INITIAL_NODES)}
                  tools={tools}
                />

                {/* Right Properties Panel (Contextual & Clean) */}
                {selectedNode && (
                  <PropertiesPanel
                    selectedNode={selectedNode}
                    onClose={() => setSelectedNodeId(null)}
                    onUpdateProperties={handleUpdateNodeProperties}
                    onOpenObjectives={() => setCurrentTab("objectives")}
                  />
                )}
              </div>

              {/* Lower Section: Collapsible Terminal & Contextual Telemetry Dock */}
              <div className="border-t border-[#14261c] bg-[#070c09] p-2.5 z-20 flex-shrink-0 space-y-2">
                {/* Dock Status & Action Strip */}
                <div className="flex items-center justify-between gap-3">
                  {/* Collapsed or Expanded Terminal */}
                  <div className={`transition-all duration-200 ${isTerminalExpanded ? "w-full h-56" : "flex-1"}`}>
                    <CliTerminalPanel
                      isExpanded={isTerminalExpanded}
                      onToggleExpand={() => setIsTerminalExpanded(!isTerminalExpanded)}
                    />
                  </div>

                  {/* Telemetry Toggle Pill (When Terminal is Collapsed) */}
                  {!isTerminalExpanded && (
                    <button
                      onClick={() => setIsLogsOpen(!isLogsOpen)}
                      className={`h-11 px-3.5 rounded-xl border text-xs font-mono font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${
                        isLogsOpen
                          ? "bg-[#142e1f] text-mint-200 border-mint-500/70 shadow-[0_0_12px_rgba(34,197,94,0.2)]"
                          : "bg-[#0a120d] border-[#16271e] text-gray-400 hover:text-gray-200 hover:border-[#203c2b]"
                      }`}
                    >
                      <Activity className={`w-3.5 h-3.5 ${isLogsOpen ? "text-mint-400" : "text-gray-500"}`} />
                      <span>Telemetría en Vivo</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-mint-400 animate-pulse"></span>
                    </button>
                  )}
                </div>

                {/* Contextual Live Logs Drawer (Slides in when toggled) */}
                {isLogsOpen && (
                  <div className="h-56 animate-in slide-in-from-bottom-2 duration-150">
                    <LiveLogsPanel
                      logs={logs}
                      isOpen={isLogsOpen}
                      onClose={() => setIsLogsOpen(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: KNOWLEDGE GRAPH (MAPA DE CONOCIMIENTO OPERATIVO TIPO OBSIDIAN) */}
          {currentTab === "graph" && (
            <KnowledgeGraphView
              onNavigateToHitl={() => setCurrentTab("inbox")}
            />
          )}

          {/* TAB: BÓVEDA DE MEMORIA (OBSIDIAN VAULT - mint memory) */}
          {currentTab === "memory" && <MemoryVaultView />}

          {/* TAB: INVENTARIO & BODEGAS (STOCK & ROP - mint stock) */}
          {currentTab === "stock" && (
            <StockInventoryView
              onNavigateToInbox={() => setCurrentTab("inbox")}
            />
          )}

          {/* TAB 2: BANDEJA HITL (HUMAN-IN-THE-LOOP APPROVALS INBOX - mint inbox) */}
          {currentTab === "inbox" && (
            <HitlApprovalsView
              decisions={decisions}
              onApproveDecision={handleApproveDecision}
              onRejectDecision={handleRejectDecision}
            />
          )}

          {/* TAB 3: OBJETIVOS & POLÍTICAS (OPERATIONAL DIRECTIVES) */}
          {currentTab === "objectives" && (
            <ObjectivesView
              activeObjectiveId={activeObjectiveId}
              onSelectObjective={handleSelectObjective}
            />
          )}

          {/* TAB 4: AUDITORÍA & TRAZABILIDAD (HISTORY) */}
          {currentTab === "history" && <HistoryView />}

          {/* TAB 5: CONFIGURACIÓN SUMINISTROS (SETTINGS & WAREHOUSES) */}
          {currentTab === "settings" && <SettingsView />}
        </div>
      </div>

      {/* 3. Manage Tools Modal */}
      <AddToolModal
        isOpen={isToolModalOpen}
        onClose={() => setIsToolModalOpen(false)}
        availableTools={tools}
        onToggleTool={handleToggleTool}
      />
    </div>
  );
};
export default App;
