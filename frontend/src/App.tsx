import { useState, useEffect } from 'react';
import {
  Home, Sparkles, CheckSquare, Database, Activity, PanelLeftClose, PanelLeftOpen,
  Search, Plus, ChevronDown, Download, Check,
  CheckCircle2, Terminal, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { Command } from 'cmdk';
import { DashboardView } from './components/DashboardView';
import { StockView } from './components/StockView';
import { LoginView } from './components/LoginView';
import { MintSplashIntro } from './components/MintSplashIntro';
import AgentWorkspace from './components/AgentWorkspace';
import mascotLogo from './assets/mint-mascot.webp';
import './index.css';

/* ───────────────────────────── DATA ───────────────────────────── */

// 5 Módulos Canónicos con los iconos exactos del Rail Oficial de Mint
const NAV = [
  { id: 'dashboard', label: 'Centro de Mando', icon: Home },
  { id: 'chat', label: 'Inteligencia ReAct', icon: Sparkles },
  { id: 'approvals', label: 'Aprobaciones Críticas', icon: CheckSquare, badge: '1' },
  { id: 'stock', label: 'Explorador de Esquemas', icon: Database, meta: 'Drizzle' },
  { id: 'activity', label: 'Auditoría Inmutable', icon: Activity },
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [engine, setEngine] = useState<'live' | 'fake'>('live');
  const [engineOpen, setEngineOpen] = useState(false);
  const [prefilledPrompt, setPrefilledPrompt] = useState<string>('');

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

  const handleLogin = () => {
    setIsAuthenticated(true);
    setShowSplash(true);
    setCurrentView('dashboard');
  };

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  const exportGeneralReport = () => {
    const content = [
      'MINT AI BACK-OFFICE — REPORTE GENERAL DE OPERACIONES',
      `Fecha de exportación: ${new Date().toISOString()}`,
      `Motor de inferencia: ${engine === 'live' ? 'Grok-4.6 (Producción)' : 'FakeGrokClient ($0 Test Mode)'}`,
      'Gobernanza activa: Límite autónomo $10,000 MXN • PostgreSQL Append-Only (0001_protect_case_events.sql)',
      '──────────────────────────────────────────────────────────',
      'Pestaña activa: ' + currentView,
      'Auditoría: 16 SKUs vigilados en 4 almacenes • 1 orden en Human-in-the-Loop',
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#040A06] font-sans text-[#E8FBEA] antialiased selection:bg-[#0D2E16] selection:text-[#B8F5A0]">
      {showSplash && (
        <MintSplashIntro onComplete={() => setShowSplash(false)} />
      )}
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: '#08120B',
            border: '1px solid #1F3D29',
            color: '#E8FBEA',
            fontSize: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.8), 0 0 20px rgba(52,211,83,0.15)',
          },
        }}
      />

      {/* ───────── 1. SIDEBAR SYNTHETIC MINT (COLLAPSIBLE TO ICON RAIL) ───────── */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 270 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className="z-20 flex shrink-0 flex-col justify-between overflow-hidden border-r border-white/[0.07] bg-[#0C0C0E] p-3 backdrop-blur-xl"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Header del Sidebar */}
          <div className={`mb-4 flex items-center ${collapsed ? 'flex-col gap-3 justify-center' : 'justify-between px-1'} pt-1`}>
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
                  className={`${collapsed ? 'h-9 w-9' : 'h-8 w-8'} shrink-0 object-contain drop-shadow-[0_2px_12px_rgba(52,211,83,0.35)] transition-transform group-hover:scale-105`}
                />
                <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-md -z-10" />
              </div>
              {!collapsed && (
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-tight font-headline text-zinc-100">Mint</span>
                  <span className="rounded-full bg-white/[0.04] border border-white/[0.08] px-2 py-0.2 font-mono text-[10px] text-zinc-400">v2.4</span>
                </div>
              )}
            </div>

            <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'gap-1'}`}>
              {!collapsed && (
                <button
                  onClick={() => {
                    setPrefilledPrompt('');
                    setCurrentView('chat');
                  }}
                  title="Nueva Operación en Agente"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-zinc-100 text-zinc-950 transition hover:bg-white shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
              )}
              <button
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
                title={collapsed ? "Expandir sidebar" : "Colapsar a barra de iconos"}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Buscador Global ⌘K */}
          {!collapsed && (
            <button
              onClick={() => setCmdOpen(true)}
              className="mb-3.5 flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 py-1.5 text-left text-xs text-zinc-400 transition hover:border-white/[0.15] hover:text-zinc-200"
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <span className="flex-1 truncate">Buscar en Mint...</span>
              <kbd className="rounded bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.2 font-mono text-[10px] text-zinc-400">⌘K</kbd>
            </button>
          )}

          {/* Navegación Vertical con los 5 Módulos Canónicos (Rail Oficial) */}
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
                  } rounded-lg transition-all ${
                    isActive
                      ? 'bg-white/[0.06] font-medium text-white border border-white/[0.1]'
                      : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                    {!collapsed && <span className="truncate text-xs">{n.label}</span>}
                  </span>
                  {!collapsed && n.badge && (
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.2 font-mono text-[10px] font-semibold text-emerald-300">
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

          {/* Historial de Casos Agrupado (Solo expandido) */}
          {!collapsed && (
            <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto border-t border-white/[0.06] pt-3 pr-1 custom-scrollbar">
              {HISTORY_GROUPS.map((g) => (
                <div key={g.group}>
                  <p className="mb-1.5 px-3 text-[10px] font-medium uppercase font-label tracking-wider text-zinc-500">{g.group}</p>
                  {g.items.map((it) => (
                    <button
                      key={it.title}
                      onClick={() => {
                        setPrefilledPrompt(it.prompt);
                        setCurrentView('chat');
                      }}
                      className="block w-full cursor-pointer truncate rounded-lg px-3 py-1.5 text-left text-xs text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-200"
                    >
                      {it.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Base del Sidebar: Alerta Proactiva + Perfil */}
        <div className="mt-2 border-t border-white/[0.06] pt-2.5">
          {!collapsed ? (
            <>
              <div
                onClick={() => setCurrentView('approvals')}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 transition rounded-lg hover:bg-white/[0.03]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className="truncate">1 alerta de stock activa</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2.5 rounded-xl px-3 py-2 transition bg-white/[0.02] border border-white/[0.06]">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-semibold text-zinc-200 border border-white/[0.08]">
                  AG
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-xs font-semibold text-zinc-200">Andrés Guerra</p>
                  <p className="truncate text-[10px] text-zinc-500">andres@mint-ai.io</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <span
                onClick={() => setCurrentView('approvals')}
                title="1 alerta de stock activa"
                className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse cursor-pointer"
              />
              <div
                title="Andrés Guerra (andres@mint-ai.io)"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-[10px] font-semibold text-zinc-200 border border-white/[0.08] cursor-pointer"
              >
                AG
              </div>
            </div>
          )}
        </div>
      </motion.aside>

      {/* ───────── 2. ÁREA DE TRABAJO PRINCIPAL CON TOPBAR NEUTRA ───────── */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#09090B]">
        {/* Topbar Persistente */}
        <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#09090B]/90 px-6 md:px-8 backdrop-blur-md">
          <div className="relative">
            <button
              onClick={() => setEngineOpen((o) => !o)}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] px-3.5 py-1.5 text-xs text-zinc-300 transition"
            >
              <span className="font-medium text-zinc-200">{engine === 'live' ? 'MINT Core 4.6' : 'FakeGrokClient ($0 Test Mode)'}</span>
              <ChevronDown className="h-3 w-3 text-zinc-500" />
            </button>
            <AnimatePresence>
              {engineOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 top-10 w-64 rounded-xl border border-white/[0.1] bg-[#0C0C0E] p-2 shadow-2xl backdrop-blur-xl z-50 text-xs shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
                >
                  <p className="px-2.5 py-1 text-[10px] font-label uppercase text-zinc-500">Motor de Razonamiento</p>
                  <button
                    onClick={() => {
                      setEngine('live');
                      setEngineOpen(false);
                      toast.success('Motor cambiado a Grok-4.6 (Producción)');
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left transition ${
                      engine === 'live' ? 'bg-white/[0.06] text-white font-medium' : 'text-zinc-400 hover:bg-white/[0.03]'
                    }`}
                  >
                    <span>Grok-4.6 (Producción)</span>
                    {engine === 'live' && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setEngine('fake');
                      setEngineOpen(false);
                      toast.info('Modo Simulación $0 activado');
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left transition ${
                      engine === 'fake' ? 'bg-white/[0.06] text-white font-medium' : 'text-zinc-400 hover:bg-white/[0.03]'
                    }`}
                  >
                    <span>FakeGrokClient ($0 Mode)</span>
                    {engine === 'fake' && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setCurrentView('dashboard');
                setShowSplash(true);
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-all hover:bg-emerald-900/30 hover:border-emerald-500/40"
              title="Reproducir Intro de Marca y Transición al Centro de Mando"
            >
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <span className="hidden sm:inline">Intro Mint</span>
            </button>

            <button
              onClick={exportGeneralReport}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white"
            >
              <Download className="h-3 w-3 text-zinc-400" />
              <span>Exportar</span>
            </button>

            <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-0.5 font-mono text-[11px] text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>PostgreSQL Inmutable</span>
            </div>
          </div>
        </header>

        {/* Contenido Central de las 5 Vistas */}
        <main className={`relative flex-1 overflow-y-auto custom-scrollbar ${currentView === 'chat' ? 'p-0 flex flex-col' : 'p-6 md:p-8'}`}>
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentView}
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

          {(currentView === 'stock' || currentView === 'database') && (
            <StockView
              onReplenish={(sku) => {
                setPrefilledPrompt(`Revisa el stock de ${sku} y cotiza reposición urgente con el mejor proveedor.`);
                setCurrentView('chat');
              }}
              onChatRequest={() => setCurrentView('chat')}
            />
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
              className="h-fit w-full max-w-[560px] rounded-3xl border border-[#1F3D29] bg-[#08120B] shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(52,211,83,0.15)] overflow-hidden"
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

  const pendingApprovals = [
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

  const handleApprove = (id: string) => {
    setApprovedList((prev) => [...prev, id]);
    toast.success(`Orden ${id} aprobada criptográficamente. Registrada en case_events.`);
  };

  const handleReject = (id: string) => {
    setApprovedList((prev) => [...prev, id]);
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
              className={`rounded-xl border p-5 md:p-6 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${
                isDone
                  ? 'border-white/[0.05] bg-[#0C0C0E]/50 opacity-60'
                  : 'border-white/[0.07] bg-[#0C0C0E] hover:border-white/[0.12]'
              }`}
            >
              {/* Header de la tarjeta */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] text-amber-300">
                    Requiere firma humana • &gt; $10,000 MXN
                  </span>
                  <span className="font-mono text-xs text-zinc-400">{item.id}</span>
                </div>
                <button
                  onClick={() => onOpenPrompt?.(item.prompt)}
                  className="text-xs text-zinc-400 hover:text-zinc-100 transition underline underline-offset-4 cursor-pointer"
                >
                  Consultar caso con Agente →
                </button>
              </div>

              {/* Título y Justificación */}
              <div className="py-3.5">
                <h3 className="text-base font-semibold text-zinc-100 font-headline mb-1">
                  {item.productName}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {item.reason}
                </p>
              </div>

              {/* Grid de 4 columnas limpio con divisiones finas */}
              <div className="border-y border-white/[0.06] py-4 my-2 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
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
                  {isDone ? 'Resolución registrada en PostgreSQL' : 'Autorización criptográfica requerida'}
                </span>

                {!isDone ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReject(item.id)}
                      className="cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="cursor-pointer rounded-lg bg-zinc-100 px-4 py-1.5 text-xs font-medium text-zinc-950 transition hover:bg-white shadow-xs active:scale-[0.98]"
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
          <div className="rounded-xl border border-white/[0.07] bg-[#0C0C0E] p-10 text-center">
            <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-400 mb-2" />
            <p className="text-sm font-medium text-zinc-200 font-headline">Bandeja al día</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Todas las operaciones recientes han sido autorizadas o se encuentran dentro del límite autónomo de $10,000 MXN.
            </p>
          </div>
        )}
      </div>

      {/* ───────── HISTORIAL DE DECISIONES RECIENTES (ELIMINA EL VACÍO INFERIOR) ───────── */}
      <div className="rounded-xl border border-white/[0.07] bg-[#0C0C0E] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.4)] opacity-75 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
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
                <span className="text-zinc-200 font-semibold">{d.amount}</span>
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
          <h1 className="text-2xl font-bold font-headline text-zinc-100 tracking-tight">
            Auditoría Inmutable (case_events)
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Registro de eventos append-only protegido a nivel motor por PostgreSQL Trigger
          </p>
        </div>
        <div className="font-mono text-[11px] text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-full">
          0001_protect_case_events.sql
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Columna Izquierda: Línea de Tiempo de Eventos con Nodos Semánticos Precisos */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.07] bg-[#0C0C0E] p-5 md:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/[0.06]">
            <span className="text-xs font-semibold uppercase font-label tracking-wider text-zinc-400">Línea de Tiempo Operativa</span>
            <span className="text-[11px] font-mono text-zinc-500">{events.length} eventos inmutables</span>
          </div>

          <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/[0.08]">
            {events.map((ev) => {
              // Codificación semántica precisa (8px ring-4)
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
                    className={`absolute -left-[27px] top-1.5 h-2 w-2 rounded-full ${dotColor} ring-4 ring-[#0C0C0E]`}
                  />
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-100 font-headline">{ev.title}</span>
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

        {/* Columna Derecha: Verificador de Inmutabilidad SQL con Botón Run Test en la Cabecera */}
        <div className="lg:col-span-1 rounded-xl border border-white/[0.07] bg-[#0C0C0E] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase font-label tracking-wider text-zinc-200">Verificador SQL</h3>
            </div>
            <button
              onClick={simulateIllegalMutation}
              disabled={testingSql}
              className="cursor-pointer rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] px-2.5 py-1 text-[11px] font-mono text-zinc-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${testingSql ? 'animate-spin text-emerald-400' : 'text-zinc-400'}`} />
              <span>{testingSql ? 'Probando...' : '▶ Run Test'}</span>
            </button>
          </div>

          <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
            Comprueba cómo el trigger PostgreSQL rechaza mutaciones accidentales o no autorizadas en tiempo de ejecución.
          </p>

          {/* Consola Terminal Integrada */}
          <div className="rounded-lg border border-white/[0.08] bg-[#09090B] p-3.5 font-mono text-[11px] min-h-[180px] flex flex-col justify-between">
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
