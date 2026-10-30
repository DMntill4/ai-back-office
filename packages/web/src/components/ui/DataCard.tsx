import React from "react";
import { StatusBadge, OperationalStatus } from "./StatusBadge";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface DataCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  context?: string;
  isHero?: boolean;
  status?: OperationalStatus;
  statusLabel?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: string | { direction?: "up" | "down" | "neutral" | "warning"; label: string };
  trendType?: "up" | "down" | "neutral" | "warning";
  wellContent?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const DataCard: React.FC<DataCardProps> = ({
  title,
  value,
  subtitle,
  context,
  isHero = false,
  status,
  statusLabel,
  badge,
  icon,
  trend,
  trendType = "up",
  wellContent,
  className = "",
  onClick,
}) => {
  const displaySubtitle = subtitle || context;
  const trendLabel = typeof trend === "object" && trend !== null ? trend.label : trend;
  const effectiveTrendType =
    typeof trend === "object" && trend !== null && trend.direction ? trend.direction : trendType;

  const cardBg = isHero
    ? "bg-hero-emerald text-white border-emerald-400/25 shadow-[0_8px_30px_rgba(13,104,77,0.35)]"
    : "bg-surface-1 border-white/[0.06] shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:border-white/10";

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${cardBg} ${onClick ? "cursor-pointer" : ""
        } ${className}`}
    >
      <div>
        {/* Header row: title and framed icon */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <span
            className={`text-label font-semibold font-sans ${isHero ? "text-brand" : "text-secondary"
              }`}
          >
            {title}
          </span>
          {icon && (
            <div
              className={`w-9 h-9 rounded-control flex items-center justify-center flex-shrink-0 ${isHero
                ? "bg-raised text-primary border border-border"
                : "bg-raised border border-border text-brand"
                }`}
            >
              {icon}
            </div>
          )}
        </div>

        {/* Main numeric value */}
        <div className="flex items-baseline gap-2 my-1">
          <span className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-white tabular-nums">
            {value}
          </span>
        </div>

        {/* Optional well container (Sub-caja interna estilo Inventar) */}
        {wellContent && (
          <div
            className={`mt-3 rounded-xl p-3 border shadow-inner ${isHero
              ? "bg-black/25 border-white/[0.08]"
              : "bg-surface-well border-white/[0.04]"
              }`}
          >
            {wellContent}
          </div>
        )}
      </div>

      {/* Footer row: subtitle, trend badge, or status */}
      {(displaySubtitle || status || badge || trendLabel) && (
        <div
          className={`mt-hairline pt-hairline border-t flex items-center justify-between text-label ${isHero ? "border-brand/20 text-brand" : "border-border text-secondary"
            }`}
        >
          <div className="truncate pr-2">
            {displaySubtitle && (
              <span className="text-caption leading-tight opacity-90">{displaySubtitle}</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {trendLabel && (
              <span
                className={`inline-flex items-center gap-1 px-compact py-hairline rounded-pill text-caption font-semibold border font-mono ${effectiveTrendType === "down" || effectiveTrendType === "warning"
                  ? "bg-state-attention-surface text-state-attention border-state-attention/30"
                  : isHero
                    ? "bg-raised text-primary border-border"
                    : "bg-state-ok-surface text-state-ok border-state-ok/30"
                  }`}
              >
                {effectiveTrendType === "down" ? (
                  <TrendingDown className="w-3 h-3 text-state-attention" />
                ) : (
                  <TrendingUp className="w-3 h-3 text-state-ok" />
                )}
                <span>{trendLabel}</span>
              </span>
            )}

            {status && <StatusBadge status={status} label={statusLabel} size="sm" />}
            {badge}
          </div>
        </div>
      )}
    </div>
  );
};
