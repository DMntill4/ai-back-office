import React from "react";
import { AgentTool } from "../../types/workflow";
import { X, Layers, Check, Plus } from "lucide-react";

interface AddToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableTools: AgentTool[];
  onToggleTool: (toolId: string) => void;
}

export const AddToolModal: React.FC<AddToolModalProps> = ({
  isOpen,
  onClose,
  availableTools,
  onToggleTool,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#111915] border border-white/10 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.75)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="h-14 px-5 border-b border-white/[0.08] flex items-center justify-between bg-[#0B100E]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-[#F9FAFB]">Gestionar Herramientas del Agente</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2.5">
          {availableTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => onToggleTool(tool.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${tool.isActive
                  ? "bg-emerald-500/[0.08] border-emerald-500/50 shadow-[0_0_14px_rgba(16,185,129,0.12)]"
                  : "bg-[#0B100E] border-white/[0.08] hover:border-white/[0.16]"
                }`}
            >
              <div className="space-y-1 pr-4 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#F9FAFB]">{tool.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#0B100E] text-emerald-400 border border-emerald-500/25">
                    {tool.category.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {tool.description}
                </p>
              </div>

              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${tool.isActive
                    ? "bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    : "border border-white/[0.14] text-zinc-500"
                  }`}
              >
                {tool.isActive ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-3.5 h-3.5" />}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="h-14 px-5 border-t border-white/[0.08] flex items-center justify-between bg-[#0B100E]">
          <span className="text-xs text-zinc-400 font-mono tabular-numbers">
            {availableTools.filter((t) => t.isActive).length} herramientas habilitadas
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
