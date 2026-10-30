import React, { useId } from "react";
import { motion } from "motion/react";

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
}

export interface SegmentedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = "",
}) => {
  const indicatorId = useId();

  return (
    <div
      role="tablist"
      className={`inline-flex items-center p-hairline rounded-pill bg-panel border border-border ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative px-3.5 py-1.5 rounded-pill text-caption font-medium transition-colors duration-150 active:scale-[0.98] cursor-pointer select-none flex items-center gap-1.5 ${
              isActive
                ? "text-primary"
                : "text-secondary hover:text-primary hover:bg-raised/40"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={`active-tab-${indicatorId}`}
                className="absolute inset-0 rounded-pill bg-raised shadow-sm"
                transition={{ duration: 0.18, ease: "easeOut" }}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="relative z-10 px-1.5 py-0.2 rounded-pill bg-canvas text-caption font-mono text-secondary">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
