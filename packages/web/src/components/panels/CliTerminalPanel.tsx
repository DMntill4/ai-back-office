import React, { useState, useRef, useEffect } from "react";
import { Terminal, Send, ChevronUp, ChevronDown, MessageSquare } from "lucide-react";
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
  const [isChatMode, setIsChatMode] = useState(false);
  const [history, setHistory] = useState<CliHistoryItem[]>([
    {
      id: "cli_boot",
      type: "system",
      text: "[SISTEMA] Mint CLI Console inicializada. Usa `/chat <pregunta>` para hablar con el agente o `mint help` para ver comandos.",
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
      // 1. Manejo del Modo Chat Interactivo
      if (isChatMode) {
        if (lower === "/exit" || lower === "exit" || lower === "/quit" || lower === "salir") {
          setIsChatMode(false);
          responseText = "[MINT BOT] Has salido del modo chat interactivo. Volviendo a consola de comandos CLI estándar.";
        } else {
          const chatRes = await api.chat.send(trimmed);
          responseText = chatRes.response;
        }
      } else if (lower === "/chat" || lower === "mint /chat" || lower === "mint chat" || lower === "chat") {
        // Activar modo chat interactivo
        setIsChatMode(true);
        responseText = [
          "[MINT BOT // MODO CHAT INTERACTIVO ACTIVADO]",
          "Ahora estás conversando directamente con el agente autónomo de Mint Studio.",
          "Respuestas fundamentadas 100% en datos reales de PostgreSQL (inventario, ROP, órdenes, telemetría). Cero alucinación.",
          "",
          "Escribe tus preguntas directamente. Para regresar al modo CLI de comandos, escribe `/exit`.",
        ].join("\n");
      } else if (
        lower.startsWith("/chat ") ||
        lower.startsWith("mint /chat ") ||
        lower.startsWith("mint chat ") ||
        lower.startsWith("chat ")
      ) {
        // Consulta directa puntual con /chat <mensaje>
        const query = trimmed.replace(/^(\/chat|mint\s+\/chat|mint\s+chat|chat)\s+/i, "").trim();
        if (!query) {
          setIsChatMode(true);
          responseText = "[MINT BOT] Modo chat interactivo activado. Escribe tu pregunta operativa o `/exit` para salir.";
        } else {
          const chatRes = await api.chat.send(query);
          responseText = chatRes.response;
        }
      } else if (lower.includes("help") || lower.includes("ayuda")) {
        responseText = [
          "[COMANDOS DISPONIBLES EN MINT CLI]:",
          "• /chat <mensaje> -> Habla con el agente autónomo (respuestas 100% reales, sin alucinación)",
          "• /chat           -> Entra en modo interactivo continuo de chat (/exit para volver)",
          "• mint scan       -> Alertas ROP reales desde /api/inventory/rop-alerts",
          "• mint stock      -> Resumen de inventario desde /api/inventory/summary",
          "• mint approve    -> Decisiones pendientes desde /api/decisions/pending",
          "• mint briefing   -> Costos de agente desde /api/telemetry/costs",
          "• clear           -> Limpia la pantalla de la terminal",
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
        // Enrutamiento inteligente al bot si el usuario escribe una pregunta en lenguaje natural sin /chat
        const chatRes = await api.chat.send(trimmed);
        responseText = chatRes.response;
      }
    } catch (err: any) {
      responseText = `[ERROR] ${err?.message || "No se pudo procesar la consulta con el agente."}`;
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

  const QUICK_COMMANDS = ["/chat", "mint scan", "mint stock", "mint approve", "mint briefing"];

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
            {isChatMode ? "Modo Chat activo con el agente" : "Click para desplegar terminal o interactuar con el bot"}
          </span>
        </div>

        {/* Quick Command Chips */}
        <div
          className="flex items-center gap-compact"
          onClick={(e) => e.stopPropagation()}
        >
          {QUICK_COMMANDS.map((quickCmd) => (
            <button
              key={quickCmd}
              onClick={() => {
                onToggleExpand?.();
                if (quickCmd === "/chat") {
                  setIsChatMode(true);
                  setTimeout(() => void handleRunCommand("/chat"), 100);
                } else {
                  setIsChatMode(false);
                  setTimeout(() => void handleRunCommand(quickCmd), 100);
                }
              }}
              className={`px-compact py-hairline rounded-control text-caption font-mono border transition-colors ${
                quickCmd === "/chat"
                  ? "bg-brand text-canvas font-semibold border-brand hover:bg-brand-lime hover:text-canvas"
                  : "bg-raised hover:bg-brand hover:text-canvas text-secondary border-border"
              }`}
            >
              {quickCmd === "/chat" ? "💬 /chat" : quickCmd}
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
          {isChatMode ? (
            <span className="text-caption font-mono px-compact py-hairline rounded-pill bg-brand text-canvas font-semibold border border-brand flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Chat con Bot Activo · /exit para salir
            </span>
          ) : (
            <span className="text-caption font-mono px-compact py-hairline rounded-pill bg-brand-surface text-brand border border-border">
              Consola Operativa
            </span>
          )}
        </div>

        {/* Actions & Minimize Button */}
        <div className="flex items-center gap-compact">
          <div data-lenis-prevent className="flex items-center gap-hairline overflow-x-auto text-caption font-mono">
            {QUICK_COMMANDS.map((quickCmd) => (
              <button
                key={quickCmd}
                onClick={() => {
                  if (quickCmd === "/chat") {
                    setIsChatMode(true);
                    void handleRunCommand("/chat");
                  } else {
                    void handleRunCommand(quickCmd);
                  }
                }}
                disabled={isRunning}
                className={`px-compact py-hairline rounded-control border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  quickCmd === "/chat"
                    ? isChatMode
                      ? "bg-brand text-canvas font-bold border-brand"
                      : "bg-brand/20 text-brand border-brand hover:bg-brand hover:text-canvas"
                    : "bg-raised hover:bg-brand hover:text-canvas text-secondary border-border"
                }`}
              >
                {quickCmd === "/chat" ? "💬 /chat" : quickCmd}
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
                <span className="text-brand font-bold">
                  {isChatMode ? "mint (bot) >" : "mint >"}
                </span>
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
            <span>{isChatMode ? "Consultando agente autónomo (cero alucinación)…" : "Consultando backend…"}</span>
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Input Bar */}
      <div className="p-element bg-panel border-t border-border flex items-center gap-compact">
        <span className={`font-mono text-caption font-bold pl-compact select-none ${isChatMode ? "text-brand-lime" : "text-brand"}`}>
          {isChatMode ? "mint (bot) >" : "mint >"}
        </span>
        <input
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder={
            isChatMode
              ? "Pregunta lo que sea al bot (ej. ¿cuántos SKUs están en quiebre?, o escribe /exit)..."
              : "Escribe /chat <pregunta>, un comando o directiva (ej. /chat estado de stock, help)..."
          }
          className="flex-1 bg-transparent text-caption font-mono text-primary placeholder:text-muted focus:outline-none disabled:opacity-60"
        />
        <button
          onClick={() => void handleRunCommand(inputCommand)}
          disabled={isRunning}
          className={`p-hairline rounded-control transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isChatMode ? "bg-brand-lime hover:bg-brand text-canvas" : "bg-brand hover:bg-brand/90 text-canvas"
          }`}
          title="Enviar al agente"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
