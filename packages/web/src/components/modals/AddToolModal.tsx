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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#090f0c] border border-[#1b3627] shadow-[0_0_50px_rgba(34,197,94,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="h-14 px-5 border-b border-[#16291e] flex items-center justify-between bg-[#0b140f]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-mint-400" />
            <h3 className="text-sm font-bold text-white">Gestionar Herramientas del Agente</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#122419] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2.5">
          {availableTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => onToggleTool(tool.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                tool.isActive
                  ? "bg-[#112419] border-mint-500/80 shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                  : "bg-[#0b130e] border-[#182e21] hover:border-[#224430]"
              }`}
            >
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-100">{tool.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#09150e] text-mint-400 border border-[#183624]">
                    {tool.category.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {tool.description}
                </p>
              </div>

              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  tool.isActive
                    ? "bg-mint-500 text-black shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                    : "border border-[#203c2b] text-gray-500"
                }`}
              >
                {tool.isActive ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-3.5 h-3.5" />}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="h-14 px-5 border-t border-[#16291e] flex items-center justify-between bg-[#0b140f]">
          <span className="text-xs text-gray-400 font-mono">
            {availableTools.filter((t) => t.isActive).length} herramientas habilitadas
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-mint-500 hover:bg-mint-400 text-black font-bold text-xs transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
