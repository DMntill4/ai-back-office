import React from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { motion } from "motion/react";

export type StepStatus = "completed" | "in_progress" | "dismissed";

export interface ReasoningStep {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
  timestamp?: string;
}

export interface ReasoningStepListProps {
  steps: ReasoningStep[];
  className?: string;
}

export const ReasoningStepList: React.FC<ReasoningStepListProps> = ({
  steps,
  className = "",
}) => {
  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-state-ok flex-shrink-0" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-brand flex-shrink-0" />;
      case "dismissed":
        return <XCircle className="w-4 h-4 text-muted flex-shrink-0" />;
    }
  };

  return (
    <div className={`space-y-compact ${className}`}>
      {steps.map((step, idx) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, delay: idx * 0.08 }} // máx 120ms desfase
          className="flex items-start gap-compact py-compact px-compact rounded-control hover:bg-raised/40 transition-colors"
        >
          <div className="mt-hairline">{getStatusIcon(step.status)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-compact">
              <span className="text-body font-medium text-primary">
                {step.label}
              </span>
              {step.timestamp && (
                <span className="text-caption text-muted font-sans whitespace-nowrap">
                  {step.timestamp}
                </span>
              )}
            </div>
            <p className="text-caption text-secondary mt-hairline line-clamp-1">
              {step.description}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
