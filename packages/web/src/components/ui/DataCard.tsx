import React from "react";
import { StatusBadge, OperationalStatus } from "./StatusBadge";

export interface DataCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status?: OperationalStatus;
  statusLabel?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const DataCard: React.FC<DataCardProps> = ({
  title,
  value,
  subtitle,
  status,
  statusLabel,
  badge,
  icon,
  className = "",
}) => {
  return (
    <div
      className={`p-4 rounded-xl bg-forest-card border border-forest-border shadow-subtle flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-xs font-medium text-txt-secondary leading-tight">
          {title}
        </span>
        {icon && <span className="text-txt-tertiary flex-shrink-0">{icon}</span>}
      </div>

      <div className="flex items-baseline gap-2 my-1">
        <span className="text-xl font-semibold font-mono tracking-tight text-txt-primary tabular-nums">
          {value}
        </span>
      </div>

      {(subtitle || status || badge) && (
        <div className="mt-2 pt-2 border-t border-forest-border/60 flex items-center justify-between text-[11px] text-txt-tertiary">
          {subtitle && <span>{subtitle}</span>}
          {status && (
            <StatusBadge status={status} label={statusLabel} size="sm" />
          )}
          {badge}
        </div>
      )}
    </div>
  );
};

