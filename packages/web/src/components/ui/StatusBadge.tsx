import React from "react";

export type OperationalStatus =
  | "ok"
  | "alerta"
  | "error"
  | "pendiente"
  | "en_curso"
  | "paid"
  | "shipped"
  | "optimo"
  | "quiebre"
  | "cuarentena"
  | "success"
  | "warning"
  | "emerald"
  | "amber"
  | "rose"
  | "blue"
  | "neutral"
  | "default";

export interface StatusBadgeProps {
  status?: OperationalStatus | string;
  variant?: OperationalStatus | string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  {
    defaultLabel: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
    dotColor: string;
  }
> = {
  ok: {
    defaultLabel: "Al día",
    textColor: "text-state-ok",
    bgColor: "bg-state-ok-surface",
    borderColor: "border-state-ok/30",
    dotColor: "bg-state-ok",
  },
  optimo: {
    defaultLabel: "Óptimo",
    textColor: "text-state-ok",
    bgColor: "bg-state-ok-surface",
    borderColor: "border-state-ok/30",
    dotColor: "bg-state-ok",
  },
  success: {
    defaultLabel: "Correcto",
    textColor: "text-state-ok",
    bgColor: "bg-state-ok-surface",
    borderColor: "border-state-ok/30",
    dotColor: "bg-state-ok",
  },
  emerald: {
    defaultLabel: "Activo",
    textColor: "text-state-ok",
    bgColor: "bg-state-ok-surface",
    borderColor: "border-state-ok/30",
    dotColor: "bg-state-ok",
  },
  paid: {
    defaultLabel: "Pagado",
    textColor: "text-state-ok",
    bgColor: "bg-state-ok-surface",
    borderColor: "border-state-ok/30",
    dotColor: "bg-state-ok",
  },
  shipped: {
    defaultLabel: "Enviado",
    textColor: "text-state-pending",
    bgColor: "bg-state-pending-surface",
    borderColor: "border-state-pending/30",
    dotColor: "bg-state-pending",
  },
  blue: {
    defaultLabel: "En tránsito",
    textColor: "text-state-pending",
    bgColor: "bg-state-pending-surface",
    borderColor: "border-state-pending/30",
    dotColor: "bg-state-pending",
  },
  alerta: {
    defaultLabel: "Atención (ROP)",
    textColor: "text-state-attention",
    bgColor: "bg-state-attention-surface",
    borderColor: "border-state-attention/30",
    dotColor: "bg-state-attention",
  },
  warning: {
    defaultLabel: "Advertencia",
    textColor: "text-state-attention",
    bgColor: "bg-state-attention-surface",
    borderColor: "border-state-attention/30",
    dotColor: "bg-state-attention",
  },
  amber: {
    defaultLabel: "Alerta",
    textColor: "text-state-attention",
    bgColor: "bg-state-attention-surface",
    borderColor: "border-state-attention/30",
    dotColor: "bg-state-attention",
  },
  cuarentena: {
    defaultLabel: "Cuarentena",
    textColor: "text-state-attention",
    bgColor: "bg-state-attention-surface",
    borderColor: "border-state-attention/30",
    dotColor: "bg-state-attention",
  },
  error: {
    defaultLabel: "Quiebre crítico",
    textColor: "text-state-error",
    bgColor: "bg-state-error-surface",
    borderColor: "border-state-error/30",
    dotColor: "bg-state-error",
  },
  quiebre: {
    defaultLabel: "Quiebre",
    textColor: "text-state-error",
    bgColor: "bg-state-error-surface",
    borderColor: "border-state-error/30",
    dotColor: "bg-state-error",
  },
  rose: {
    defaultLabel: "Crítico",
    textColor: "text-state-error",
    bgColor: "bg-state-error-surface",
    borderColor: "border-state-error/30",
    dotColor: "bg-state-error",
  },
  pendiente: {
    defaultLabel: "Requiere firma",
    textColor: "text-state-pending",
    bgColor: "bg-state-pending-surface",
    borderColor: "border-state-pending/30",
    dotColor: "bg-state-pending",
  },
  en_curso: {
    defaultLabel: "En tránsito",
    textColor: "text-muted",
    bgColor: "bg-raised",
    borderColor: "border-border",
    dotColor: "bg-muted",
  },
  neutral: {
    defaultLabel: "Inactivo",
    textColor: "text-muted",
    bgColor: "bg-raised",
    borderColor: "border-border",
    dotColor: "bg-muted",
  },
  default: {
    defaultLabel: "Estándar",
    textColor: "text-muted",
    bgColor: "bg-raised",
    borderColor: "border-border",
    dotColor: "bg-muted",
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  label,
  size = "md",
  className = "",
}) => {
  const key = (status || variant || "ok").toLowerCase();
  const config = STATUS_CONFIG[key] || STATUS_CONFIG.ok;
  const displayLabel = label || config.defaultLabel;

  const sizeStyles =
    size === "sm"
      ? "px-2 py-0.5 text-[10px] gap-1.5"
      : "px-2.5 py-1 text-xs gap-2";

  return (
    <span
      className={`inline-flex items-center font-medium font-mono rounded-full border shadow-sm ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeStyles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} flex-shrink-0 animate-pulse`} />
      <span>{displayLabel}</span>
    </span>
  );
};
