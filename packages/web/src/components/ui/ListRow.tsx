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
      className={`px-4 py-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
        selected
          ? "bg-[#16221D] border-emerald-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.3)] ring-1 ring-emerald-500/20"
          : "bg-surface-1 border-white/[0.06] hover:bg-[#16211C] hover:border-white/10 shadow-sm"
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-[#0B110E] border border-white/[0.04] flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-inner">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-[11px] text-txt-secondary truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3.5 flex-shrink-0">
        {meta && (
          <div className="text-[11px] font-mono text-txt-secondary tabular-nums">
            {meta}
          </div>
        )}
        {statusBadge}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};
