import React from "react";

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
            className={`px-3.5 py-1.5 rounded-pill text-caption font-medium transition-colors cursor-pointer select-none flex items-center gap-1.5 ${
              isActive
                ? "bg-raised text-primary shadow-sm"
                : "text-secondary hover:text-primary hover:bg-raised/40"
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="px-1.5 py-0.2 rounded-pill bg-canvas text-caption font-mono text-secondary">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

