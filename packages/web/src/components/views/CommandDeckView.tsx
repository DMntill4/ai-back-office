import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  TerminalSquare,
  Play,
  RotateCcw,
  Pin,
  Trash2,
  Clock,
  Sparkles,
  Palette,
  Bot,
  ShieldAlert,
  FileSpreadsheet,
  FileText,
  Activity,
  Stethoscope,
  Target,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  EyeOff,
  ChevronRight,
} from "lucide-react";
import {
  COMMAND_REGISTRY,
  SlashCommand,
  CommandExecution,
  getPinnedCommands,
  togglePinCommand,
  SlashCategory,
} from "../../services/commandRegistry";
import { ThemeFactoryWidget } from "../deck/ThemeFactoryWidget";
import { DaemonControlWidget } from "../deck/DaemonControlWidget";
import { AgentDecisionWidget } from "../deck/AgentDecisionWidget";
import { HealthChecklistWidget } from "../deck/HealthChecklistWidget";
import { MetricsCardWidget } from "../deck/MetricsCardWidget";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { useLenisScroll } from "../../hooks/useLenisScroll";

interface CommandDeckViewProps {
  onNavigateTo?: (tab: string) => void;
}

const CATEGORY_LABELS: Record<SlashCategory, string> = {
  automation: "Operaciones y Automatización",
  agents: "Agentes y Demonio",
  inventory: "Inventario y Stock",
  system: "Sistema y Diagnóstico",
  ui: "UI y Plataforma",
};

