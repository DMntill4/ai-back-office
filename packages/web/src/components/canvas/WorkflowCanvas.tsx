import React from "react";
import { NodeData, AgentTool } from "../../types/workflow";
import {
  Database,
  Bot,
  Zap,
  CheckCircle2,
  Bell,
  FileSpreadsheet,
  Plus,
  Maximize2,
  RotateCcw,
  Trash2,
  Layers,
  Sparkles,
  Target,
} from "lucide-react";

interface WorkflowCanvasProps {
  nodes: NodeData[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onAddToolClick: () => void;
  onResetCanvas: () => void;
  tools: AgentTool[];
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onAddToolClick,
  onResetCanvas,
  tools,
}) => {
  const triggerNode = nodes.find((n) => n.type === "trigger") || nodes[0];
  const agentNode = nodes.find((n) => n.type === "agent") || nodes[1];
  const actionNodes = nodes.filter((n) => n.type === "action");

  // Output port coordinates of trigger node
  const triggerPort = { x: 310, y: 220 };

  // Input port of main agent node
  const agentInputPort = { x: 380, y: 220 };

  // Output port of main agent node (branches into action nodes)
  const agentOutputPort = { x: 670, y: 220 };

  // Action node input ports
  const actionInputPorts = [
    { x: 750, y: 95 },
    { x: 750, y: 205 },
    { x: 750, y: 315 },
  ];

  return (
    <div className="relative flex-1 h-full w-full overflow-hidden canvas-dot-grid flex items-center justify-center p-8 select-none">
      {/* SVG Connecting Cables */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
          <linearGradient id="activeCableGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>

        {/* Cable: Trigger -> Main Agent (Active sync line) */}
        <path
          d={`M ${triggerPort.x} ${triggerPort.y} C ${triggerPort.x + 35} ${triggerPort.y}, ${
            agentInputPort.x - 35
          } ${agentInputPort.y}, ${agentInputPort.x} ${agentInputPort.y}`}
          stroke="url(#activeCableGrad)"
          strokeWidth="2"
          fill="none"
          className="connector-flow"
        />

        {/* Cables: Main Agent -> Action Nodes (Resting quiet lines) */}
        {actionInputPorts.map((target, idx) => (
          <path
            key={`cable-agent-action-${idx}`}
            d={`M ${agentOutputPort.x} ${agentOutputPort.y} C ${agentOutputPort.x + 40} ${
              agentOutputPort.y
            }, ${target.x - 40} ${target.y}, ${target.x} ${target.y}`}
            stroke={idx === 1 ? "url(#activeCableGrad)" : "#1b3425"}
            strokeWidth="1.75"
            fill="none"
            className={idx === 1 ? "connector-flow" : ""}
          />
        ))}
      </svg>

      {/* Nodes Container */}
      <div className="relative w-[1040px] h-[450px] pointer-events-auto">
        {/* NODE 1: Trigger Node (PostgreSQL Database) */}
        {triggerNode && (
          <div
            onClick={() => onSelectNode(triggerNode.id)}
            style={{ left: "80px", top: "175px" }}
            className={`absolute w-[230px] p-3.5 rounded-xl bg-[#0c1410] border transition-all cursor-pointer shadow-md ${
              selectedNodeId === triggerNode.id
                ? "border-mint-500/80 ring-1 ring-mint-400/40"
                : "border-[#182c20] hover:border-[#274835]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#102418] text-mint-400 border border-[#1b3d27]">
                TRIGGER
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-mint-500"></span>
                <span>Postgres</span>
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#112017] text-mint-400 flex-shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-gray-100 truncate">
                  PostgreSQL Central
                </h4>
                <p className="text-[11px] font-mono text-gray-500 truncate">
                  15 tablas • Santander
                </p>
              </div>
            </div>

            {/* Output Port */}
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0c1410] border border-mint-500"></div>
          </div>
        )}

        {/* NODE 2: Main Agent Node (AI Agent) */}
        {agentNode && (
          <div
            onClick={() => onSelectNode(agentNode.id)}
            style={{ left: "380px", top: "105px" }}
            className={`absolute w-[290px] p-4 rounded-xl bg-[#0b130e] border transition-all cursor-pointer shadow-lg ${
              agentNode.status === "running"
                ? "border-mint-500 shadow-[0_0_20px_rgba(34,197,94,0.25)] ring-1 ring-mint-400/50"
                : selectedNodeId === agentNode.id
                ? "border-mint-500/80 ring-1 ring-mint-400/30"
                : "border-[#1a3325] hover:border-[#284f39]"
            }`}
          >
            {/* Input Port */}
            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0b130e] border border-mint-500"></div>

            {/* Header: Name + Badge + State */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-[#12281b] text-mint-400">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-white tracking-tight">
                  Mint Coordinator
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-mint-950 text-mint-400 border border-mint-500/40">
                  MAIN
                </span>
                <span className="w-2 h-2 rounded-full bg-mint-500 animate-pulse"></span>
              </div>
            </div>

            {/* Compact Objective pill */}
            <div className="px-2.5 py-1.5 rounded-lg bg-[#0e1a13] border border-[#183323] mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-300 font-medium truncate">
                <Target className="w-3 h-3 text-mint-400 flex-shrink-0" />
                <span className="truncate">Auditoría ROP & Abastecimiento</span>
              </div>
              <span className="text-[9px] font-mono text-mint-400">grok-4.6</span>
            </div>

            {/* Active Tools List (Compact Chips) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                <span>HERRAMIENTAS ACTIVAS</span>
                <span className="text-mint-400">4 de {tools.length}</span>
              </div>

              <div className="space-y-1">
                {tools.slice(0, 3).map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0f1b14] border border-[#162d1f] text-[11px] text-gray-300"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-mint-500"></span>
                    <span className="truncate">{tool.name}</span>
                  </div>
                ))}
              </div>

              {/* Add Tool Trigger */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToolClick();
                }}
                className="w-full mt-2 py-1 px-2 rounded-md border border-dashed border-[#1f3d2b] hover:border-mint-400 text-[10px] font-mono text-mint-400 hover:text-white bg-[#0a140f] hover:bg-[#122419] transition-all flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Gestionar herramientas...</span>
              </button>
            </div>

            {/* Output Port */}
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0b130e] border border-mint-500"></div>
          </div>
        )}

        {/* ACTION NODES on the Right */}
        {actionNodes.map((action, idx) => {
          const icons = [CheckCircle2, Bell, FileSpreadsheet];
          const Icon = icons[idx % icons.length];
          const topPosition = 65 + idx * 110;
          const isSelected = selectedNodeId === action.id;

          return (
            <div
              key={action.id}
              onClick={() => onSelectNode(action.id)}
              style={{ left: "750px", top: `${topPosition}px` }}
              className={`absolute w-[230px] p-3 rounded-xl bg-[#0c1410] border transition-all cursor-pointer shadow-md ${
                isSelected
                  ? "border-mint-500/80 ring-1 ring-mint-400/40"
                  : "border-[#182c20] hover:border-[#274835]"
              }`}
            >
              {/* Input Port */}
              <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0c1410] border border-[#274f38]"></div>

              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#102418] text-mint-400 border border-[#1b3d27]">
                  ACTION
                </span>
                <span className="text-[10px] font-mono text-gray-500">
                  {idx === 1 ? "HITL ACTIVO" : "Auto"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#112017] text-mint-400 flex-shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold text-gray-100 truncate">
                    {action.label}
                  </h4>
                  <p className="text-[10px] font-mono text-gray-400 truncate">
                    {action.sublabel}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Canvas Controls (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 flex items-center gap-1 p-1 rounded-lg bg-[#0a120d]/80 backdrop-blur-md border border-[#1a3023] shadow-md z-10">
        <button
          title="Fullscreen"
          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#122118] transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          title="Undo"
          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#122118] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onResetCanvas}
          title="Reset"
          className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-[#122118] transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
