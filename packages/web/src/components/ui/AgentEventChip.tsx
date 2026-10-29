import React from "react";
import { Check } from "lucide-react";

export interface AgentEventChipProps {
  action: string;
  detail?: string;
  timeOrMetric?: string;
  className?: string;
  onClick?: () => void;
}

export const AgentEventChip: React.FC<AgentEventChipProps> = ({
  action,
  detail,
  timeOrMetric,
  className = "",
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-forest-surface/90 border border-forest-border hover:border-forest-borderBright transition-all shadow-subtle ${
        onClick ? "cursor-pointer hover:bg-forest-card" : ""
      } ${className}`}
    >
      {/* Icono de Check en cápsula verde esmeralda */}
      <span className="w-4 h-4 rounded-full bg-brand/15 text-brand border border-brand/30 flex items-center justify-center flex-shrink-0">
        <Check className="w-2.5 h-2.5 stroke-[2.5]" />
      </span>

      {/* Acción en lenguaje natural */}
      <span className="text-xs font-medium text-txt-primary">
        {action}
      </span>

      {/* Detalle / ID técnico en mono */}
      {detail && (
        <>
          <span className="text-txt-tertiary select-none">·</span>
          <span className="text-[11px] font-mono text-txt-secondary tabular-nums">
            {detail}
          </span>
        </>
      )}

      {/* Tiempo transcurrido o métrica */}
      {timeOrMetric && (
        <>
          <span className="text-txt-tertiary select-none">·</span>
          <span className="text-[11px] font-mono text-txt-tertiary tabular-nums">
            {timeOrMetric}
          </span>
        </>
      )}
    </div>
  );
};

