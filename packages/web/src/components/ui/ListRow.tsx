import React from "react";

export interface ListRowProps {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  statusBadge?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  meta,
  statusBadge,
  actions,
  icon,
  onClick,
  selected = false,
  className = "",
}) => {
  return (
    <div
      onClick={onClick}
      className={`px-compact py-compact rounded-control border transition-all flex items-center justify-between gap-base ${selected
        ? "bg-brand-surface border-brand/40 ring-1 ring-brand/20"
        : "bg-panel border-border hover:bg-raised hover:border-border-strong"
        } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      <div className="flex items-center gap-compact min-w-0">
        {icon && (
          <div className="w-9 h-9 rounded-control bg-raised border border-border flex items-center justify-center text-brand flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-label font-semibold text-primary truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-caption text-secondary truncate mt-hairline">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3.5 flex-shrink-0">
        {meta && (
          <div className="text-caption font-mono text-secondary tabular-nums">
            {meta}
          </div>
        )}
        {statusBadge}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};
