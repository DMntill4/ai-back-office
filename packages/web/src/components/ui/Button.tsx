import React from "react";
import { ArrowRight } from "lucide-react";
import { motion, type HTMLMotionProps } from "motion/react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
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
    "inline-flex items-center justify-center font-medium transition-colors select-none disabled:opacity-40 disabled:cursor-not-allowed rounded-full group cursor-pointer";

  const sizeStyles = {
    sm: "h-8 px-3 text-xs gap-2",
    md: "h-9 px-4 text-xs gap-2.5",
    lg: "h-10 px-5 text-sm gap-3",
  };

  const arrowCircleSize = {
    sm: "w-4 h-4 text-[10px]",
    md: "w-5 h-5 text-xs",
    lg: "w-6 h-6 text-xs",
  };

  // Flowcraft signature buttons:
  // Primary: White pill with dark text and dark inner circle arrow
  // Secondary: Dark forest pill with subtle hairline border
  const variantStyles = {
    primary:
      "bg-white text-[#070B08] font-semibold hover:bg-neutral-100 active:bg-neutral-200 shadow-buttonGlow",
    secondary:
      "bg-forest-surface text-txt-primary border border-forest-border hover:bg-forest-card hover:border-forest-borderBright active:bg-forest-border",
    danger:
      "bg-state-errorBg text-state-error border border-state-errorBorder hover:bg-state-error/20 active:bg-state-error/30",
    ghost:
      "bg-transparent text-txt-secondary hover:text-txt-primary hover:bg-forest-card/50",
  };

  const shouldRenderArrow = showArrow ?? (variant === "primary");

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.015, y: -0.5 }}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>

      {shouldRenderArrow && (
        <motion.span
          className={`flex-shrink-0 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-0.5 ${
            variant === "primary"
              ? "bg-[#070B08] text-white"
              : "bg-forest-border text-txt-secondary"
          } ${arrowCircleSize[size]}`}
        >
          <ArrowRight className="w-2.5 h-2.5" />
        </motion.span>
      )}
    </motion.button>
  );
};
