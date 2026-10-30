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
  const [isCompanyMenuOpen, setIsCompanyMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(preferences.sidebarCollapsed);
  const [selectedCompany, setSelectedCompany] = useState(preferences.defaultCompany);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

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
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-primary font-sans antialiased">
      {/* 1. Barra Superior de 52px con selector de empresa, rol y presencia del agente */}
      <header className="fixed top-0 left-0 right-0 h-[52px] bg-panel border-b border-border flex items-center justify-between px-base z-40">
        {/* Identidad Mint & Selector de Empresa */}
        <div className="flex items-center gap-compact">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-compact rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors cursor-pointer"
            title="Alternar barra lateral"
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
            >
              <Building2 className="w-3.5 h-3.5 text-brand" />
              <span className="truncate max-w-[200px]">{selectedCompany}</span>
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
                  className="absolute left-0 mt-2 w-72 rounded-container bg-raised border border-strong shadow-popover p-compact z-50"
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
        <div className="hidden md:flex items-center max-w-sm w-full mx-group">
          <CommandSearch records={searchRecords} onSelectTab={onSelectTab} />
        </div>

        {/* Acciones de la Derecha */}
        <div className="flex items-center gap-compact">
          {/* Indicador de estado del agente */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-pill bg-raised border border-border">
            <span className="w-2 h-2 rounded-pill bg-state-ok" />
            <span className="text-caption text-secondary font-medium whitespace-nowrap">
              {agentStatusText}
            </span>
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
            className={`w-8 h-8 rounded-pill bg-panel border border-border flex items-center justify-center transition-colors cursor-pointer ${isTerminalOpen ? "text-brand border-brand" : "text-secondary hover:text-primary"
              }`}
            title="Consola de telemetría (Ctrl+J)"
          >
            <Terminal className="w-4 h-4" />
          </button>

          {/* Notificaciones: lista con destino propio por aviso */}
          <NotificationsPopover notifications={notifications} onSelectTab={onSelectTab} />

          <div className="h-4 w-px bg-border" />

          {/* Perfil de usuario con menú */}
          <ProfileMenu companyName={selectedCompany} onSelectTab={onSelectTab} />
        </div>
      </header>

      {/* 2. Barra Lateral de 232px (colapsable a 64px) con 7 Destinos */}
      <aside
        className={`mt-[52px] border-r border-border bg-panel flex flex-col justify-between p-compact z-30 flex-shrink-0 h-[calc(100vh-52px)] overflow-y-auto transition-all duration-150 ${isSidebarCollapsed ? "w-16" : "w-[232px]"
          }`}
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
                onClick={() => onSelectTab(item.id)}
                className={`relative w-full flex items-center justify-between px-3 py-2 rounded-control text-body transition-colors cursor-pointer ${isSelected
                  ? "bg-raised text-primary font-medium border border-border before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-brand before:rounded-r-full"
                  : "text-secondary hover:text-primary hover:bg-raised/40 font-normal"
                  }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-compact truncate">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${isSelected ? "text-brand" : "text-secondary"
                      }`}
                  />
                  {!isSidebarCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </div>

                {!isSidebarCollapsed && item.badge !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-pill bg-canvas text-caption font-mono font-medium text-state-pending border border-state-pending/30">
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
              <span>Sistema UI (Dev)</span>
            </button>
          )}

          {!isSidebarCollapsed && (
            <div className="p-compact rounded-control bg-raised/50 border border-border flex items-center justify-between">
              <span className="text-caption font-medium text-secondary">Mint Back Office</span>
              <span className="text-caption font-mono text-muted">v2.0</span>
            </div>
          )}
        </div>
      </aside>

      {/* 3. Área de Trabajo Principal */}
      <div className="flex-1 mt-[52px] h-[calc(100vh-52px)] flex flex-col relative overflow-hidden bg-canvas">
        <main className="flex-1 overflow-y-auto flex flex-col">
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
              className="absolute bottom-0 left-0 right-0 h-72 z-30 bg-panel border-t border-strong shadow-dialog flex flex-col"
            >
              <div className="flex items-center justify-between px-base py-compact bg-raised border-b border-border">
                <div className="flex items-center gap-compact">
                  <Terminal className="w-3.5 h-3.5 text-brand" />
                  <span className="text-caption font-mono font-medium text-primary">
                    Consola de Telemetría & Diagnóstico Mint
                  </span>
                  <span className="text-caption font-mono text-muted">
                    (Ctrl+J)
                  </span>
                </div>
                <button
                  onClick={() => setIsTerminalOpen(false)}
                  className="p-1 rounded-control text-secondary hover:text-primary hover:bg-panel transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden p-compact">
                <CliTerminalPanel isExpanded={true} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
