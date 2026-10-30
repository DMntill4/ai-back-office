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

// Sanitiza nombres de funciones a lenguaje de negocio limpio
const sanitizeBusinessText = (text?: string): string => {
  if (!text) return "";
  return text
    .replace(/fn:\s*[a-zA-Z_]+/gi, "")
    .replace(/verificarFrescuraDatos\(\)/gi, "Sincronización de existencias")
    .replace(/inventario_rop/gi, "Monitoreo de reorden")
    .replace(/dataHealthService/gi, "Salud del catálogo")
    .replace(/proactiveMonitor/gi, "Vigilancia de flujo")
    .replace(/auditarAnomalias/gi, "Auditoría operacional")
    .trim();
};

export const KpiStrip: React.FC<KpiStripProps> = ({
  metrics,
  items,
  className = "",
}) => {
  const cardList = items || metrics;
  if (!cardList || cardList.length === 0) return null;

  // Default icons for cards 2, 3, 4 if not passed
  const defaultIcons = [
    <Sparkles key="0" className="w-4 h-4 text-white" />,
    <Layers key="1" className="w-4 h-4 text-emerald-400" />,
    <AlertCircle key="2" className="w-4 h-4 text-amber-400" />,
    <TrendingUp key="3" className="w-4 h-4 text-emerald-400" />,
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-2 ${className}`}>
      {cardList.map((item, idx) => {
        const isHero = item.isHero !== undefined ? item.isHero : idx === 0;
        const rawLabel = item.title || item.label;
        const cleanContext = sanitizeBusinessText(item.subtitle || item.context);
        const cleanLabel = sanitizeBusinessText(rawLabel) || (
          isHero
            ? "Métrica Consolidada"
            : idx === 1
            ? "Inventario & SKUs"
            : idx === 2
            ? "Órdenes & Retenciones"
            : "Rendimiento Operacional"
        );

        const trendLabel =
          typeof item.trend === "string"
            ? item.trend
            : item.trend?.label || (isHero ? "+14% vs mes ant." : "+8.2%");

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

        // CARD 1: HERO CARD (Donezo / CheckinOs Style)
        if (isHero) {
          return (
            <div
              key={idx}
              className="bg-hero-emerald rounded-2xl border border-emerald-400/25 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col justify-between relative overflow-hidden transition-all group"
            >
              {/* Sutil brillo superior */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-radial-gradient pointer-events-none opacity-20" />

              <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100/90 font-sans">
                  {cleanLabel}
                </span>

                <button
                  type="button"
                  onClick={item.onActionClick}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all shadow-sm flex-shrink-0 cursor-pointer"
                  title="Ver detalle"
                >
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>

              <div className="relative z-10 my-1">
                <span className="text-4xl font-bold tracking-tight text-white font-sans tabular-nums block">
                  {item.value}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-400/20 relative z-10 flex items-center justify-between text-xs">
                <span className="text-emerald-100/80 text-[11px] leading-tight line-clamp-1">
                  {cleanContext || "Monitoreo continuo en tiempo real"}
                </span>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white font-mono flex-shrink-0">
                  <TrendingUp className="w-3 h-3" />
                  {trendLabel}
                </span>
              </div>
            </div>
          );
        }

        // CARDS 2, 3, 4: SURFACE LEVEL 1 (Tactile Obsidian Emerald)
        const isWarning =
          item.trendType === "warning" ||
          trendDirection === "down" ||
          (idx === 2 && !trendDirection);

        const trendColorClass = isWarning
          ? "bg-amber-500/15 text-amber-300 border-amber-500/25"
          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";

        return (
          <div
            key={idx}
            className="bg-surface-1 rounded-2xl border border-white/[0.06] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:border-white/10 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-txt-secondary font-sans">
                {cleanLabel}
              </span>

              <div className="w-9 h-9 rounded-xl bg-[#19241F] border border-white/[0.04] flex items-center justify-center flex-shrink-0 shadow-inner">
                {renderIconElement()}
              </div>
            </div>

            <div className="my-1">
              <span className="text-3xl font-bold tracking-tight text-white font-sans tabular-nums block">
                {item.value}
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-txt-secondary text-[11px] leading-tight line-clamp-1 pr-2">
                {cleanContext || "Actualizado en tiempo real"}
              </span>

              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono flex-shrink-0 ${trendColorClass}`}
              >
                {isWarning ? (
                  <TrendingDown className="w-3 h-3 text-amber-400" />
                ) : (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                )}
                {trendLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
