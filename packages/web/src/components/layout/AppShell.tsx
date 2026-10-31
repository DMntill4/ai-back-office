import React, { useState, useEffect } from "react";
import {
  Home,
  Boxes,
  FileText,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronUp,
  Terminal,
  X,
  Building2,
  Menu,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AgentParticleCloud, AgentVisualState } from "../ui/AgentParticleCloud";
import { CliTerminalPanel } from "../panels/CliTerminalPanel";
import { CostBadge } from "../ui/CostBadge";
import { NotificationsPopover, AppNotification } from "./NotificationsPopover";
import { ProfileMenu } from "./ProfileMenu";
import { CommandSearch, SearchableRecord } from "./CommandSearch";
import { useUserSettings, COMPANIES } from "../../hooks/useUserSettings";

export interface AppShellProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  pendingApprovalsCount?: number;
  agentStatusText?: string;
  agentState?: AgentVisualState;
  /** Costo acumulado en USD de la tarea en curso (Agent FinOps). */
  currentTaskCostUsd?: number;
  /** Tokens consumidos por la tarea en curso. */
  currentTaskTokens?: number;
  /** Identificador de la tarea en curso, para el tooltip del badge de costo. */
  currentTaskId?: string;
  /** Avisos de la campana (ya filtrados por las preferencias del usuario). */
  notifications?: AppNotification[];
  /** Registros dinámicos que encuentra el buscador global. */
  searchRecords?: SearchableRecord[];
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  subTabs?: string[];
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount = 2,
  agentStatusText = "Operativo · 10:24 a. m.",
  agentState = "reposo",
  currentTaskCostUsd,
  currentTaskTokens,
  currentTaskId,
  notifications = [],
  searchRecords = [],
  children,
}) => {
  const { profile, preferences } = useUserSettings();
  const [statusTime, setStatusTime] = useState(() =>
    new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" }).format(new Date()),
  );
  const [isCompanyMenuOpen, setIsCompanyMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(preferences.sidebarCollapsed);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(preferences.defaultCompany);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStatusTime(
        new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" }).format(new Date()),
      );
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Atajo global Ctrl+J / Cmd+J para abrir/cerrar consola de telemetría
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsTerminalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isMobileSidebarOpen]);

  const companiesList = COMPANIES;

  // 7 Destinos Principales según Mint-DESIGN.md
  const navItems: NavItem[] = [
    {
      id: "inicio",
      label: "Inicio",
      icon: Home,
      subTabs: ["inicio"],
    },
    {
      id: "aprobaciones",
      label: "Aprobaciones",
      icon: CheckCircle2,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      subTabs: ["aprobaciones"],
    },
    {
      id: "inventario",
      label: "Inventario",
      icon: Boxes,
      subTabs: ["inventario", "productos", "rutas_logistica"],
    },
    {
      id: "compras",
      label: "Compras",
      icon: FileText,
      subTabs: ["compras", "compras_ordenes", "proveedores"],
    },
    {
      id: "agente",
      label: "Agente",
      icon: Sparkles,
      subTabs: [
        "agente",
        "flujo_agente",
        "mapa_conocimiento",
        "memoria_agente",
        "auditoria_eventos",
        "reglas_politicas",
        "modelos",
        "nodos",
        "objetivos",
      ],
    },
    {
      id: "reportes",
      label: "Reportes",
      icon: BarChart3,
      subTabs: ["reportes", "analisis_reportes"],
    },
    {
      id: "ajustes",
      label: "Ajustes",
      icon: Settings,
      subTabs: [
        "ajustes",
        "mi_perfil",
        "preferencias",
        "configuracion_general",
        "empresas_sucursales",
        "integraciones",
        "canales_notificaciones",
        "webhooks_api",
        "roles_permisos",
      ],
    },
  ];

  return (
    <div className="flex h-screen h-dvh w-full max-w-full overflow-x-hidden bg-canvas text-primary font-sans antialiased">
      {/* 1. Barra Superior de 52px con selector de empresa, rol y presencia del agente */}
      <header className="fixed top-0 left-0 right-0 h-[52px] bg-panel border-b border-border flex items-center justify-between gap-2 px-2 sm:px-base z-40">
        {/* Identidad Mint & Selector de Empresa */}
        <div className="flex min-w-0 items-center gap-compact">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden p-compact rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors cursor-pointer"
            title="Abrir navegación"
            aria-label="Abrir navegación"
            aria-expanded={isMobileSidebarOpen}
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex p-compact rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors cursor-pointer"
            title="Alternar barra lateral"
            aria-label="Alternar barra lateral"
            aria-expanded={!isSidebarCollapsed}
          >
            <Menu className="w-4 h-4" />
          </button>

          <div
            onClick={() => onSelectTab("inicio")}
            className="flex items-center gap-compact cursor-pointer group"
          >
            {/* Presencia del agente de 24px según Mint-DESIGN.md */}
            <AgentParticleCloud size={24} state={agentState} />
            <span className="text-body font-bold tracking-tight text-primary group-hover:text-brand transition-colors">
              Mint
            </span>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Selector de Empresa Visible */}
          <div className="relative">
            <button
              onClick={() => setIsCompanyMenuOpen(!isCompanyMenuOpen)}
              className="flex items-center gap-2 px-3 py-1 rounded-pill text-caption font-medium text-secondary hover:text-primary bg-panel border border-border hover:border-strong transition-colors cursor-pointer"
              aria-label={`Sede seleccionada: ${selectedCompany}`}
            >
              <Building2 className="w-3.5 h-3.5 text-brand" />
              <span className="hidden sm:inline truncate max-w-[200px]">{selectedCompany}</span>
              <ChevronDown
                className={`w-3 h-3 text-secondary transition-transform duration-150 ${isCompanyMenuOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            <AnimatePresence>
              {isCompanyMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-7rem)] rounded-container bg-raised border border-strong shadow-popover p-compact z-50"
                >
                  <div className="text-caption font-medium text-muted px-2.5 py-1">
                    Sedes y Empresas
                  </div>
                  {companiesList.map((comp) => (
                    <button
                      key={comp}
                      onClick={() => {
                        setSelectedCompany(comp);
                        setIsCompanyMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-control text-caption transition-colors flex items-center justify-between cursor-pointer ${selectedCompany === comp
                        ? "bg-panel text-brand font-medium border border-border"
                        : "text-secondary hover:bg-panel/70 hover:text-primary"
                        }`}
                    >
                      <span className="truncate">{comp}</span>
                      {selectedCompany === comp && (
                        <span className="w-1.5 h-1.5 rounded-pill bg-brand" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Rol del usuario siempre visible */}
          <span className="hidden 2xl:inline text-caption text-secondary font-medium whitespace-nowrap">
            · {profile.role}
          </span>
        </div>

        {/* Buscador global (Ctrl/Cmd + K) */}
        <div className="hidden lg:flex items-center max-w-sm min-w-0 flex-1 mx-group">
          <CommandSearch records={searchRecords} onSelectTab={onSelectTab} />
        </div>

        {/* Acciones de la Derecha */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-compact">
          {/* Indicador de estado del agente */}
        <div className="flex lg:hidden items-center justify-center w-8 h-8 rounded-control bg-raised border border-border" title={`${agentStatusText} · ${statusTime}`} aria-label={`${agentStatusText} · ${statusTime}`}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-pill bg-brand opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-pill bg-brand-lime" />
            </span>
          </div>
        <div className="hidden lg:flex h-8 items-center gap-2 px-3 rounded-pill bg-raised border border-border">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-pill bg-brand opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-pill bg-brand-lime" />
            </span>
          <span className="text-caption text-secondary font-medium whitespace-nowrap">
            {agentStatusText.split("·")[0].trim()}
          </span>
          <span className="text-muted" aria-hidden="true">·</span>
          <span className="text-caption text-muted whitespace-nowrap">{statusTime}</span>
        </div>

          {/* Insignia de costo de la tarea y total de sesión (Agent FinOps) */}
          {preferences.showCostBadge && (
          <CostBadge
            taskCostUsd={currentTaskCostUsd}
            taskTokens={currentTaskTokens}
            taskId={currentTaskId}
            className="hidden sm:flex"
          />
          )}

          {/* Botón Discreto Telemetría (Ctrl+J) */}
          <button
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            className={`w-8 h-8 rounded-control bg-raised border border-border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${isTerminalOpen ? "text-brand border-brand" : "text-secondary hover:text-primary hover:bg-panel"
              }`}
            title="Abrir consola interactiva (Ctrl+J)"
            aria-label="Abrir consola interactiva"
            aria-pressed={isTerminalOpen}
          >
            <Terminal className="w-4 h-4" />
          </button>

          {/* Notificaciones: lista con destino propio por aviso */}
          <NotificationsPopover notifications={notifications} onSelectTab={onSelectTab} />

          <div className="h-4 w-px bg-border/60 mx-1" />

          {/* Perfil de usuario con menú */}
          <ProfileMenu companyName={selectedCompany} onSelectTab={onSelectTab} />
        </div>
      </header>

      {/* 2. Barra Lateral de 232px (colapsable a 64px) con 7 Destinos */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-x-0 top-[52px] bottom-0 z-30 bg-black/60 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Cerrar navegación"
          />
        )}
      </AnimatePresence>
      <aside
        className={`fixed left-0 top-[52px] bottom-0 z-30 w-[232px] border-r border-border bg-panel flex flex-col justify-between p-compact flex-shrink-0 overflow-y-auto transition-transform duration-200 ease-out md:static md:mt-[52px] md:h-[calc(100dvh-52px)] md:translate-x-0 ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:w-16 xl:translate-x-0 ${isSidebarCollapsed ? "xl:w-16" : "xl:w-[232px]"}`}
      >
        <div className="space-y-hairline">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected =
              currentTab === item.id ||
              (item.subTabs && item.subTabs.includes(currentTab));

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setIsMobileSidebarOpen(false);
                }}
                aria-current={isSelected ? "page" : undefined}
                className={`relative w-full flex items-center justify-between md:max-xl:justify-center px-3 py-2 rounded-control text-body transition-colors duration-150 cursor-pointer ${isSelected
                  ? "bg-raised text-primary font-medium border border-border"
                  : "text-secondary hover:text-primary hover:bg-raised/40 font-normal"
                  }`}
                title={item.label}
              >
                {isSelected && (
                  <motion.span
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-brand"
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    aria-hidden="true"
                  />
                )}
                <div className="flex items-center gap-compact truncate md:max-xl:justify-center">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${isSelected ? "text-brand" : "text-secondary"
                      }`}
                  />
                  <span className="truncate md:max-xl:hidden xl:hidden">
                    {item.label}
                  </span>
                  {!isSidebarCollapsed && (
                    <span className="hidden xl:block truncate">{item.label}</span>
                  )}
                </div>

                {!isSidebarCollapsed && item.badge !== undefined && (
                  <span className="hidden xl:inline px-1.5 py-0.2 rounded-pill bg-canvas text-caption font-mono font-medium text-state-pending border border-state-pending/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Pie de Barra Lateral: Sistema UI (solo dev) y Versión */}
        <div className="pt-compact border-t border-border space-y-compact">
          {(import.meta as any).env?.DEV && !isSidebarCollapsed && (
            <button
              onClick={() => onSelectTab("componentes")}
              className={`w-full text-left px-3 py-1.5 rounded-control text-caption flex items-center gap-2 cursor-pointer ${currentTab === "componentes"
                ? "bg-raised text-brand font-medium border border-border"
                : "text-muted hover:text-secondary"
                }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span className="hidden xl:inline">Sistema UI (Dev)</span>
            </button>
          )}

          {!isSidebarCollapsed && (
            <div className="p-compact rounded-control bg-raised/50 border border-border flex items-center justify-between">
              <span className="hidden xl:inline text-caption font-medium text-secondary">Mint Back Office</span>
              <span className="text-caption font-mono text-muted">v2.0</span>
            </div>
          )}
        </div>
      </aside>

      {/* 3. Área de Trabajo Principal */}
      <div className="flex-1 min-w-0 max-w-full mt-[52px] h-[calc(100dvh-52px)] flex flex-col relative overflow-hidden bg-canvas">
        <main className="flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden flex flex-col">
          {children}
        </main>

        {/* Panel Inferior de Telemetría (Ctrl+J) */}
        <AnimatePresence>
          {isTerminalOpen && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`absolute bottom-0 left-0 right-0 ${isTerminalCollapsed ? "h-12" : "h-48 sm:h-72"} z-30 bg-panel border-t border-strong shadow-dialog flex flex-col`}
            >
              <div className="flex min-w-0 items-center justify-between gap-compact px-compact sm:px-base py-compact bg-raised border-b border-border">
                <div className="flex min-w-0 items-center gap-compact">
                  <Terminal className="w-3.5 h-3.5 text-brand" />
                  <span className="truncate text-caption font-mono font-medium text-primary">
                    Consola de Telemetría & Diagnóstico Mint
                  </span>
                  <span className="hidden sm:inline text-caption font-mono text-muted">
                    (Ctrl+J)
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-hairline">
                  <button
                    onClick={() => setIsTerminalCollapsed((collapsed) => !collapsed)}
                    className="p-1 rounded-control text-secondary hover:text-primary hover:bg-panel transition-colors cursor-pointer"
                    title={isTerminalCollapsed ? "Expandir consola" : "Contraer consola"}
                    aria-label={isTerminalCollapsed ? "Expandir consola" : "Contraer consola"}
                  >
                    {isTerminalCollapsed ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsTerminalOpen(false)}
                    className="p-1 rounded-control text-secondary hover:text-primary hover:bg-panel transition-colors cursor-pointer"
                    title="Cerrar consola"
                    aria-label="Cerrar consola"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {!isTerminalCollapsed && (
                <div className="flex-1 overflow-hidden p-compact">
                  <CliTerminalPanel isExpanded={true} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