export const CommandDeckView: React.FC<CommandDeckViewProps> = ({ onNavigateTo }) => {
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollWrapperRef, scrollContentRef);

  const [inputVal, setInputVal] = useState<string>("");
  const [selectedCmd, setSelectedCmd] = useState<SlashCommand | null>(null);
  const [argValues, setArgValues] = useState<Record<string, string>>({});
  const [showPalette, setShowPalette] = useState<boolean>(false);
  const [paletteIndex, setPaletteIndex] = useState<number>(0);
  const [pinnedList, setPinnedList] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("todas");

  // Historial de ejecuciones en Run Cards estructuradas
  const [executions, setExecutions] = useState<CommandExecution[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Inicializar estado y primera ejecución demostrativa (/theme-factory)
  useEffect(() => {
    setPinnedList(getPinnedCommands());

    // Run Card inicial pre-cargada para que el usuario pueda interactuar de inmediato
    const initialRun: CommandExecution = {
      id: `run_${Math.random().toString(36).substring(2, 8)}`,
      command: "/theme-factory",
      rawInput: "/theme-factory mode=mint-dark",
      parsedArgs: { mode: "mint-dark" },
      status: "success",
      latencyMs: 14,
      timestamp: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      renderType: "theme-preview",
      resultData: { mode: "mint-dark" },
      isPinned: true,
    };
    setExecutions([initialRun]);
  }, []);

  // Filtrado de comandos para la paleta de autocompletado
  const filteredCommands = useMemo(() => {
    const q = inputVal.trim().toLowerCase();
    const cleanQ = q.startsWith("/") ? q.slice(1) : q;
    return COMMAND_REGISTRY.filter((cmd) => {
      const matchText =
        cmd.command.toLowerCase().includes(cleanQ) ||
        cmd.title.toLowerCase().includes(cleanQ) ||
        cmd.description.toLowerCase().includes(cleanQ);
      return matchText;
    });
  }, [inputVal]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);

    if (val.startsWith("/") || val.length > 0) {
      setShowPalette(true);
      setPaletteIndex(0);
    } else {
      setShowPalette(false);
    }

    // Si coincide exactamente con un comando
    const exact = COMMAND_REGISTRY.find((c) => c.command.toLowerCase() === val.split(" ")[0].toLowerCase());
    if (exact && exact !== selectedCmd) {
      setSelectedCmd(exact);
      const defaults: Record<string, string> = {};
      exact.args?.forEach((arg) => {
        if (arg.default) defaults[arg.name] = arg.default;
      });
      setArgValues(defaults);
    }
  };

  const handleSelectCommandFromPalette = (cmd: SlashCommand) => {
    setSelectedCmd(cmd);
    setInputVal(cmd.command);
    setShowPalette(false);

    const defaults: Record<string, string> = {};
    cmd.args?.forEach((arg) => {
      if (arg.default) defaults[arg.name] = arg.default;
    });
    setArgValues(defaults);
    inputRef.current?.focus();
  };

  const executeCommand = async (cmdToRun: SlashCommand, argsToUse: Record<string, string>) => {
    const runId = `run_${Math.random().toString(36).substring(2, 8)}`;
    const startTime = performance.now();

    const newExecution: CommandExecution = {
      id: runId,
      command: cmdToRun.command,
      rawInput: `${cmdToRun.command} ${Object.entries(argsToUse).map(([k, v]) => `${k}=${v}`).join(" ")}`.trim(),
      parsedArgs: { ...argsToUse },
      status: "running",
      latencyMs: 0,
      timestamp: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      renderType: cmdToRun.renderType,
      resultData: null,
    };

    setExecutions((prev) => [newExecution, ...prev]);

    try {
      // Simular latencia de red estructurada
      await new Promise((res) => setTimeout(res, 220));

      const latency = Math.round(performance.now() - startTime);

      setExecutions((prev) =>
        prev.map((item) =>
          item.id === runId
            ? {
                ...item,
                status: "success",
                latencyMs: latency,
                resultData: { executed: true, args: argsToUse },
              }
            : item
        )
      );
    } catch (err) {
      setExecutions((prev) =>
        prev.map((item) =>
          item.id === runId
            ? {
                ...item,
                status: "error",
                latencyMs: Math.round(performance.now() - startTime),
                errorMessage: err instanceof Error ? err.message : "Error durante la ejecución del comando",
              }
            : item
        )
      );
    }
  };

  const handleRunSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCmd) {
      // Si escribió algo pero no seleccionó, tomar el primer resultado
      if (filteredCommands.length > 0) {
        const first = filteredCommands[0];
        const defaults: Record<string, string> = {};
        first.args?.forEach((arg) => {
          if (arg.default) defaults[arg.name] = arg.default;
        });
        void executeCommand(first, defaults);
        setShowPalette(false);
      }
      return;
    }

    void executeCommand(selectedCmd, argValues);
    setShowPalette(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showPalette && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPaletteIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setPaletteIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const picked = filteredCommands[paletteIndex];
        if (picked) {
          handleSelectCommandFromPalette(picked);
        }
      } else if (e.key === "Escape") {
        setShowPalette(false);
      }
    } else if (e.key === "Enter") {
      handleRunSubmit();
    }
  };

  const handleTogglePin = (cmdStr: string) => {
    const next = togglePinCommand(cmdStr);
    setPinnedList(next);
  };

  const handleClearExecutions = () => {
    setExecutions((prev) => prev.filter((e) => e.isPinned));
  };

  const getCommandIcon = (iconName: string) => {
    switch (iconName) {
      case "Palette":
        return <Palette className="w-4 h-4 text-brand" />;
      case "ShieldAlert":
        return <ShieldAlert className="w-4 h-4 text-state-attention" />;
      case "FileSpreadsheet":
        return <FileSpreadsheet className="w-4 h-4 text-brand" />;
      case "Sparkles":
        return <Sparkles className="w-4 h-4 text-brand" />;
      case "Bot":
        return <Bot className="w-4 h-4 text-brand" />;
      case "EyeOff":
        return <EyeOff className="w-4 h-4 text-secondary" />;
      case "FileText":
        return <FileText className="w-4 h-4 text-secondary" />;
      case "Activity":
        return <Activity className="w-4 h-4 text-brand" />;
      case "Stethoscope":
        return <Stethoscope className="w-4 h-4 text-state-ok" />;
      case "Target":
        return <Target className="w-4 h-4 text-brand" />;
      default:
        return <TerminalSquare className="w-4 h-4 text-brand" />;
    }
  };

  const renderWidgetContent = (item: CommandExecution) => {
    switch (item.renderType) {
      case "theme-preview":
        return <ThemeFactoryWidget initialPreset={item.parsedArgs?.mode} />;
      case "status-badge":
        return <DaemonControlWidget />;
      case "agent-tree":
        return (
          <AgentDecisionWidget
            command={item.command}
            args={item.parsedArgs}
            data={item.resultData}
            onNavigateTo={onNavigateTo}
          />
        );
      case "table":
        return <HealthChecklistWidget />;
      case "metrics-card":
        return <MetricsCardWidget command={item.command} args={item.parsedArgs} />;
      default:
        return (
          <div className="p-compact rounded-control bg-raised border border-border text-caption text-secondary">
            Resultado estructurado recibido para {item.command}.
          </div>
        );
    }
  };

  return (
    <div
      ref={scrollWrapperRef}
      className="flex-1 h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain relative"
    >
      <div
        ref={scrollContentRef}
        className="relative min-h-full bg-canvas text-primary font-sans p-base sm:p-group lg:p-page space-y-group overflow-hidden"
      >
        {/* Fondo atmosférico sutil */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0" aria-hidden="true">
          <div className="absolute -top-24 -left-24 w-[480px] h-[360px] rounded-full bg-ambient-mint opacity-70 pointer-events-none" />
        </div>

        <div className="relative z-10 space-y-group">
          {/* Header del Command Deck */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact pb-compact border-b border-border">
            <div className="flex items-center gap-compact">
              <div className="w-10 h-10 rounded-card-sm bg-panel border border-border flex items-center justify-center text-brand">
                <TerminalSquare className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-page-title font-bold text-primary flex items-center gap-2">
                  Command Deck
                  <span className="text-caption font-mono bg-raised px-2 py-0.5 rounded-pill border border-border text-brand font-medium">
                    Slash-Ops v2.4
                  </span>
                </h1>
                <p className="text-caption text-secondary">
                  Automatización estructurada, diagnósticos en tiempo real y gobernanza del agente.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-panel border border-border text-caption text-secondary">
                <span className="w-2 h-2 rounded-full bg-state-ok" />
                Demonio en línea
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-panel border border-border text-caption text-muted font-mono">
                {COMMAND_REGISTRY.length} Comandos
              </span>
            </div>
          </div>

          {/* ZONE 1: Top Command Bar (Input Inteligente con Raycast/Linear Popover) */}
          <div className="relative z-30">
            <div className="p-base rounded-card bg-panel border border-strong shadow-md space-y-compact">
              <div className="relative flex items-center">
                <div className="absolute left-3.5 pointer-events-none text-brand">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputVal}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowPalette(true)}
                  placeholder="Escribe '/' para explorar comandos estructurados (ej. /theme-factory, /audit-anomalies)..."
                  className="w-full h-11 pl-10 pr-28 text-body bg-raised text-primary border border-border rounded-control placeholder:text-muted focus:outline-none focus:border-brand transition-colors font-mono"
                />

                <div className="absolute right-2 flex items-center gap-1.5">
                  <span className="hidden sm:inline-block text-caption font-mono text-muted bg-panel px-2 py-0.5 rounded-control border border-border">
                    Enter
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleRunSubmit()}
                    icon={<Play className="w-3.5 h-3.5 fill-current" />}
                  >
                    Ejecutar
                  </Button>
                </div>
              </div>

              {/* Argumentos dinámicos del comando seleccionado */}
              {selectedCmd && selectedCmd.args && selectedCmd.args.length > 0 && (
                <div className="flex flex-wrap items-center gap-compact pt-1 text-caption">
                  <span className="text-muted font-mono">{selectedCmd.command}</span>
                  {selectedCmd.args.map((arg) => (
                    <div
                      key={arg.name}
                      className="inline-flex items-center gap-1.5 bg-raised px-2.5 py-1 rounded-control border border-border"
                    >
                      <span className="text-secondary font-medium">{arg.name}:</span>
                      {arg.type === "select" && arg.options ? (
                        <select
                          value={argValues[arg.name] || arg.default || ""}
                          onChange={(e) =>
                            setArgValues((prev) => ({ ...prev, [arg.name]: e.target.value }))
                          }
                          className="bg-transparent text-primary font-mono focus:outline-none cursor-pointer border-none text-caption"
                        >
                          {arg.options.map((opt) => (
                            <option key={opt} value={opt} className="bg-panel text-primary">
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={argValues[arg.name] || ""}
                          onChange={(e) =>
                            setArgValues((prev) => ({ ...prev, [arg.name]: e.target.value }))
                          }
                          placeholder={arg.placeholder || "valor"}
                          className="bg-transparent text-primary font-mono focus:outline-none border-b border-border text-caption w-24"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Popover flotante estilo Raycast */}
            {showPalette && filteredCommands.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 p-compact rounded-card bg-panel border border-strong shadow-xl max-h-80 overflow-y-auto space-y-1 z-40">
                <div className="px-2 py-1 text-caption text-muted font-medium flex items-center justify-between border-b border-border">
                  <span>Comandos Disponibles</span>
                  <span className="font-mono text-caption">Tab o ↑↓ para navegar</span>
                </div>
                {filteredCommands.map((cmd, idx) => {
                  const isSelected = idx === paletteIndex;
                  return (
                    <button
                      key={cmd.command}
                      type="button"
                      onClick={() => handleSelectCommandFromPalette(cmd)}
                      onMouseEnter={() => setPaletteIndex(idx)}
                      className={`w-full text-left px-3 py-2 rounded-control flex items-center justify-between gap-compact transition-colors ${
                        isSelected
                          ? "bg-brand/15 border border-brand/30 text-primary"
                          : "text-secondary hover:bg-raised"
                      }`}
                    >
                      <div className="flex items-center gap-compact min-w-0">
                        {getCommandIcon(cmd.iconName)}
                        <span className="font-mono text-body font-semibold text-primary">
                          {cmd.command}
                        </span>
                        <span className="text-caption text-secondary truncate hidden md:inline">
                          — {cmd.title}
                        </span>
                      </div>
                      <span className="text-caption font-mono text-muted bg-raised px-2 py-0.5 rounded-pill border border-border">
                        {CATEGORY_LABELS[cmd.category]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ZONE 2: Quick Automation Grid (Comandos fijados y favoritos) */}
          <div className="space-y-compact">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-caption font-bold text-secondary uppercase tracking-wider">
                Automatizaciones Rápidas
              </h3>
              <div className="flex items-center gap-1 text-caption text-muted">
                <Pin className="w-3.5 h-3.5" />
                <span>Haz clic para ejecutar directamente</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-compact">
              {COMMAND_REGISTRY.slice(0, 4).map((cmd) => {
                const isPinned = pinnedList.includes(cmd.command);
                return (
                  <div
                    key={cmd.command}
                    className="p-compact rounded-card-sm bg-panel border border-border hover:border-brand/40 hover:bg-raised transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-control bg-raised flex items-center justify-center">
                          {getCommandIcon(cmd.iconName)}
                        </div>
                        <span className="font-mono text-caption font-bold text-primary">
                          {cmd.command}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(cmd.command);
                        }}
                        className={`p-1 rounded-control transition-colors ${
                          isPinned ? "text-brand" : "text-muted hover:text-secondary opacity-0 group-hover:opacity-100"
                        }`}
                        title="Fijar comando"
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-caption text-secondary line-clamp-2 my-2 leading-relaxed">
                      {cmd.description}
                    </p>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const defaults: Record<string, string> = {};
                        cmd.args?.forEach((a) => {
                          if (a.default) defaults[a.name] = a.default;
                        });
                        setSelectedCmd(cmd);
                        setArgValues(defaults);
                        void executeCommand(cmd, defaults);
                      }}
                      className="w-full text-caption py-1 mt-1 justify-center"
                    >
                      Ejecutar ahora
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ZONE 3: Execution Stream (Run Cards Estructuradas) */}
          <div className="space-y-base">
            <div className="flex flex-wrap items-center justify-between gap-compact px-1 pb-compact border-b border-border">
              <div className="flex items-center gap-compact">
                <h3 className="text-body font-bold text-primary">
                  Historial de Ejecuciones (Run Cards)
                </h3>
                <span className="text-caption font-mono bg-raised px-2 py-0.5 rounded-pill border border-border text-secondary">
                  {executions.length} {executions.length === 1 ? "corrida" : "corridas"}
                </span>
              </div>

              {executions.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearExecutions}
                  className="inline-flex items-center gap-1.5 text-caption text-muted hover:text-state-error transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar no fijados</span>
                </button>
              )}
            </div>

            {executions.length === 0 ? (
              <Panel variant="card" className="p-group text-center space-y-compact">
                <TerminalSquare className="w-8 h-8 text-muted mx-auto" />
                <h4 className="text-body font-semibold text-primary">No hay ejecuciones recientes</h4>
                <p className="text-caption text-secondary max-w-sm mx-auto">
                  Ejecuta cualquier comando desde la barra superior o las tarjetas de acceso rápido para ver sus resultados estructurados aquí.
                </p>
              </Panel>
            ) : (
              <div className="space-y-base">
                {executions.map((exec) => (
                  <Panel
                    key={exec.id}
                    variant="card"
                    className="p-base rounded-card bg-panel border border-border hover:border-strong transition-all space-y-base"
                  >
                    {/* Header de la Run Card */}
                    <div className="flex flex-wrap items-center justify-between gap-compact pb-compact border-b border-border">
                      <div className="flex items-center gap-compact">
                        <span className="font-mono text-caption text-muted bg-raised px-2 py-0.5 rounded-pill border border-border">
                          {exec.id}
                        </span>

                        <span className="font-mono text-body font-bold text-primary">
                          {exec.rawInput}
                        </span>

                        {exec.status === "success" && (
                          <span className="inline-flex items-center gap-1 text-caption text-state-ok font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETADO
                          </span>
                        )}
                        {exec.status === "running" && (
                          <span className="inline-flex items-center gap-1 text-caption text-state-pending font-mono">
                            <RotateCcw className="w-3.5 h-3.5 animate-spin" /> EJECUTANDO
                          </span>
                        )}
                        {exec.status === "error" && (
                          <span className="inline-flex items-center gap-1 text-caption text-state-error font-mono">
                            <XCircle className="w-3.5 h-3.5" /> ERROR
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-compact text-caption text-muted">
                        <span className="font-mono">{exec.latencyMs}ms</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {exec.timestamp}
                        </span>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const found = COMMAND_REGISTRY.find((c) => c.command === exec.command);
                            if (found) void executeCommand(found, exec.parsedArgs);
                          }}
                          icon={<RotateCcw className="w-3 h-3" />}
                        >
                          Re-ejecutar
                        </Button>
                      </div>
                    </div>

                    {/* Contenido del widget estructurado */}
                    <div className="pt-compact">
                      {renderWidgetContent(exec)}
                    </div>
                  </Panel>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
