import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  CheckCircle2,
  Boxes,
  FileText,
  Sparkles,
  BarChart3,
  Settings,
  Bell,
  Search,
  ChevronDown,
  Building2,
  Terminal,
  X,
} from "lucide-react";
import { AgentParticleOrb, AgentState } from "../ui/AgentParticleOrb";
import { CliTerminalPanel } from "../panels/CliTerminalPanel";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface AppShellProps {
  children: React.ReactNode;
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  pendingApprovalsCount?: number;
  agentState?: AgentState;
  agentStatusText?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  currentTab,
  onSelectTab,
  pendingApprovalsCount = 2,
  agentState = "pensando",
  agentStatusText = "Vigilando inventario y órdenes",
}) => {
  const [selectedCompany, setSelectedCompany] = useState<string>(
    "Ferretería Industrial Santandereana S.A.S."
  );
  const [isCompanyMenuOpen, setIsCompanyMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

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

  const companiesList = [
    "Ferretería Industrial Santandereana S.A.S.",
    "Distribuidora Andina de Herramientas",
    "Suministros del Oriente S.A.",
  ];

  // 7 Destinos Principales por Tarea de Negocio (DESIGN.md v2)
  const navItems: NavItem[] = [
    { id: "inicio", label: "Inicio", icon: Home },
    {
      id: "aprobaciones",
      label: "Aprobaciones",
      icon: CheckCircle2,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    { id: "inventario", label: "Inventario", icon: Boxes },
    { id: "compras", label: "Compras", icon: FileText },
    { id: "agente", label: "Agente", icon: Sparkles },
    { id: "reportes", label: "Reportes", icon: BarChart3 },
    { id: "ajustes", label: "Ajustes", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-primary font-sans antialiased">
      {/* 1. Header Bar Unificado con Tokens de Diseño v2 */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-panel border-b border-subtle flex items-center justify-between px-6 z-40">
        {/* Brand & Wordmark */}
        <div className="flex items-center gap-3">
          <motion.div
            onClick={() => onSelectTab("inicio")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <img
              src="/assets/icon.png"
              alt="Mint Logo"
              className="w-5 h-5 object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-body font-extrabold tracking-tight text-primary group-hover:text-brand-lime transition-colors">
              MINT
            </span>
          </motion.div>

          <div className="h-4 w-px bg-subtle" />

          {/* Selector de Empresa */}
          <div className="relative">
            <button
              onClick={() => setIsCompanyMenuOpen(!isCompanyMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-control text-caption font-medium text-secondary hover:text-primary bg-elevated border border-subtle transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-brand-lime" />
              <span className="truncate max-w-[240px]">{selectedCompany}</span>
              <ChevronDown
                className={`w-3 h-3 text-secondary transition-transform duration-200 ${
                  isCompanyMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {isCompanyMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.16 }}
                  className="absolute left-0 mt-2 w-72 rounded-panel bg-panel border border-bright shadow-dialog p-2 z-50"
                >
                  <div className="text-caption font-semibold text-secondary px-2.5 py-1">
                    Sedes y Empresas
                  </div>
                  {companiesList.map((comp) => (
                    <button
                      key={comp}
                      onClick={() => {
                        setSelectedCompany(comp);
                        setIsCompanyMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-control text-caption transition-colors flex items-center justify-between cursor-pointer ${
                        selectedCompany === comp
                          ? "bg-elevated text-brand-lime font-medium border border-subtle"
                          : "text-secondary hover:bg-elevated/50 hover:text-primary"
                      }`}
                    >
                      <span className="truncate">{comp}</span>
                      {selectedCompany === comp && (
                        <span className="w-1.5 h-1.5 rounded-pill bg-brand-lime" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Buscador Central */}
        <div className="hidden md:flex items-center max-w-md w-full mx-6">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar órdenes, SKUs, proveedores o decisiones..."
              className="w-full bg-canvas border border-subtle hover:border-bright focus:border-brand-lime rounded-control pl-9 pr-12 py-1.5 text-caption text-primary placeholder:text-tertiary focus:outline-none transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-caption font-mono px-1.5 py-0.5 rounded-control bg-elevated border border-subtle text-secondary">
              ⌘F
            </kbd>
          </div>
        </div>

        {/* Controles de la Derecha */}
        <div className="flex items-center gap-3">
          {/* Indicador del Agente */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-pill bg-elevated border border-subtle shadow-subtle flex-shrink-0">
            <AgentParticleOrb size={16} state={agentState} className="flex-shrink-0" />
            <span className="text-caption text-secondary font-medium whitespace-nowrap">{agentStatusText}</span>
          </div>

          {/* Botón Discreto Telemetría (Ctrl+J) */}
          <button
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            className={`w-8 h-8 rounded-pill bg-elevated border border-subtle flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
              isTerminalOpen ? "text-brand-lime border-brand-lime" : "text-secondary hover:text-primary"
            }`}
            title="Consola de telemetría (Ctrl+J)"
          >
            <Terminal className="w-4 h-4" />
          </button>

          {/* Botón Notificaciones / Aprobaciones */}
          <button
            onClick={() => onSelectTab("aprobaciones")}
            className="relative w-8 h-8 rounded-pill bg-elevated border border-subtle flex items-center justify-center text-secondary hover:text-primary transition-colors cursor-pointer flex-shrink-0"
            title="Aprobaciones y notificaciones"
          >
            <Bell className="w-4 h-4" />
            {pendingApprovalsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-pill bg-state-pending text-caption font-bold text-white flex items-center justify-center px-1 font-mono">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          <div className="h-4 w-px bg-subtle flex-shrink-0" />

          {/* Avatar de Usuario */}
          <div className="flex items-center gap-2.5 pl-1 cursor-pointer group flex-shrink-0">
            <div className="w-8 h-8 rounded-pill bg-elevated border border-subtle flex items-center justify-center text-caption font-bold text-brand-lime font-mono">
              FS
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-caption font-semibold text-primary group-hover:text-brand-lime transition-colors leading-tight whitespace-nowrap">
                Fernando S.
              </p>
              <p className="text-caption text-tertiary leading-none mt-0.5 whitespace-nowrap">
                Director de Operaciones
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Barra Lateral de Navegación (7 Destinos Principales) */}
      <aside className="w-60 mt-14 border-r border-subtle bg-panel flex flex-col justify-between p-4 z-30 flex-shrink-0 h-[calc(100vh-3.5rem)] overflow-y-auto">
        <div className="space-y-1">
          <div className="px-3 py-1 mb-2 text-caption text-secondary font-medium">
            Módulos de Trabajo
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected =
              currentTab === item.id ||
              (item.id === "compras" && currentTab === "compras_ordenes") ||
              (item.id === "agente" && currentTab === "flujo_agente") ||
              (item.id === "reportes" && currentTab === "analisis_reportes") ||
              (item.id === "ajustes" && (currentTab === "reglas_politicas" || currentTab === "configuracion_general"));

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-control text-body transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-elevated text-primary font-semibold border border-subtle before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-brand-lime before:rounded-r-full"
                    : "text-secondary hover:text-primary hover:bg-elevated/50 font-normal"
                }`}
              >
                <div className="relative z-10 flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isSelected ? "text-brand-lime" : "text-secondary"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className="relative z-10 text-caption font-mono px-2 py-0.5 rounded-pill bg-state-pendingBg text-state-pending border border-state-pendingBorder font-semibold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tarjeta de Pie con Estado de Versión */}
        <div className="pt-3 mt-4 border-t border-subtle">
          <div className="p-3 rounded-control bg-elevated border border-subtle flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-pill bg-state-ok flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-caption font-semibold text-primary whitespace-nowrap">
                  Mint Back Office
                </span>
                <span className="text-caption font-mono text-tertiary">v2.0</span>
              </div>
              <p className="text-caption text-secondary leading-tight truncate">
                Supervisión autónoma activa
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* 3. Área de Trabajo Principal */}
      <div className="flex-1 mt-14 h-[calc(100vh-3.5rem)] flex flex-col relative overflow-hidden bg-canvas">
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
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="absolute bottom-0 left-0 right-0 h-72 z-30 bg-panel border-t border-subtle shadow-dialog flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-2 bg-elevated border-b border-subtle">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-brand-lime" />
                  <span className="text-caption font-mono font-bold text-primary">
                    Consola de Telemetría Mint
                  </span>
                  <span className="text-caption font-mono text-tertiary">
                    (Ctrl+J para alternar)
                  </span>
                </div>
                <button
                  onClick={() => setIsTerminalOpen(false)}
                  className="p-1 rounded-control hover:bg-panel text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden p-2">
                <CliTerminalPanel isExpanded={true} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
