import React from "react";

export interface KpiMetric {
  value: string;
  context: string;
  isHighlight?: boolean;
}

export interface KpiStripProps {
  metrics: KpiMetric[];
  className?: string;
}

export const KpiStrip: React.FC<KpiStripProps> = ({
  metrics,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-wrap items-center divide-y sm:divide-y-0 sm:divide-x divide-forest-border border-y border-forest-border py-4 my-4 ${className}`}
    >
      {metrics.map((item, idx) => (
        <div
          key={idx}
          className="flex-1 min-w-[180px] px-6 py-2 first:pl-2 last:pr-2 flex flex-col justify-center"
        >
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight tabular-nums ${
                item.isHighlight ? "text-gradient-mint" : "text-txt-primary"
              }`}
            >
              {item.value}
            </span>
          </div>
          <span className="text-xs text-txt-secondary mt-1 leading-snug">
            {item.context}
          </span>
        </div>
      ))}
    </div>
  );
};

