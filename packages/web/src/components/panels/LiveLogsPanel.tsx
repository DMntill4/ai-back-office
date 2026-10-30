import React, { useState } from "react";
import { LogStep } from "../../types/workflow";
import { CheckCircle2, RotateCw, Copy, Check, Terminal, X, Minimize2, Coins } from "lucide-react";
import { formatUsd, formatTokens } from "../ui/CostBadge";

interface LiveLogsPanelProps {
  logs: LogStep[];
  isOpen?: boolean;
  onClose?: () => void;
}

export const LiveLogsPanel: React.FC<LiveLogsPanelProps> = ({
  logs,
  isOpen = true,
  onClose,
}) => {
  const [selectedStepId, setSelectedStepId] = useState<string>(
    logs[logs.length - 1]?.id || "step_3"
  );
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const selectedLog = logs.find((l) => l.id === selectedStepId) || logs[0];

  // Totales de la ejecución (Agent FinOps): suma de tokens y costo de todos los pasos.
  const totalTokens = logs.reduce((acc, l) => acc + (l.tokens ?? 0), 0);
  const totalCostUsd = logs.reduce((acc, l) => acc + (l.costUsd ?? 0), 0);

  const handleCopyJson = () => {
    if (selectedLog?.payload) {
      navigator.clipboard.writeText(JSON.stringify(selectedLog.payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas border border-border rounded-container overflow-hidden">
      {/* Panel Header */}
      <div className="h-10 px-base bg-panel border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-compact">
          <span className="text-label font-semibold text-primary tracking-wide font-mono">
            Telemetría & Execution Logs
          </span>
        </div>
        <div className="flex items-center gap-element text-caption font-mono">
          <span className="flex items-center gap-compact px-compact py-hairline rounded-pill bg-state-ok-surface text-state-ok border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-state-ok animate-pulse"></span>
            Status: running
          </span>
          {/* Costo acumulado de la ejecución (Agent FinOps) */}
          <span
            className="flex items-center gap-compact px-compact py-hairline rounded-pill bg-raised text-secondary border border-border"
            title={`Tokens: ${totalTokens} · Costo: ${formatUsd(totalCostUsd)}`}
          >
            <Coins className="w-3 h-3" />
            {formatUsd(totalCostUsd)} · {formatTokens(totalTokens)} tok
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-hairline rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors"
              title="Cerrar panel de logs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body: Split View (Steps List on Left, JSON Payload on Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Execution Pipeline Steps */}
        <div className="w-44 border-r border-border p-element space-y-hairline overflow-y-auto bg-panel">
          {logs.map((step) => {
            const isSelected = selectedStepId === step.id;
            const isRunning = step.status === "running";
            return (
              <div
                key={step.id}
                onClick={() => setSelectedStepId(step.id)}
                className={`p-compact rounded-control cursor-pointer transition-colors flex items-center gap-compact text-caption font-mono font-semibold ${isSelected
                  ? "bg-brand-surface text-brand border border-brand/40"
                  : "text-secondary hover:text-primary hover:bg-raised border border-transparent"
                  }`}
              >
                {step.status === "success" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-state-ok flex-shrink-0" />
                )}
                {isRunning && (
                  <RotateCw className="w-3.5 h-3.5 text-brand animate-spin flex-shrink-0" />
                )}
                <span className="truncate">{step.label}</span>
              </div>
            );
          })}
        </div>

        {/* Right: Formatted JSON Output */}
        <div className="flex-1 p-element overflow-y-auto flex flex-col justify-between bg-canvas">
          <div className="flex items-center justify-between pb-compact border-b border-border mb-compact">
            <span className="text-caption font-mono text-secondary">
              Processing node: <span className="text-brand font-semibold">{selectedLog?.label || "Node"}</span>
            </span>
            <button
              onClick={handleCopyJson}
              className="p-hairline rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors flex items-center gap-hairline text-caption font-mono"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-state-ok" />
                  <span className="text-state-ok">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <pre className="flex-1 text-caption font-mono text-secondary overflow-x-auto leading-relaxed select-text">
            {selectedLog?.payload
              ? JSON.stringify(selectedLog.payload, null, 2)
              : "{\n  \"status\": \"idle\"\n}"}
          </pre>
        </div>
      </div>
    </div>
  );
};
