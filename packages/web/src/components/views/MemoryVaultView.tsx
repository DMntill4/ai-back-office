import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Folder,
  FolderOpen,
  FileText,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Layers,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Zap,
  BookOpen,
} from "lucide-react";

export interface VaultFile {
  id: string;
  filename: string;
  folder: "Decisiones" | "Políticas" | "Cuarentena" | "Consenso";
  title: string;
  updatedAt: string;
  confidence: number;
  hmacSha256: string;
  tags: string[];
  summary: string;
  content: string;
}

export interface AgentQuestion {
  id: string;
  title: string;
  question: string;
  options: string[];
  status: "pending" | "resolved";
}

const SEED_VAULT_FILES: VaultFile[] = [
  {
    id: "MEM-DEC-001",
    filename: "compra_mayorista_sierras.md",
    folder: "Decisiones",
    title: "Retención de Gobernanza: Compra Mayorista Sierra Circular 1800W",
    updatedAt: "Hoy, 10:14 a. m.",
    confidence: 0.96,
    hmacSha256: "9f82c3d1e4a5028bf87412e690a312bc89a712f5e3b129",
    tags: ["Aprobación HITL", "Presupuesto", "Punto de Reorden"],
    summary: "Se detuvo orden de compra por $7.250.000 COP al superar el umbral autónomo de $5M COP. Autorizada por el administrador.",
    content: "La demanda de discos diamantados y sierras circulares en Bucaramanga aumentó un 28% tras el inicio de obras viales. La optimización consolidó un lote de 50 unidades con DeWalt Colombia, logrando un ahorro de $1.450.000 COP. La orden fue retenida por la regla POL-COMP-01 para firma humana.",
  },
  {
    id: "MEM-POL-002",
    filename: "politica_compras_autonomas.md",
    folder: "Políticas",
    title: "Regla de Autonomía de Compra y Aprobaciones Escalonadas",
    updatedAt: "Ayer, 16:30 p. m.",
    confidence: 0.99,
    hmacSha256: "e4d909c290d0fb1ca068ffaddf22cbd0add8b365d886b1",
    tags: ["Reglas", "Gobernanza", "Finanzas"],
    summary: "Parámetros que permiten al agente emitir órdenes de hasta $5.000.000 COP sin intervención manual.",
    content: "Toda orden formulada por el especialista con proveedores homologados de categoría A+ cuyo monto sea inferior a $5.000.000 COP se emite directamente con firma criptográfica HMAC-SHA256 para evitar demoras logísticas.",
  },
  {
    id: "MEM-QUA-003",
    filename: "discrepancia_calibre_lamina.md",
    folder: "Cuarentena",
    title: "Discrepancia en Especificación Técnica: Lámina Galvanizada",
    updatedAt: "27 Oct 2026",
    confidence: 0.88,
    hmacSha256: "3f82ab2e67c8a14b091f6d34e2c817290fa8b417c8091d",
    tags: ["Cuarentena", "Calidad", "Aceros"],
    summary: "Diferencia detectada entre la ficha técnica del proveedor (Calibre 16) y la orden de compra recibida (Calibre 18).",
    content: "El lote recibido en Bodega Matriz Bucaramanga no coincide con las especificaciones mínimas de resistencia estructural. Se congelaron órdenes automáticas con Aceros del Oriente hasta recibir confirmación del laboratorio.",
  },
];

const SEED_QUESTIONS: AgentQuestion[] = [
  {
    id: "q-01",
    title: "Preferencia de Suministro en Tornillería",
    question: "¿Deseas priorizar la entrega rápida (24h) con DeWalt o el mejor precio (+12% margen) con Mundial de Tornillos para la obra Anillo Vial?",
    options: ["Priorizar Entrega Rápida", "Priorizar Mejor Margen (Recomendado)", "Dividir Pedido 50/50"],
    status: "pending",
  },
];

