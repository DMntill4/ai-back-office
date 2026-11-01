import React, { useState, useEffect, useMemo } from "react";
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
  TerminalSquare,
  X,
  Building2,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CliTerminalPanel } from "../panels/CliTerminalPanel";
import { MintLogo } from "../ui/MintLogo";
import { NotificationsPopover, AppNotification } from "./NotificationsPopover";
import { ProfileMenu } from "./ProfileMenu";
import { CommandSearch, SearchableRecord } from "./CommandSearch";
import { useUserSettings, updatePreferences, COMPANIES } from "../../hooks/useUserSettings";
import { api, API_BASE_URL } from "../../services/apiClient";
import { formatUsd, formatTokens } from "../ui/CostBadge";

export interface AppShellProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  pendingApprovalsCount?: number;
  agentStatusText?: string;
  agentState?: string;
  /** Costo acumulado en USD de la tarea en curso (Agent FinOps). */
  currentTaskCostUsd?: number;
  /** Tokens consumidos por la tarea en curso. */
  currentTaskTokens?: number;
  /** Identificador de la tarea en curso. */
  currentTaskId?: string;
  /** Avisos de la campana. */
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
  pendingApprovalsCount = 0,
  notifications = [],
  searchRecords = [],
  children,
}) => {
  const { profile, preferences } = useUserSettings();

  // 1. Estado de colapso de la barra lateral con persistencia en preferencias
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(
    () => preferences.sidebarCollapsed || (typeof window !== "undefined" && window.innerWidth < 1024),
  );

  const [isCompanyMenuOpen, setIsCompanyMenuOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(preferences.defaultCompany);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [statusTime, setStatusTime] = useState(() =>
    new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" }).format(new Date()),
  );

  // 2. Chequeo real de salud del sistema contra /api/daemon/status
  const [daemonState, setDaemonState] = useState<{
    status: "operativo" | "atencion" | "sin_verificar";
    label: string;
    detail: string;
  }>({
    status: "sin_verificar",
    label: "Sin verificar",
    detail: "Consultando servicio...",
  });

  // 3. Chequeo real de costos acumulados contra /api/telemetry/costs
  const [sessionCosts, setSessionCosts] = useState<{
    totalCostUsd: number;
    totalTokens: number;
  }>({
    totalCostUsd: 0,
    totalTokens: 0,
  });

  // Auto-colapso si la ventana es angosta (< 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth < 1024 && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSidebarCollapsed]);

  // Actualización de reloj de sincronización
  useEffect(() => {
    const timer = window.setInterval(() => {
      setStatusTime(
        new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" }).format(new Date()),
      );
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Consulta de salud real del demonio autónomo (cada 15s)
  useEffect(() => {
    let cancelled = false;
    const checkDaemon = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/daemon/status`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        if (json?.daemon?.isRunning && !json.daemon?.isPaused) {
          setDaemonState({
            status: "operativo",
            label: "Operativo",
            detail: `Ciclos: ${json.daemon.ticksCount ?? 0}`,
          });
        } else if (json?.daemon?.isPaused) {
          setDaemonState({
            status: "atencion",
            label: "En pausa",
            detail: "Vigilancia en pausa",
          });
        } else {
          setDaemonState({
            status: "sin_verificar",
            label: "Sin verificar",
            detail: "Supervisión inactiva",
          });
        }
      } catch {
        if (!cancelled) {
          setDaemonState({
            status: "sin_verificar",
            label: "Sin verificar",
            detail: "Servicio de vigilancia desconectado",
          });
        }
      }
    };

    void checkDaemon();
    const interval = setInterval(checkDaemon, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Consulta de costos reales de telemetría (cada 15s)
  useEffect(() => {
    let cancelled = false;
    const loadCosts = async () => {
      try {
        const res = await api.telemetry.costs();
        if (!cancelled && res.success && res.data?.session) {
          setSessionCosts({
            totalCostUsd: res.data.session.totalCostUsd ?? 0,
            totalTokens: res.data.session.totalTokens ?? 0,
          });
        }
      } catch {
        // Fallback seguro
      }
    };

    void loadCosts();
    const interval = setInterval(loadCosts, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Atajos globales: Ctrl+J (Terminal) y Ctrl+K (Buscador)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsTerminalOpen((prev) => !prev);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleSidebar = () => {
    const nextState = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextState);
    updatePreferences({ sidebarCollapsed: nextState });
  };

  const companiesList = COMPANIES;

  // 8 Destinos Principales según Mint-DESIGN.md
  const navItems: NavItem[] = useMemo(
    () => [
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
        id: "automatizacion",
        label: "Automatización",
        icon: TerminalSquare,
        subTabs: ["automatizacion", "comandos", "deck"],
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
    ],
    [pendingApprovalsCount],
  );

  return (
    <div className="flex h-screen h-dvh w-full max-w-full overflow-hidden bg-canvas text-primary font-sans antialiased">
      {/* =========================================================================
          BARRA LATERAL (Fase 5 - Rediseño Total sin Barra Superior)
          ========================================================================= */}
      <aside
        className={`h-screen h-dvh flex flex-col justify-between border-r border-border bg-panel flex-shrink-0 select-none transition-all duration-200 ease-out z-30 ${
          isSidebarCollapsed ? "w-[72px] px-2 py-3" : "w-[244px] px-3.5 py-3"
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Zona superior con franja Tauri Drag Region */}
          <div data-tauri-drag-region className="h-2 w-full shrink-0 select-none" aria-hidden="true" />

          {/* 1. LOGO + "Mint" Y BOTÓN DE COLAPSAR */}
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => onSelectTab("inicio")}
                className="cursor-pointer transition-transform active:scale-95 p-1"
                title="Ir a Inicio — Mint Studio"
                aria-label="Ir a Inicio"
              >
                <MintLogo size="md" showText={false} />
              </button>
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1.5 rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors cursor-pointer"
                title="Expandir barra lateral"
                aria-label="Expandir barra lateral"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full mb-3 px-1">
              <button
                type="button"
                onClick={() => onSelectTab("inicio")}
                className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-90 text-left"
                title="Ir a Inicio"
                aria-label="Ir a Inicio"
              >
                <MintLogo size="md" showText={true} />
              </button>
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1.5 rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors cursor-pointer"
                title="Contraer barra lateral"
                aria-label="Contraer barra lateral"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 2. SELECTOR DE EMPRESA CON EL ROL COMO SUBTÍTULO */}
          <div className="relative mb-3">
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={() => setIsCompanyMenuOpen((open) => !open)}
                className="w-10 h-10 mx-auto rounded-control bg-raised hover:bg-panel border border-border hover:border-brand flex items-center justify-center text-brand transition-colors cursor-pointer"
                title={`${selectedCompany} · ${profile.role}`}
                aria-label={`Sede actual: ${selectedCompany}, rol: ${profile.role}`}
                aria-expanded={isCompanyMenuOpen}
              >
                <Building2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCompanyMenuOpen((open) => !open)}
                className="w-full flex items-center justify-between p-2 rounded-container bg-raised/50 hover:bg-raised border border-border hover:border-strong transition-colors cursor-pointer text-left group"
                aria-label={`Sede actual: ${selectedCompany}, rol: ${profile.role}`}
                aria-expanded={isCompanyMenuOpen}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-control bg-panel border border-border flex items-center justify-center text-brand shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-caption font-semibold text-primary group-hover:text-brand transition-colors truncate">
                      {selectedCompany}
                    </div>
                    <div className="text-caption text-muted truncate">
                      {profile.role}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-secondary shrink-0 transition-transform duration-150 group-hover:text-primary ${
                    isCompanyMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}

            {/* Menú flotante de empresas */}
            <AnimatePresence>
              {isCompanyMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  className={`absolute z-50 w-64 rounded-container bg-raised border border-strong shadow-popover p-compact ${
                    isSidebarCollapsed ? "left-full top-0 ml-2" : "left-0 top-full mt-1.5"
                  }`}
                >
                  <div className="text-caption font-medium text-muted px-2.5 py-1 border-b border-border mb-1">
                    Sedes y Empresas
                  </div>
                  {companiesList.map((comp) => (
                    <button
                      key={comp}
                      type="button"
                      onClick={() => {
                        setSelectedCompany(comp);
                        setIsCompanyMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-control text-caption transition-colors flex items-center justify-between cursor-pointer ${
                        selectedCompany === comp
                          ? "bg-panel text-brand font-medium border border-border"
                          : "text-secondary hover:bg-panel/70 hover:text-primary"
                      }`}
                    >
                      <span className="truncate">{comp}</span>
                      {selectedCompany === comp && <span className="w-1.5 h-1.5 rounded-pill bg-brand shrink-0" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. BOTÓN DE BÚSQUEDA "Buscar o ir a… Ctrl K" */}
          {isSidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-10 h-10 mx-auto rounded-control bg-raised/40 hover:bg-raised border border-border hover:border-strong text-secondary hover:text-primary flex items-center justify-center transition-colors cursor-pointer mb-3.5"
              title="Buscar o ir a… (Ctrl K)"
              aria-label="Buscar o ir a…"
            >
              <Search className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-control bg-raised/40 hover:bg-raised border border-border hover:border-strong text-caption text-secondary hover:text-primary transition-colors cursor-pointer group mb-3.5"
              aria-label="Buscar o ir a… (Ctrl K)"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="w-3.5 h-3.5 text-muted group-hover:text-primary shrink-0" />
                <span className="truncate text-caption">Buscar o ir a…</span>
              </div>
              <kbd className="text-caption font-mono px-1.5 py-0.2 rounded bg-canvas border border-border text-muted shrink-0">
                Ctrl K
              </kbd>
            </button>
          )}

          {/* 4. NAVEGACIÓN ACTUAL (8 Destinos con píldora verde translúcida activa) */}
          <nav className="space-y-1 flex-1 overflow-y-auto custom-scrollbar pr-0.5" aria-label="Navegación principal">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected =
                currentTab === item.id ||
                Boolean(item.subTabs && item.subTabs.includes(currentTab));

              if (isSidebarCollapsed) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    aria-current={isSelected ? "page" : undefined}
                    aria-label={item.label}
                    title={item.label}
                    className={`relative w-10 h-10 mx-auto rounded-pill flex items-center justify-center transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-brand/15 text-brand border border-brand/30"
                        : "text-secondary hover:text-primary hover:bg-raised/40 border border-transparent"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? "text-brand" : "text-secondary"}`} />
                    {item.badge !== undefined && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-3.5 rounded-pill bg-state-pending text-canvas text-caption font-mono font-bold flex items-center justify-center px-1">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isSelected ? "page" : undefined}
                  title={item.label}
                  className={`relative w-full flex items-center justify-between px-3 py-2 rounded-pill text-caption transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-brand/12 text-brand font-medium border border-brand/20"
                      : "text-secondary hover:text-primary hover:bg-raised/40 font-normal border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isSelected ? "text-brand" : "text-secondary"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-pill text-caption font-mono font-medium ${
                        isSelected
                          ? "bg-brand/20 text-brand"
                          : "bg-canvas text-state-pending border border-state-pending/30"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 5. ESPACIO FLEXIBLE Y SECCIÓN INFERIOR */}
        <div className="pt-2 mt-auto border-t border-border flex flex-col">
          {/* 6. FILA DE UTILIDADES: Botón de terminal y Notificaciones */}
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2 mb-2.5">
              <button
                type="button"
                onClick={() => setIsTerminalOpen((open) => !open)}
                className={`w-10 h-10 rounded-control border flex items-center justify-center transition-colors cursor-pointer ${
                  isTerminalOpen
                    ? "bg-brand/15 text-brand border-brand/30"
                    : "bg-raised border-border text-secondary hover:text-primary hover:bg-panel"
                }`}
                title="Consola interactiva de telemetría (Ctrl+J)"
                aria-label="Abrir consola interactiva"
                aria-pressed={isTerminalOpen}
              >
                <Terminal className="w-4 h-4" />
              </button>

              <NotificationsPopover
                notifications={notifications}
                onSelectTab={onSelectTab}
                position="side"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 mb-2.5 px-0.5">
              <button
                type="button"
                onClick={() => setIsTerminalOpen((open) => !open)}
                className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-control border text-caption transition-colors cursor-pointer ${
                  isTerminalOpen
                    ? "bg-brand/15 text-brand border-brand/30"
                    : "bg-raised border-border text-secondary hover:text-primary hover:bg-panel"
                }`}
                title="Consola interactiva de telemetría (Ctrl+J)"
                aria-label="Abrir consola de telemetría"
                aria-pressed={isTerminalOpen}
              >
                <TerminalSquare className="w-3.5 h-3.5" />
                <span className="font-mono text-caption">Consola</span>
              </button>

              <NotificationsPopover
                notifications={notifications}
                onSelectTab={onSelectTab}
                position="up"
              />
            </div>
          )}

          {/* 7. TARJETA DE ESTADO: Punto semántico + Estado real del sistema + Costo de sesión */}
          {isSidebarCollapsed ? (
            <div
              className="mx-auto mb-2.5 flex items-center justify-center w-8 h-8 rounded-control bg-raised/40 border border-border cursor-help"
              title={`Sistema: ${daemonState.label} · Sincronizado: ${statusTime}\nCosto sesión: ${formatUsd(sessionCosts.totalCostUsd)} · ${formatTokens(sessionCosts.totalTokens)} tokens`}
              aria-label={`Estado del sistema: ${daemonState.label}`}
            >
              <span className="relative flex h-2 w-2">
                {daemonState.status === "operativo" ? (
                  <>
                    <span className="absolute inline-flex h-full w-full rounded-pill bg-brand opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-pill bg-brand-lime" />
                  </>
                ) : daemonState.status === "atencion" ? (
                  <span className="relative inline-flex h-2 w-2 rounded-pill bg-state-attention" />
                ) : (
                  <span className="relative inline-flex h-2 w-2 rounded-pill bg-muted" />
                )}
              </span>
            </div>
          ) : (
            <div className="mb-2.5 p-2 rounded-container bg-raised/40 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-2 w-2 shrink-0">
                  {daemonState.status === "operativo" ? (
                    <>
                      <span className="absolute inline-flex h-full w-full rounded-pill bg-brand opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-pill bg-brand-lime" />
                    </>
                  ) : daemonState.status === "atencion" ? (
                    <span className="relative inline-flex h-2 w-2 rounded-pill bg-state-attention" />
                  ) : (
                    <span className="relative inline-flex h-2 w-2 rounded-pill bg-muted" />
                  )}
                </span>
                <span className="text-caption font-medium text-primary leading-tight">
                  {daemonState.label}
                </span>
                <span className="text-muted text-caption">·</span>
                <span className="text-caption text-muted">{statusTime}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-caption font-mono">
                <span className="text-muted text-caption font-sans">Costo sesión</span>
                <span className="text-primary font-medium">
                  {formatUsd(sessionCosts.totalCostUsd)}
                </span>
              </div>
            </div>
          )}

          {/* 8. FILA DE USUARIO: Avatar, Nombre, Rol y Menú desplegable */}
          <div className="w-full">
            <ProfileMenu
              companyName={selectedCompany}
              onSelectTab={onSelectTab}
              position={isSidebarCollapsed ? "side" : "up"}
              isCollapsed={isSidebarCollapsed}
            />
          </div>
        </div>
      </aside>

      {/* =========================================================================
          ÁREA DE TRABAJO PRINCIPAL (Limpia, a pantalla completa, sin franja superior de 52px)
          ========================================================================= */}
      <div className="flex-1 min-w-0 max-w-full h-screen h-dvh flex flex-col relative overflow-hidden bg-canvas">
        {/* Franja superior de arrastre de ventana nativa Tauri */}
        <div data-tauri-drag-region className="h-2 w-full shrink-0 select-none bg-canvas" aria-hidden="true" />

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
              className={`absolute bottom-0 left-0 right-0 ${
                isTerminalCollapsed ? "h-12" : "h-48 sm:h-72"
              } z-40 bg-panel border-t border-strong shadow-dialog flex flex-col`}
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
                    type="button"
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
                    type="button"
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
                  <div data-lenis-prevent className="h-full">
                    <CliTerminalPanel isExpanded={true} />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          PALETA FLOTANTE DE COMANDOS (Command Search Modal)
          ========================================================================= */}
      <CommandSearch
        records={searchRecords}
        onSelectTab={onSelectTab}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
};
