import React from "react";
import { Check, Clock, AlertTriangle, Package, Truck, CheckCircle2, ShoppingBag } from "lucide-react";

export type MilestoneStatus = "completed" | "active" | "warning" | "pending";

export interface MilestoneStep {
  label: string;
  timestamp?: string;
  status: MilestoneStatus;
  icon?: React.ReactNode;
  details?: string;
}

export interface MilestoneStepperProps {
  steps: MilestoneStep[];
  title?: string;
  dateOrMeta?: string;
  actionButton?: React.ReactNode;
  className?: string;
  onStepClick?: (stepIndex: number) => void;
}

export const MilestoneStepper: React.FC<MilestoneStepperProps> = ({
  steps,
  title,
  dateOrMeta,
  actionButton,
  className = "",
  onStepClick,
}) => {
  if (!steps || steps.length === 0) return null;

  // Default icons according to step index if not explicitly provided
  const defaultStepIcons = [
    <ShoppingBag key="0" className="w-4 h-4" />,
    <Package key="1" className="w-4 h-4" />,
    <Truck key="2" className="w-4 h-4" />,
    <CheckCircle2 key="3" className="w-4 h-4" />,
  ];

  return (
    <div
      className={`bg-surface-well rounded-xl p-4 border border-white/[0.04] shadow-inner flex flex-col justify-between ${className}`}
    >
      {/* Header opcional estilo Inventar / Fikri */}
      {(title || dateOrMeta || actionButton) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            {title && (
              <span className="text-xs font-semibold text-white tracking-tight">
                {title}
              </span>
            )}
            {dateOrMeta && (
              <span className="text-[11px] font-mono text-txt-secondary">
                {dateOrMeta}
              </span>
            )}
          </div>

          {actionButton && (
            <div className="flex items-center text-xs font-medium text-emerald-400 hover:text-emerald-300">
              {actionButton}
            </div>
          )}
        </div>
      )}

      {/* Stepper Horizontal */}
      <div className="py-2">
        <div className="relative flex items-center justify-between w-full">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            const nextStep = !isLast ? steps[idx + 1] : null;

            // Determina el color de la barra horizontal entre este nodo y el siguiente
            let barColor = "bg-[#1F2924]";
            if (nextStep) {
              if (step.status === "completed" && nextStep.status === "completed") {
                barColor = "bg-[#10B981]";
              } else if (step.status === "completed" && (nextStep.status === "active" || nextStep.status === "warning")) {
                barColor = nextStep.status === "warning" ? "bg-[#F59E0B]" : "bg-[#10B981]";
              } else if (step.status === "active") {
                barColor = "bg-hatched-emerald";
              }
            }

            // Estilos del nodo de 32x32px (rounded-lg)
            let nodeStyle = "bg-[#19241F] text-zinc-500 border border-white/[0.04]";
            if (step.status === "completed") {
              nodeStyle = "bg-[#10B981] text-white shadow-[0_0_14px_rgba(16,185,129,0.4)]";
            } else if (step.status === "active") {
              nodeStyle = "bg-emerald-500/20 text-[#34D399] border-2 border-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse";
            } else if (step.status === "warning") {
              nodeStyle = "bg-amber-500/20 text-[#F59E0B] border-2 border-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.3)]";
            }

            return (
              <React.Fragment key={idx}>
                {/* Nodo de 32x32px */}
                <div
                  onClick={() => onStepClick && onStepClick(idx)}
                  className={`flex flex-col items-center group relative z-10 ${
                    onStepClick ? "cursor-pointer" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${nodeStyle}`}
                  >
                    {step.icon || defaultStepIcons[idx] || (
                      step.status === "completed" ? (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      ) : step.status === "warning" ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )
                    )}
                  </div>

                  {/* Label y Timestamp debajo del nodo */}
                  <div className="text-center mt-2 max-w-[90px] sm:max-w-[120px]">
                    <span
                      className={`block text-[11px] font-medium leading-tight truncate ${
                        step.status === "completed" || step.status === "active"
                          ? "text-white"
                          : step.status === "warning"
                          ? "text-amber-400"
                          : "text-zinc-500"
                      }`}
                    >
                      {step.label}
                    </span>
                    {step.timestamp && (
                      <span className="block text-[10px] font-mono text-zinc-500 mt-0.5">
                        {step.timestamp}
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra horizontal conectora de 4px de grosor */}
                {!isLast && (
                  <div className="flex-1 h-[4px] mx-2 -mt-6 rounded-full overflow-hidden bg-[#1F2924] relative">
                    <div className={`h-full w-full ${barColor} transition-all duration-300`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

