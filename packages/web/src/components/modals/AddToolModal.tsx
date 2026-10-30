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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-base">
      <div className="w-full max-w-lg rounded-container bg-panel border border-border shadow-dialog overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="h-14 px-base border-b border-border flex items-center justify-between bg-raised">
          <div className="flex items-center gap-compact">
            <Layers className="w-4 h-4 text-brand" />
            <h3 className="text-label font-semibold text-primary">Gestionar Herramientas del Agente</h3>
          </div>
          <button
            onClick={onClose}
            className="p-hairline rounded-control text-secondary hover:text-primary hover:bg-panel transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-base max-h-[60vh] overflow-y-auto custom-scrollbar space-y-compact">
          {availableTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => onToggleTool(tool.id)}
              className={`p-compact rounded-control border cursor-pointer transition-all flex items-center justify-between ${tool.isActive
                ? "bg-brand-surface border-brand/40 shadow-card"
                : "bg-raised border-border hover:border-border-strong"
                }`}
            >
              <div className="space-y-hairline pr-base min-w-0">
                <div className="flex items-center gap-compact">
                  <span className="text-label font-semibold text-primary">{tool.name}</span>
                  <span className="text-caption font-mono px-compact py-hairline rounded-control bg-panel text-brand border border-brand/40">
                    {tool.category}
                  </span>
                </div>
                <p className="text-caption text-secondary leading-relaxed">
                  {tool.description}
                </p>
              </div>

              <div
                className={`w-6 h-6 rounded-control flex items-center justify-center flex-shrink-0 transition-colors ${tool.isActive
                  ? "bg-brand text-canvas shadow-card"
                  : "border border-border text-muted"
                  }`}
              >
                {tool.isActive ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-3.5 h-3.5" />}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="h-14 px-base border-t border-border flex items-center justify-between bg-raised">
          <span className="text-label text-secondary font-mono tabular-numbers">
            {availableTools.filter((t) => t.isActive).length} herramientas habilitadas
          </span>
          <button
            onClick={onClose}
            className="px-base py-hairline rounded-control bg-brand hover:bg-brand text-canvas font-semibold text-label transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
