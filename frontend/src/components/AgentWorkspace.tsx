import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, ChevronDown, Check, CheckCircle2, Terminal, ArrowUp, Zap,
  AlertTriangle, RotateCcw, Paperclip,
} from 'lucide-react';
import { MintInteractiveMascot, type AgentState } from './MintInteractiveMascot';
import mascotLogo from '../assets/mint-mascot.webp';

/* ───────────────────────────── DATA ───────────────────────────── */

const SKILLS = [
  { id: 'auto', label: 'Auto-Superpower', file: 'superpowers.ts', prompt: '' },
  { id: 'procurement', label: 'Negociar Compra', file: 'procurement_negotiator.md', prompt: 'Revisa el stock del Sensor ST-200 y evalúa reposición de 50 unidades.' },
  { id: 'finance', label: 'Análisis Financiero', file: 'financial_maestro.md', prompt: 'Genera el análisis financiero de inventario y presupuesto a 30 días.' },
  { id: 'crisis', label: 'Crisis de Stock', file: 'supply_chain_crisis.md', prompt: 'Hay una ruptura de stock crítica en el almacén central. Evalúa alternativas de abasto.' },
  { id: 'audit', label: 'Auditar Anomalías', file: 'auditar_anomalias', prompt: 'Audita anomalías de stock y sobrecostos en órdenes abiertas.' },
] as const;

const ACTION_PILLS = [
  { label: 'Reponer Sensor ST-200', badge: '2u', skill: 'procurement', prompt: 'Revisa el stock del Sensor ST-200 (2u / mín 15u) y cotiza reposición de 50 unidades con el mejor proveedor.' },
  { label: 'Valuación y flujo a 30d', skill: 'finance', prompt: 'Genera el análisis financiero a 30 días: capital comprometido, ahorros MXN/USD y caducidades FEFO.' },
  { label: 'Simular escenario What-If', skill: 'crisis', prompt: 'Simula una contingencia de proveedores y evalúa escenarios de demanda para el próximo trimestre.' },
  { label: 'Auditar anomalías', skill: 'audit', prompt: 'Audita anomalías de stock y sobrecostos en órdenes abiertas.' },
];

interface Msg { id: number; role: 'user' | 'agent'; text?: string; skillIds?: string[] }

/* ───────────────────────────── COMPONENT ───────────────────────────── */

interface AgentWorkspaceProps {
  onNavigate?: (view: string) => void;
  embedded?: boolean;
  prefilledPrompt?: string;
  onClearPrefill?: () => void;
}

