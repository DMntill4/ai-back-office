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
    textColor: "text-[#10B981]",
    bgColor: "bg-[#10B981]/15",
    borderColor: "border-[#10B981]/30",
    dotColor: "bg-[#10B981]",
  },
  optimo: {
    defaultLabel: "Óptimo",
    textColor: "text-[#10B981]",
    bgColor: "bg-[#10B981]/15",
    borderColor: "border-[#10B981]/30",
    dotColor: "bg-[#10B981]",
  },
  success: {
    defaultLabel: "Correcto",
    textColor: "text-[#10B981]",
    bgColor: "bg-[#10B981]/15",
    borderColor: "border-[#10B981]/30",
    dotColor: "bg-[#10B981]",
  },
  emerald: {
    defaultLabel: "Activo",
    textColor: "text-[#10B981]",
    bgColor: "bg-[#10B981]/15",
    borderColor: "border-[#10B981]/30",
    dotColor: "bg-[#10B981]",
  },
  paid: {
    defaultLabel: "Pagado",
    textColor: "text-[#10B981]",
    bgColor: "bg-[#10B981]/15",
    borderColor: "border-[#10B981]/30",
    dotColor: "bg-[#10B981]",
  },
  shipped: {
    defaultLabel: "Enviado",
    textColor: "text-[#3B82F6]",
    bgColor: "bg-[#3B82F6]/15",
    borderColor: "border-[#3B82F6]/30",
    dotColor: "bg-[#3B82F6]",
  },
  blue: {
    defaultLabel: "En tránsito",
    textColor: "text-[#3B82F6]",
    bgColor: "bg-[#3B82F6]/15",
    borderColor: "border-[#3B82F6]/30",
    dotColor: "bg-[#3B82F6]",
  },
  alerta: {
    defaultLabel: "Atención (ROP)",
    textColor: "text-[#F59E0B]",
    bgColor: "bg-[#F59E0B]/15",
    borderColor: "border-[#F59E0B]/30",
    dotColor: "bg-[#F59E0B]",
  },
  warning: {
    defaultLabel: "Advertencia",
    textColor: "text-[#F59E0B]",
    bgColor: "bg-[#F59E0B]/15",
    borderColor: "border-[#F59E0B]/30",
    dotColor: "bg-[#F59E0B]",
  },
  amber: {
    defaultLabel: "Alerta",
    textColor: "text-[#F59E0B]",
    bgColor: "bg-[#F59E0B]/15",
    borderColor: "border-[#F59E0B]/30",
    dotColor: "bg-[#F59E0B]",
  },
  cuarentena: {
    defaultLabel: "Cuarentena",
    textColor: "text-[#F59E0B]",
    bgColor: "bg-[#F59E0B]/15",
    borderColor: "border-[#F59E0B]/30",
    dotColor: "bg-[#F59E0B]",
  },
  error: {
    defaultLabel: "Quiebre crítico",
    textColor: "text-[#EF4444]",
    bgColor: "bg-[#EF4444]/15",
    borderColor: "border-[#EF4444]/30",
    dotColor: "bg-[#EF4444]",
  },
  quiebre: {
    defaultLabel: "Quiebre",
    textColor: "text-[#EF4444]",
    bgColor: "bg-[#EF4444]/15",
    borderColor: "border-[#EF4444]/30",
    dotColor: "bg-[#EF4444]",
  },
  rose: {
    defaultLabel: "Crítico",
    textColor: "text-[#EF4444]",
    bgColor: "bg-[#EF4444]/15",
    borderColor: "border-[#EF4444]/30",
    dotColor: "bg-[#EF4444]",
  },
  pendiente: {
    defaultLabel: "Requiere firma",
    textColor: "text-[#818CF8]",
    bgColor: "bg-[#6366F1]/15",
    borderColor: "border-[#6366F1]/30",
    dotColor: "bg-[#818CF8]",
  },
  en_curso: {
    defaultLabel: "En tránsito",
    textColor: "text-[#94A3B8]",
    bgColor: "bg-[#94A3B8]/15",
    borderColor: "border-[#94A3B8]/30",
    dotColor: "bg-[#94A3B8]",
  },
  neutral: {
    defaultLabel: "Inactivo",
    textColor: "text-[#94A3B8]",
    bgColor: "bg-[#94A3B8]/15",
    borderColor: "border-[#94A3B8]/30",
    dotColor: "bg-[#94A3B8]",
  },
  default: {
    defaultLabel: "Estándar",
    textColor: "text-[#94A3B8]",
    bgColor: "bg-[#94A3B8]/15",
    borderColor: "border-[#94A3B8]/30",
    dotColor: "bg-[#94A3B8]",
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
