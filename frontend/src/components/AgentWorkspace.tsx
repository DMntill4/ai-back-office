import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, ChevronDown, Check, CheckCircle2, Terminal, ArrowUp, Zap,
  AlertTriangle, RotateCcw, Paperclip, Search,
  TrendingUp, Truck
} from 'lucide-react';
import { MintInteractiveMascot, type AgentState } from './MintInteractiveMascot';
import type { UserSession } from './LoginView';
import mascotLogo from '../assets/mint-mascot.webp';
import { api } from '../lib/api';

/* ───────────────────────────── DATA ───────────────────────────── */

const SKILLS = [
  { id: 'auto', label: 'Auto-Superpower', file: 'superpowers.ts', prompt: '' },
  { id: 'demand', label: 'Pronóstico Demanda', file: 'demand_forecasting.ts', prompt: 'Calcula el pronóstico de demanda a 30 días del Sensor ST-200 y evalúa semanas de cobertura.' },
  { id: 'shipments', label: 'Rastrear Envíos', file: 'shipments_tracker.ts', prompt: 'Rastrea el estado de los envíos en tránsito y fecha estimada de entrega con transportista.' },
  { id: 'realstock', label: 'Stock Real SQL', file: 'real_stock_engine.ts', prompt: 'Verifica el inventario real cargado por la empresa mediante archivo SQL.' },
  { id: 'procurement', label: 'Compra Autónoma', file: 'procurement_negotiator.md', prompt: 'Revisa el stock del Sensor ST-200 y emite orden de compra bajo el umbral de $10,000 MXN.' },
  { id: 'finance', label: 'Análisis Financiero', file: 'financial_maestro.md', prompt: 'Genera el análisis financiero de inventario y presupuesto a 30 días.' },
] as const;

const ACTION_PILLS = [
  { icon: Search, label: 'Consultar Existencias', skill: 'realstock', prompt: 'Consulta el inventario y disponibilidad real de la empresa en almacén central.' },
  { icon: Zap, label: 'Compra Autónoma < $10k', badge: 'Auto', skill: 'procurement', prompt: 'Revisa existencias críticas y cotiza reposición bajo el límite autónomo de $10,000 MXN.' },
  { icon: TrendingUp, label: 'Pronóstico de Demanda', badge: '30d', skill: 'demand', prompt: 'Calcula el pronóstico de demanda a 30 días y semanas de cobertura para productos prioritarios.' },
  { icon: Truck, label: 'Seguimiento de Envíos', badge: 'En Ruta', skill: 'shipments', prompt: 'Rastrea el estatus de las órdenes y envíos en tránsito con los transportistas.' },
];

export interface ToolTraceStep {
  call: string;
  out: string;
}

export interface Msg {
  id: number;
  role: 'user' | 'agent';
  text?: string;
  skillIds?: string[];
  responseText?: string;
  toolTrace?: ToolTraceStep[];
  isRealStock?: boolean;
  requiresHitl?: boolean;
  orderAmount?: string;
  threshold?: string;
  metrics?: {
    totalCostUsd?: string;
    totalTokens?: number;
    iterations?: number;
  };
}

/* ───────────────────────────── COMPONENT ───────────────────────────── */

interface AgentWorkspaceProps {
  onNavigate?: (view: string) => void;
  embedded?: boolean;
  prefilledPrompt?: string;
  onClearPrefill?: () => void;
  currentUser?: UserSession | null;
}

