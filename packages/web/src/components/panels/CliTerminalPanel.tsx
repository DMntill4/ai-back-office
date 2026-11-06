import React, { useState, useRef, useEffect } from "react";
import { Terminal, Send, ChevronUp, ChevronDown, MessageSquare, CheckCircle2, Sparkles } from "lucide-react";
import { CliHistoryItem } from "../../types/workflow";
import { api, API_BASE_URL } from "../../services/apiClient";

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
  const [isChatMode, setIsChatMode] = useState(true);
  const [history, setHistory] = useState<CliHistoryItem[]>([
    {
      id: "cli_boot",
      type: "system",
      text: "[SISTEMA] Consola Autónoma Mint activa y conectada al motor multi-agente en vivo (Grok + 35 herramientas operativas + PostgreSQL). Escribe cualquier objetivo, pregunta o comando en lenguaje natural.",
      timestamp: new Date().toLocaleTimeString("es-CO", { hour12: false }),
    },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [liveSteps, setLiveSteps] = useState<string[]>([]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, liveSteps]);

  // Suscripción SSE en tiempo real mientras el agente piensa y ejecuta herramientas
  useEffect(() => {
    if (!isRunning) {
      setLiveSteps([]);
      return;
    }

    const sseUrl = `${API_BASE_URL}/events/stream`;
    let es: EventSource | null = null;
    try {
      es = new EventSource(sseUrl);
      es.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data);
          if (parsed.type === "agent_step") {
            const stepText = `[${parsed.agent || "Agente"}] ${parsed.action || "ejecutando"}: ${
              typeof parsed.details === "string" ? parsed.details.slice(0, 140) : ""
            }`;
            setLiveSteps((prev) => [...prev.slice(-5), stepText]);
          }
        } catch {
          // Ignorar tramas de keep-alive
        }
      };
    } catch {
      // Continuar sin stream si EventSource no está disponible
    }

    return () => {
      if (es) es.close();
    };
  }, [isRunning]);

  const formatAgentOutputWithEvidence = (chatRes: Awaited<ReturnType<typeof api.chat.send>>): string => {
    const blocks: string[] = [];

    if (chatRes.evidenceChain && chatRes.evidenceChain.length > 0) {
      blocks.push("[EVIDENCIA DE EJECUCIÓN AUTÓNOMA]");
      for (const step of chatRes.evidenceChain) {
        const badge = step.isSuccess
          ? step.verified
            ? "[OK · VERIFICADO EN BD]"
            : "[OK]"
          : "[FALLO -> RECUPERACIÓN]";
        const argsPreview = Object.keys(step.args || {}).length > 0 ? ` ${JSON.stringify(step.args)}` : "";
        blocks.push(`  • Paso ${step.stepIndex}: ${step.toolName}${argsPreview} ${badge}`);
        if (step.verificationDetail) {
          blocks.push(`    ↳ ${step.verificationDetail}`);
        }
      }
      if (chatRes.steps !== undefined || chatRes.totalTokens !== undefined) {
        blocks.push(
          `  • Telemetría: ${chatRes.steps ?? chatRes.evidenceChain.length} pasos | ${
            chatRes.totalTokens ?? 0
          } tokens | $${chatRes.totalCost ?? "0.0000"} USD${chatRes.caseId ? ` | Caso: ${chatRes.caseId}` : ""}`,
        );
      }
      blocks.push("────────────────────────────────────────────────────────────────────────");
    } else if (chatRes.caseId) {
      blocks.push(
        `[EJECUCIÓN DIRECTA DEL AGENTE · Caso: ${chatRes.caseId} · Tokens: ${chatRes.totalTokens ?? 0} · Costo: $${
          chatRes.totalCost ?? "0.0000"
        } USD]`,
      );
    }

    blocks.push(chatRes.response);
    return blocks.join("\n");
  };

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

    if (lower === "clear" || lower === "limpiar" || lower === "/clear") {
      setHistory([]);
      setInputCommand("");
      return;
    }

    setHistory((prev) => [...prev, userItem]);
    setInputCommand("");
    setIsRunning(true);
    setLiveSteps(["Iniciando deliberación en el coordinador multi-agente..."]);

    let responseText = "";

    try {
      if (lower === "/help" || lower === "help" || lower === "mint help") {
        responseText = [
          "[CONSOLA AUTÓNOMA MINT — CAPACIDADES EN VIVO]:",
          "• Cualquier objetivo en lenguaje natural se ejecuta en el bucle real del agente (runAgentLoop + Grok + 35 herramientas):",
          "  - «Investiga la situación actual del inventario y dime qué requiere atención urgente»",
          "  - «Revisa si hay movimientos sospechosos o problemas de salud de datos»",
          "  - «Envía una notificación por Telegram con el resumen ejecutivo de hoy»",
          "  - «Crea un respaldo de continuidad operativa ahora mismo»",
          "• Comandos directos rápidos:",
          "  - mint scan       -> Consulta directa de alertas de punto de reorden (/api/inventory/rop-alerts)",
          "  - mint stock      -> Resumen verificado de inventario (/api/inventory/summary)",
          "  - mint approve    -> Propuestas pendientes de firma (/api/decisions/pending)",
          "  - clear           -> Limpia la pantalla de la consola",
        ].join("\n");
      } else if (lower === "mint scan" || lower === "/scan") {
        const res = await api.inventory.ropAlerts();
        const alerts = Array.isArray(res?.data) ? res.data : [];
        if (alerts.length === 0) {
          responseText = "[OK] Sin alertas de reorden activas. Todas las referencias están sobre su umbral mínimo.";
        } else {
          const lines = alerts.slice(0, 10).map((a: any) => {
            const current = Number(a.totalStock ?? a.currentStock ?? 0);
            const rop = Number(a.reorderPoint ?? a.ropThreshold ?? a.minStock ?? 0);
            const deficit = Math.max(0, rop - current);
            return `• ${a.sku} (${a.name ?? "—"}): stock ${current} / ROP ${rop} -> DÉFICIT: ${deficit} u. (Sugerido: ${a.suggestedOrderQty ?? deficit} u.)`;
          });
          responseText = [`[ALERTAS REALES DE REORDEN] ${alerts.length} referencias bajo punto de reorden:`, ...lines].join("\n");
        }
      } else if (lower === "mint stock" || lower === "/stock") {
        const res = await api.inventory.summary();
        const s: any = res?.data ?? {};
        responseText = [
          "[RESUMEN REAL DE INVENTARIO EN BASE DE DATOS]",
          `• SKUs totales: ${s.totalSkus ?? 0}`,
          `• Unidades físicas totales: ${Number(s.totalUnits ?? 0).toLocaleString("es-CO")}`,
          `• Bajo punto de reorden: ${s.skusBelowRop ?? s.lowStock ?? 0}`,
          `• Agotados (stock 0): ${s.skusOutOfStock ?? 0}`,
          `• Valoración total: $${Number(s.totalValuation ?? s.totalValueCop ?? 0).toLocaleString("es-CO")} ${s.currency ?? "COP"}`,
        ].join("\n");
      } else if (lower === "mint approve" || lower === "/inbox") {
        const res = await api.decisions.pending();
        const rows = Array.isArray(res?.data) ? res.data : [];
        if (rows.length === 0) {
          responseText = "[APROBACIONES] No hay decisiones pendientes de firma en este momento.";
        } else {
          const lines = rows.slice(0, 10).map(
            (d: any) => `• ${d.id} — ${d.title ?? "Decisión"} ($${Number(d.costMxn ?? 0).toLocaleString("es-CO")})`,
          );
          responseText = [`[APROBACIONES] ${rows.length} decisiones pendientes de firma:`, ...lines].join("\n");
        }
      } else {
        // Cualquier pregunta, objetivo abierto, comando /chat o instrucción va directamente al Agente Real (runAgentLoop)
        const cleanQuery = trimmed.replace(/^(\/chat|mint\s+\/chat|mint\s+chat|chat)\s*/i, "").trim() || trimmed;
        const chatRes = await api.chat.send(cleanQuery);
        responseText = formatAgentOutputWithEvidence(chatRes);
      }
    } catch (err: any) {
      responseText = `[ERROR] ${err?.message || "No se pudo procesar la directiva con el motor autónomo."}`;
    } finally {
      setIsRunning(false);
      setLiveSteps([]);
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

  const QUICK_PROMPTS = [
    { label: "Auditar inventario crítico", cmd: "Investiga la situación actual del inventario y dime qué productos agotados o críticos requieren atención inmediata." },
    { label: "Salud y anomalías de datos", cmd: "Ejecuta una auditoría de salud de datos y dime si existen registros en cuarentena o problemas operativos hoy." },
    { label: "Notificar por Telegram", cmd: "Envía una notificación operativa por Telegram con el resumen actual del inventario y alertas críticas." },
    { label: "mint scan", cmd: "mint scan" },
    { label: "mint stock", cmd: "mint stock" },
  ];

  if (!isExpanded) {
    return (
      <div
        onClick={onToggleExpand}
        className="h-11 px-base bg-panel border border-border hover:border-strong rounded-control flex items-center justify-between cursor-pointer transition-colors group select-none"
      >
        <div className="flex items-center gap-element">
          <div className="flex items-center gap-compact">
            <Terminal className="w-3.5 h-3.5 text-brand" />
            <span className="text-label font-mono font-semibold text-primary">
              Mint CLI & Agente Autónomo
            </span>
          </div>
          <span className="text-muted text-caption font-mono">•</span>
          <span className="text-caption font-mono text-secondary group-hover:text-primary transition-colors">
            Motor multi-agente en vivo (Grok + 35 herramientas)
          </span>
        </div>

        <div
          className="flex items-center gap-compact"
          onClick={(e) => e.stopPropagation()}
        >
          {QUICK_PROMPTS.slice(0, 3).map((q) => (
            <button
              key={q.label}
              onClick={() => {
                onToggleExpand?.();
                setTimeout(() => void handleRunCommand(q.cmd), 100);
              }}
              className="px-compact py-hairline rounded-control text-caption font-mono bg-raised hover:bg-brand hover:text-canvas text-secondary border border-border transition-colors"
            >
              {q.label}
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
      <div className="h-10 px-base bg-panel border-b border-border flex items-center justify-between gap-compact">
        <div className="flex items-center gap-compact min-w-0">
          <Terminal className="w-3.5 h-3.5 text-brand shrink-0" />
          <span className="text-label font-semibold text-primary font-mono truncate">
            Mint Embedded CLI
          </span>
          <span className="text-caption font-mono px-compact py-hairline rounded-pill bg-brand/15 text-brand border border-brand/30 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3" />
            Agente Autónomo Real Activo
          </span>
        </div>

        {/* Acciones rápidas y botón minimizar */}
        <div className="flex items-center gap-compact min-w-0">
          <div data-lenis-prevent className="hidden md:flex items-center gap-hairline overflow-x-auto text-caption font-mono">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q.label}
                onClick={() => void handleRunCommand(q.cmd)}
                disabled={isRunning}
                className="px-compact py-hairline rounded-control border border-border bg-raised hover:bg-brand hover:text-canvas text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {q.label}
              </button>
            ))}
          </div>

          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-hairline rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors ml-hairline"
              title="Plegar Terminal"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
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
                <span className="text-primary">{item.text}</span>
              </div>
            )}
            {item.type === "output" && (
              <div className="pl-group text-primary whitespace-pre-line text-caption bg-raised p-element rounded-control border border-border mt-hairline">
                {item.text}
              </div>
            )}
            {item.type === "system" && (
              <div className="text-caption text-secondary flex items-center gap-compact">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0" />
                <span>{item.text}</span>
              </div>
            )}
          </div>
        ))}
        {isRunning && (
          <div className="p-compact rounded-control bg-panel border border-brand/30 space-y-1">
            <div className="text-caption text-brand font-semibold flex items-center gap-compact">
              <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
              <span>Agente autónomo razonando y ejecutando herramientas reales...</span>
            </div>
            {liveSteps.map((step, idx) => (
              <div key={idx} className="text-caption text-secondary pl-4 truncate">
                ↳ {step}
              </div>
            ))}
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Input Bar */}
      <div className="p-element bg-panel border-t border-border flex items-center gap-compact">
        <span className="font-mono text-caption font-bold pl-compact select-none text-brand">
          mint &gt;
        </span>
        <input
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder="Escribe cualquier instrucción, pregunta u operación para el agente (ej. investiga el inventario y envía alerta por Telegram)..."
          className="flex-1 bg-transparent text-caption font-mono text-primary placeholder:text-muted focus:outline-none disabled:opacity-60"
        />
        <button
          onClick={() => void handleRunCommand(inputCommand)}
          disabled={isRunning}
          className="px-compact py-hairline rounded-control bg-brand hover:bg-brand/90 text-canvas font-mono text-caption font-semibold flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Ejecutar con el agente autónomo"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ejecutar</span>
        </button>
      </div>
    </div>
  );
};
