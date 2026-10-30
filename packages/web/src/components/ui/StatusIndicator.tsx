import React from "react";

export type OperationalStatus = "ok" | "attention" | "error" | "pending" | "progress";

export interface StatusIndicatorProps {
  status: OperationalStatus;
  label: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  OperationalStatus,
  { symbol: string; textClass: string; bgClass: string; borderClass: string }
> = {
  ok: {
    symbol: "●",
    textClass: "text-state-ok",
    bgClass: "bg-state-ok-surface",
    borderClass: "border-state-ok/25",
  },
  attention: {
    symbol: "▲",
    textClass: "text-state-attention",
    bgClass: "bg-state-attention-surface",
    borderClass: "border-state-attention/25",
  },
  error: {
    symbol: "■",
    textClass: "text-state-error",
    bgClass: "bg-state-error-surface",
    borderClass: "border-state-error/25",
  },
  pending: {
    symbol: "◆",
    textClass: "text-state-pending",
    bgClass: "bg-state-pending-surface",
    borderClass: "border-state-pending/25",
  },
  progress: {
    symbol: "◌",
    textClass: "text-state-progress",
    bgClass: "bg-state-progress-surface",
    borderClass: "border-state-progress/25",
  },
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  className = "",
}) => {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-caption font-medium border whitespace-nowrap shrink-0 ${config.textClass} ${config.bgClass} ${config.borderClass} ${className}`}
    >
      <span className="font-bold text-caption select-none">{config.symbol}</span>
      <span>{label}</span>
    </span>
  );
};

