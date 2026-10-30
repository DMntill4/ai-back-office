import React from "react";
import { ArrowUpRight, TrendingUp, TrendingDown, Layers, AlertCircle, ShieldCheck, Sparkles } from "lucide-react";

export interface KpiCardItem {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  context?: string;
  isHighlight?: boolean;
  isHero?: boolean;
  trend?: string | { direction: "up" | "down" | "neutral"; label: string };
  trendType?: "up" | "down" | "neutral" | "warning";
  icon?: any;
  onActionClick?: () => void;
}

export interface KpiMetric extends KpiCardItem {}

export interface KpiStripProps {
  metrics?: KpiCardItem[];
  items?: KpiCardItem[];
  className?: string;
}

export const KpiStrip: React.FC<KpiStripProps> = ({
  metrics,
  items,
  className = "",
}) => {
  const cardList = items || metrics;
  if (!cardList || cardList.length === 0) return null;

  // Default icons if none passed
  const defaultIcons = [
    <Sparkles key="0" className="w-4 h-4 text-lime-300" />,
    <Layers key="1" className="w-4 h-4 text-emerald-400" />,
    <AlertCircle key="2" className="w-4 h-4 text-amber-400" />,
    <TrendingUp key="3" className="w-4 h-4 text-emerald-400" />,
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-2 ${className}`}>
      {cardList.map((item, idx) => {
        const isHero = item.isHero !== undefined ? item.isHero : idx === 0;
        const displayLabel = item.title || item.label || "";
        const displayContext = item.subtitle || item.context || "";

        const trendLabel =
          typeof item.trend === "string"
            ? item.trend
            : item.trend?.label;

        const trendDirection =
          typeof item.trend === "object" ? item.trend.direction : undefined;

        // Render Icon
        const renderIconElement = () => {
          if (!item.icon) {
            return defaultIcons[idx] || <Layers className="w-4 h-4 text-emerald-400" />;
          }
          if (React.isValidElement(item.icon)) {
            return item.icon;
          }
          const IconComp = item.icon as React.ComponentType<{ className?: string }>;
          return <IconComp className="w-4 h-4 text-emerald-400" />;
        };

        // CARD 1: HERO CARD (Donezo Style with Mint Guanábana Lime gradient)
        if (isHero) {
          return (
            <div
              key={idx}
              className="bg-gradient-to-br from-[#0B5C43] via-[#084230] to-[#05281D] rounded-2xl border border-emerald-400/25 hover:border-lime-400/40 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col justify-between relative overflow-hidden transition-all group"
            >
              {/* Sutil halo lima insignia de Mint */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,rgba(163,230,53,0.18),transparent_70%)] pointer-events-none" />

              <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
                <span className="text-xs font-medium text-emerald-100/90 font-sans">
                  {displayLabel || "Valorización de Inventario"}
                </span>

                <button
                  type="button"
                  onClick={item.onActionClick}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all shadow-sm flex-shrink-0 cursor-pointer"
                  title="Ver detalle"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>

              <div className="relative z-10 my-1">
                <span className="text-3xl font-extrabold tracking-tight text-white font-sans tabular-nums block">
                  {item.value}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-400/15 relative z-10 flex items-center justify-between text-xs">
                <span className="text-emerald-100/80 text-[11px] leading-tight line-clamp-1">
                  {displayContext || "Capital activo consolidado en 3 sedes"}
                </span>

                {trendLabel && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-lime-300 font-sans flex-shrink-0">
                    <TrendingUp className="w-3 h-3 text-lime-400" />
                    {trendLabel}
                  </span>
                )}
              </div>
            </div>
          );
        }

        // CARDS 2, 3, 4: SURFACE LEVEL 1
        const isWarning =
          item.trendType === "warning" ||
          trendDirection === "down";

        const trendColorClass = isWarning
          ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
          : trendDirection === "neutral"
          ? "bg-white/[0.04] text-zinc-300 border-white/[0.08]"
          : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";

        return (
          <div
            key={idx}
            className="bg-surface-1 rounded-2xl border border-white/[0.06] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:border-white/10 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="text-xs font-medium text-zinc-400 font-sans">
                {displayLabel}
              </span>

              <div className="w-8 h-8 rounded-xl bg-surface-well border border-white/[0.04] flex items-center justify-center flex-shrink-0 shadow-inner">
                {renderIconElement()}
              </div>
            </div>

            <div className="my-1">
              <span className="text-3xl font-extrabold tracking-tight text-white font-sans tabular-nums block">
                {item.value}
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-zinc-400 text-[11px] leading-tight line-clamp-1 pr-2">
                {displayContext}
              </span>

              {trendLabel && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border font-sans flex-shrink-0 ${trendColorClass}`}
                >
                  {isWarning ? (
                    <TrendingDown className="w-3 h-3 text-amber-400" />
                  ) : trendDirection === "neutral" ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  ) : (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  )}
                  {trendLabel}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};