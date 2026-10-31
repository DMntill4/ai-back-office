import React from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  filterControl?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  filterControl,
  className = "",
}) => {
  return (
    <div className={`space-y-compact pb-element border-b border-border ${className}`}>
      <div className="flex min-w-0 flex-col sm:flex-row sm:items-center justify-between gap-element">
        <div className="min-w-0">
          <h1 className="text-page-title font-bold text-primary tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-body text-secondary mt-hairline line-clamp-1">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-compact flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {filterControl && (
        <div data-lenis-prevent className="max-w-full overflow-x-auto custom-scrollbar pt-hairline">
          {filterControl}
        </div>
      )}
    </div>
  );
};
