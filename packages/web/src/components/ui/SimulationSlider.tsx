import React from "react";

export interface SimulationSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  unitPriceCop?: number;
  dailyConsumption?: number;
  standardPriceCop?: number;
  onChange: (value: number) => void;
  className?: string;
}

export const SimulationSlider: React.FC<SimulationSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "unidades",
  unitPriceCop = 145000,
  dailyConsumption = 1.8,
  standardPriceCop = 158000,
  onChange,
  className = "",
}) => {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  // Cálculos reactivos de impacto en vivo
  const totalCost = value * unitPriceCop;
  const coverageDays = Math.round(value / (dailyConsumption || 1));
  const savings = Math.max(0, (standardPriceCop - unitPriceCop) * value);

  const formatCop = (num: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(num);

  return (
    <div className={`space-y-compact p-compact rounded-container bg-panel border border-border ${className}`}>
      <div className="flex items-center justify-between text-body">
        <span className="font-medium text-secondary">{label}</span>
        <span className="font-bold text-primary tabular-nums">
          {value} {unit}
        </span>
      </div>

      {/* Pista y Deslizador Personalizado */}
      <div className="relative flex items-center h-5">
        <div className="absolute left-0 right-0 h-1.5 rounded-pill bg-raised overflow-hidden">
          <div
            className="h-full bg-brand rounded-pill transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative w-full h-5 opacity-0 cursor-pointer z-10"
        />
        {/* Thumb visible */}
        <div
          className="absolute w-4 h-4 rounded-pill bg-white border border-strong shadow-sm pointer-events-none transition-all duration-75 -translate-x-1/2"
          style={{ left: `${percentage}%` }}
        />
      </div>

      {/* Resumen de Impacto en Cifras Tabulares */}
      <div className="grid grid-cols-3 gap-compact pt-compact border-t border-border text-center">
        <div>
          <span className="block text-caption text-muted">Costo Proyectado</span>
          <span className="block text-body font-bold text-primary tabular-nums mt-hairline">
            {formatCop(totalCost)}
          </span>
        </div>
        <div>
          <span className="block text-caption text-muted">Cobertura Proyectada</span>
          <span className="block text-body font-bold text-state-ok tabular-nums mt-hairline">
            {coverageDays} días
          </span>
        </div>
        <div>
          <span className="block text-caption text-muted">Ahorro Estimado</span>
          <span className="block text-body font-bold text-brand tabular-nums mt-hairline">
            +{formatCop(savings)}
          </span>
        </div>
      </div>
    </div>
  );
};

