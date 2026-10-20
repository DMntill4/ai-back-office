import { useState, useEffect } from 'react';
import {
  Home, Sparkles, CheckSquare, Database, Activity, PanelLeftClose, PanelLeftOpen,
  Search, Plus, Download,
  CheckCircle2, Terminal, RefreshCw, Sliders, LogOut,
  TrendingUp, Truck, Settings, Server, Bell, ChevronDown, Layers, Zap, Users,
  Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { Command } from 'cmdk';
import { DashboardView } from './components/DashboardView';
import { StockView } from './components/StockView';
import { DatabaseManagerView } from './components/DatabaseManagerView';
import { LoginView, type UserSession } from './components/LoginView';
import { SetupWizard } from './components/SetupWizard';
import { MintSplashIntro } from './components/MintSplashIntro';
import { DemandForecastView } from './components/DemandForecastView';
import { ShipmentsTrackerView } from './components/ShipmentsTrackerView';
import { AccountProfileModal, type AccountRoleType } from './components/AccountProfileModal';
import { AccountsManagementView } from './components/AccountsManagementView';
import AgentWorkspace from './components/AgentWorkspace';
import mascotLogo from './assets/mint-mascot.webp';
import { api } from './lib/api';
import './index.css';

/* ───────────────────────────── DATA ───────────────────────────── */

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: string;
  meta?: string;
}

// Módulos Canónicos del Sistema Mint (Arquitectura Stakent Silenciosa)
const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Centro de Mando', icon: Home },
  { id: 'demand', label: 'Pronóstico Predictivo', icon: TrendingUp },
  { id: 'shipments', label: 'Envíos y Logística', icon: Truck },
  { id: 'accounts', label: 'Cuentas y Perfiles', icon: Users, badge: '3' },
  { id: 'chat', label: 'Inteligencia ReAct', icon: Sparkles },
  { id: 'approvals', label: 'Aprobaciones Críticas', icon: CheckSquare, badge: '1' },
  { id: 'stock', label: 'Inventario & Catálogo', icon: Database },
  { id: 'database', label: 'Gobernanza & DB', icon: Server, meta: 'PostgreSQL' },
  { id: 'activity', label: 'Auditoría Inmutable', icon: Activity },
];

const ACTIVE_FACILITIES_SKUS = [
  {
    id: 'fac-central',
    title: 'Almacén Central',
    subtitle: 'Stock Valuado $7,699.00',
    iconColor: 'bg-emerald-500/10 text-emerald-400',
    view: 'stock',
  },
  {
    id: 'sku-vfd10',
    title: 'Variador VFD-10',
    subtitle: '2 uds. • Quiebre Inminente',
    iconColor: 'bg-amber-500/10 text-amber-400',
    view: 'demand',
  },
  {
    id: 'sku-sm400',
    title: 'Servomotor SM-400',
    subtitle: '24 uds. • Cobertura 20D',
    iconColor: 'bg-blue-500/10 text-blue-400',
    view: 'demand',
  },
  {
    id: 'ord-088',
    title: 'Orden OC-2026-088',
    subtitle: 'En Reparto • Llegada Hoy',
    iconColor: 'bg-emerald-500/10 text-emerald-400',
    view: 'shipments',
  },
];

const HISTORY_GROUPS = [
  {
    group: 'Hoy',
    items: [
      { title: 'Reposición 50x Sensor ST-200', prompt: 'Revisa el stock del Sensor ST-200 (2u / mín 15u) y cotiza reposición de 50 unidades con Grainger Industrial.' },
      { title: 'Evaluación Grainger vs TechCorp', prompt: 'Compara precios unitarios y SLA de entrega entre Grainger Industrial y TechCorp MX para componentes de instrumentación.' },
      { title: 'Auditoría preventiva almacén central', prompt: 'Ejecuta una auditoría de descalces y productos en mínimo crítico en el Almacén Central.' },
    ],
  },
  {
    group: 'Ayer',
    items: [
      { title: 'Balance presupuestal a 30 días', prompt: 'Genera el análisis financiero a 30 días: capital comprometido, flujo proyectado y caducidades FEFO.' },
      { title: 'Simulación crisis logística Q4', prompt: 'Simula un incremento de demanda del 30% y evalúa el riesgo de ruptura en sensores y microcontroladores.' },
    ],
  },
];

