import React from "react";
import { ArrowUpRight } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "table"; // 36px, 32px en tablas, sm y lg compatibles

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  showArrow?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  icon,
  showArrow,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-sans font-medium transition-colors select-none disabled:opacity-40 disabled:cursor-not-allowed rounded-pill group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

  const sizeStyles: Record<ButtonSize, string> = {
    table: "h-8 px-3 text-caption gap-2", // 32px en tablas
    sm: "h-8 px-3 text-caption gap-2",    // 32px
    md: "h-9 px-4 text-caption gap-2.5",  // 36px
    lg: "h-10 px-5 text-body gap-3",     // 40px
  };

  const isDestructive = variant === "destructive" || variant === "danger";

  const variantStyles = {
    primary:
      "bg-action text-action-text font-semibold hover:bg-action-hover active:bg-action-hover/90",
    secondary:
      "bg-transparent text-primary border border-strong hover:bg-raised active:bg-panel",
    ghost:
      "bg-transparent text-secondary hover:text-primary hover:bg-raised/50",
    destructive:
      "bg-transparent text-state-error border border-state-error hover:bg-state-error-surface active:bg-state-error-surface/80",
    danger:
      "bg-transparent text-state-error border border-state-error hover:bg-state-error-surface active:bg-state-error-surface/80",
  };

  const shouldRenderArrow = showArrow ?? (variant === "primary");

  return (
    <button
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {shouldRenderArrow && (
        <span className="w-5 h-5 rounded-pill bg-canvas text-primary flex items-center justify-center flex-shrink-0 transition-transform group-hover:translate-x-0.5">
          <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </span>
      )}
    </button>
  );
};
