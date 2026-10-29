import React, { useState } from "react";
import { LogStep } from "../../types/workflow";
import { CheckCircle2, RotateCw, Copy, Check, Terminal, X, Minimize2 } from "lucide-react";

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

  const handleCopyJson = () => {
    if (selectedLog?.payload) {
      navigator.clipboard.writeText(JSON.stringify(selectedLog.payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070c09] border border-[#16271e] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
      {/* Panel Header */}
      <div className="h-10 px-4 bg-[#0a120d] border-b border-[#16271e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-200 tracking-wide font-mono">
            Telemetría & Execution Logs
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0f2417] text-mint-400 border border-[#1b432a]">
            <span className="w-1.5 h-1.5 rounded-full bg-mint-400 animate-pulse"></span>
            Status: running
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#15281e] transition-colors"
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
        <div className="w-44 border-r border-[#16271e] p-2.5 space-y-1.5 overflow-y-auto bg-[#080e0a]">
          {logs.map((step) => {
            const isSelected = selectedStepId === step.id;
            const isRunning = step.status === "running";
            return (
              <div
                key={step.id}
                onClick={() => setSelectedStepId(step.id)}
                className={`p-2 rounded-xl cursor-pointer transition-all flex items-center gap-2 text-xs font-mono font-bold ${
                  isSelected
                    ? "bg-[#142e1f] text-mint-200 border border-mint-500/60 shadow-[0_0_10px_rgba(34,197,94,0.15)]"
                    : "text-gray-400 hover:text-gray-200 hover:bg-[#0d1812]"
                }`}
              >
                {step.status === "success" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-mint-400 flex-shrink-0" />
                )}
                {isRunning && (
                  <RotateCw className="w-3.5 h-3.5 text-mint-400 animate-spin flex-shrink-0" />
                )}
                <span className="truncate">{step.label}</span>
              </div>
            );
          })}
        </div>

        {/* Right: Formatted JSON Output */}
        <div className="flex-1 p-3 overflow-y-auto flex flex-col justify-between bg-[#060a08]">
          <div className="flex items-center justify-between pb-2 border-b border-[#14251b] mb-2">
            <span className="text-[11px] font-mono text-gray-400">
              Processing node: <span className="text-mint-300 font-semibold">{selectedLog?.label || "Node"}</span>
            </span>
            <button
              onClick={handleCopyJson}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#132219] transition-colors flex items-center gap-1 text-[10px] font-mono"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-mint-400" />
                  <span className="text-mint-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <pre className="flex-1 text-[11px] font-mono text-mint-300/90 overflow-x-auto leading-relaxed select-text">
            {selectedLog?.payload
              ? JSON.stringify(selectedLog.payload, null, 2)
              : "{\n  \"status\": \"idle\"\n}"}
          </pre>
        </div>
      </div>
    </div>
  );
};
