import React from "react";
import { ArrowUpRight, TrendingUp, TrendingDown, Layers, AlertCircle, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "motion/react";

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

export interface KpiMetric extends KpiCardItem { }

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
    <Sparkles key="0" className="w-4 h-4 text-brand" />,
    <Layers key="1" className="w-4 h-4 text-brand" />,
    <AlertCircle key="2" className="w-4 h-4 text-state-attention" />,
    <TrendingUp key="3" className="w-4 h-4 text-brand" />,
  ];

  return (
    <div className={`grid min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-2 ${className}`}>
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
            return defaultIcons[idx] || <Layers className="w-4 h-4 text-brand" />;
          }
          if (React.isValidElement(item.icon)) {
            return item.icon;
          }
          const IconComp = item.icon as React.ComponentType<{ className?: string }>;
          return <IconComp className="w-4 h-4 text-brand" />;
        };

        // CARD 1: HERO CARD (Donezo Style with Mint Guanábana Lime gradient)
        if (isHero) {
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut", delay: Math.min(idx, 5) * 0.025 }}
              className="min-w-0 bg-brand-surface rounded-container border border-brand/40 hover:border-brand p-base shadow-card flex flex-col justify-between relative overflow-hidden transition-all group"
            >
              <div className="flex items-start justify-between gap-compact mb-compact relative z-10">
                <span className="text-label font-medium text-brand font-sans">
                  {displayLabel || "Valorización de Inventario"}
                </span>

                <button
                  type="button"
                  onClick={item.onActionClick}
                  className="w-7 h-7 rounded-pill bg-raised hover:bg-border flex items-center justify-center text-primary transition-all flex-shrink-0 cursor-pointer"
                  title="Ver detalle"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>

              <div className="relative z-10 my-hairline">
                <span className="text-metric font-semibold text-primary font-sans tabular-nums block break-words">
                  {item.value}
                </span>
              </div>

              <div className="mt-base pt-compact border-t border-brand/20 relative z-10 flex flex-wrap items-center justify-between gap-compact text-caption">
                <span className="text-secondary text-caption leading-tight line-clamp-1">
                  {displayContext || "Capital activo consolidado en 3 sedes"}
                </span>

                {trendLabel && (
                  <span className="inline-flex items-center gap-hairline px-compact py-hairline rounded-pill text-caption font-semibold bg-raised text-brand font-sans flex-shrink-0">
                    <TrendingUp className="w-3 h-3 text-brand" />
                    {trendLabel}
                  </span>
                )}
              </div>
            </motion.div>
          );
        }

        // CARDS 2, 3, 4: SURFACE LEVEL 1
        const isWarning =
          item.trendType === "warning" ||
          trendDirection === "down";

        const trendColorClass = isWarning
          ? "bg-state-attention-surface text-state-attention border-state-attention/30"
          : trendDirection === "neutral"
            ? "bg-raised text-secondary border-border"
            : "bg-state-ok-surface text-state-ok border-state-ok/30";

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut", delay: Math.min(idx, 5) * 0.025 }}
            className="min-w-0 bg-panel rounded-container border border-border p-base shadow-card hover:border-border-strong transition-all flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between gap-compact mb-compact">
              <span className="text-label font-medium text-secondary font-sans">
                {displayLabel}
              </span>

              <div className="w-8 h-8 rounded-control bg-raised border border-border flex items-center justify-center flex-shrink-0">
                {renderIconElement()}
              </div>
            </div>

            <div className="my-hairline">
              <span className="text-metric font-semibold text-primary font-sans tabular-nums block break-words">
                {item.value}
              </span>
            </div>

            <div className="mt-base pt-compact border-t border-border flex flex-wrap items-center justify-between gap-compact text-caption">
              <span className="text-secondary text-caption leading-tight line-clamp-1 pr-compact">
                {displayContext}
              </span>

              {trendLabel && (
                <span
                  className={`inline-flex items-center gap-hairline px-compact py-hairline rounded-pill text-caption font-semibold border font-sans flex-shrink-0 ${trendColorClass}`}
                >
                  {isWarning ? (
                    <TrendingDown className="w-3 h-3 text-state-attention" />
                  ) : trendDirection === "neutral" ? (
                    <span className="w-1.5 h-1.5 rounded-pill bg-muted" />
                  ) : (
                    <TrendingUp className="w-3 h-3 text-state-ok" />
                  )}
                  {trendLabel}
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};