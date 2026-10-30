import React from "react";
import { CheckCircle2 } from "lucide-react";

export interface AgentEventChipProps {
  action: string;
  reference?: string;
  detail?: string;
  timeAgo?: string;
  timeOrMetric?: string;
  className?: string;
  onClick?: () => void;
}

export const AgentEventChip: React.FC<AgentEventChipProps> = ({
  action,
  reference,
  detail,
  timeAgo,
  timeOrMetric,
  className = "",
  onClick,
}) => {
  const refText = reference || detail || "";
  const timeText = timeAgo || timeOrMetric || "";

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-raised border border-border text-caption text-secondary ${
        onClick ? "cursor-pointer hover:border-strong transition-colors" : ""
      } ${className}`}
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-brand flex-shrink-0" />
      <span className="text-primary font-medium">{action}</span>
      {refText && (
        <>
          <span className="text-muted">·</span>
          <span className="font-mono text-caption text-primary">{refText}</span>
        </>
      )}
      {timeText && (
        <>
          <span className="text-muted">·</span>
          <span className="text-muted">{timeText}</span>
        </>
      )}
    </div>
  );
};
