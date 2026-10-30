import React from "react";
import { motion } from "motion/react";

export interface MetricItem {
  id: string;
  value: string;
  context: string;
  highlightBrand?: boolean;
  auxiliary?: React.ReactNode;
}

export interface MetricStripProps {
  items: MetricItem[];
  className?: string;
}

export const MetricStrip: React.FC<MetricStripProps> = ({ items, className = "" }) => {
  return (
    <div
      className={`grid grid-cols-1 sm:flex sm:flex-wrap items-stretch divide-y sm:divide-y-0 sm:divide-x divide-border border-y border-border py-element bg-transparent ${className}`}
    >
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut", delay: Math.min(index, 5) * 0.025 }}
          className="flex-1 min-w-0 px-group py-compact sm:py-0 first:pl-0 last:pr-0"
        >
          <div className="flex flex-wrap items-baseline gap-2">
            <span
              className={`text-metric font-bold tabular-nums tracking-tight ${
                item.highlightBrand ? "text-gradient-brand" : "text-primary font-sans"
              }`}
            >
              {item.value}
            </span>
            {item.auxiliary && <div>{item.auxiliary}</div>}
          </div>
          <p className="text-caption text-secondary mt-hairline line-clamp-1">
            {item.context}
          </p>
        </motion.div>
      ))}
    </div>
  );
};
