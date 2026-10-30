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
              <span className="text-caption font-mono text-secondary">
                {dateOrMeta}
              </span>
            )}
          </div>

          {actionButton && (
            <div className="flex items-center text-label font-medium text-brand hover:text-brand">
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
            let barColor = "bg-border";
            if (nextStep) {
              if (step.status === "completed" && nextStep.status === "completed") {
                barColor = "bg-brand";
              } else if (step.status === "completed" && (nextStep.status === "active" || nextStep.status === "warning")) {
                barColor = nextStep.status === "warning" ? "bg-state-attention" : "bg-brand";
              } else if (step.status === "active") {
                barColor = "bg-hatched-emerald";
              }
            }

            // Estilos del nodo de 32x32px (rounded-control)
            let nodeStyle = "bg-raised text-muted border border-border";
            if (step.status === "completed") {
              nodeStyle = "bg-brand text-canvas";
            } else if (step.status === "active") {
              nodeStyle = "bg-brand-surface text-brand border-2 border-brand animate-pulse";
            } else if (step.status === "warning") {
              nodeStyle = "bg-state-attention-surface text-state-attention border-2 border-state-attention";
            }

            return (
              <React.Fragment key={idx}>
                {/* Nodo de 32x32px */}
                <div
                  onClick={() => onStepClick && onStepClick(idx)}
                  className={`flex flex-col items-center group relative z-10 ${onStepClick ? "cursor-pointer" : ""
                    }`}
                >
                  <div
                    className={`w-8 h-8 rounded-control flex items-center justify-center transition-all ${nodeStyle}`}
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
                      className={`block text-caption font-medium leading-tight truncate ${step.status === "completed" || step.status === "active"
                        ? "text-primary"
                        : step.status === "warning"
                          ? "text-state-attention"
                          : "text-muted"
                        }`}
                    >
                      {step.label}
                    </span>
                    {step.timestamp && (
                      <span className="block text-caption font-mono text-muted mt-hairline">
                        {step.timestamp}
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra horizontal conectora de 4px de grosor */}
                {!isLast && (
                  <div className="flex-1 h-[4px] mx-compact -mt-6 rounded-pill overflow-hidden bg-border relative">
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