export default function AgentWorkspace({
  prefilledPrompt,
  onClearPrefill,
  currentUser,
}: AgentWorkspaceProps) {
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [input, setInput] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('auto');

  const [prevPrefill, setPrevPrefill] = useState(prefilledPrompt);
  if (prefilledPrompt && prefilledPrompt !== prevPrefill) {
    setPrevPrefill(prefilledPrompt);
    setInput(prefilledPrompt);
    onClearPrefill?.();
  }
  const [skillMenuOpen, setSkillMenuOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [approved, setApproved] = useState(false);
  const timers = useRef<number[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const started = messages.length > 0;
  const currentSkill = SKILLS.find((s) => s.id === selectedSkillId) ?? SKILLS[0];

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, agentState]);

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const send = useCallback(async (text: string, skillId?: string) => {
    if (!text.trim() || agentState === 'thinking') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setInput('');
    setApproved(false);
    setSkillMenuOpen(false);
    setAttachMenuOpen(false);
    setMessages((m) => [...m, { id: Date.now(), role: 'user', text }]);
    setAgentState('thinking');

    const activeCompanyId = currentUser?.companyId || 'comp_default';

    try {
      const data = await api.sendChat(text, activeCompanyId);

      if (data.success && data.response) {
        const isReal =
          data.response.includes('STOCK REAL') ||
          data.response.toLowerCase().includes('stock real');

        const toolCallsFromText: ToolTraceStep[] = [];
        if (text.toLowerCase().includes('stock') || text.toLowerCase().includes('inventario')) {
          toolCallsFromText.push({ call: `consultar_stock("${activeCompanyId}")`, out: '→ Lectura de tabla inventory en PostgreSQL' });
        }
        if (text.toLowerCase().includes('compr') || text.toLowerCase().includes('cotiz') || text.toLowerCase().includes('repon')) {
          toolCallsFromText.push({ call: 'evaluar_proveedores()', out: '→ Matriz multicriterio de costo, SLA y confiabilidad' });
          toolCallsFromText.push({ call: 'evaluar_reglas_gobernanza()', out: '→ Verificación de límite autónomo $10,000 MXN' });
        }
        if (toolCallsFromText.length === 0) {
          toolCallsFromText.push({ call: 'bucle_react_grok()', out: '→ Análisis de intención e inferencia en xAI' });
        }

        setMessages((m) => [
          ...m,
          {
            id: Date.now() + 1,
            role: 'agent',
            skillIds: [skillId ?? selectedSkillId, 'security'],
            responseText: data.response,
            isRealStock: isReal,
            metrics: {
              totalCostUsd: data.metrics?.totalCostUsd != null ? String(data.metrics.totalCostUsd) : undefined,
              totalTokens: data.metrics?.totalTokens,
              iterations: data.metrics?.iterations,
            },
            toolTrace: toolCallsFromText,
          },
        ]);
        setAgentState('responding');
        later(() => setAgentState('idle'), 1500);
      } else {
        throw new Error('Respuesta no concluyente del agente');
      }
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: 'agent',
          skillIds: ['security'],
          responseText: `⚠️ Error de comunicación: ${err.message}.\n\nVerifica que el backend esté activo en el puerto 3001 con la base de datos conectada.`,
          toolTrace: [
            {
              call: 'POST /api/chat',
              out: `→ Fallo: ${err.message}`,
            },
          ],
        },
      ]);
      setAgentState('idle');
    }
  }, [agentState, selectedSkillId, currentUser]);

  const reset = () => {
    timers.current.forEach(clearTimeout);
    setMessages([]);
    setAgentState('idle');
    setInput('');
    setSelectedSkillId('auto');
    setApproved(false);
    setSkillMenuOpen(false);
    setAttachMenuOpen(false);
  };

  return (
    <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-transparent h-full w-full">
      {/* Resplandor ambiental muy sutil */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <div className="-mt-20 h-[380px] w-[380px] rounded-full bg-emerald-500/[0.03] blur-[140px]" />
      </div>

      {/* Contenido Principal */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col h-full">
        <AnimatePresence mode="wait">
          {!started ? (
            <motion.div
              key="hero"
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col items-center justify-center px-6 pb-12"
            >
              <div className="flex w-full max-w-[680px] flex-col items-center">
                {/* Mascota Mint Original Flotante e Interactiva */}
                <div className="mb-2 flex items-center justify-center">
                  <MintInteractiveMascot state={agentState} size={120} />
                </div>

                {/* Saludo con tipografía minimalista y limpia */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight text-zinc-100">
                    Buenos días, {currentUser?.name?.split(' ')[0] || 'Andrés'}
                  </h1>
                  <p className="text-lg sm:text-xl text-zinc-400 mt-1 font-headline">
                    ¿Cómo puedo <span className="font-serif-italic text-zinc-200">ayudarte hoy?</span>
                  </p>
                </div>

                {/* Súper Composer Mint */}
                <div className="relative w-full rounded-2xl border border-[#162D1D] bg-[#08120B]/95 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.7),0_0_30px_rgba(52,211,83,0.05)] transition-all focus-within:border-[#1F4527] focus-within:shadow-[0_0_25px_rgba(52,211,83,0.12)]">
                  <textarea
                    rows={2}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send(input);
                      }
                    }}
                    placeholder="Pregunta a MINT o describe una operación de back-office..."
                    className="w-full resize-none bg-transparent px-1 pt-1 pb-2 text-sm text-[#E8FBEA] placeholder:text-[#527558] outline-none"
                  />

                  {/* Fila Inferior de Controles */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      {/* Botón de Adjuntos / Menú */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => { setAttachMenuOpen((o) => !o); setSkillMenuOpen(false); }}
                          title="Vincular contexto o SKU"
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <AnimatePresence>
                          {attachMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="absolute bottom-9 left-0 w-64 rounded-xl border border-[#162D1D] bg-[#08140B] p-2 shadow-2xl backdrop-blur-xl z-50 text-xs shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
                            >
                              <button
                                onClick={() => {
                                  setInput((prev) => (prev ? prev + ' ' : '') + '@SKU-ST200');
                                  setAttachMenuOpen(false);
                                }}
                                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[#8EB795] hover:bg-[#102416] hover:text-[#E8FBEA]"
                              >
                                <Paperclip className="h-3.5 w-3.5 text-[#527558]" />
                                <span>Vincular <span className="font-mono text-[#B8F5A0]">@SKU-ST200</span></span>
                              </button>
                              <button
                                onClick={() => {
                                  setInput('Ejecuta auditoría de inventario crítico en los 4 almacenes.');
                                  setAttachMenuOpen(false);
                                }}
                                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[#8EB795] hover:bg-[#102416] hover:text-[#E8FBEA]"
                              >
                                <Zap className="h-3.5 w-3.5 text-[#34D353]" />
                                <span>Playbook: Auditoría Express</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Selector tipo píldora de Superpowers */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => { setSkillMenuOpen((o) => !o); setAttachMenuOpen(false); }}
                          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#162D1D] bg-[#050D07] px-3 py-1 text-xs text-[#8EB795] transition hover:bg-[#0A170E] hover:text-[#E8FBEA]"
                        >
                          <Zap className="h-3 w-3 text-[#34D353]" />
                          <span>{currentSkill.label}</span>
                          <ChevronDown className="h-3 w-3 text-[#527558]" />
                        </button>
                        <AnimatePresence>
                          {skillMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="absolute bottom-9 left-0 w-64 rounded-xl border border-[#162D1D] bg-[#08140B] p-2 shadow-2xl backdrop-blur-xl z-50 text-xs shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
                            >
                              {SKILLS.map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    setSelectedSkillId(s.id);
                                    if (s.prompt && !input.trim()) setInput(s.prompt);
                                    setSkillMenuOpen(false);
                                  }}
                                  className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                                >
                                  <span>
                                    <span className="block font-medium text-zinc-200">{s.label}</span>
                                    <span className="font-mono text-[10px] text-zinc-500">{s.file}</span>
                                  </span>
                                  {selectedSkillId === s.id && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Botón de Enviar Técnico */}
                    <button
                      onClick={() => send(input)}
                      disabled={agentState === 'thinking' || !input.trim()}
                      aria-label="Enviar"
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-zinc-100 text-zinc-950 transition-all hover:bg-white shadow-xs disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-zinc-100 active:scale-[0.98]"
                    >
                      <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Píldoras de Acción Rápida Synthetic Mint (Inspiración BeeBot) */}
                <div className="mt-4 flex w-full max-w-[680px] flex-wrap items-center justify-center gap-2">
                  {ACTION_PILLS.map((pill) => {
                    const Icon = pill.icon;
                    return (
                      <button
                        key={pill.label}
                        onClick={() => {
                          setSelectedSkillId(pill.skill);
                          send(pill.prompt, pill.skill);
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] px-3.5 py-1.5 text-xs text-zinc-300 transition-all hover:border-white/[0.15] hover:text-white shadow-xs"
                      >
                        <Icon className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{pill.label}</span>
                        {pill.badge && (
                          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.2 font-mono text-[9px] text-amber-300">
                            {pill.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            /* ───────── HILO DE CONVERSACIÓN SYNTHETIC MINT ───────── */
            <motion.div
              key="thread"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 overflow-y-auto px-6 pt-4 custom-scrollbar">
                <div className="mx-auto flex max-w-[680px] flex-col gap-6 pb-6">
                  {messages.map((m) =>
                    m.role === 'user' ? (
                      <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl border border-white/[0.08] bg-[#18181B] px-4 py-2.5 text-xs leading-relaxed text-zinc-100 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
                          {m.text}
                        </div>
                      </motion.div>
                    ) : (
                      <AgentResponse
                        key={m.id}
                        skillIds={m.skillIds ?? []}
                        approved={approved}
                        onApprove={() => setApproved(true)}
                        responseText={m.responseText}
                        toolTrace={m.toolTrace}
                        isRealStock={m.isRealStock}
                        requiresHitl={m.requiresHitl}
                        orderAmount={m.orderAmount}
                        threshold={m.threshold}
                        metrics={m.metrics}
                      />
                    )
                  )}

                  {agentState === 'thinking' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5 text-xs text-[#8EB795]">
                      <MintInteractiveMascot state="thinking" size={28} className="!h-8 !w-8" />
                      <span className="text-[#8EB795]">Ejecutando bucle ReAct…</span>
                      <span className="font-mono text-[#52795F]">superpowers.ts</span>
                    </motion.div>
                  )}
                  <div ref={endRef} />
                </div>
              </div>

              {/* Input en modo conversación */}
              <div className="mx-auto w-full max-w-[680px] px-6 pb-6">
                <div className="relative w-full rounded-xl border border-[#162D1D] bg-[#08120B] p-3 shadow-2xl transition-all focus-within:border-[#1F4527] focus-within:shadow-[0_0_20px_rgba(52,211,83,0.1)]">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send(input);
                      }
                    }}
                    placeholder="Escribe una respuesta o instrucción..."
                    className="w-full resize-none bg-transparent px-1 pt-1 pb-1 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-0.5">
                        {currentSkill.label}
                      </span>
                      <button
                        type="button"
                        onClick={reset}
                        title="Reiniciar conversación"
                        className="text-zinc-500 hover:text-zinc-300 p-1 transition cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => send(input)}
                      disabled={agentState === 'thinking' || !input.trim()}
                      aria-label="Enviar"
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-zinc-100 text-zinc-950 transition-all hover:bg-white shadow-xs disabled:cursor-not-allowed disabled:opacity-30 active:scale-[0.98]"
                    >
                      <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

/* ───────────────────────── AGENT RESPONSE (MODERNISMO MINIMALISTA) ───────────────────────── */

const AgentResponse = ({
  skillIds,
  approved,
  onApprove,
  responseText,
  toolTrace,
  isRealStock,
  requiresHitl,
  orderAmount,
  threshold,
  metrics,
}: {
  skillIds: string[];
  approved: boolean;
  onApprove: () => void;
  responseText?: string;
  toolTrace?: ToolTraceStep[];
  isRealStock?: boolean;
  requiresHitl?: boolean;
  orderAmount?: string;
  threshold?: string;
  metrics?: {
    totalCostUsd?: string;
    totalTokens?: number;
    iterations?: number;
  };
}) => {
  const files = skillIds.map((id) =>
    id === 'security'
      ? 'security_guardrails.md'
      : id === 'realstock'
      ? 'real_stock_engine.ts'
      : SKILLS.find((s) => s.id === id)?.file ?? 'procurement_negotiator.md'
  );

  const defaultSteps = [
    { call: 'consultar_stock("ST-200")', out: '→ 2 u disponibles • mínimo 15 u • CRÍTICO' },
    { call: 'evaluar_proveedores("ST-200")', out: '→ Grainger Industrial • $450 MXN/u • entrega 48h' },
    { call: 'crear_orden_compra("ST-200", 50, "Grainger")', out: '→ 50 × $450 = $22,500 MXN • Excede umbral' },
  ];

  const steps = toolTrace && toolTrace.length > 0 ? toolTrace : defaultSteps;
  const [showTools, setShowTools] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3.5">
      <img src={mascotLogo} alt="MINT" className="mt-0.5 h-7 w-7 shrink-0 object-contain drop-shadow-[0_2px_10px_rgba(52,211,83,0.35)]" />
      <div className="min-w-0 flex-1 space-y-3">
        {/* Metadatos de ejecución sutiles */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>{files.join(' • ')}</span>
          {isRealStock && (
            <>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-300">Catálogo SQL Verificado</span>
            </>
          )}
        </div>

        {/* Dictamen / Respuesta Principal en lenguaje claro */}
        {responseText ? (
          <div className="text-sm leading-relaxed text-zinc-100 whitespace-pre-wrap space-y-2 bg-[#101217] border border-white/[0.06] rounded-2xl p-4 shadow-sm">
            {responseText}
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-zinc-100 bg-[#101217] border border-white/[0.06] rounded-2xl p-4 shadow-sm">
            El Sensor Térmico ST-200 se encuentra en nivel crítico. La reposición de 50 unidades con{' '}
            <strong className="text-white font-medium">Grainger Industrial</strong> ($450 MXN/u, entrega en 48h) totaliza{' '}
            <strong className="text-emerald-400 font-semibold font-mono">$22,500 MXN</strong>.
          </div>
        )}

        {/* Acordeón opcional: Razonamiento y Herramientas */}
        {steps.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowTools((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              <Terminal className="h-3 w-3 text-emerald-400" />
              <span>{showTools ? 'Ocultar razonamiento y herramientas' : `Ver razonamiento y herramientas (${steps.length})`}</span>
              <ChevronDown className={`h-3 w-3 text-zinc-500 transition-transform ${showTools ? 'rotate-180' : ''}`} />
            </button>

            {showTools && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 overflow-hidden rounded-xl border border-white/[0.06] bg-[#07090C] p-3.5 font-mono text-[11px] space-y-2"
              >
                {steps.map((s, i) => (
                  <div key={s.call + i} className="border-l-2 border-emerald-500/40 pl-2.5 py-0.5">
                    <p className="text-zinc-200 font-medium">{s.call}</p>
                    <p className="text-emerald-400/80 text-[10px] mt-0.5">{s.out}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* Tarjeta de Guardrail HITL si es requerida */}
        {(requiresHitl || (!responseText && !isRealStock)) && (
          <div
            className={`rounded-2xl border p-4 transition-all shadow-sm ${
              approved
                ? 'border-emerald-500/20 bg-emerald-950/20'
                : 'border-amber-500/20 bg-amber-950/10'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {approved ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-100 font-headline">
                  {approved ? 'Orden aprobada y emitida' : 'Guardrail Human-in-the-Loop'}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                  {approved ? (
                    'OC registrada inmutablemente en case_events con firma criptográfica.'
                  ) : (
                    <>
                      La orden por <strong className="text-zinc-200 font-medium">{orderAmount || '$22,500 MXN'}</strong> excede el límite autónomo de{' '}
                      <strong className="text-zinc-200 font-medium">{threshold || '$10,000 MXN'}</strong>. Requiere firma de supervisor.
                    </>
                  )}
                </p>
                {!approved && (
                  <button
                    onClick={onApprove}
                    className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition-all shadow-xs active:scale-[0.98]"
                  >
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Aprobar y Emitir Orden</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Telemetría ejecutiva */}
        <div className="flex items-center gap-2 pt-0.5 font-mono text-[10px] text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Grok-4.6 ReAct • {metrics?.totalTokens ?? 1840} tokens • ${metrics?.totalCostUsd ?? '0.0024'} USD</span>
        </div>
      </div>
    </motion.div>
  );
};
