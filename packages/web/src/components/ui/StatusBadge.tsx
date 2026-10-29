import React from "react";

export type OperationalStatus = "ok" | "alerta" | "error" | "pendiente" | "en_curso";

interface StatusBadgeProps {
  status: OperationalStatus;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

const STATUS_CONFIG: Record<
  OperationalStatus,
  {
    symbol: string;
    defaultLabel: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  ok: {
    symbol: "●",
    defaultLabel: "Al día",
    textColor: "text-[#14B8A6]",
    bgColor: "bg-[#14B8A6]/10",
    borderColor: "border-[#14B8A6]/30",
  },
  alerta: {
    symbol: "▲",
    defaultLabel: "Atención (ROP)",
    textColor: "text-[#F59E0B]",
    bgColor: "bg-[#F59E0B]/10",
    borderColor: "border-[#F59E0B]/30",
  },
  error: {
    symbol: "■",
    defaultLabel: "Quiebre crítico",
    textColor: "text-[#E11D48]",
    bgColor: "bg-[#E11D48]/10",
    borderColor: "border-[#E11D48]/30",
  },
  pendiente: {
    symbol: "◆",
    defaultLabel: "Requiere aprobación",
    textColor: "text-[#818CF8]",
    bgColor: "bg-[#6366F1]/10",
    borderColor: "border-[#6366F1]/30",
  },
  en_curso: {
    symbol: "◌",
    defaultLabel: "En ejecución",
    textColor: "text-[#94A3B8]",
    bgColor: "bg-[#94A3B8]/10",
    borderColor: "border-[#94A3B8]/30",
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = "md",
  className = "",
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.ok;
  const displayLabel = label || config.defaultLabel;

  const sizeStyles =
    size === "sm"
      ? "px-2 py-0.5 text-[11px] gap-1.5"
      : "px-2.5 py-1 text-xs gap-2";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${config.bgColor} ${config.borderColor} ${config.textColor} ${sizeStyles} ${className}`}
    >
      <span
        aria-hidden="true"
        className="text-[10px] leading-none select-none"
      >
        {config.symbol}
      </span>
      <span>{displayLabel}</span>
    </span>
  );
};

