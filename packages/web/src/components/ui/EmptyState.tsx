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
      className={`p-10 rounded-2xl border border-dashed border-forest-border flex flex-col items-center justify-center text-center max-w-md mx-auto my-8 ${className}`}
    >
      {/* Silueta sutil de la guanábana en líneas tenues */}
      <div className="w-14 h-14 rounded-2xl bg-forest-card border border-forest-border flex items-center justify-center mb-4 text-brand">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8 opacity-75"
        >
          {/* Tallo */}
          <path
            d="M24 6 C24 10, 26 13, 29 15"
            stroke="#2BB656"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Contorno orgánico con hoyuelos de guanábana */}
          <path
            d="M24 15 C33 13, 39 19, 39 28 C39 37, 32 42, 24 42 C16 42, 9 37, 9 28 C9 19, 15 13, 24 15 Z"
            stroke="#2BB656"
            strokeWidth="2"
            fill="rgba(43, 182, 86, 0.06)"
          />
          {/* Puntos / Hoyuelos característicos */}
          <circle cx="18" cy="24" r="1.5" fill="#2BB656" />
          <circle cx="28" cy="23" r="1.5" fill="#2BB656" />
          <circle cx="22" cy="30" r="1.5" fill="#2BB656" />
          <circle cx="29" cy="34" r="1.5" fill="#2BB656" />
          <circle cx="17" cy="34" r="1.5" fill="#2BB656" />
        </svg>
      </div>

      <h4 className="text-sm font-semibold text-txt-primary mb-1">{title}</h4>
      <p className="text-xs text-txt-secondary leading-relaxed mb-5 max-w-xs">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

