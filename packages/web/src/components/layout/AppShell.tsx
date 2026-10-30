import React, { useState } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AgentParticleOrb, AgentState } from "../ui/AgentParticleOrb";

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

  const companiesList = [
    "Ferretería Industrial Santandereana S.A.S.",
    "Distribuidora Andina de Herramientas",
    "Suministros del Oriente S.A.",
  ];

  // Canonical 18 options matching user specification
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
    <div className="flex h-screen w-screen overflow-hidden bg-forest-canvas text-txt-primary font-sans antialiased select-none">
      {/* 1. Header Bar Flotante (Flowcraft Bar Style) */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-forest-surface/90 backdrop-blur-md border-b border-forest-border flex items-center justify-between px-5 z-40">
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
              alt="Mint Guanábana Logo"
              className="w-5 h-5 object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-sm font-extrabold tracking-tight text-txt-primary group-hover:text-brand transition-colors">
              MINT
            </span>
          </motion.div>

          <div className="h-4 w-px bg-forest-border" />

          {/* Company Selector Dropdown */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsCompanyMenuOpen(!isCompanyMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-txt-secondary hover:text-txt-primary hover:bg-forest-card border border-transparent hover:border-forest-border transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-txt-tertiary" />
              <span className="truncate max-w-[240px]">{selectedCompany}</span>
              <ChevronDown
                className={`w-3 h-3 text-txt-tertiary transition-transform duration-200 ${
                  isCompanyMenuOpen ? "rotate-180" : ""
                }`}
              />
            </motion.button>

            <AnimatePresence>
              {isCompanyMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute left-0 mt-2 w-72 rounded-2xl bg-forest-card border border-forest-borderBright shadow-dialog p-1.5 z-50 backdrop-blur-md"
                >
                  <div className="text-[10px] font-semibold text-txt-tertiary px-2 py-1 uppercase tracking-wider">
                    Empresas disponibles
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
                          ? "bg-forest-border text-brand font-medium"
                          : "text-txt-secondary hover:bg-forest-surface hover:text-txt-primary"
                      }`}
                    >
                      <span className="truncate">{comp}</span>
                      {selectedCompany === comp && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Search input with subtle focus transition */}
        <div className="hidden md:flex items-center max-w-md w-full mx-6">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-txt-tertiary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar productos, proveedores, órdenes..."
              className="w-full bg-forest-card/80 border border-forest-border hover:border-forest-borderBright focus:border-brand/60 focus:bg-forest-card rounded-full pl-9 pr-4 py-1.5 text-xs text-txt-primary placeholder:text-txt-tertiary focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Right: Agent Orb, Notifications, User profile */}
        <div className="flex items-center gap-3">
          {/* Agent Presence Pill */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-forest-card border border-forest-border shadow-subtle cursor-default"
          >
            <AgentParticleOrb size={18} state={agentState} className="flex-shrink-0" />
            <span className="text-[11px] text-txt-secondary">{agentStatusText}</span>
          </motion.div>

          {/* Notification Bell with Motion Tap */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => onSelectTab("aprobaciones")}
            className="relative p-2 rounded-full hover:bg-forest-card text-txt-secondary hover:text-txt-primary transition-colors border border-transparent hover:border-forest-border cursor-pointer"
            title="Notificaciones y aprobaciones"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-brand text-[9px] font-bold text-forest-canvas flex items-center justify-center font-mono">
              3
            </span>
          </motion.button>

          <div className="h-4 w-px bg-forest-border" />

          {/* User Profile */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className="w-7 h-7 rounded-full bg-brand/15 border border-brand/30 text-brand text-xs font-bold flex items-center justify-center font-mono">
              FS
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-txt-primary leading-tight">
                Fernando S.
              </p>
              <p className="text-[10px] text-txt-tertiary leading-none">
                Administrador
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Left Sidebar Navigation (W=240px fija, con Motion layoutId fluid glider) */}
      <aside className="w-60 mt-14 border-r border-forest-border bg-forest-surface flex flex-col justify-between p-3 z-30 flex-shrink-0 h-[calc(100vh-3.5rem)] overflow-y-auto">
        <div className="space-y-4">
          {/* Top item: Inicio con layoutId */}
          <div>
            <button
              onClick={() => onSelectTab("inicio")}
              className={`relative w-full flex items-center justify-between px-3.5 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                currentTab === "inicio"
                  ? "text-brand font-semibold"
                  : "text-txt-secondary hover:text-txt-primary"
              }`}
            >
              {currentTab === "inicio" && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute inset-0 rounded-full bg-brand/15 border border-brand/30 shadow-subtle"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              <div className="relative z-10 flex items-center gap-2.5">
                <Home
                  className={`w-4 h-4 ${
                    currentTab === "inicio" ? "text-brand" : "text-txt-tertiary"
                  }`}
                />
                <span>Inicio</span>
              </div>

              {currentTab === "inicio" && (
                <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-brand" />
              )}
            </button>
          </div>

          {/* Sections from the canonical user specification */}
          {navSections.map((section) => (
            <div key={section.heading} className="space-y-0.5">
              <p className="text-[10px] font-semibold text-txt-tertiary px-3 py-1 uppercase tracking-wider">
                {section.heading}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isSelected = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`relative w-full flex items-center justify-between px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? "text-txt-primary font-semibold"
                        : "text-txt-secondary hover:text-txt-primary"
                    }`}
                  >
                    {/* Motion layoutId gliding indicator */}
                    {isSelected && (
                      <motion.div
                        layoutId="sidebar-active-indicator"
                        className="absolute inset-0 rounded-full bg-forest-card border border-forest-borderBright shadow-subtle"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}

                    <div className="relative z-10 flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                          isSelected ? "text-brand" : "text-txt-tertiary"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="relative z-10 flex items-center gap-1.5 flex-shrink-0">
                      {item.badge !== undefined && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-brand/20 text-brand border border-brand/30 font-bold">
                          {item.badge}
                        </span>
                      )}
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Brand Card */}
        <div className="pt-3 mt-4 border-t border-forest-border/80">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="p-2.5 rounded-xl bg-forest-card/70 border border-forest-border flex items-center gap-2.5"
          >
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-txt-primary">Mint</span>
                <span className="text-[10px] font-mono text-txt-tertiary">v1.0.0</span>
              </div>
              <p className="text-[10px] text-txt-secondary leading-tight truncate">
                Automatiza. Detecta. Decide.
              </p>
            </div>
          </motion.div>
        </div>
      </aside>

      {/* 3. Main Content Workspace */}
      <main className="flex-1 mt-14 h-[calc(100vh-3.5rem)] overflow-y-auto flex flex-col bg-forest-canvas">
        {children}
      </main>
    </div>
  );
};
