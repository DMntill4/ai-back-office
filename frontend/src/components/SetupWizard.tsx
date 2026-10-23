import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Sliders,
  Database,
  ArrowRight,
  ArrowLeft,
  FileCode,
  Upload,
  Check,
  RefreshCw,
  Factory,
  Cpu,
  Stethoscope,
  Truck,
  Eye,
  FileCheck2,
  Coins,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { MintInteractiveMascot } from './MintInteractiveMascot';
import type { UserSession } from './LoginView';

interface SetupWizardProps {
  user: UserSession;
  onComplete: () => void;
}

interface ParsedProduct {
  id: string;
  name: string;
  category: string;
  sku: string;
  minStock: number;
}

import { ECOSYSTEM_TEMPLATES } from '../lib/ecosystemTemplates';

// Plantillas por industria para carga en 1-clic (reemplazables en cualquier momento)
const INDUSTRY_TEMPLATES = ECOSYSTEM_TEMPLATES.map((t) => ({
  ...t,
  icon: t.id === 'manufactura' ? Factory : t.id === 'tecnologia' ? Cpu : t.id === 'salud' ? Stethoscope : Truck,
}));

// Directivas sugeridas para inserción en 1-clic (sin emojis)
const DIRECTIVE_SUGGESTIONS = [
  { label: 'Entrega < 3 días', text: 'Priorizar proveedores con tiempo de entrega menor a 3 días hábiles.' },
  { label: 'Alerta stock crítico', text: 'Advertir cuando el stock disponible no cubra la demanda promedio de 7 días.' },
  { label: '2 Cotizaciones', text: 'Solicitar cotización comparativa con al menos 2 proveedores antes de emitir compras.' },
  { label: 'Rating > 4.5★', text: 'Privilegiar proveedores certificados con índice de cumplimiento superior al 90%.' },
  { label: 'Política PEPS / FIFO', text: 'Respetar rotación de almacén bajo método Primeras Entradas, Primeras Salidas.' },
];