/* ───────────────────────────── MAIN SHELL ───────────────────────────── */

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [prefilledPrompt, setPrefilledPrompt] = useState<string>('');
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; provider: string; latencyMs: number } | null>(null);
  const [operationalMode, setOperationalMode] = useState<'autonomous' | 'supervised'>('autonomous');
  const [facilitiesOpen, setFacilitiesOpen] = useState(true);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalRole, setAccountModalRole] = useState<AccountRoleType>('Empresa');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Consulta de salud y conectividad de PostgreSQL / Supabase
  useEffect(() => {
    api.getDbStatus().then((res) => {
      if (res.success && res.data) {
        setDbStatus({
          connected: res.data.connected,
          provider: res.data.provider,
          latencyMs: res.data.latencyMs,
        });
      }
    }).catch(() => {});
  }, []);

  // ⌘K shortcut listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleLogin = (user: UserSession) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    if (user.setupCompleted) {
      setShowSplash(true);
      setCurrentView('dashboard');
    }
  };

  const handleFinishSetup = () => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, setupCompleted: true });
    }
    const wasCustomizing = isCustomizing;
    setIsCustomizing(false);
    if (!wasCustomizing) {
      setShowSplash(true);
    }
    setCurrentView('dashboard');
  };

  if (!isAuthenticated || !currentUser) {
    return <LoginView onLogin={handleLogin} />;
  }

  if (!currentUser.setupCompleted || isCustomizing) {
    return (
      <SetupWizard
        user={currentUser}
        onComplete={handleFinishSetup}
      />
    );
  }

  const exportGeneralReport = () => {
    const content = [
      'MINT AI BACK-OFFICE — REPORTE GENERAL DE OPERACIONES',
      `Fecha de exportación: ${new Date().toISOString()}`,
      'Motor de inferencia: xAI Grok-4.6 (Producción Real) • Base de Datos: PostgreSQL / Supabase',
      'Gobernanza activa: Límite autónomo $10,000 MXN • Auditoría Inmutable Human-in-the-Loop',
      '──────────────────────────────────────────────────────────',
      'Pestaña activa: ' + currentView,
      'Auditoría: 16 SKUs vigilados en 4 almacenes • Aprobaciones HITL activas',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `mint-reporte-${currentView}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Reporte exportado exitosamente');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#08090C] font-sans text-zinc-100 antialiased selection:bg-[#064E3B] selection:text-emerald-200">
      {showSplash && (
        <MintSplashIntro onComplete={() => setShowSplash(false)} />
      )}
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: '#101217',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#FFFFFF',
            fontSize: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.8), 0 0 20px rgba(74,222,128,0.06)',
          },
        }}
      />

      {/* ───────── 1. SIDEBAR IZQUIERDO DESKTOP (REGLA 2: w-64 bg-[#0B0C10] border-r border-white/[0.05]) ───────── */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className="z-20 hidden md:flex shrink-0 flex-col justify-between overflow-hidden border-r border-white/[0.05] bg-[#0B0C10] p-4"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Arriba: Logo Oficial de Mint */}
          <div className={`mb-4 flex items-center ${collapsed ? 'flex-col gap-3 justify-center' : 'justify-between'} pt-0.5`}>
            <div
              onClick={() => {
                setPrefilledPrompt('');
                setCurrentView('chat');
              }}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
              title="Mint AI"
            >
              <div className="relative flex items-center justify-center">
                <img
                  src={mascotLogo}
                  alt="Mint"
                  className={`${collapsed ? 'h-8 w-8' : 'h-7 w-7'} shrink-0 object-contain transition-transform group-hover:scale-105`}
                />
              </div>
              {!collapsed && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-white font-headline">Mint</span>
                  <span className="font-mono text-[10px] text-zinc-500">v2.4</span>
                </div>
              )}
            </div>

            <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'gap-1'}`}>
              <button
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
                title={collapsed ? "Expandir sidebar" : "Colapsar a barra de iconos"}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Switch Segmentado Estilo Píldora (Modo Autónomo vs Supervisado) */}
          {!collapsed && (
            <div className="mb-4 bg-[#14161C] p-1 rounded-xl flex items-center border border-white/[0.05] text-xs">
              <button
                type="button"
                onClick={() => {
                  setOperationalMode('autonomous');
                  toast.info('Modo Autónomo activado: Reglas ReAct automáticas < $10k');
                }}
                className={`flex-1 py-1 text-center font-medium rounded-lg transition-all cursor-pointer text-[11px] ${
                  operationalMode === 'autonomous'
                    ? 'bg-[#1E222B] text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Modo Autónomo
              </button>
              <button
                type="button"
                onClick={() => {
                  setOperationalMode('supervised');
                  toast.info('Modo Supervisado: Requiere aprobación HITL para toda compra');
                }}
                className={`flex-1 py-1 text-center font-medium rounded-lg transition-all cursor-pointer text-[11px] ${
                  operationalMode === 'supervised'
                    ? 'bg-[#1E222B] text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Supervisado
              </button>
            </div>
          )}

          {/* Centro: Navegación de Pestañas (Ítem Activo en bg-[#1A1D24] text-white rounded-xl) */}
          <nav className="space-y-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              const isActive = currentView === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setCurrentView(n.id)}
                  title={n.label}
                  className={`flex w-full cursor-pointer items-center ${
                    collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                  } rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#1A1D24] font-medium text-white shadow-sm'
                      : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                    {!collapsed && <span className="truncate text-xs font-medium">{n.label}</span>}
                  </span>
                  {!collapsed && n.badge && (
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.2 font-mono text-[10px] font-semibold text-emerald-400">
                      {n.badge}
                    </span>
                  )}
                  {!collapsed && n.meta && (
                    <span className="font-mono text-[10px] text-zinc-500">
                      {n.meta}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Mitad Inferior: Instalaciones / SKUs Activos */}
          {!collapsed && (
            <div className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto border-t border-white/[0.05] pt-3 pr-0.5 custom-scrollbar">
              <div
                onClick={() => setFacilitiesOpen((o) => !o)}
                className="flex items-center justify-between px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-zinc-400">Instalaciones / SKUs Activos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-semibold border border-emerald-500/20">
                    4
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${facilitiesOpen ? '' : '-rotate-90'}`} />
                </div>
              </div>

              {facilitiesOpen && (
                <div className="space-y-1 mt-1">
                  {ACTIVE_FACILITIES_SKUS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.view)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/[0.03] transition text-left cursor-pointer group"
                    >
                      <div className={`w-7 h-7 rounded-lg ${item.iconColor} flex items-center justify-center shrink-0`}>
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Abajo del todo: Tarjeta de Estado ReAct xAI */}
        <div className="mt-3 pt-3 border-t border-white/[0.05]">
          {!collapsed ? (
            <div className="rounded-xl bg-[#12141A] border border-white/[0.05] p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Zap className="w-4 h-4 fill-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white truncate">Motor ReAct xAI</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-zinc-500 truncate">Gobernanza activa &lt; $10k</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                onClick={() => setCurrentView('chat')}
                title="Motor ReAct Activo"
                className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-emerald-400" />
              </div>
            </div>
          )}
        </div>
      </motion.aside>

      {/* ───────── 1b. SIDEBAR MÓVIL (DRAWER DESLIZABLE EN md:hidden) ───────── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
            />

            {/* Slide-over Drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-[#0B0C10] border-r border-white/[0.08] p-4 flex flex-col justify-between shadow-2xl md:hidden overflow-y-auto custom-scrollbar"
            >
              <div className="flex min-h-0 flex-1 flex-col">
                {/* Cabecera del Drawer */}
                <div className="mb-4 flex items-center justify-between pt-0.5">
                  <div
                    onClick={() => {
                      setPrefilledPrompt('');
                      setCurrentView('chat');
                      setMobileNavOpen(false);
                    }}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                  >
                    <img src={mascotLogo} alt="Mint" className="h-7 w-7 shrink-0 object-contain" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold tracking-tight text-white font-headline">Mint</span>
                      <span className="font-mono text-[10px] text-zinc-500">v2.4</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setMobileNavOpen(false)}
                    aria-label="Cerrar menú"
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Switch Segmentado Modo Autónomo vs Supervisado */}
                <div className="mb-4 bg-[#14161C] p-1 rounded-xl flex items-center border border-white/[0.05] text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setOperationalMode('autonomous');
                      toast.info('Modo Autónomo activado: Reglas ReAct < $10k');
                    }}
                    className={`flex-1 py-1 text-center font-medium rounded-lg transition-all cursor-pointer text-[11px] ${
                      operationalMode === 'autonomous' ? 'bg-[#1E222B] text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Modo Autónomo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOperationalMode('supervised');
                      toast.info('Modo Supervisado: Requiere aprobación HITL');
                    }}
                    className={`flex-1 py-1 text-center font-medium rounded-lg transition-all cursor-pointer text-[11px] ${
                      operationalMode === 'supervised' ? 'bg-[#1E222B] text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Supervisado
                  </button>
                </div>

                {/* Navegación de Pestañas Móvil */}
                <nav className="space-y-1">
                  {NAV.map((n) => {
                    const Icon = n.icon;
                    const isActive = currentView === n.id;
                    return (
                      <button
                        key={n.id}
                        onClick={() => {
                          setCurrentView(n.id);
                          setMobileNavOpen(false);
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 rounded-xl transition-all ${
                          isActive
                            ? 'bg-[#1A1D24] font-medium text-white shadow-sm'
                            : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                          <span className="truncate text-xs font-medium">{n.label}</span>
                        </span>
                        {n.badge && (
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.2 font-mono text-[10px] font-semibold text-emerald-400">
                            {n.badge}
                          </span>
                        )}
                        {n.meta && (
                          <span className="font-mono text-[10px] text-zinc-500">
                            {n.meta}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                {/* Instalaciones / SKUs Activos */}
                <div className="mt-4 pt-3 border-t border-white/[0.05] space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 px-2 block mb-1">
                    Instalaciones / SKUs Activos
                  </span>
                  {ACTIVE_FACILITIES_SKUS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.view);
                        setMobileNavOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/[0.03] transition text-left cursor-pointer"
                    >
                      <div className={`w-7 h-7 rounded-lg ${item.iconColor} flex items-center justify-center shrink-0`}>
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-zinc-200 truncate">{item.title}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{item.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pie del Drawer Móvil */}
              <div className="mt-3 pt-3 border-t border-white/[0.05]">
                <div className="rounded-xl bg-[#12141A] border border-white/[0.05] p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Zap className="w-4 h-4 fill-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate">Motor ReAct xAI</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate">Gobernanza activa &lt; $10k</p>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ───────── 2. ÁREA DE TRABAJO PRINCIPAL CON HEADER SUPERIOR LIMPIO (REGLA 2) ───────── */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#08090C]">
        {/* Top Header Bar Limpio Responsivo */}
        <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#08090C] px-3 sm:px-6 md:px-8">
          {/* Izquierda: Botón Menú Móvil + Perfil del Operador Activo + Botón Píldora de Acento Mint */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            {/* Botón Menú Hamburger en Pantallas Móviles */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir navegación"
              className="flex md:hidden h-8 w-8 items-center justify-center rounded-xl bg-[#12141A] border border-white/[0.06] text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Perfil del Operador Activo */}
            <button
              type="button"
              onClick={() => {
                setAccountModalRole(currentUser.role === 'auditor' ? 'Admin' : 'Empresa');
                setAccountModalOpen(true);
              }}
              className="flex items-center gap-2 p-1 -ml-1 rounded-xl hover:bg-white/[0.04] transition cursor-pointer group text-left"
              title="Administrar cuenta y perfil (Admin / Empresa / Cliente)"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-[11px] font-semibold text-emerald-300 group-hover:border-emerald-400/60 transition shrink-0">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-semibold text-white group-hover:text-emerald-300 transition truncate max-w-[100px] lg:max-w-none">{currentUser.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-zinc-400 border border-white/[0.06] hidden md:inline">
                  {currentUser.role}
                </span>
              </div>
            </button>

            {/* Botón Píldora de Acento Mint */}
            <button
              type="button"
              onClick={() => {
                setPrefilledPrompt('Genera una orden de reposición de 25 unidades para el Variador VFD-10 cotizando con el proveedor más óptimo.');
                setCurrentView('chat');
              }}
              className="bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold text-xs px-2.5 sm:px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-[0.98] shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden xs:inline sm:inline">Nueva Orden</span>
            </button>

            {/* Status Live de DB si está conectado */}
            {dbStatus && (
              <button
                type="button"
                onClick={() => setCurrentView('database')}
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] text-zinc-400 hover:text-white transition cursor-pointer"
                title={`Conectado a ${dbStatus.provider} (${dbStatus.latencyMs}ms)`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[10px] text-zinc-300">
                  {dbStatus.provider.includes('Supabase') ? 'Supabase' : 'PostgreSQL'} ({dbStatus.latencyMs}ms)
                </span>
              </button>
            )}
          </div>

          {/* Derecha: Campana con Badge Numérico + Buscador Compacto + Botón Configuración */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Campana de Notificaciones con Badge Numérico 2 */}
            <button
              type="button"
              onClick={() => setCurrentView('approvals')}
              title="2 notificaciones operativas"
              className="relative w-8 h-8 rounded-xl bg-[#12141A] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/[0.12] transition cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 text-zinc-950 text-[10px] font-bold flex items-center justify-center shadow-xs">
                2
              </span>
            </button>

            {/* Buscador Compacto Icono en Mobile (< sm) */}
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="flex sm:hidden w-8 h-8 rounded-xl bg-[#12141A] border border-white/[0.06] items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
              title="Buscar en Mint (⌘K)"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Buscador Compacto en sm+ */}
            <div
              onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#12141A] border border-white/[0.06] text-xs text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200 transition cursor-pointer w-36 sm:w-44 lg:w-48"
            >
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="truncate text-xs">Buscar en Mint...</span>
              <kbd className="ml-auto font-mono text-[9px] text-zinc-500 bg-white/[0.04] border border-white/[0.05] px-1 py-0.2 rounded">⌘K</kbd>
            </div>

            {/* Botón Exportar */}
            <button
              type="button"
              onClick={exportGeneralReport}
              className="hidden sm:flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/[0.06] bg-[#12141A] hover:bg-[#1A1D24] hover:text-white px-3 py-1.5 text-xs font-medium text-zinc-300 transition active:scale-[0.98]"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden md:inline">Exportar</span>
            </button>

            {/* Botón Configuración */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className={`flex cursor-pointer items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border transition text-xs font-medium ${
                  menuOpen
                    ? 'bg-[#1A1D24] border-white/[0.15] text-white'
                    : 'border-white/[0.06] bg-[#12141A] hover:bg-[#1A1D24] text-zinc-300 hover:text-white'
                }`}
                title="Ajustes de sistema y preferencias"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden md:inline">Configuración</span>
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-11 w-72 rounded-2xl border border-white/[0.08] bg-[#101217] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl z-50 text-xs"
                  >
                    <div className="px-2.5 py-1 mb-2 border-b border-white/[0.05] flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                        Ajustes del Sistema
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        v2.4
                      </span>
                    </div>

                    {/* Opción 1: Administrar Cuenta & Perfil (Modal Dividido) */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setAccountModalRole(currentUser.role === 'auditor' ? 'Admin' : 'Empresa');
                        setAccountModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.04] transition flex items-center gap-2 cursor-pointer mb-1"
                    >
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <div>
                        <span className="font-medium text-xs block">Administrar Cuenta &amp; Perfil</span>
                        <span className="text-[10px] text-zinc-500">Roles Admin, Empresa y Cliente</span>
                      </div>
                    </button>

                    {/* Opción 2: Configurar Asistente & Reglas */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setIsCustomizing(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.04] transition flex items-center gap-2 cursor-pointer mb-1"
                    >
                      <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                      <div>
                        <span className="font-medium text-xs block">Personalizar Agente &amp; Reglas</span>
                        <span className="text-[10px] text-zinc-500">Reconfigurar tono, empresa y límites HITL</span>
                      </div>
                    </button>

                    {/* Opción 2: Modo Técnico / Developer */}
                    <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                        <div>
                          <span className="font-medium text-xs text-zinc-200 block">Modo Técnico</span>
                          <span className="block text-[10px] text-zinc-500">Telemetría de base de datos</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setDeveloperMode((m) => !m);
                          toast.info(!developerMode ? 'Modo Técnico activado' : 'Modo Técnico desactivado');
                        }}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                          developerMode ? 'bg-emerald-400' : 'bg-zinc-800'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
                            developerMode ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Opción 3: Cerrar Sesión */}
                    <div className="pt-2 mt-2 border-t border-white/[0.05]">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setIsAuthenticated(false);
                          setCurrentUser(null);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Contenido Central de las Vistas */}
        <main className={`relative flex-1 overflow-y-auto custom-scrollbar bg-[#08090C] ${currentView === 'chat' ? 'p-0 flex flex-col' : 'p-3.5 sm:p-6 md:p-8'}`}>
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentView}
              onOpenPrompt={(p) => {
                setPrefilledPrompt(p);
                setCurrentView('chat');
              }}
              developerMode={developerMode}
              currency="MXN"
            />
          )}

          {currentView === 'demand' && (
            <DemandForecastView
              onOpenPrompt={(p) => {
                setPrefilledPrompt(p);
                setCurrentView('chat');
              }}
              currency="MXN"
            />
          )}

          {currentView === 'shipments' && (
            <ShipmentsTrackerView
              onOpenPrompt={(p) => {
                setPrefilledPrompt(p);
                setCurrentView('chat');
              }}
            />
          )}

          {currentView === 'accounts' && (
            <AccountsManagementView
              onOpenAccountModal={(r) => {
                if (r) setAccountModalRole(r);
                setAccountModalOpen(true);
              }}
              onOpenPrompt={(p) => {
                setPrefilledPrompt(p);
                setCurrentView('chat');
              }}
            />
          )}

          {currentView === 'chat' && (
            <div className="h-full w-full flex-1 flex flex-col">
              <AgentWorkspace
                embedded
                currentUser={currentUser}
                prefilledPrompt={prefilledPrompt}
                onClearPrefill={() => setPrefilledPrompt('')}
                onNavigate={setCurrentView}
              />
            </div>
          )}

          {currentView === 'approvals' && (
            <ApprovalsView onNavigate={setCurrentView} onOpenPrompt={(p) => {
              setPrefilledPrompt(p);
              setCurrentView('chat');
            }} />
          )}

          {currentView === 'stock' && (
            <StockView
              onReplenish={(sku) => {
                setPrefilledPrompt(`Revisa el stock de ${sku} y cotiza reposición urgente con el mejor proveedor.`);
                setCurrentView('chat');
              }}
              onChatRequest={() => setCurrentView('chat')}
            />
          )}

          {currentView === 'database' && (
            <DatabaseManagerView />
          )}

          {currentView === 'activity' && (
            <ActivityAuditView />
          )}
        </main>
      </div>

      {/* ───────── COMMAND PALETTE (⌘K / Ctrl+K) ───────── */}
      <AnimatePresence>
        {cmdOpen && (
          <div
            className="fixed inset-0 z-[1000] flex justify-center bg-black/70 pt-[12vh] backdrop-blur-md"
            onClick={() => setCmdOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="h-fit w-full max-w-[560px] rounded-3xl border border-white/[0.08] bg-[#101217] shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden"
            >
              <Command className="cmdk-root">
                <Command.Input autoFocus placeholder="Buscar comando, SKU o saltar a pestaña…" className="cmdk-input" />
                <Command.List className="cmdk-list custom-scrollbar">
                  <Command.Empty className="cmdk-empty p-4 text-xs text-[#52795F]">Sin resultados coincidentes.</Command.Empty>
                  <Command.Group heading="Navegación de Módulos" className="cmdk-group">
                    {NAV.map((n) => {
                      const Icon = n.icon;
                      return (
                        <Command.Item
                          key={n.id}
                          className="cmdk-item"
                          onSelect={() => {
                            setCurrentView(n.id);
                            setCmdOpen(false);
                          }}
                        >
                          <Icon size={14} className="text-[#34D353]" />
                          <span>{n.label}</span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                  <Command.Group heading="Casos de Negocio Recientes" className="cmdk-group">
                    {HISTORY_GROUPS.flatMap((g) => g.items).map((it) => (
                      <Command.Item
                        key={it.title}
                        className="cmdk-item"
                        onSelect={() => {
                          setPrefilledPrompt(it.prompt);
                          setCurrentView('chat');
                          setCmdOpen(false);
                        }}
                      >
                        <Activity size={14} className="text-[#52795F]" />
                        <span>{it.title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                </Command.List>
              </Command>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ───────── MODAL DE ADMINISTRACIÓN DE CUENTAS Y PERFILES (SPLIT-PANEL) ───────── */}
      <AccountProfileModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        currentUser={currentUser}
        initialRole={accountModalRole}
        onSave={(data) => {
          if (currentUser) {
            setCurrentUser({
              ...currentUser,
              name: data.name,
              email: data.email,
              companyName: data.companyName,
            });
          }
        }}
      />
    </div>
  );
}

/* ───────────────────── 3. APROBACIONES CRÍTICAS (MODERNISMO MINIMALISTA) ───────────────────── */

interface ApprovalsViewProps {
  onNavigate?: (view: string) => void;
  onOpenPrompt?: (prompt: string) => void;
}

const RECENT_DECISIONS = [
  { id: 'OC-2026-088', product: 'Fusible Cerámico 10A (100u)', provider: 'ElectroGlobal', amount: '$4,800.00 MXN', resolution: 'Aprobada automáticamente (Regla < $10k)', status: 'approved', time: 'Hace 2h' },
  { id: 'OC-2026-087', product: 'Microcontrolador X1 Cortex (20u)', provider: 'TechCorp MX', amount: '$9,200.00 MXN', resolution: 'Aprobada por supervisor (HITL)', status: 'approved', time: 'Ayer' },
  { id: 'OC-2026-084', product: 'Sensor de Presión P1 (15u)', provider: 'FastShip Logistics', amount: '$18,400.00 MXN', resolution: 'Rechazada por sobrecosto logístico', status: 'rejected', time: 'Hace 2 días' },
];

function ApprovalsView({ onOpenPrompt }: ApprovalsViewProps) {
  const [approvedList, setApprovedList] = useState<string[]>([]);
  const [liveApprovals, setLiveApprovals] = useState<any[]>([]);

  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/approvals');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setLiveApprovals(json.data);
          }
        }
      } catch {
        // Modo local
      }
    };
    fetchApprovals();
  }, []);

  const defaultPending = [
    {
      id: 'OC-2026-089',
      sku: 'ST-200',
      productName: 'Sensor Térmico ST-200 (50 unidades)',
      currentStock: '2u / mín 15u',
      provider: 'Grainger Industrial',
      amountMXN: '$22,500.00 MXN',
      amountUSD: '$1,250.00 USD',
      sla: '48 Horas',
      reason: 'El monto excede el umbral autónomo de $10,000 MXN. Requiere validación de supervisor (Human-in-the-Loop).',
      prompt: 'Explica el desglose y cotización de la orden OC-2026-089 para el Sensor ST-200.',
    },
  ];

  const pendingApprovals = liveApprovals.length > 0
    ? liveApprovals.map((a) => ({
        id: a.id,
        sku: 'ST-200',
        productName: `Reposición de Insumos Críticos (${a.id})`,
        currentStock: '2u / mín 15u',
        provider: 'Grainger Industrial',
        amountMXN: `$${Number(a.amount || 15450).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`,
        amountUSD: `$${Math.round(Number(a.amount || 15450) / 18).toLocaleString('en-US')} USD`,
        sla: '48 Horas',
        reason: `El monto de $${Number(a.amount || 15450).toLocaleString('es-MX')} MXN supera el límite autónomo de $10,000 MXN. Requiere validación humana.`,
        prompt: `Explica la cotización y desglose de la orden ${a.id} por $${a.amount} MXN.`,
      }))
    : defaultPending;

  const handleApprove = async (id: string) => {
    setApprovedList((prev) => [...prev, id]);
    try {
      await fetch(`http://localhost:3001/api/approvals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'aprobado' }),
      });
    } catch {
      // Local
    }
    toast.success(`Orden ${id} autorizada. Orden emitida al proveedor y registrada.`);
  };

  const handleReject = async (id: string) => {
    setApprovedList((prev) => [...prev, id]);
    try {
      await fetch(`http://localhost:3001/api/approvals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rechazado' }),
      });
    } catch {
      // Local
    }
    toast.error(`Orden ${id} rechazada por el supervisor.`);
  };

  const activeCount = pendingApprovals.filter((a) => !approvedList.includes(a.id)).length;

  return (
    <div className="flex flex-col w-full max-w-[1360px] mx-auto gap-6 font-sans text-zinc-100 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <h1 className="text-2xl font-bold font-headline text-zinc-100 tracking-tight">
            Aprobaciones Críticas (Human-in-the-Loop)
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Decisiones que exceden el límite de autonomía de $10,000 MXN o presentan excepciones operativas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-full">
            {activeCount} {activeCount === 1 ? 'orden pendiente' : 'órdenes pendientes'}
          </span>
        </div>
      </div>

      {/* Lista de Aprobaciones */}
      <div className="space-y-4">
        {pendingApprovals.map((item) => {
          const isDone = approvedList.includes(item.id);
          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-5 md:p-6 transition-all shadow-sm ${
                isDone
                  ? 'border-white/[0.04] bg-[#101217]/50 opacity-60'
                  : 'border-white/[0.05] bg-[#101217] hover:border-white/[0.1]'
              }`}
            >
              {/* Header de la tarjeta */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] text-amber-300">
                    Requiere firma humana • &gt; $10,000 MXN
                  </span>
                  <span className="font-mono text-xs text-zinc-400">{item.id}</span>
                </div>
                <button
                  onClick={() => onOpenPrompt?.(item.prompt)}
                  className="text-xs text-zinc-400 hover:text-white transition underline underline-offset-4 cursor-pointer"
                >
                  Consultar caso con Agente →
                </button>
              </div>

              {/* Título y Justificación */}
              <div className="py-3.5">
                <h3 className="text-base font-semibold text-white font-headline mb-1">
                  {item.productName}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {item.reason}
                </p>
              </div>

              {/* Grid de 4 columnas limpio con divisiones finas */}
              <div className="border-y border-white/[0.05] py-4 my-2 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.05]">
                <div className="pr-4 py-2 sm:py-0">
                  <span className="block text-[10px] text-zinc-500 uppercase font-label tracking-wider">Stock Actual / Mínimo</span>
                  <span className="text-xs font-mono text-zinc-200 mt-1 block font-semibold">{item.currentStock}</span>
                </div>
                <div className="sm:px-4 py-2 sm:py-0">
                  <span className="block text-[10px] text-zinc-500 uppercase font-label tracking-wider">Proveedor Seleccionado</span>
                  <span className="text-xs text-zinc-100 mt-1 block font-medium">{item.provider}</span>
                </div>
                <div className="sm:px-4 py-2 sm:py-0">
                  <span className="block text-[10px] text-zinc-500 uppercase font-label tracking-wider">Monto de la Orden</span>
                  <span className="text-lg font-mono font-semibold text-white mt-0.5 block">{item.amountMXN}</span>
                </div>
                <div className="sm:pl-4 py-2 sm:py-0">
                  <span className="block text-[10px] text-zinc-500 uppercase font-label tracking-wider">Tiempo de Entrega (SLA)</span>
                  <span className="text-xs font-mono text-zinc-300 mt-1 block">{item.sla}</span>
                </div>
              </div>

              {/* Acciones Sobrias */}
              <div className="flex items-center justify-between pt-3">
                <span className="text-[11px] font-mono text-zinc-500">
                  {isDone ? 'Resolución registrada en el historial' : 'Firma de supervisor requerida'}
                </span>

                {!isDone ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReject(item.id)}
                      className="cursor-pointer rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="cursor-pointer rounded-xl bg-[#6EE7B7] hover:bg-[#34D399] px-4 py-1.5 text-xs font-semibold text-zinc-950 transition shadow-xs active:scale-[0.98]"
                    >
                      Aprobar y Emitir Orden
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Resolución finalizada</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {activeCount === 0 && (
          <div className="rounded-2xl border border-white/[0.05] bg-[#101217] p-10 text-center">
            <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-400 mb-2" />
            <p className="text-sm font-medium text-zinc-200 font-headline">Bandeja al día</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Todas las operaciones recientes han sido autorizadas o se encuentran dentro del límite autónomo de $10,000 MXN.
            </p>
          </div>
        )}
      </div>

      {/* ───────── HISTORIAL DE DECISIONES RECIENTES ───────── */}
      <div className="rounded-2xl border border-white/[0.05] bg-[#101217] p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.05]">
          <span className="text-xs font-semibold uppercase font-label tracking-wider text-zinc-400">
            Historial de Decisiones Recientes (Firmadas / Rechazadas)
          </span>
          <span className="font-mono text-[10px] text-zinc-500">Últimos 7 días • Auditoría HITL</span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {RECENT_DECISIONS.map((d) => (
            <div key={d.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                  {d.id}
                </span>
                <span className="font-medium text-zinc-200">{d.product}</span>
                <span className="text-zinc-500 text-[11px]">• {d.provider}</span>
              </div>
              <div className="flex items-center gap-4 text-zinc-400 font-mono text-[11px]">
                <span className="text-white font-semibold">{d.amount}</span>
                <span className={d.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}>
                  {d.resolution}
                </span>
                <span className="text-zinc-500">{d.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── 4. AUDITORÍA INMUTABLE (MODERNISMO MINIMALISTA) ───────────────────── */

interface AuditEvent {
  id: number;
  time: string;
  category: 'agent' | 'order' | 'db' | 'security';
  title: string;
  detail: string;
}

const INITIAL_EVENTS: AuditEvent[] = [
  { id: 1, time: '10:45:12', category: 'agent', title: 'Dictamen ReAct Emitido', detail: 'Evaluación de proveedores finalizada para ST-200. Grainger seleccionado (SLA 48h).' },
  { id: 2, time: '10:45:10', category: 'security', title: 'Guardrail HITL Activado', detail: 'Orden por $22,500 MXN supera el límite de $10,000 MXN. Se requiere firma de supervisor.' },
  { id: 3, time: '10:44:58', category: 'agent', title: 'Ejecución Tool: consultar_stock', detail: 'Lectura de tabla inventory para SKU ST-200: 2 unidades disponibles, mínimo 15 unidades.' },
  { id: 4, time: '10:30:00', category: 'db', title: 'CRON Proactivo Almacenes', detail: 'Escaneo completado en 4 almacenes. 1 SKU en estado crítico detectado.' },
  { id: 5, time: '09:00:15', category: 'order', title: 'Cierre Contable FEFO', detail: 'Consolidación de órdenes matutinas y verificación de hash en PostgreSQL.' },
];

function ActivityAuditView() {
  const [events] = useState<AuditEvent[]>(INITIAL_EVENTS);
  const [sqlLog, setSqlLog] = useState<string | null>(null);
  const [testingSql, setTestingSql] = useState(false);

  const simulateIllegalMutation = () => {
    setTestingSql(true);
    setSqlLog(null);
    setTimeout(() => {
      setTestingSql(false);
      setSqlLog(
        `psql:postgres@mint-db:5432/mint_prod\n` +
        `> DELETE FROM case_events WHERE id = 1;\n\n` +
        `ERROR: 42501 (insufficient_privilege):\n` +
        `MUTATION DENIED by trigger "trg_protect_case_events_immutable".\n` +
        `Details: Table "case_events" is strictly APPEND-ONLY for regulatory compliance.\n` +
        `HINT: No records can be updated or deleted once committed to the audit trail.\n` +
        `TRANSACTION ABORTED (0 rows affected).`
      );
      toast.error('Trigger PostgreSQL activado: Operación ilegal bloqueada exitosamente');
    }, 700);
  };

  return (
    <div className="flex flex-col w-full max-w-[1360px] mx-auto gap-6 font-sans text-zinc-100 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <h1 className="text-2xl font-bold font-headline text-white tracking-tight">
            Auditoría de Operaciones &amp; Trazabilidad Inmutable
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Registro continuo de dictámenes, guardrails HITL y órdenes ejecutadas con protección de inmutabilidad.
          </p>
        </div>
        <div className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Gobernanza Activa</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Columna Izquierda: Línea de Tiempo de Eventos */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.05] bg-[#101217] p-5 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/[0.05]">
            <span className="text-xs font-semibold uppercase font-label tracking-wider text-zinc-400">Línea de Tiempo Operativa</span>
            <span className="text-[11px] font-mono text-zinc-500">{events.length} eventos inmutables</span>
          </div>

          <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/[0.08]">
            {events.map((ev) => {
              const dotColor =
                ev.category === 'security'
                  ? 'bg-amber-400 ring-amber-400/20'
                  : ev.category === 'db'
                  ? 'bg-zinc-400 ring-zinc-500/20'
                  : ev.title.includes('Tool')
                  ? 'bg-blue-400 ring-blue-500/20'
                  : 'bg-emerald-400 ring-emerald-500/20';

              return (
                <div key={ev.id} className="relative">
                  <span
                    className={`absolute -left-[27px] top-1.5 h-2 w-2 rounded-full ${dotColor} ring-4 ring-[#101217]`}
                  />
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-white font-headline">{ev.title}</span>
                    <span className="font-mono text-[10px] text-zinc-500">{ev.time}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    {ev.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Verificador de Inmutabilidad SQL */}
        <div className="lg:col-span-1 rounded-2xl border border-white/[0.05] bg-[#101217] p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase font-label tracking-wider text-zinc-200">Verificador SQL</h3>
            </div>
            <button
              onClick={simulateIllegalMutation}
              disabled={testingSql}
              className="cursor-pointer rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-2.5 py-1 text-[11px] font-mono text-zinc-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${testingSql ? 'animate-spin text-emerald-400' : 'text-zinc-400'}`} />
              <span>{testingSql ? 'Probando...' : '▶ Run Test'}</span>
            </button>
          </div>

          <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
            Comprueba cómo el trigger PostgreSQL rechaza mutaciones accidentales o no autorizadas en tiempo de ejecución.
          </p>

          {/* Consola Terminal Integrada */}
          <div className="rounded-xl border border-white/[0.06] bg-[#08090C] p-3.5 font-mono text-[11px] min-h-[180px] flex flex-col justify-between">
            <div className="text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {sqlLog ? (
                <span className="text-red-400">{sqlLog}</span>
              ) : (
                <div className="text-zinc-500">
                  <p className="text-emerald-400">mint@core-sql:~$ ./test-immutability.sh</p>
                  <p className="mt-1 text-zinc-500">Listo. Pulsa [ ▶ Run Test ] para simular DELETE/UPDATE bloqueado por trigger.</p>
                </div>
              )}
            </div>
            <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-zinc-500">
              <span>Trigger: trg_protect_case_events</span>
              <span className="text-emerald-400 font-semibold">APPEND-ONLY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
