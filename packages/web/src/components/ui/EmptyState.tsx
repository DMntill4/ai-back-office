import React from "react";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={`p-page rounded-container border border-dashed border-border bg-panel/40 flex flex-col items-center justify-center text-center max-w-md mx-auto my-group ${className}`}
    >
      {/* Silueta sutil de la guanábana */}
      <div className="w-12 h-12 rounded-container bg-raised border border-border flex items-center justify-center mb-element text-brand">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-7 text-brand"
        >
          <path
            d="M24 6 C24 10, 26 13, 29 15"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M24 15 C33 13, 39 19, 39 28 C39 37, 32 42, 24 42 C16 42, 9 37, 9 28 C9 19, 15 13, 24 15 Z"
            stroke="currentColor"
            strokeWidth="2"
            fill="currentColor"
            fillOpacity="0.1"
          />
          <circle cx="18" cy="24" r="1.5" fill="currentColor" />
          <circle cx="28" cy="23" r="1.5" fill="currentColor" />
          <circle cx="22" cy="30" r="1.5" fill="currentColor" />
          <circle cx="29" cy="34" r="1.5" fill="currentColor" />
          <circle cx="17" cy="34" r="1.5" fill="currentColor" />
        </svg>
      </div>

      <h3 className="text-section-title font-bold text-primary tracking-tight">
        {title}
      </h3>
      <p className="text-body text-secondary mt-hairline max-w-sm">
        {description}
      </p>

      {actionLabel && onAction && (
        <div className="mt-element">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
