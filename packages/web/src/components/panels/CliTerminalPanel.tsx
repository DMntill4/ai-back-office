import React, { useState, useRef, useEffect } from "react";
import { Terminal, Send, Play, CornerDownLeft, Sparkles, Check, AlertCircle, ChevronUp, ChevronDown } from "lucide-react";
import { CliHistoryItem } from "../../types/workflow";
import { api } from "../../services/apiClient";

interface CliTerminalPanelProps {
  onExecuteCommand?: (cmd: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const CliTerminalPanel: React.FC<CliTerminalPanelProps> = ({
  onExecuteCommand,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [inputCommand, setInputCommand] = useState("");
  const [history, setHistory] = useState<CliHistoryItem[]>([
    {
      id: "cli_boot",
      type: "system",
      text: "[SISTEMA] Mint CLI Console inicializada. Escribe `mint help` para ver los comandos disponibles.",
      timestamp: new Date().toLocaleTimeString("es-CO", { hour12: false }),
    },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleRunCommand = async (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed || isRunning) return;

    const time = new Date().toLocaleTimeString("es-CO", { hour12: false });
    const userItem: CliHistoryItem = {
      id: `cli_${Date.now()}`,
      type: "command",
      text: trimmed,
      timestamp: time,
    };

    const lower = trimmed.toLowerCase();
    let responseText = "";

    if (lower === "clear" || lower === "limpiar") {
      setHistory([]);
      setInputCommand("");
      return;
    }

    setHistory((prev) => [...prev, userItem]);
    setInputCommand("");
    setIsRunning(true);

    try {
      if (lower.includes("help") || lower.includes("ayuda")) {
        responseText = [
          "[COMANDOS DISPONIBLES EN MINT CLI]:",
          "• mint scan      -> Alertas ROP reales desde /api/inventory/rop-alerts",
          "• mint stock     -> Resumen de inventario desde /api/inventory/summary",
          "• mint approve   -> Decisiones pendientes desde /api/decisions/pending",
          "• mint briefing  -> Costos de agente desde /api/telemetry/costs",
          "• clear          -> Limpia la pantalla de la terminal",
        ].join("\n");
      } else if (lower.includes("scan")) {
        const res = await api.inventory.ropAlerts();
        const alerts = Array.isArray(res?.data) ? res.data : [];
        if (alerts.length === 0) {
          responseText = "[OK] Sin alertas ROP activas. Todas las referencias están sobre su punto de reorden.";
        } else {
          const lines = alerts.slice(0, 8).map((a: any) => {
            const deficit = Number(a.deficit ?? (Number(a.ropThreshold ?? 0) - Number(a.currentStock ?? 0)));
            return `• ${a.sku} (${a.name ?? "—"}): stock ${a.currentStock ?? 0} / ROP ${a.ropThreshold ?? 0} -> DÉFICIT: ${deficit}u`;
          });
          responseText = [`[OK] ${alerts.length} referencias bajo Punto de Reorden (ROP).`, ...lines].join("\n");
        }
        if (res?.isFallback) responseText += "\n[AVISO] Backend no disponible: datos degradados.";
      } else if (lower.includes("stock")) {
        const res = await api.inventory.summary();
        const s: any = res?.data ?? {};
        responseText = [
          "[RESUMEN DE INVENTARIO]",
          `• SKUs totales: ${s.totalSkus ?? s.total ?? 0}`,
          `• Bajo stock: ${s.lowStock ?? 0}`,
          `• Críticos: ${s.criticalStock ?? s.critical ?? 0}`,
          `• Valor total: $${Number(s.totalValueCop ?? s.totalValue ?? 0).toLocaleString("es-CO")} COP`,
        ].join("\n");
        if (res?.isFallback) responseText += "\n[AVISO] Backend no disponible: datos degradados.";
      } else if (lower.includes("approve") || lower.includes("aprobar")) {
        const res = await api.decisions.pending();
        const rows = Array.isArray(res?.data) ? res.data : [];
        if (rows.length === 0) {
          responseText = "[Aprobaciones] No hay decisiones pendientes de firma.";
        } else {
          const lines = rows.slice(0, 8).map((d: any) => `• ${d.id} — ${d.title ?? "Decisión"} (${d.costFormatted ?? "—"})`);
          responseText = [`[Aprobaciones] ${rows.length} decisiones pendientes en /inbox:`, ...lines].join("\n");
        }
      } else if (lower.includes("briefing") || lower.includes("hoy")) {
        const res = await api.telemetry.costs();
        const c: any = res?.data ?? {};
        responseText = [
          "[BRIEFING OPERATIVO]",
          `• Fecha: ${new Date().toLocaleDateString("es-CO")}`,
          `• Tokens consumidos: ${Number(c.totalTokens ?? 0).toLocaleString("es-CO")}`,
          `• Costo acumulado: $${Number(c.totalCostUsd ?? 0).toFixed(4)} USD`,
          `• Tareas registradas: ${Array.isArray(c.tasks) ? c.tasks.length : 0}`,
        ].join("\n");
      } else {
        responseText = `[MINT CLI] Comando no reconocido: "${trimmed}". Escribe \`mint help\` para ver los comandos disponibles.`;
      }
    } catch (err: any) {
      responseText = `[ERROR] ${err?.message || "No se pudo ejecutar el comando contra el backend."}`;
    } finally {
      setIsRunning(false);
    }

    const responseItem: CliHistoryItem = {
      id: `cli_${Date.now() + 1}`,
      type: "output",
      text: responseText,
      timestamp: new Date().toLocaleTimeString("es-CO", { hour12: false }),
    };

    setHistory((prev) => [...prev, responseItem]);
    onExecuteCommand?.(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleRunCommand(inputCommand);
    }
  };

  if (!isExpanded) {
    return (
      <div
        onClick={onToggleExpand}
        className="h-11 px-base bg-panel border border-border hover:border-border-strong rounded-control flex items-center justify-between cursor-pointer transition-colors group select-none"
      >
        <div className="flex items-center gap-element">
          <div className="flex items-center gap-compact">
            <Terminal className="w-3.5 h-3.5 text-brand" />
            <span className="text-label font-mono font-semibold text-primary">
              Mint CLI
            </span>
          </div>
          <span className="text-muted text-caption font-mono">•</span>
          <span className="text-caption font-mono text-secondary group-hover:text-primary transition-colors">
            Click para desplegar terminal o presiona un comando
          </span>
        </div>

        {/* Quick Command Chips */}
        <div
          className="flex items-center gap-compact"
          onClick={(e) => e.stopPropagation()}
        >
          {["mint scan", "mint stock", "mint approve"].map((quickCmd) => (
            <button
              key={quickCmd}
              onClick={() => {
                onToggleExpand?.();
                setTimeout(() => void handleRunCommand(quickCmd), 100);
              }}
              className="px-compact py-hairline rounded-control bg-raised hover:bg-brand hover:text-canvas text-secondary text-caption font-mono border border-border transition-colors"
            >
              {quickCmd}
            </button>
          ))}
          <button
            onClick={onToggleExpand}
            className="p-hairline rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors ml-compact"
            title="Expandir Terminal"
          >
            <ChevronUp className="w-4 h-4 text-brand" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas border border-border rounded-container overflow-hidden">
      {/* Panel Header */}
      <div className="h-10 px-base bg-panel border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-compact">
          <Terminal className="w-3.5 h-3.5 text-brand" />
          <span className="text-label font-semibold text-primary tracking-wide font-mono">
            Mint Embedded CLI
          </span>
          <span className="text-caption font-mono px-compact py-hairline rounded-pill bg-brand-surface text-brand border border-border">
            CLI Module
          </span>
        </div>

        {/* Actions & Minimize Button */}
        <div className="flex items-center gap-compact">
          <div data-lenis-prevent className="flex items-center gap-hairline overflow-x-auto text-caption font-mono">
            {["mint scan", "mint stock", "mint approve", "mint briefing"].map((quickCmd) => (
              <button
                key={quickCmd}
                onClick={() => void handleRunCommand(quickCmd)}
                disabled={isRunning}
                className="px-compact py-hairline rounded-control bg-raised hover:bg-brand hover:text-canvas text-secondary border border-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {quickCmd}
              </button>
            ))}
          </div>

          <button
            onClick={onToggleExpand}
            className="p-hairline rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors ml-hairline"
            title="Plegar Terminal"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div data-lenis-prevent className="flex-1 p-element overflow-y-auto font-mono text-caption space-y-compact select-text">
        {history.map((item) => (
          <div key={item.id} className="leading-relaxed">
            {item.type === "command" && (
              <div className="flex items-center gap-compact text-brand font-semibold">
                <span className="text-muted text-caption">{item.timestamp}</span>
                <span className="text-brand font-bold">mint &gt;</span>
                <span>{item.text}</span>
              </div>
            )}
            {item.type === "output" && (
              <div className="pl-group text-secondary whitespace-pre-line text-caption bg-raised p-element rounded-control border border-border mt-hairline">
                {item.text}
              </div>
            )}
            {item.type === "system" && (
              <div className="text-caption text-muted flex items-center gap-compact">
                <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
                <span>{item.text}</span>
              </div>
            )}
          </div>
        ))}
        {isRunning && (
          <div className="text-caption text-muted flex items-center gap-compact">
            <span className="w-1.5 h-1.5 rounded-full bg-state-pending animate-pulse"></span>
            <span>Consultando backend…</span>
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Input Bar */}
      <div className="p-element bg-panel border-t border-border flex items-center gap-compact">
        <span className="text-brand font-mono text-caption font-bold pl-compact select-none">
          mint &gt;
        </span>
        <input
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder="Escribe un comando o directiva (ej. mint scan, mint stock, help)..."
          className="flex-1 bg-transparent text-caption font-mono text-primary placeholder:text-muted focus:outline-none disabled:opacity-60"
        />
        <button
          onClick={() => void handleRunCommand(inputCommand)}
          disabled={isRunning}
          className="p-hairline rounded-control bg-brand hover:bg-brand/90 text-canvas transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
