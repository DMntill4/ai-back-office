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
      className={`px-3.5 py-3 rounded-lg border transition-all flex items-center justify-between gap-4 ${
        selected
          ? "bg-forest-surface border-brand/50 shadow-subtle"
          : "bg-forest-card/50 border-forest-border hover:bg-forest-card hover:border-forest-borderBright"
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <span className="text-txt-tertiary flex-shrink-0 flex items-center">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-txt-primary truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-[11px] text-txt-tertiary truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {meta && (
          <div className="text-[11px] font-mono text-txt-secondary tabular-nums">
            {meta}
          </div>
        )}
        {statusBadge}
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>
    </div>
  );
};