export default function AgentWorkspace({ prefilledPrompt, onClearPrefill }: AgentWorkspaceProps) {
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

  const send = useCallback((text: string, skillId?: string) => {
    if (!text.trim() || agentState === 'thinking') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setInput('');
    setApproved(false);
    setSkillMenuOpen(false);
    setAttachMenuOpen(false);
    setMessages((m) => [...m, { id: Date.now(), role: 'user', text }]);
    setAgentState('thinking');
    later(() => {
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'agent', skillIds: [skillId ?? selectedSkillId, 'security'] }]);
      setAgentState('responding');
      later(() => setAgentState('idle'), 3200);
    }, 1500);
  }, [agentState, selectedSkillId]);

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
      {/* Resplandor ambiental Synthetic Mint */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <div className="-mt-20 h-[480px] w-[480px] rounded-full bg-[#34D353]/10 blur-[150px]" />
        <div className="-mt-20 h-[300px] w-[300px] rounded-full bg-[#0D2E16]/40 blur-[90px] absolute" />
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
              <div className="flex w-full max-w-[660px] flex-col items-center">
                {/* Mascota 3D interactiva oficial con aura radiante */}
                <MintInteractiveMascot state={agentState} size={118} />

                {/* Título en Outfit con acento sutil */}
                <h1 className="mt-4 mb-6 text-center text-2xl font-bold font-headline tracking-tight text-[#E8FBEA]">
                  ¿Qué operación revisamos hoy, Andrés?
                </h1>

                {/* Súper Composer Modernista */}
                <div className="relative w-full rounded-xl border border-white/[0.08] bg-[#0C0C0E] p-3.5 md:p-4 shadow-[0_12px_40px_rgba(0,0,0,0.7)] transition-all focus-within:border-white/[0.18]">
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
                    className="w-full resize-none bg-transparent px-1 pt-1 pb-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
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
                              className="absolute bottom-9 left-0 w-64 rounded-xl border border-white/[0.1] bg-[#0C0C0E] p-2 shadow-2xl backdrop-blur-xl z-50 text-xs shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
                            >
                              <button
                                onClick={() => {
                                  setInput((prev) => (prev ? prev + ' ' : '') + '@SKU-ST200');
                                  setAttachMenuOpen(false);
                                }}
                                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                              >
                                <Paperclip className="h-3.5 w-3.5 text-zinc-500" />
                                <span>Vincular <span className="font-mono text-zinc-200">@SKU-ST200</span></span>
                              </button>
                              <button
                                onClick={() => {
                                  setInput('Ejecuta auditoría de inventario crítico en los 4 almacenes.');
                                  setAttachMenuOpen(false);
                                }}
                                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                              >
                                <Zap className="h-3.5 w-3.5 text-emerald-400" />
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
                          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                        >
                          <Zap className="h-3 w-3 text-emerald-400" />
                          <span>{currentSkill.label}</span>
                          <ChevronDown className="h-3 w-3 text-zinc-500" />
                        </button>
                        <AnimatePresence>
                          {skillMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="absolute bottom-9 left-0 w-64 rounded-xl border border-white/[0.1] bg-[#0C0C0E] p-2 shadow-2xl backdrop-blur-xl z-50 text-xs shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
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

                {/* Píldoras de Acción Rápida Synthetic Mint */}
                <div className="mt-4 flex w-full max-w-[660px] flex-wrap items-center justify-center gap-2">
                  {ACTION_PILLS.map((pill) => (
                    <button
                      key={pill.label}
                      onClick={() => {
                        setSelectedSkillId(pill.skill);
                        send(pill.prompt, pill.skill);
                      }}
                      className="flex cursor-pointer items-center gap-2 rounded-full border border-[#14281B] bg-[#08120B] px-4 py-2 text-xs text-[#8EB795] transition-all hover:border-[#34D353]/40 hover:bg-[#0D2E16] hover:text-[#B8F5A0] shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
                    >
                      <span>{pill.label}</span>
                      {pill.badge && (
                        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.2 font-mono text-[10px] text-amber-400">
                          {pill.badge}
                        </span>
                      )}
                    </button>
                  ))}
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
                        <div className="max-w-[80%] rounded-2xl border border-[#34D353]/20 bg-[#0D2E16]/80 px-4 py-2.5 text-xs leading-relaxed text-[#E8FBEA] shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
                          {m.text}
                        </div>
                      </motion.div>
                    ) : (
                      <AgentResponse key={m.id} skillIds={m.skillIds ?? []} approved={approved} onApprove={() => setApproved(true)} />
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
                <div className="relative w-full rounded-xl border border-white/[0.08] bg-[#0C0C0E] p-3 shadow-2xl transition-all focus-within:border-white/[0.18]">
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
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-zinc-300 bg-white/[0.04] border border-white/[0.08] rounded-md px-2 py-0.5">{currentSkill.label}</span>
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

      {/* Control flotante discreto de estados del logo */}
      <div className="fixed bottom-3 right-5 z-40 flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#0C0C0E]/90 px-2.5 py-1 text-[10px] text-zinc-400 backdrop-blur-md opacity-40 transition hover:opacity-100 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
        <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">logo</span>
        {(['idle', 'thinking', 'responding'] as AgentState[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              timers.current.forEach(clearTimeout);
              setAgentState(s);
            }}
            className={`cursor-pointer rounded px-1.5 py-0.5 text-[10px] transition ${
              agentState === s ? 'bg-white/[0.08] text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {s}
          </button>
        ))}
        {started && (
          <button onClick={reset} title="Reiniciar chat" className="ml-1 cursor-pointer text-zinc-400 hover:text-white">
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── AGENT RESPONSE (MODERNISMO MINIMALISTA) ───────────────────────── */

const AgentResponse = ({
  skillIds,
  approved,
  onApprove,
}: {
  skillIds: string[];
  approved: boolean;
  onApprove: () => void;
}) => {
  const files = skillIds.map((id) =>
    id === 'security' ? 'security_guardrails.md' : SKILLS.find((s) => s.id === id)?.file ?? 'procurement_negotiator.md'
  );

  const steps = [
    { call: 'consultar_stock("ST-200")', out: '→ 2 u disponibles • mínimo 15 u • CRÍTICO' },
    { call: 'evaluar_proveedores("ST-200")', out: '→ Grainger Industrial • $450 MXN/u • entrega 48h' },
    { call: 'crear_orden_compra("ST-200", 50, "Grainger")', out: '→ 50 × $450 = $22,500 MXN • Excede umbral' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3.5">
      <img src={mascotLogo} alt="MINT" className="mt-0.5 h-7 w-7 shrink-0 object-contain drop-shadow-[0_2px_10px_rgba(52,211,83,0.35)]" />
      <div className="min-w-0 flex-1 space-y-3">
        {/* Superpower Activo */}
        <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-zinc-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Superpower: {files.join(' & ')}</span>
        </div>

        {/* Terminal TOOL CALL */}
        <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#09090B]">
          <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3.5 py-1.5 font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
            <Terminal className="h-3 w-3 text-emerald-400" />
            <span>tool call trace</span>
          </div>
          <div className="space-y-1.5 p-3.5 font-mono text-[11px]">
            {steps.map((s, i) => (
              <motion.div key={s.call} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.2 }}>
                <p className="text-emerald-400">{s.call}</p>
                <p className="text-zinc-400">{s.out}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Dictamen */}
        <p className="text-xs leading-relaxed text-zinc-200">
          El Sensor Térmico ST-200 se encuentra en nivel crítico. La reposición de 50 unidades con{' '}
          <strong className="text-white font-medium">Grainger Industrial</strong> ($450 MXN/u, entrega en 48h) totaliza{' '}
          <strong className="text-white font-semibold font-mono">$22,500 MXN</strong>.
        </p>

        {/* Tarjeta de Guardrail HITL */}
        <div
          className={`rounded-xl border p-4 transition-all shadow-[0_4px_24px_rgba(0,0,0,0.4)] ${
            approved
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-white/[0.07] bg-[#0C0C0E]'
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
                    La orden por <strong className="text-zinc-200 font-medium">$22,500 MXN</strong> excede el límite autónomo de{' '}
                    <strong className="text-zinc-200 font-medium">$10,000 MXN</strong>. Requiere firma de supervisor.
                  </>
                )}
              </p>
              {!approved && (
                <button
                  onClick={onApprove}
                  className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-950 transition-all hover:bg-white shadow-xs active:scale-[0.98]"
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Aprobar y Emitir Orden</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Telemetría */}
        <div className="flex items-center gap-2 pt-0.5 font-mono text-[10px] text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Grok-4.6 • 1,840 tokens • $0.0024 USD • Inmutable</span>
        </div>
      </div>
    </motion.div>
  );
};
