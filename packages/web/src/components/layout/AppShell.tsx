import React, { useState, useEffect } from "react";
import {
  Home,
  Boxes,
  Truck,
  Users,
  FileText,
  Package,
  CheckCircle2,
  Clock,
  Shield,
  UserCheck,
  GitFork,
  Network,
  BookOpen,
  BarChart3,
  Bell,
  Terminal,
  Building2,
  Layers,
  Settings,
  ChevronDown,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AgentParticleOrb, AgentState } from "../ui/AgentParticleOrb";
import { CliTerminalPanel } from "../panels/CliTerminalPanel";

export interface AppShellProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  pendingApprovalsCount?: number;
  agentStatusText?: string;
  agentState?: AgentState;
  children: React.ReactNode;
}

interface NavSection {
  heading: string;
  items: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[];
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount = 2,
  agentStatusText = "Operativo · 10:24 a. m.",
  agentState = "reposo",
  children,
}) => {
  const [isCompanyMenuOpen, setIsCompanyMenuOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(
    "Ferretería Industrial Santandereana S.A.S."
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  // Atajo global Ctrl+J / Cmd+J para abrir/cerrar la consola de telemetría
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

  const navSections: NavSection[] = [
    {
      heading: "Operaciones",
      items: [
        { id: "inventario", label: "Inventario", icon: Boxes },
        { id: "rutas_logistica", label: "Rutas y logística", icon: Truck },
        { id: "proveedores", label: "Proveedores", icon: Users },
        { id: "compras_ordenes", label: "Compras y órdenes", icon: FileText },
        { id: "productos", label: "Productos", icon: Package },
      ],
    },
    {
      heading: "Gobernanza",
      items: [
        {
          id: "aprobaciones",
          label: "Aprobaciones",
          icon: CheckCircle2,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
        },
        { id: "auditoria_eventos", label: "Auditoría de eventos", icon: Clock },
        { id: "reglas_politicas", label: "Reglas y políticas", icon: Shield },
        { id: "roles_permisos", label: "Roles y permisos", icon: UserCheck },
      ],
    },
    {
      heading: "Inteligencia",
      items: [
        { id: "flujo_agente", label: "Flujo del agente", icon: GitFork },
        { id: "mapa_conocimiento", label: "Mapa de conocimiento", icon: Network },
        { id: "memoria_agente", label: "Memoria del agente", icon: BookOpen },
        { id: "analisis_reportes", label: "Análisis y reportes", icon: BarChart3 },
      ],
    },
    {
      heading: "Comunicaciones",
      items: [
        { id: "canales_notificaciones", label: "Canales y notificaciones", icon: Bell },
        { id: "webhooks_api", label: "Webhooks y API", icon: Terminal },
      ],
    },
    {
      heading: "Configuración",
      items: [
        { id: "empresas_sucursales", label: "Empresas y sucursales", icon: Building2 },
        { id: "integraciones", label: "Integraciones", icon: Layers },
        { id: "configuracion_general", label: "Configuración general", icon: Settings },
        { id: "componentes", label: "Sistema UI & Componentes", icon: Sparkles },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0F0D] text-zinc-100 font-sans antialiased select-none">
      {/* 1. Header Bar Unificado (#090D0B con border-white/[0.06]) */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#090D0B] border-b border-white/[0.06] flex items-center justify-between px-5 z-40">
        {/* Brand & Wordmark with vertical divider */}
        <div className="flex items-center gap-3">
          <motion.div
            onClick={() => onSelectTab("inicio")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <img
              src="/assets/icon.png"
              alt="Mint Logo"
              className="w-5 h-5 object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-sm font-extrabold tracking-tight text-white group-hover:text-lime-400 transition-colors">
              MINT
            </span>
          </motion.div>

          <div className="h-4 w-px bg-white/[0.06]" />

          {/* Company Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCompanyMenuOpen(!isCompanyMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-[#111915] border border-white/[0.06] transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[240px]">{selectedCompany}</span>
              <ChevronDown
                className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${
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
                  className="absolute left-0 mt-2 w-72 rounded-2xl bg-[#111915] border border-white/[0.08] shadow-2xl p-1.5 z-50 backdrop-blur-md"
                >
                  <div className="text-[10px] font-semibold text-zinc-500 px-2 py-1 uppercase tracking-wider">
                    Sedes y Empresas
                  </div>
                  {companiesList.map((comp) => (
                    <button
                      key={comp}
                      onClick={() => {
                        setSelectedCompany(comp);
                        setIsCompanyMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        selectedCompany === comp
                          ? "bg-emerald-500/10 text-emerald-300 font-medium border border-emerald-500/20"
                          : "text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <span className="truncate">{comp}</span>
                      {selectedCompany === comp && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Buscador con superficie #111915 rounded-xl */}
        <div className="hidden md:flex items-center max-w-md w-full mx-6">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar productos, órdenes de compra, proveedores..."
              className="w-full bg-[#111915] border border-white/[0.06] hover:border-white/[0.12] focus:border-emerald-500/50 rounded-xl pl-9 pr-12 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all shadow-inner"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-400">
              ⌘F
            </kbd>
          </div>
        </div>

        {/* Right: Iconos circulares (w-9 h-9 rounded-full bg-[#111915] border border-white/[0.06]) */}
        <div className="flex items-center gap-2.5">
          {/* Agent Presence Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#111915] border border-white/[0.06] shadow-sm">
            <AgentParticleOrb size={16} state={agentState} className="flex-shrink-0" />
            <span className="text-[11px] text-zinc-300 font-medium">{agentStatusText}</span>
          </div>

          {/* Botón Discreto Terminal / Telemetría (Ctrl+J) */}
          <button
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            className={`w-9 h-9 rounded-full bg-[#111915] border border-white/[0.06] flex items-center justify-center transition-colors cursor-pointer ${
              isTerminalOpen ? "text-emerald-400 border-emerald-500/40" : "text-zinc-400 hover:text-white"
            }`}
            title="Consola de telemetría (Ctrl+J)"
          >
            <Terminal className="w-4 h-4" />
          </button>

          {/* Botón Circular Notificaciones */}
          <button
            onClick={() => onSelectTab("aprobaciones")}
            className="relative w-9 h-9 rounded-full bg-[#111915] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Aprobaciones y notificaciones"
          >
            <Bell className="w-4 h-4" />
            {pendingApprovalsCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-[9px] font-bold text-black flex items-center justify-center font-mono">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          <div className="h-4 w-px bg-white/[0.06]" />

          {/* Avatar Circular con Nombre y Rol */}
          <div className="flex items-center gap-2.5 pl-1 cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-[#111915] border border-white/[0.06] flex items-center justify-center text-xs font-bold text-emerald-400 font-mono ring-1 ring-emerald-500/20">
              FS
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors leading-tight">
                Fernando S.
              </p>
              <p className="text-[10px] text-zinc-500 leading-none mt-0.5">
                Director de Operaciones
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Left Sidebar Navigation (#090D0B con indicador Donezo) */}
      <aside className="w-60 mt-14 border-r border-white/[0.06] bg-[#090D0B] flex flex-col justify-between p-3 z-30 flex-shrink-0 h-[calc(100vh-3.5rem)] overflow-y-auto">
        <div className="space-y-4">
          {/* Top item: Inicio */}
          <div>
            <button
              onClick={() => onSelectTab("inicio")}
              className={`relative w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                currentTab === "inicio"
                  ? "bg-[#111915] text-white font-semibold border border-white/[0.06] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:bg-emerald-400 before:rounded-r-full"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#111915]/50 font-medium"
              }`}
            >
              <div className="relative z-10 flex items-center gap-2.5">
                <Home
                  className={`w-4 h-4 ${
                    currentTab === "inicio" ? "text-emerald-400" : "text-zinc-500"
                  }`}
                />
                <span>Inicio</span>
              </div>
            </button>
          </div>

          {/* Secciones de Navegación */}
          {navSections.map((section) => (
            <div key={section.heading} className="space-y-0.5">
              <p className="text-[10px] font-semibold text-zinc-500 px-3 py-1 uppercase tracking-wider">
                {section.heading}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isSelected = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`relative w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#111915] text-white font-semibold border border-white/[0.06] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:bg-emerald-400 before:rounded-r-full"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-[#111915]/50 font-medium"
                    }`}
                  >
                    <div className="relative z-10 flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                          isSelected ? "text-emerald-400" : "text-zinc-500"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="relative z-10 flex items-center gap-1.5 flex-shrink-0">
                      {item.badge !== undefined && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Brand Card */}
        <div className="pt-3 mt-4 border-t border-white/[0.06]">
          <div className="p-2.5 rounded-xl bg-[#111915] border border-white/[0.06] flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">Mint</span>
                <span className="text-[10px] font-mono text-zinc-500">v1.0.0</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight truncate">
                Automatiza. Detecta. Decide.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* 3. Main Content Workspace (100% altura limpia) */}
      <div className="flex-1 mt-14 h-[calc(100vh-3.5rem)] flex flex-col relative overflow-hidden bg-[#0A0F0D]">
        <main className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </main>

        {/* Panel Inferior de Telemetría (Oculto por defecto, activable con Ctrl+J) */}
        <AnimatePresence>
          {isTerminalOpen && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="absolute bottom-0 left-0 right-0 h-72 z-30 bg-[#090D0B] border-t border-white/[0.08] shadow-[0_-15px_30px_rgba(0,0,0,0.6)] flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-2 bg-[#111915] border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-white">
                    Consola de Telemetría & Diagnóstico Mint
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    (Atajo: Ctrl+J)
                  </span>
                </div>
                <button
                  onClick={() => setIsTerminalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/[0.06] text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