export const MemoryVaultView: React.FC = () => {
  const [files, setFiles] = useState<VaultFile[]>(SEED_VAULT_FILES);
  const [selectedFolder, setSelectedFolder] = useState<string>("Todas");
  const [selectedFileId, setSelectedFileId] = useState<string>("MEM-DEC-001");
  const [questions, setQuestions] = useState<AgentQuestion[]>(SEED_QUESTIONS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const selectedFile = useMemo(
    () => files.find((f) => f.id === selectedFileId) || files[0],
    [files, selectedFileId]
  );

  const filteredFiles = useMemo(() => {
    if (selectedFolder === "Todas") return files;
    return files.filter((f) => f.folder === selectedFolder);
  }, [files, selectedFolder]);

  const handleResolveQuestion = (qId: string, option: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, status: "resolved" } : q))
    );
    showToast(`Decisión guardada en memoria: ${option}`);
  };

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-canvas text-[#F9FAFB] font-sans select-none relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-4 py-3 rounded-full flex items-center gap-3 bg-[#0A160E]/95 border border-[#10B981]/40 text-[#34D399] shadow-[0_0_25px_rgba(16,185,129,0.25)] backdrop-blur-xl"
          >
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            <span className="text-xs font-mono font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[#8E9893] hover:text-[#F9FAFB] text-xs ml-1"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SUPERIOR */}
      <header className="px-6 py-4 bg-canvas border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-20 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-zinc-400">
              Repositorio de Memoria Corporativa
            </span>
            <span className="text-white/20">/</span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Bóveda de Memoria & Contexto Autónomo
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Registro estructurado de conocimiento empresarial, precedentes y reglas operativas
          </p>
        </div>

        <button
          onClick={() => showToast("Bóveda compactada: Coherencia de memoria recalculada al 98.4%.")}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>✦ Compactar y Optimizar Memoria</span>
        </button>
      </header>

      {/* CUERPO EN 3 COLUMNAS LIMPIAS */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-6 gap-6 min-h-0">
        {/* COLUMNA 1 (240px): ÁRBOL DE COLECCIONES */}
        <aside className="w-full lg:w-[240px] bg-surface-1 rounded-2xl p-4 border border-white/[0.06] shadow-xl shrink-0 flex flex-col justify-between overflow-y-auto">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-3">
              Colecciones de Memoria
            </span>

            <div className="space-y-1.5">
              {[
                { id: "Todas", label: "Todas las Memorias", count: 18 },
                { id: "Decisiones", label: "Decisiones Previas", count: 8 },
                { id: "Políticas", label: "Políticas Aprendidas", count: 4 },
                { id: "Cuarentena", label: "Excepciones / Cuarentena", count: 2 },
                { id: "Consenso", label: "Acuerdos de Consenso", count: 4 },
              ].map((col) => (
                <button
                  key={col.id}
                  onClick={() => setSelectedFolder(col.id)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-between border ${
                    selectedFolder === col.id
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold"
                      : "bg-surface-well border-white/[0.04] text-zinc-400 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{col.label}</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">{col.count}</span>
                </button>
              ))}
            </div>

            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mt-6 mb-3">
              Documentos Activos
            </span>

            <div className="space-y-1">
              {filteredFiles.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFileId(f.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between border ${
                    selectedFileId === f.id
                      ? "bg-emerald-500/10 border-emerald-500/30 text-white font-medium"
                      : "text-zinc-400 hover:bg-white/[0.04] border-transparent"
                  }`}
                >
                  <span className="truncate">{f.filename.replace(/\.md$/i, "")}</span>
                  {selectedFileId === f.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* COLUMNA 2 (CENTRAL): VISOR DE DOCUMENTO ESTILIZADO */}
        <main className="flex-1 bg-surface-1 rounded-2xl p-6 border border-white/[0.06] shadow-xl overflow-y-auto flex flex-col gap-5">
          <div className="pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/30">
                {selectedFile.folder}
              </span>
              <span className="text-zinc-500 font-mono text-xs">
                {selectedFile.filename.replace(/\.md$/i, "")}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">{selectedFile.title}</h2>
          </div>

          {/* Ficha Técnica del Registro */}
          <div className="bg-surface-well rounded-xl p-4 border border-white/[0.04]">
            <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400/90 font-bold block mb-3">
              Ficha Técnica del Registro
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block">Actualizado</span>
                <span className="text-zinc-300 font-medium">{selectedFile.updatedAt}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block">Confianza de Memoria</span>
                <span className="text-emerald-400 font-bold font-mono">{(selectedFile.confidence * 100).toFixed(0)}% Coherencia</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block">Firma de Integridad</span>
                <span className="text-zinc-400 font-mono text-[10px] truncate block">{selectedFile.hmacSha256}</span>
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <h4 className="text-xs font-bold text-white mb-1">Resumen del Contexto</h4>
            <p className="text-xs text-zinc-300 leading-relaxed">{selectedFile.summary}</p>
          </div>

          {/* Contenido en lenguaje claro */}
          <div className="text-xs text-zinc-300 leading-relaxed space-y-3">
            <h4 className="text-xs font-bold text-white">Detalle de la Memoria</h4>
            <p>{selectedFile.content}</p>
          </div>

          {/* Etiquetas Semánticas */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-white/[0.06]">
            {selectedFile.tags.map((t, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-surface-well border border-white/[0.06] text-[11px] font-medium text-zinc-400"
              >
                {t}
              </span>
            ))}
          </div>
        </main>

        {/* COLUMNA 3 (300px): MEDIDOR SEMICIRCULAR & PREGUNTAS DEL AGENTE */}
        <aside className="w-full lg:w-[300px] flex flex-col gap-5 shrink-0 overflow-y-auto">
          {/* Tarjeta de Medidor Semicircular de 180° */}
          <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl">
            <div className="pb-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white">Salud de la Memoria</h3>
              <p className="text-[11px] text-zinc-400">Coherencia semántica y ausencia de contradicciones</p>
            </div>

            <div className="relative flex flex-col items-center justify-center my-4">
              <svg className="w-48 h-28 select-none" viewBox="0 0 200 115">
                <defs>
                  <pattern
                    id="gauge-hatch-pattern-memory"
                    width="6"
                    height="6"
                    patternTransform="rotate(-45)"
                    patternUnits="userSpaceOnUse"
                  >
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#10B981" strokeWidth="2.5" strokeOpacity="0.45" />
                  </pattern>
                </defs>
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1B2620" strokeWidth="20" strokeLinecap="round" />
                <path d="M 20 100 A 80 80 0 0 1 140 26" fill="none" stroke="#0E684D" strokeWidth="20" strokeLinecap="round" />
                <path d="M 140 26 A 80 80 0 0 1 168 55" fill="none" stroke="url(#gauge-hatch-pattern-memory)" strokeWidth="20" />
              </svg>

              <div className="absolute bottom-2 text-center">
                <span className="text-3xl font-extrabold text-white font-sans">94.8%</span>
                <span className="block text-[10px] text-zinc-400">Consistencia</span>
              </div>
            </div>
          </div>

          {/* Preguntas Pendientes del Agente */}
          <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  <span>Consultas del Agente</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {questions.filter((q) => q.status === "pending").length} activa
                </span>
              </div>

              {questions.map((q) => (
                <div key={q.id} className="space-y-3">
                  <h4 className="text-xs font-bold text-white">{q.title}</h4>
                  <p className="text-[11px] text-zinc-300 leading-relaxed bg-surface-well p-3 rounded-xl border border-white/[0.04]">
                    {q.question}
                  </p>

                  <div className="space-y-2 pt-2">
                    {q.options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() => handleResolveQuestion(q.id, opt)}
                        className="w-full py-2 px-3 rounded-xl bg-surface-well hover:bg-emerald-500/15 hover:border-emerald-500/30 border border-white/[0.06] text-xs font-medium text-zinc-300 hover:text-emerald-300 transition-all text-left flex items-center justify-between"
                      >
                        <span>{opt}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