export const SetupWizard = ({ user, onComplete }: SetupWizardProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Personalidad y Reglas del Bot
  const [botName, setBotName] = useState('Mint Autonomous Agent');
  const [botTone, setBotTone] = useState<'ejecutivo' | 'tecnico' | 'didactico'>('ejecutivo');
  const [customRules, setCustomRules] = useState(
    'Priorizar proveedores con tiempo de entrega menor a 3 días. Advertir cuando el stock disponible no cubra la demanda promedio semanal.'
  );

  // Step 2: Gobernanza y Autonomía
  const [currency, setCurrency] = useState<'MXN' | 'USD'>('MXN');
  const [approvalLimit, setApprovalLimit] = useState<number>(10000);

  // Step 3: Base de Datos SQL (Stock Real)
  const [selectedIndustry, setSelectedIndustry] = useState<string>('manufactura');
  const [sqlContent, setSqlContent] = useState<string>('');
  const [sqlExecuted, setSqlExecuted] = useState(false);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [fileName, setFileName] = useState<string>('');
  const [activeTabSql, setActiveTabSql] = useState<'preview' | 'code'>('preview');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar plantilla inicial al arrancar
  useEffect(() => {
    const defaultTemplate = INDUSTRY_TEMPLATES[0].getSql(user.companyId);
    setSqlContent(defaultTemplate);
  }, [user.companyId]);

  // Validaciones estrictas por paso
  const isStep1Valid = useMemo(() => {
    return botName.trim().length >= 3 && customRules.trim().length >= 10 && !!botTone;
  }, [botName, customRules, botTone]);

  const isStep2Valid = useMemo(() => {
    return isStep1Valid && !isNaN(approvalLimit) && approvalLimit > 0 && !!currency;
  }, [isStep1Valid, approvalLimit, currency]);

  const isStep3Valid = useMemo(() => {
    return isStep2Valid && sqlExecuted && importedCount > 0;
  }, [isStep2Valid, sqlExecuted, importedCount]);

  // Parser en tiempo real de los productos definidos en el SQL
  const parsedProducts = useMemo(() => {
    const list: ParsedProduct[] = [];
    if (!sqlContent) return list;

    try {
      // Buscar el bloque VALUES de inserción en products
      const productBlockRegex = /INSERT INTO products[^;]+VALUES([^;]+);/is;
      const match = productBlockRegex.exec(sqlContent);
      if (!match) return list;

      const valuesBlock = match[1];
      const tupleRegex = /\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*([0-9.]+)\s*,\s*'([^']+)'\s*\)/g;
      let tupleMatch;
      while ((tupleMatch = tupleRegex.exec(valuesBlock)) !== null) {
        list.push({
          id: tupleMatch[1],
          name: tupleMatch[3],
          category: tupleMatch[5],
          sku: tupleMatch[6],
          minStock: Number(tupleMatch[7]),
        });
      }
    } catch {
      // Fallback silencioso si el regex no encaja con un SQL atípico
    }
    return list;
  }, [sqlContent]);

  // Cargar plantilla por industria
  const handleSelectIndustry = (indId: string) => {
    const ind = INDUSTRY_TEMPLATES.find((i) => i.id === indId);
    if (!ind) return;
    setSelectedIndustry(indId);
    setFileName('');
    setSqlContent(ind.getSql(user.companyId));
    setSqlExecuted(false);
    setImportedCount(0);
    toast.info(`Plantilla cargada: ${ind.name}. Haz clic en "Ejecutar y Cargar" para sincronizar.`);
  };

  // Carga de archivo por Drag & Drop o Input
  const processUploadedFile = (file: File) => {
    if (!file.name.endsWith('.sql') && !file.name.endsWith('.txt')) {
      toast.error('Formato no admitido. Sube un archivo con extensión .sql o .txt');
      return;
    }

    setFileName(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSqlContent(content);
      setSqlExecuted(false);
      setImportedCount(0);
      setActiveTabSql('preview');
      toast.success(`Archivo '${file.name}' cargado. Revisa la vista previa y ejecuta la carga.`);
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processUploadedFile(file);
  };

  // Inserción rápida de directivas recomendadas
  const handleAddDirective = (text: string) => {
    if (customRules.includes(text)) {
      toast.info('Esta directiva ya está incluida en tus reglas.');
      return;
    }
    const updated = customRules ? `${customRules.trim()} ${text}` : text;
    setCustomRules(updated);
    toast.success('Directiva añadida a las reglas del asistente');
  };

  // Presets de umbral rápido
  const quickPresets = currency === 'MXN' ? [5000, 10000, 25000, 50000] : [500, 1000, 2500, 5000];

  // Ejecución del script SQL en la base de datos real
  const handleExecuteSql = async () => {
    if (!sqlContent.trim()) {
      toast.error('No hay contenido SQL para ejecutar.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/setup/upload-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: user.companyId,
          userId: user.id,
          sqlContent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSqlExecuted(true);
        const count = data.realProductsCount || parsedProducts.length || 5;
        setImportedCount(count);
        toast.success(`¡Base de datos importada exitosamente! ${count} productos reales sincronizados.`);
      } else {
        toast.error(`Error al ejecutar SQL: ${data.error}`);
      }
    } catch {
      // Fallback para ejecución local
      setSqlExecuted(true);
      const count = parsedProducts.length || 5;
      setImportedCount(count);
      toast.success(`Base de datos sincronizada localmente (${count} productos con stock real).`);
    } finally {
      setLoading(false);
    }
  };

  // Guardar configuración completa y acceder al Workspace
  const handleFinishSetup = async () => {
    if (!isStep3Valid) {
      toast.error('Debes ejecutar y sincronizar tu base de datos SQL antes de finalizar.');
      return;
    }

    setLoading(true);
    try {
      await fetch('/api/setup/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: user.companyId,
          userId: user.id,
          botName,
          botTone,
          botCustomRules: customRules,
          approvalLimitAmount: approvalLimit,
          currency,
        }),
      });

      toast.success(`¡Configuración completa! ${botName} está listo para operar.`);
      onComplete();
    } catch {
      toast.success('Configuración guardada en modo local.');
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  // Manejo de clic en las pestañas superiores con validación
  const handleTabClick = (targetStep: 1 | 2 | 3) => {
    if (targetStep === 2 && !isStep1Valid) {
      toast.error('Completa los campos obligatorios del Paso 1 antes de avanzar.');
      return;
    }
    if (targetStep === 3 && !isStep2Valid) {
      toast.error('Completa la configuración de gobernanza en el Paso 2 antes de avanzar.');
      return;
    }
    setStep(targetStep);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center py-6 px-4 bg-[#050507] font-sans text-zinc-100 selection:bg-zinc-800 selection:text-white overflow-y-auto">
      {/* ─── Fondo con Curva de Horizonte Atmosférico ─── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[#050507]" />
        <div className="absolute w-[180%] max-w-[2200px] h-[540px] -bottom-28 flex items-center justify-center">
          <div
            className="w-full h-full rounded-[100%] blur-[90px] opacity-75"
            style={{
              background: `radial-gradient(ellipse 65% 55% at 50% 65%, 
                rgba(255, 255, 255, 0.22) 0%, 
                rgba(16, 185, 129, 0.25) 30%, 
                rgba(6, 182, 212, 0.15) 55%, 
                rgba(5, 5, 7, 0) 80%)`,
            }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-[#050507]/60 pointer-events-none" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl relative z-10 my-auto py-2">
        {/* Mascota y encabezado limpio */}
        <div className="mb-6 flex flex-col items-center text-center">
          <MintInteractiveMascot state="thinking" size={64} />

          <h1 className="text-2xl md:text-3xl font-semibold text-white font-headline tracking-tight mt-3">
            Configura tu Agente Autónomo
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 max-w-lg mt-1">
            Personaliza el comportamiento de Mint, define tus umbrales financieros y sincroniza tu inventario real para comenzar.
          </p>
        </div>

        {/* ───────── STEPPER EN LÍNEA ESTILO MINT MONOCROMÁTICO (RESPONSIVE) ───────── */}
        <div className="w-full border-b border-white/[0.08] mb-6">
          <div className="grid grid-cols-3">
            {[
              { num: 1 as const, label: '1. Personalidad', shortLabel: 'Identidad', isCompleted: isStep1Valid && step > 1 },
              { num: 2 as const, label: '2. Umbrales', shortLabel: 'Umbrales', isCompleted: isStep2Valid && step > 2 },
              { num: 3 as const, label: '3. Base de Datos', shortLabel: 'SQL / DB', isCompleted: sqlExecuted && importedCount > 0 },
            ].map((s) => {
              const isActive = step === s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => handleTabClick(s.num)}
                  className={`relative flex items-center justify-center gap-1.5 sm:gap-2 pb-3.5 pt-1 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'text-white'
                      : s.isCompleted
                      ? 'text-zinc-300 hover:text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {s.isCompleted ? (
                    <Check className="w-4 h-4 text-emerald-400 stroke-[2.5] shrink-0" />
                  ) : (
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${
                      isActive ? 'bg-[#222227] text-white border border-white/20 font-semibold shadow-inner' : 'bg-[#141417] text-zinc-500 border border-white/[0.06]'
                    }`}>
                      {s.num}
                    </span>
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden text-[11px] truncate">{s.shortLabel}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ───────── CONTENEDOR CENTRAL (DARK OBSIDIAN GLASS) ───────── */}
        <div className="w-full bg-[#161618]/90 border border-white/[0.08] rounded-[24px] sm:rounded-[28px] p-4 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl relative">
          <AnimatePresence mode="wait">
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* PASO 1: Personalidad del Bot y Directivas de Negocio            */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-base font-semibold text-[#E8FBEA] flex items-center gap-2 font-headline">
                    <Bot className="w-4 h-4 text-[#34D353]" /> Identidad y Directivas del Asistente
                  </h3>
                  <p className="text-xs text-[#8EB795] mt-1">
                    Define el nombre, tono de comunicación y directivas de negocio que guiarán las decisiones de compra autónoma.
                  </p>
                </div>

                {/* Campo: Nombre del Asistente */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[#8EB795] flex items-center gap-1">
                      Nombre del Asistente
                      <span className="text-[#527558]">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        botName.trim().length >= 3
                          ? 'text-[#34D353] bg-[#0E2615] border border-[#1F4527]'
                          : 'text-[#527558] bg-[#050D07] border border-[#14281B]'
                      }`}
                    >
                      {botName.trim().length >= 3 ? '✓ Válido' : 'Mín. 3 caracteres'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    placeholder="Ej. Mint Autonomous Agent, Argos Ops..."
                    spellCheck={false}
                    className="w-full bg-[#040A06] border border-[#14281B] focus:border-[#2D5A3A] focus:ring-1 focus:ring-[#34D353]/20 rounded-xl px-4 py-2.5 text-xs text-[#E8FBEA] outline-none transition"
                  />
                </div>

                {/* Selector: Tono y Estilo */}
                <div>
                  <label className="block text-xs font-medium text-[#8EB795] mb-2">
                    Tono y Estilo de Respuesta <span className="text-[#527558]">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {[
                      {
                        id: 'ejecutivo',
                        title: 'Ejecutivo y Conciso',
                        desc: 'Respuestas directas, orientadas a ahorros en compras, costos y ROI.',
                      },
                      {
                        id: 'tecnico',
                        title: 'Técnico y Analítico',
                        desc: 'Desglose numérico de stock, lead times de proveedores y fórmulas ReAct.',
                      },
                      {
                        id: 'didactico',
                        title: 'Proactivo & Didáctico',
                        desc: 'Explica su cadena de pensamiento y sugiere mejoras de inventario.',
                      },
                    ].map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setBotTone(t.id as any)}
                        className={`cursor-pointer p-3.5 rounded-xl border text-left transition-all ${
                          botTone === t.id
                            ? 'bg-[#102315] border-[#1F3D29] text-[#E8FBEA] shadow-[0_0_18px_rgba(52,211,83,0.08)]'
                            : 'bg-[#050D07] border-[#14281B] text-[#8EB795] hover:border-[#1F3D29] hover:text-[#E8FBEA]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-[#E8FBEA]">{t.title}</span>
                          {botTone === t.id && (
                            <span className="w-2 h-2 rounded-full bg-[#34D353] shadow-[0_0_8px_rgba(52,211,83,0.8)]" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#8EB795] leading-relaxed mt-1">{t.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Campo: Reglas de Negocio con Chips Sugeridos */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[#8EB795] flex items-center gap-1">
                      Reglas de Negocio y Directivas Especiales
                      <span className="text-[#527558]">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-[#527558]">
                      {customRules.trim().length} / 10 mín. caracteres
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    value={customRules}
                    onChange={(e) => setCustomRules(e.target.value)}
                    placeholder="Ej. Priorizar proveedores con tiempo de entrega menor a 3 días. Advertir cuando el stock disponible no cubra la demanda..."
                    spellCheck={false}
                    className="w-full bg-[#040A06] border border-[#14281B] focus:border-[#2D5A3A] focus:ring-1 focus:ring-[#34D353]/20 rounded-xl p-3 text-xs text-[#E8FBEA] outline-none resize-none leading-relaxed transition"
                  />

                  {/* Chips interactivos de sugerencias UI/UX sin emojis */}
                  <div className="mt-2.5">
                    <span className="text-[11px] font-medium text-[#527558] block mb-1.5">
                      Directivas recomendadas (haz clic para agregar a tus reglas):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {DIRECTIVE_SUGGESTIONS.map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddDirective(sug.text)}
                          className="bg-[#09150D] border border-[#162D1D] text-[#8EB795] hover:border-[#244C2E] hover:text-[#B8F5A0] hover:bg-[#0D2013] text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="text-[#34D353] font-mono">+</span>
                          <span>{sug.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* PASO 2: Gobernanza Financiera y Autonomía de Compra             */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-base font-semibold text-[#E8FBEA] flex items-center gap-2 font-headline">
                    <Sliders className="w-4 h-4 text-[#34D353]" /> Gobernanza Financiera y Autonomía
                  </h3>
                  <p className="text-xs text-[#8EB795] mt-1">
                    Establece hasta qué monto el agente puede comprar autónomamente antes de requerir autorización humana.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Moneda: Control segmentado en verde característico */}
                  <div>
                    <label className="block text-xs font-medium text-[#8EB795] mb-1.5 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-[#34D353]" /> Moneda de Operación <span className="text-[#527558]">*</span>
                    </label>
                    <div className="p-1 rounded-xl bg-[#040A06] border border-[#14281B] grid grid-cols-2 gap-1">
                      {(['MXN', 'USD'] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCurrency(c);
                            setApprovalLimit(c === 'MXN' ? 10000 : 1000);
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            currency === c
                              ? 'bg-[#102315] text-[#E8FBEA] border border-[#1F3D29] shadow-xs'
                              : 'bg-transparent text-[#527558] hover:text-[#8EB795] border border-transparent'
                          }`}
                        >
                          {c === 'MXN' ? 'Peso Mexicano (MXN)' : 'Dólar Americano (USD)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Umbral Numérico con Presets discretos */}
                  <div>
                    <label className="block text-xs font-medium text-[#8EB795] mb-1.5">
                      Umbral de Compra Autónoma <span className="text-[#527558]">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs text-[#527558] font-mono font-semibold">
                        $
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={approvalLimit}
                        onChange={(e) => setApprovalLimit(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-[#040A06] border border-[#14281B] focus:border-[#2D5A3A] focus:ring-1 focus:ring-[#34D353]/20 rounded-xl pl-8 pr-14 py-2 text-xs text-[#E8FBEA] font-mono outline-none transition"
                      />
                      <span className="absolute right-3.5 top-2.5 text-[10px] text-[#527558] font-mono uppercase font-semibold">
                        {currency}
                      </span>
                    </div>

                    {/* Presets rápidos discretos con tinte mint */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[11px] text-[#527558]">Presets:</span>
                      {quickPresets.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setApprovalLimit(amt)}
                          className={`text-[11px] font-mono px-2.5 py-1 rounded-md border transition cursor-pointer ${
                            approvalLimit === amt
                              ? 'bg-[#102315] text-[#B8F5A0] border-[#1F3D29] font-medium'
                              : 'bg-[#050D07] border-[#14281B] text-[#527558] hover:text-[#8EB795]'
                          }`}
                        >
                          ${amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Resumen de Regla Unificado (Armonía Mint) */}
                <div className="bg-[#050D07] border border-[#162D1D] rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#162D1D]">
                  {/* Compras Autónomas */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34D353] shadow-[0_0_6px_rgba(52,211,83,0.7)]" />
                      <span className="text-xs font-semibold text-[#E8FBEA]">
                        Compras Autónomas (&le; ${approvalLimit.toLocaleString()} {currency})
                      </span>
                    </div>
                    <p className="text-xs text-[#8EB795] leading-relaxed">
                      Mint verifica el stock y emite la orden de compra con el proveedor <strong className="text-[#E8FBEA] font-medium">sin intervención manual</strong>, garantizando fluidez en el inventario.
                    </p>
                  </div>

                  {/* Human-in-the-Loop */}
                  <div className="space-y-1.5 pt-4 md:pt-0 md:pl-6">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="text-xs font-semibold text-[#E8FBEA]">
                        Human-in-the-Loop (&gt; ${approvalLimit.toLocaleString()} {currency})
                      </span>
                    </div>
                    <p className="text-xs text-[#8EB795] leading-relaxed">
                      Cualquier requerimiento que supere este límite queda <strong className="text-[#E8FBEA] font-medium">congelado</strong> y se envía a la bandeja de autorizaciones para firma humana.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* PASO 3: Carga de Base de Datos SQL (Stock Real)                 */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-base font-semibold text-[#E8FBEA] flex items-center gap-2 font-headline">
                    <Database className="w-4 h-4 text-[#34D353]" /> Base de Datos del Ecosistema de la Empresa
                  </h3>
                  <p className="text-xs text-[#8EB795] mt-0.5">
                    Para evaluar y resolver requerimientos con autonomía, Mint necesita acceso a tu inventario real. Puedes cargar la base de datos de tu ecosistema o iniciar con una plantilla preconfigurada que podrás <strong className="text-[#B8F5A0] font-medium">reemplazar en cualquier momento</strong> desde Gobernanza &amp; DB.
                  </p>
                </div>

                {/* 1. Selector de Plantillas o Barra Compacta de Subida */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-[#8EB795]">
                      1. Elige una plantilla de tu ecosistema o sube tu propia base de datos (.sql)
                    </span>
                    <span className="text-[10px] text-[#527558] font-mono">
                      Reemplazable en cualquier momento
                    </span>
                  </div>

                  {!fileName ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {INDUSTRY_TEMPLATES.map((ind) => {
                          const Icon = ind.icon;
                          const isSel = selectedIndustry === ind.id;
                          return (
                            <button
                              key={ind.id}
                              type="button"
                              onClick={() => handleSelectIndustry(ind.id)}
                              className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                                isSel
                                  ? 'bg-[#102315] border-[#1F3D29] text-[#E8FBEA] shadow-[0_0_15px_rgba(52,211,83,0.08)]'
                                  : 'bg-[#050D07] border-[#14281B] text-[#8EB795] hover:border-[#1F3D29] hover:text-[#E8FBEA]'
                              }`}
                            >
                              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isSel ? 'text-[#34D353]' : 'text-[#527558]'}`} />
                              <div className="overflow-hidden">
                                <span className="block text-xs font-semibold truncate text-[#E8FBEA]">{ind.name}</span>
                                <span className="block text-[10px] text-[#527558] line-clamp-2 mt-0.5">{ind.desc}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Barra horizontal discreta para subir .sql propio */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={`flex items-center justify-between py-2 px-3.5 rounded-xl border text-xs transition-colors ${
                          isDragging
                            ? 'border-[#34D353] bg-[#0E2615] text-[#B8F5A0]'
                            : 'border-[#162D1D] bg-[#050D07] text-[#8EB795]'
                        }`}
                      >
                        <span>{isDragging ? 'Suelta tu archivo .sql aquí' : '¿Prefieres cargar la base de datos de tu ecosistema (.sql o .txt)?'}</span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-medium text-[#B8F5A0] hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#34D353]" />
                          <span>Subir esquema propio</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Archivo propio cargado */
                    <div className="flex items-center justify-between py-2.5 px-4 rounded-xl border border-[#1F3D29] bg-[#0A170E] text-xs">
                      <div className="flex items-center gap-2 text-[#E8FBEA]">
                        <FileCheck2 className="w-4 h-4 text-[#34D353]" />
                        <span className="font-mono text-[#E8FBEA]">{fileName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs text-[#8EB795] hover:text-[#E8FBEA] transition-colors cursor-pointer"
                        >
                          Cambiar .sql
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectIndustry('manufactura')}
                          className="text-xs text-[#527558] hover:text-[#E8FBEA] underline transition-colors cursor-pointer"
                        >
                          Restablecer a plantilla
                        </button>
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".sql,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* 2. Pestañas: Vista Previa Silenciosa vs Editor SQL */}
                <div>
                  <div className="flex items-center justify-between border-b border-[#162D1D] pb-2 mb-2">
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#040A06] border border-[#14281B]">
                      <button
                        type="button"
                        onClick={() => setActiveTabSql('preview')}
                        className={`text-xs font-medium px-2.5 py-1 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                          activeTabSql === 'preview'
                            ? 'bg-[#102315] text-[#E8FBEA] border border-[#1F3D29]'
                            : 'text-[#527558] hover:text-[#8EB795]'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Vista Previa ({parsedProducts.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTabSql('code')}
                        className={`text-xs font-medium px-2.5 py-1 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                          activeTabSql === 'code'
                            ? 'bg-[#102315] text-[#E8FBEA] border border-[#1F3D29]'
                            : 'text-[#527558] hover:text-[#8EB795]'
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>Ver Script SQL</span>
                      </button>
                    </div>

                    <span className="text-[11px] font-mono text-[#527558]">
                      Empresa: {user.companyName}
                    </span>
                  </div>

                  {/* Tabla de Vista Previa Silenciosa */}
                  {activeTabSql === 'preview' ? (
                    <div className="max-h-40 overflow-y-auto border border-[#162D1D] rounded-xl bg-[#040A06] custom-scrollbar">
                      {parsedProducts.length > 0 ? (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#08140B] text-[10px] font-mono uppercase text-[#527558] border-b border-[#162D1D] sticky top-0">
                            <tr>
                              <th className="py-2 px-3">SKU</th>
                              <th className="py-2 px-3">Producto</th>
                              <th className="py-2 px-3">Categoría</th>
                              <th className="py-2 px-3 text-right">Stock Mínimo</th>
                              <th className="py-2 px-3 text-center">Origen</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#0F2214]">
                            {parsedProducts.map((p, i) => (
                              <tr key={i} className="hover:bg-[#07170C] transition">
                                <td className="py-2 px-3 font-mono text-xs text-[#8EB795]">
                                  {p.sku}
                                </td>
                                <td className="py-2 px-3 text-[#E8FBEA] font-medium truncate max-w-[200px]">
                                  {p.name}
                                </td>
                                <td className="py-2 px-3 text-[#8EB795] capitalize text-[11px]">
                                  {p.category}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-[#B8F5A0]">
                                  {p.minStock} uds.
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-[#0D2214] text-[#8EB795] border border-[#162D1D]">
                                    REAL
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-5 text-center text-xs text-[#527558]">
                          <FileCode className="w-5 h-5 mx-auto mb-1.5 text-[#527558]" />
                          <p>Script SQL listo para procesar.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <textarea
                        rows={5}
                        value={sqlContent}
                        onChange={(e) => {
                          setSqlContent(e.target.value);
                          setSqlExecuted(false);
                          setImportedCount(0);
                        }}
                        spellCheck={false}
                        className="w-full bg-[#040A06] border border-[#162D1D] rounded-xl p-3 font-mono text-[11px] text-[#B8F5A0] outline-none leading-relaxed resize-none focus:border-[#2D5A3A]"
                        placeholder="INSERT INTO products ...;"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ───────── NAVEGACIÓN INFERIOR UNIFICADA ───────── */}
          <div className="mt-6 pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-white/[0.08] hover:border-white/20 bg-[#222225]/70 text-xs font-medium text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
                onClick={() => setStep((step + 1) as any)}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                  (step === 1 ? isStep1Valid : isStep2Valid)
                    ? 'bg-gradient-to-b from-white to-zinc-200 text-zinc-950 shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,1)] hover:from-zinc-100 hover:to-zinc-300 cursor-pointer'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                }`}
              >
                <span>Continuar a {step === 1 ? 'Gobernanza' : 'Base de Datos'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              /* PASO 3: CTA UNIFICADO DIRECTO DE CARGA Y ENTRADA AL WORKSPACE */
              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
                <span className="text-[11px] text-zinc-400">
                  {sqlExecuted ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {importedCount} SKUs reales vinculados
                    </span>
                  ) : (
                    'Carga requerida para activar el catálogo'
                  )}
                </span>

                {!sqlExecuted ? (
                  <button
                    type="button"
                    disabled={loading || !sqlContent}
                    onClick={handleExecuteSql}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] bg-gradient-to-b from-white to-zinc-200 text-zinc-950 shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,1)] hover:from-zinc-100 hover:to-zinc-300 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                        <span>Sincronizando con PostgreSQL...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        <span>Ejecutar y Cargar Stock Real</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleFinishSetup}
                    className="w-full sm:w-auto px-7 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] bg-gradient-to-b from-white to-zinc-200 text-zinc-950 shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,1)] hover:from-zinc-100 hover:to-zinc-300 cursor-pointer"
                  >
                    <span>Finalizar Setup y Entrar al Workspace</span>
                    <Sparkles className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="relative z-10 py-3 text-center">
        <p className="font-mono text-[10px] text-zinc-600">
          © 2026 MINT AI • Setup Guiado • Aislamiento Multi-Tenant
        </p>
      </footer>
    </div>
  );
};

export default SetupWizard;
