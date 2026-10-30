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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-element">
        <div>
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
          <div className="flex items-center gap-compact flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {filterControl && (
        <div className="pt-hairline">
          {filterControl}
        </div>
      )}
    </div>
  );
};

