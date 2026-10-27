import React from "react";
import { NodeData, WorkflowObjective } from "../../types/workflow";
import { PREDEFINED_OBJECTIVES } from "../../data/mockData";
import { X, Sparkles, Database, Shield, Target, Sliders } from "lucide-react";

interface PropertiesPanelProps {
  selectedNode: NodeData;
  onClose: () => void;
  onUpdateProperties: (nodeId: string, updates: Partial<NodeData["properties"]>) => void;
  onOpenObjectives?: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedNode,
  onClose,
  onUpdateProperties,
  onOpenObjectives,
}) => {
  const isAgent = selectedNode.type === "agent";
  const isTrigger = selectedNode.type === "trigger";
  const props = selectedNode.properties || {};

  const currentObjective =
    PREDEFINED_OBJECTIVES.find((o) => o.id === props.objectiveId) ||
    PREDEFINED_OBJECTIVES[0];

  return (
    <aside className="w-80 border-l border-[#1a2e22] bg-[#090f0c] p-5 flex flex-col justify-between overflow-y-auto z-10 flex-shrink-0">
      <div className="space-y-5">
        {/* Header: Title, ID badge, Close button */}
        <div className="flex items-center justify-between pb-3 border-b border-[#17281f]">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-100">Properties</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102217] text-mint-400 border border-[#1b3a27]">
              ID: {selectedNode.id.slice(0, 12)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#122118] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TRIGGER NODE PROPERTIES (Base de Datos) */}
        {isTrigger && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#0e1813] border border-[#1b3425] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-mint-300">
                <Database className="w-4 h-4 text-mint-400" />
                <span>Conexión PostgreSQL</span>
              </div>
              <p className="text-xs text-gray-400">
                Conectado a la base de datos principal de Ferretería Industrial Santandereana.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                HOST / BASE DE DATOS
              </label>
              <input
                type="text"
                value={props.dbHost || "localhost:5432 / ai_back_office"}
                disabled
                className="w-full px-3 py-2 rounded-xl bg-[#0c1410] border border-[#1c3326] text-xs font-mono text-gray-300"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                TABLAS CONECTADAS
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="px-3 py-2 rounded-lg bg-[#0e1813] border border-[#1a3023] text-gray-300">
                  products (154)
                </div>
                <div className="px-3 py-2 rounded-lg bg-[#0e1813] border border-[#1a3023] text-gray-300">
                  suppliers (6)
                </div>
                <div className="px-3 py-2 rounded-lg bg-[#0e1813] border border-[#1a3023] text-gray-300">
                  warehouses (3)
                </div>
                <div className="px-3 py-2 rounded-lg bg-[#0e1813] border border-[#1a3023] text-gray-300">
                  orders (28)
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                className="w-full py-2 px-3 rounded-xl bg-[#112318] hover:bg-[#183523] border border-[#214730] text-xs font-semibold text-mint-300 transition-colors"
              >
                Recargar esquema de PostgreSQL
              </button>
            </div>
          </div>
        )}

        {/* AGENT NODE PROPERTIES */}
        {isAgent && (
          <div className="space-y-4">
            {/* NODE NAME */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                NODE NAME
              </label>
              <input
                type="text"
                value={props.nodeName || "AI Agent"}
                onChange={(e) =>
                  onUpdateProperties(selectedNode.id, { nodeName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#0c1410] border border-[#1e3828] focus:border-mint-500 focus:outline-none text-xs text-white"
              />
            </div>

            {/* OBJETIVO OPERATIVO ASIGNADO */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-mint-400 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  <span>OBJETIVO OPERATIVO</span>
                </label>
                <span className="text-[10px] font-mono text-gray-500 uppercase">{currentObjective.badge}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#0c1511] border border-[#1b3626] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-100">{currentObjective.title}</span>
                  <span className="w-2 h-2 rounded-full bg-mint-400"></span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {currentObjective.description}
                </p>
                <button
                  type="button"
                  onClick={onOpenObjectives}
                  className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-[#112318] hover:bg-[#193624] border border-[#1f422e] text-[11px] font-semibold text-mint-300 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Cambiar objetivo o directivas...</span>
                </button>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                DESCRIPTION / DIRECTIVA
              </label>
              <textarea
                rows={3}
                value={props.description || ""}
                onChange={(e) =>
                  onUpdateProperties(selectedNode.id, { description: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#0c1410] border border-[#1e3828] focus:border-mint-500 focus:outline-none text-xs text-gray-300 resize-none leading-relaxed"
              />
            </div>

            {/* CHAT MODEL */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                CHAT MODEL
              </label>
              <select
                value={props.model || "grok-4.6"}
                onChange={(e) =>
                  onUpdateProperties(selectedNode.id, { model: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#0c1410] border border-[#1e3828] text-xs text-white focus:outline-none focus:border-mint-500"
              >
                <option value="grok-4.6">Grok-4.6 (Recomendado)</option>
                <option value="grok-beta">Grok-Beta (Baja Latencia)</option>
                <option value="gpt-4o">GPT-4o (OpenAI)</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              </select>
            </div>

            {/* MAX ITERATIONS & MEMORY LIMIT */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                  Max Iterations
                </label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={props.maxIterations || 10}
                  onChange={(e) =>
                    onUpdateProperties(selectedNode.id, {
                      maxIterations: parseInt(e.target.value) || 10,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#0c1410] border border-[#1e3828] text-xs text-white focus:outline-none focus:border-mint-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                  Memory limit
                </label>
                <input
                  type="text"
                  value={props.memoryLimit || "50k tokens"}
                  disabled
                  className="w-full px-3 py-2 rounded-xl bg-[#0c1410] border border-[#1e3828] text-xs text-gray-400 font-mono"
                />
              </div>
            </div>

            {/* UMBRAL DE GOBERNANZA HITL */}
            <div className="p-3 rounded-xl bg-[#0f1d15] border border-[#1f422e] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-mint-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-mint-400" />
                  <span>Umbral HITL</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-mint-950 text-mint-400 border border-mint-500/40">
                  GOBERNANZA
                </span>
              </div>
              <p className="text-xs font-mono font-bold text-white">
                $5,000,000 COP
              </p>
              <p className="text-[10px] text-gray-400">
                Toda compra mayor es derivada automáticamente a la bandeja de decisiones para aprobación humana.
              </p>
            </div>
          </div>
        )}

        {/* ACTION NODE PROPERTIES */}
        {!isAgent && !isTrigger && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                ACCIÓN SELECCIONADA
              </label>
              <input
                type="text"
                value={selectedNode.label}
                disabled
                className="w-full px-3 py-2 rounded-xl bg-[#0c1410] border border-[#1e3828] text-xs font-bold text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                DESCRIPCIÓN DE IMPACTO
              </label>
              <p className="text-xs text-gray-300 leading-relaxed bg-[#0c1410] p-3 rounded-xl border border-[#1e3828]">
                {props.description || "Acción operativa conectada al flujo del agente."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-[#17281f] text-[11px] text-gray-500 font-mono flex items-center justify-between">
        <span>Mint Studio v2.4</span>
        <span className="text-mint-400">Ready</span>
      </div>
    </aside>
  );
};
