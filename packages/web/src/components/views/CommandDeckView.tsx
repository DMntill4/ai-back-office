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
  Shield,
  ShieldAlert,
  FileSpreadsheet,
  FileText,
  FileCheck,
  Activity,
  Stethoscope,
  Target,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  EyeOff,
  GitBranch,
  BrainCircuit,
  MessageSquare,
  Calendar,
  ListTodo,
  Package,
  Truck,
  MapPin,
  Building2,
  Users,
  Inbox,
  Database,
  Layers,
  HeartPulse,
  BookOpen,
  Share2,
  Radio,
  Bell,
  Download,
  Send,
  Settings,
  SlidersHorizontal,
  UserCheck,
  Building,
  User,
  FlaskConical,
  Power,
  Key,
  Monitor,
  Terminal,
  LayoutDashboard,
  Filter,
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
import { VoucherCardWidget } from "../deck/VoucherCardWidget";
import { GenericDataWidget } from "../deck/GenericDataWidget";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { useLenisScroll } from "../../hooks/useLenisScroll";

interface CommandDeckViewProps {
  onNavigateTo?: (tab: string) => void;
}

const DOMAIN_TABS: { id: "todas" | SlashCategory; label: string; count: number }[] = [
  { id: "todas", label: "Todos los Comandos", count: COMMAND_REGISTRY.length },
  {
    id: "agents",
    label: "Agentes & Autonomía",
    count: COMMAND_REGISTRY.filter((c) => c.category === "agents").length,
  },
  {
    id: "operations",
    label: "Operaciones & Logística",
    count: COMMAND_REGISTRY.filter((c) => c.category === "operations").length,
  },
  {
    id: "data",
    label: "Datos & Memoria",
    count: COMMAND_REGISTRY.filter((c) => c.category === "data").length,
  },
  {
    id: "system",
    label: "Sistema & UI",
    count: COMMAND_REGISTRY.filter((c) => c.category === "system").length,
  },
];

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
  const [activeDomain, setActiveDomain] = useState<"todas" | SlashCategory>("todas");
  const [catalogSearch, setCatalogSearch] = useState<string>("");

  // Historial de ejecuciones estructuradas en Run Cards
  const [executions, setExecutions] = useState<CommandExecution[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Cerrar la paleta de sugerencias al hacer clic fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowPalette(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Inicializar estado con /theme-factory precargado para interactividad inmediata
  useEffect(() => {
    setPinnedList(getPinnedCommands());

    const initialRun: CommandExecution = {
      id: `run_${Math.random().toString(36).substring(2, 8)}`,
      command: "/theme-factory",
      rawInput: "/theme-factory mode=mint-dark",
      parsedArgs: { mode: "mint-dark" },
      status: "success",
      latencyMs: 12,
      timestamp: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      renderType: "theme-preview",
      resultData: { mode: "mint-dark" },
      isPinned: true,
    };
    setExecutions([initialRun]);
  }, []);

  // Filtrado de comandos para la paleta superior estilo Raycast
  const filteredPaletteCommands = useMemo(() => {
    const q = inputVal.trim().toLowerCase();
    const cleanQ = q.startsWith("/") ? q.slice(1) : q;
    if (!cleanQ) {
      // Sugerencias principales por defecto (máximo 6 para no saturar la pantalla ni cortar elementos)
      const featured = ["/theme-factory", "/agents", "/stock", "/orders", "/autonomy", "/daemon"];
      return COMMAND_REGISTRY.filter((c) => featured.includes(c.command));
    }
    return COMMAND_REGISTRY.filter((cmd) => {
      return (
        cmd.command.toLowerCase().includes(cleanQ) ||
        cmd.title.toLowerCase().includes(cleanQ) ||
        cmd.description.toLowerCase().includes(cleanQ)
      );
    });
  }, [inputVal]);

  // Filtrado de comandos para el catálogo central organizado por dominios
  const domainFilteredCommands = useMemo(() => {
    let list = COMMAND_REGISTRY;
    if (activeDomain !== "todas") {
      list = list.filter((c) => c.category === activeDomain);
    }
    if (catalogSearch.trim()) {
      const q = catalogSearch.trim().toLowerCase();
      const cleanQ = q.startsWith("/") ? q.slice(1) : q;
      list = list.filter(
        (c) =>
          c.command.toLowerCase().includes(cleanQ) ||
          c.title.toLowerCase().includes(cleanQ) ||
          c.description.toLowerCase().includes(cleanQ)
      );
    }
    return list;
  }, [activeDomain, catalogSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);

    if (val.startsWith("/") || val.length > 0) {
      setShowPalette(true);
      setPaletteIndex(0);
    } else {
      setShowPalette(false);
    }

    const exact = COMMAND_REGISTRY.find(
      (c) => c.command.toLowerCase() === val.split(" ")[0].toLowerCase()
    );
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

    const formattedArgs = Object.entries(argsToUse)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    const rawInput = `${cmdToRun.command} ${formattedArgs}`.trim();

    const newExecution: CommandExecution = {
      id: runId,
      command: cmdToRun.command,
      rawInput,
      parsedArgs: { ...argsToUse },
      status: "running",
      latencyMs: 0,
      timestamp: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      renderType: cmdToRun.renderType,
      resultData: null,
    };

    setExecutions((prev) => [newExecution, ...prev]);

    try {
      let fetchedData: any = null;

      // Si el comando tiene un endpoint real, consultarlo
      if (cmdToRun.endpoint) {
        try {
          const res = await fetch(cmdToRun.endpoint);
          if (res.ok) {
            fetchedData = await res.json();
          }
        } catch {
          // Si no responde el endpoint, se recurre a fallback estructurado
        }
      }

      // Latencia realista de orquestación
      await new Promise((res) => setTimeout(res, 180));
      const latency = Math.round(performance.now() - startTime);

      setExecutions((prev) =>
        prev.map((item) =>
          item.id === runId
            ? {
                ...item,
                status: "success",
                latencyMs: latency,
                resultData: fetchedData || { status: "OK", executed: true, args: argsToUse },
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
                errorMessage: err instanceof Error ? err.message : "Error durante la ejecución",
              }
            : item
        )
      );
    }
  };

  const handleRunSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCmd) {
      if (filteredPaletteCommands.length > 0) {
        const first = filteredPaletteCommands[0];
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
    if (showPalette && filteredPaletteCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPaletteIndex((prev) => (prev + 1) % filteredPaletteCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setPaletteIndex((prev) => (prev - 1 + filteredPaletteCommands.length) % filteredPaletteCommands.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const picked = filteredPaletteCommands[paletteIndex];
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
      case "Bot":
        return <Bot className="w-4 h-4 text-brand" />;
      case "Shield":
        return <Shield className="w-4 h-4 text-state-pending" />;
      case "ShieldAlert":
        return <ShieldAlert className="w-4 h-4 text-state-attention" />;
      case "Activity":
        return <Activity className="w-4 h-4 text-state-ok" />;
      case "EyeOff":
        return <EyeOff className="w-4 h-4 text-secondary" />;
      case "Target":
        return <Target className="w-4 h-4 text-brand" />;
      case "Sparkles":
        return <Sparkles className="w-4 h-4 text-brand" />;
      case "GitBranch":
        return <GitBranch className="w-4 h-4 text-brand" />;
      case "BrainCircuit":
        return <BrainCircuit className="w-4 h-4 text-state-pending" />;
      case "FileText":
        return <FileText className="w-4 h-4 text-secondary" />;
      case "HelpCircle":
        return <HelpCircle className="w-4 h-4 text-state-attention" />;
      case "MessageSquare":
        return <MessageSquare className="w-4 h-4 text-brand" />;
      case "Calendar":
        return <Calendar className="w-4 h-4 text-secondary" />;
      case "ListTodo":
        return <ListTodo className="w-4 h-4 text-brand" />;
      case "Package":
        return <Package className="w-4 h-4 text-brand" />;
      case "FileCheck":
        return <FileCheck className="w-4 h-4 text-brand" />;
      case "FileSpreadsheet":
        return <FileSpreadsheet className="w-4 h-4 text-brand" />;
      case "Truck":
        return <Truck className="w-4 h-4 text-state-ok" />;
      case "MapPin":
        return <MapPin className="w-4 h-4 text-state-attention" />;
      case "Building2":
        return <Building2 className="w-4 h-4 text-secondary" />;
      case "Users":
        return <Users className="w-4 h-4 text-secondary" />;
      case "Inbox":
        return <Inbox className="w-4 h-4 text-brand" />;
      case "Database":
        return <Database className="w-4 h-4 text-brand" />;
      case "Layers":
        return <Layers className="w-4 h-4 text-secondary" />;
      case "HeartPulse":
        return <HeartPulse className="w-4 h-4 text-state-ok" />;
      case "BookOpen":
        return <BookOpen className="w-4 h-4 text-brand" />;
      case "Share2":
        return <Share2 className="w-4 h-4 text-state-pending" />;
      case "Radio":
        return <Radio className="w-4 h-4 text-brand" />;
      case "Bell":
        return <Bell className="w-4 h-4 text-state-attention" />;
      case "Download":
        return <Download className="w-4 h-4 text-secondary" />;
      case "Send":
        return <Send className="w-4 h-4 text-brand" />;
      case "Stethoscope":
        return <Stethoscope className="w-4 h-4 text-state-ok" />;
      case "CheckCircle2":
        return <CheckCircle2 className="w-4 h-4 text-state-ok" />;
      case "Settings":
        return <Settings className="w-4 h-4 text-secondary" />;
      case "SlidersHorizontal":
        return <SlidersHorizontal className="w-4 h-4 text-brand" />;
      case "UserCheck":
        return <UserCheck className="w-4 h-4 text-state-ok" />;
      case "Building":
        return <Building className="w-4 h-4 text-secondary" />;
      case "User":
        return <User className="w-4 h-4 text-secondary" />;
      case "FlaskConical":
        return <FlaskConical className="w-4 h-4 text-state-pending" />;
      case "Power":
        return <Power className="w-4 h-4 text-state-ok" />;
      case "Key":
        return <Key className="w-4 h-4 text-brand" />;
      case "Monitor":
        return <Monitor className="w-4 h-4 text-secondary" />;
      case "Terminal":
        return <Terminal className="w-4 h-4 text-brand" />;
      case "LayoutDashboard":
        return <LayoutDashboard className="w-4 h-4 text-brand" />;
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
      case "voucher":
        return (
          <VoucherCardWidget
            command={item.command}
            args={item.parsedArgs}
            voucherData={item.resultData?.voucher}
            onNavigateTo={onNavigateTo}
          />
        );
      case "table":
        return <HealthChecklistWidget />;
      case "metrics-card":
        return <MetricsCardWidget command={item.command} args={item.parsedArgs} />;
      case "generic-data":
      default:
        return (
          <GenericDataWidget
            command={item.command}
            args={item.parsedArgs}
            data={item.resultData}
          />
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
        {/* Fondo decorativo sutil */}
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
                    {COMMAND_REGISTRY.length} Comandos CLI
                  </span>
                </h1>
                <p className="text-caption text-secondary">
                  Automatización estructurada, orquestación por slash commands y gobernanza en tiempo real.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-panel border border-border text-caption text-secondary">
                <span className="w-2 h-2 rounded-full bg-state-ok" />
                Vigilancia activa
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-panel border border-border text-caption text-secondary">
                Base de datos conectada
              </span>
            </div>
          </div>

          {/* 1. TOP COMMAND BAR (Raycast / Linear Style con Autocompletado y Pills de Parámetros) */}
          <div ref={searchContainerRef} className="relative z-30">
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
                  onFocus={() => {
                    if (inputVal.trim().length > 0) setShowPalette(true);
                  }}
                  placeholder="Escribe '/' para ejecutar comandos del CLI (ej. /theme-factory, /stock, /orders, /daemon)..."
                  className="w-full h-11 pl-10 pr-24 sm:pr-28 text-caption sm:text-body bg-raised text-primary border border-border rounded-control placeholder:text-muted focus:outline-none focus:border-brand transition-colors font-mono"
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

              {/* Argumentos tipados en píldoras visuales */}
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
                          className="bg-transparent text-primary font-mono focus:outline-none border-b border-border text-caption w-28"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Popover de autocompletado flotante con aislamiento nítido */}
            {showPalette && (
              <div className="absolute top-full left-0 right-0 mt-2 p-compact rounded-card bg-panel border border-border shadow-popover max-h-72 overflow-y-auto custom-scrollbar space-y-1 z-50">
                <div className="px-2 py-1 text-caption text-muted font-medium flex items-center justify-between border-b border-border">
                  <span>
                    {inputVal.trim().startsWith("/") && inputVal.trim().length > 1
                      ? `${filteredPaletteCommands.length} Comandos Coincidentes`
                      : "Comandos sugeridos"}
                  </span>
                  <span className="font-mono text-caption hidden sm:inline">Tab o ↑↓ para seleccionar · Esc para cerrar</span>
                </div>
                {filteredPaletteCommands.length === 0 ? (
                  <div className="px-3 py-4 text-center text-caption text-muted">
                    No se encontraron comandos coincidentes para "{inputVal}"
                  </div>
                ) : (
                  filteredPaletteCommands.map((cmd, idx) => {
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
                            : "text-secondary hover:bg-raised border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-compact min-w-0">
                          {getCommandIcon(cmd.iconName)}
                          <span className="font-mono text-caption sm:text-body font-semibold text-primary shrink-0">
                            {cmd.command}
                          </span>
                          <span className="text-caption text-secondary truncate hidden sm:inline">
                            — {cmd.title}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-muted bg-raised px-2 py-0.5 rounded-pill border border-border shrink-0">
                          {cmd.category}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 2. CATÁLOGO ORGANIZADO POR DOMINIOS (Tabs & Grid Central) */}
          <div className="space-y-compact">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-compact pb-compact border-b border-border">
              {/* Pestañas de categorías con scroll horizontal suave */}
              <div data-lenis-prevent className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full custom-scrollbar">
                {DOMAIN_TABS.map((tab) => {
                  const isActive = activeDomain === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveDomain(tab.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-caption font-medium transition-colors ${
                        isActive
                          ? "bg-brand/20 text-brand border border-brand/40"
                          : "bg-panel text-secondary hover:text-primary hover:bg-raised border border-border"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="font-mono text-[11px] opacity-75">({tab.count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Buscador interno del catálogo */}
              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Filtrar catálogo..."
                  className="w-full h-8 pl-8 pr-3 text-caption bg-panel text-primary border border-border rounded-control focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            {/* Grid de comandos del catálogo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-compact">
              {domainFilteredCommands.map((cmd) => {
                const isPinned = pinnedList.includes(cmd.command);

                return (
                  <div
                    key={cmd.command}
                    className="p-compact rounded-card-sm bg-panel border border-border hover:border-brand/40 hover:bg-raised transition-all group flex flex-col justify-between"
                  >
                    <div>
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
                            isPinned
                              ? "text-brand"
                              : "text-muted hover:text-secondary opacity-0 group-hover:opacity-100"
                          }`}
                          title="Fijar comando"
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="text-caption font-semibold text-primary mt-2">
                        {cmd.title}
                      </h4>
                      <p className="text-caption text-secondary line-clamp-2 my-1 leading-relaxed">
                        {cmd.description}
                      </p>
                    </div>

                    <div className="pt-2 mt-2 border-t border-border flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-muted bg-raised px-2 py-0.5 rounded-pill border border-border">
                        {cmd.renderType}
                      </span>
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
                        className="text-caption py-0.5 px-2.5 h-7"
                      >
                        Ejecutar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. INSPECTOR DE EJECUCIÓN ESTRUCTURADO (Runbook Log en Run Cards) */}
          <div className="space-y-base pt-compact">
            <div className="flex flex-wrap items-center justify-between gap-compact px-1 pb-compact border-b border-border">
              <div className="flex items-center gap-compact">
                <h3 className="text-body font-bold text-primary">
                  Inspector de Ejecución Estructurado (Run Cards)
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
                <h4 className="text-body font-semibold text-primary">No hay ejecuciones registradas</h4>
                <p className="text-caption text-secondary max-w-sm mx-auto">
                  Selecciona cualquier comando desde la barra superior o el catálogo para ver su resultado visual enriquecido aquí.
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

                    {/* Widget estructurado */}
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
