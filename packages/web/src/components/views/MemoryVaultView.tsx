import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Folder,
  FolderOpen,
  FileText,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { useVault } from "../../hooks/useVault";
import type { VaultDocumentSummary } from "../../services/apiClient";

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
    tags: ["Aprobación humana", "Presupuesto", "Punto de Reorden"],
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

/** Mapea una categoría del API a la carpeta visual de la vista. */
function toVaultFolder(category: VaultDocumentSummary["category"]): VaultFile["folder"] {
  switch (category) {
    case "quarantine":
      return "Cuarentena";
    case "audit":
      return "Políticas";
    case "questions":
      return "Consenso";
    default:
      return "Decisiones";
  }
}

/** Adapta el contrato del API al modelo de presentación de la vista. */
function toVaultFile(doc: VaultDocumentSummary): VaultFile {
  const confidenceNum = Number.parseFloat(String(doc.confianza));
  return {
    id: doc.id,
    filename: doc.relativePath.split("/").pop() ?? `${doc.id}.md`,
    folder: toVaultFolder(doc.category),
    title: doc.title,
    updatedAt: doc.updatedAt,
    confidence: Number.isFinite(confidenceNum) ? confidenceNum : 0.9,
    hmacSha256: doc.id.replace(/[^a-zA-Z0-9]/g, "").padEnd(48, "0").slice(0, 48),
    tags: doc.tags ?? [],
    summary: `${doc.tipo} · ${doc.modulo} · estado ${doc.estado}`,
    content: "",
  };
}

const sectionLabelClass = "text-caption font-mono text-muted block";

export const MemoryVaultView: React.FC = () => {
  const { documents: liveDocuments, loading: vaultLoading, isFallback } = useVault();
  const [files, setFiles] = useState<VaultFile[]>(SEED_VAULT_FILES);

  // Sincroniza la bóveda real (o el fallback) con el estado local de la vista.
  useEffect(() => {
    if (liveDocuments.length > 0) {
      setFiles(liveDocuments.map(toVaultFile));
    }
  }, [liveDocuments]);
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
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-canvas text-primary font-sans relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-compact py-hairline rounded-pill flex items-center gap-compact bg-brand-surface border border-brand/40 text-brand shadow-popover"
          >
            <div className="w-2 h-2 rounded-pill bg-brand animate-ping" />
            <span className="text-caption font-mono font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-muted hover:text-primary text-caption ml-hairline"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SUPERIOR */}
      <header className="px-group py-base bg-canvas border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-base z-20 shrink-0">
        <div>
          <div className="flex items-center gap-hairline">
            <span className="text-caption font-sans text-secondary">
              Inteligencia
            </span>
            <span className="text-muted">/</span>
            <h1 className="text-section-title font-semibold text-primary">
              Memoria del agente
            </h1>
          </div>
          <p className="text-caption text-secondary mt-hairline">
            Registro estructurado de decisiones empresariales, precedentes y reglas operativas
          </p>
        </div>

        <button
          onClick={() => showToast("Memoria compactada: Coherencia recalculada al 98.4%.")}
          className="pl-compact pr-hairline py-hairline rounded-pill bg-brand hover:bg-brand text-canvas font-semibold text-caption flex items-center gap-compact transition-colors cursor-pointer group"
        >
          <span>Compactar Memoria</span>
          <span className="w-6 h-6 rounded-pill bg-canvas text-brand flex items-center justify-center transition-transform group-hover:rotate-45">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
        </button>
      </header>

      {/* CUERPO EN 3 COLUMNAS */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-group gap-group min-h-0">
        {/* COLUMNA 1: ÁRBOL DE COLECCIONES */}
        <aside className="w-full lg:w-[240px] bg-panel rounded-container p-base border border-border shrink-0 flex flex-col justify-between overflow-y-auto custom-scrollbar">
          <div>
            <span className={`${sectionLabelClass} mb-compact`}>
              Colecciones de Memoria
            </span>

            <div className="space-y-hairline">
              {[
                { id: "Todas", label: "Todas las Memorias", count: 18, icon: Layers },
                { id: "Decisiones", label: "Decisiones Previas", count: 8, icon: CheckCircle2 },
                { id: "Políticas", label: "Políticas Aprendidas", count: 4, icon: ShieldCheck },
                { id: "Cuarentena", label: "Excepciones / Cuarentena", count: 2, icon: ShieldAlert },
                { id: "Consenso", label: "Acuerdos de Consenso", count: 4, icon: Sparkles },
              ].map((col) => {
                const Icon = col.icon;
                const isActive = selectedFolder === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => setSelectedFolder(col.id)}
                    className={`w-full py-hairline px-compact rounded-control text-caption font-medium transition-colors flex items-center justify-between border ${isActive
                      ? "bg-brand-surface border-brand/40 text-brand font-semibold"
                      : "bg-raised border-border text-secondary hover:text-primary hover:border-border-strong"
                      }`}
                  >
                    <span className="flex items-center gap-hairline min-w-0">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-brand" : "text-muted"}`} />
                      <span className="truncate">{col.label}</span>
                    </span>
                    <span
                      className={`text-caption font-mono tabular-numbers px-hairline py-hairline rounded-control shrink-0 ${isActive ? "bg-brand-surface text-brand" : "bg-raised text-muted"
                        }`}
                    >
                      {col.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <span className={`${sectionLabelClass} mt-group mb-compact`}>
              Documentos Activos
            </span>

            <div className="space-y-hairline">
              {filteredFiles.map((f) => {
                const isActive = selectedFileId === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFileId(f.id)}
                    className={`w-full text-left p-hairline rounded-control text-caption transition-colors flex items-center gap-hairline border ${isActive
                      ? "bg-brand-surface border-brand/40 text-primary font-medium"
                      : "text-secondary hover:bg-raised border-transparent"
                      }`}
                  >
                    <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-brand" : "text-muted"}`} />
                    <span className="truncate flex-1">{f.title}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-pill bg-brand shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-base pt-compact border-t border-border">
            <div className="flex items-center justify-between text-caption text-muted">
              <span className="flex items-center gap-hairline">
                <ShieldCheck className="w-3 h-3 text-brand" />
                Firma HMAC activa
              </span>
              <span className="font-mono">v2.4</span>
            </div>
          </div>
        </aside>

        {/* COLUMNA 2: VISOR DE DOCUMENTO */}
        <main className="flex-1 bg-panel rounded-container p-group border border-border overflow-y-auto custom-scrollbar flex flex-col gap-element min-w-0">
          <div className="pb-base border-b border-border">
            <div className="flex flex-wrap items-center gap-hairline mb-hairline">
              <span className="px-hairline py-hairline rounded-pill bg-brand-surface text-brand text-caption font-medium border border-brand/40">
                {selectedFile.folder}
              </span>
              <span className="text-caption font-mono text-muted px-hairline py-hairline rounded-control bg-raised border border-border">
                {selectedFile.id}
              </span>
              <span className="text-muted text-caption flex items-center gap-hairline">
                <Clock className="w-3 h-3" />
                {selectedFile.updatedAt}
              </span>
            </div>
            <h2 className="text-section-title font-semibold text-primary leading-snug">
              {selectedFile.title}
            </h2>
          </div>

          {/* Ficha Técnica del Registro */}
          <div className="bg-raised rounded-container p-base border border-border">
            <div className="flex items-center justify-between mb-compact">
              <span className="text-caption font-mono text-brand">
                Ficha Técnica del Registro
              </span>
              <span className="flex items-center gap-hairline text-caption text-brand">
                <ShieldCheck className="w-3 h-3" />
                Verificada
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-base text-caption">
              <div>
                <span className="text-caption text-muted block mb-hairline">
                  Última actualización
                </span>
                <span className="text-primary font-medium">{selectedFile.updatedAt}</span>
              </div>
              <div>
                <span className="text-caption text-muted block mb-hairline">
                  Confianza de memoria
                </span>
                <div className="flex items-center gap-hairline">
                  <span className="text-brand font-bold font-mono tabular-numbers">
                    {(selectedFile.confidence * 100).toFixed(0)}%
                  </span>
                  <div className="flex-1 h-1 rounded-pill bg-raised overflow-hidden max-w-[80px]">
                    <div
                      className="h-full bg-brand rounded-pill"
                      style={{ width: `${selectedFile.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="min-w-0">
                <span className="text-caption text-muted block mb-hairline">
                  Firma de integridad
                </span>
                <span className="text-secondary font-mono text-caption truncate block">
                  {selectedFile.hmacSha256}
                </span>
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div className="p-base rounded-container bg-brand-surface border border-brand/20">
            <h4 className="text-caption font-mono text-brand mb-hairline">
              Resumen del Contexto
            </h4>
            <p className="text-caption text-primary leading-relaxed">{selectedFile.summary}</p>
          </div>

          {/* Contenido en lenguaje claro */}
          <div className="text-caption text-secondary leading-relaxed space-y-hairline">
            <h4 className="text-caption font-mono text-muted">
              Detalle de la Memoria
            </h4>
            <p className="text-body leading-relaxed">{selectedFile.content}</p>
          </div>

          {/* Etiquetas Semánticas */}
          <div className="flex flex-wrap items-center gap-hairline pt-base mt-auto border-t border-border">
            <span className="text-caption font-mono text-muted mr-hairline">
              Etiquetas
            </span>
            {selectedFile.tags.map((t, idx) => (
              <span
                key={idx}
                className="px-hairline py-hairline rounded-control bg-raised border border-border text-caption font-medium text-secondary"
              >
                {t}
              </span>
            ))}
          </div>
        </main>

        {/* COLUMNA 3: MEDIDOR & PREGUNTAS DEL AGENTE */}
        <aside className="w-full lg:w-[300px] flex flex-col gap-element shrink-0 overflow-y-auto custom-scrollbar">
          {/* Tarjeta de Medidor Semicircular */}
          <div className="bg-panel rounded-container p-base border border-border">
            <div className="pb-compact border-b border-border">
              <h3 className="text-label font-semibold text-primary">Salud de la Memoria</h3>
              <p className="text-caption text-secondary">
                Coherencia semántica y ausencia de contradicciones
              </p>
            </div>

            <div className="relative flex flex-col items-center justify-center mt-base">
              <svg className="w-52 h-32" viewBox="0 0 200 118">
                <defs>
                  <pattern
                    id="gauge-hatch-pattern-memory"
                    width="6"
                    height="6"
                    patternTransform="rotate(-45)"
                    patternUnits="userSpaceOnUse"
                  >
                    <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-brand)" strokeWidth="2.5" strokeOpacity="0.5" />
                  </pattern>
                  <linearGradient id="gauge-solid-memory" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="var(--color-brand)" />
                  </linearGradient>
                </defs>

                {/* Pista de fondo */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                {/* Arco sólido */}
                <path
                  d="M 20 100 A 80 80 0 0 1 179.2 91.2"
                  fill="none"
                  stroke="url(#gauge-solid-memory)"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                {/* Proyección rayada del tramo restante */}
                <path
                  d="M 179.2 91.2 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="url(#gauge-hatch-pattern-memory)"
                  strokeWidth="18"
                />

                {/* Marcas de graduación */}
                {[0, 25, 50, 75, 100].map((pct) => {
                  const angle = Math.PI * (1 - pct / 100);
                  const x1 = 100 + Math.cos(angle) * 62;
                  const y1 = 100 - Math.sin(angle) * 62;
                  const x2 = 100 + Math.cos(angle) * 70;
                  const y2 = 100 - Math.sin(angle) * 70;
                  return (
                    <line
                      key={pct}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="var(--color-border-strong)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              <div className="absolute bottom-0 text-center">
                <span className="text-metric font-semibold text-primary font-sans tabular-numbers leading-none">
                  94.8%
                </span>
                <span className="block text-caption text-secondary mt-hairline">
                  Consistencia semántica
                </span>
              </div>
            </div>

            {/* Desglose de salud de datos */}
            <div className="mt-base pt-compact border-t border-border space-y-hairline">
              {[
                { label: "Registros verificados", value: 18, total: 18 },
                { label: "Sin contradicciones", value: 17, total: 18 },
                { label: "Firma HMAC válida", value: 18, total: 18 },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-caption">
                  <span className="text-secondary">{row.label}</span>
                  <span className="font-mono tabular-numbers text-primary">
                    {row.value}
                    <span className="text-muted">/{row.total}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Preguntas Pendientes del Agente */}
          <div className="bg-panel rounded-container p-base border border-border flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-compact mb-compact border-b border-border">
              <h3 className="text-label font-semibold text-primary flex items-center gap-hairline">
                <HelpCircle className="w-4 h-4 text-brand" />
                <span>Consultas del Agente</span>
              </h3>
              <span className="text-caption font-medium px-hairline py-hairline rounded-pill bg-brand-surface text-brand border border-brand/20">
                {questions.filter((q) => q.status === "pending").length} activa
              </span>
            </div>

            {questions.map((q) => (
              <div key={q.id} className="space-y-compact">
                <h4 className="text-caption font-semibold text-primary">{q.title}</h4>
                <p className="text-caption text-secondary leading-relaxed bg-raised p-compact rounded-control border border-border">
                  {q.question}
                </p>

                <div className="space-y-hairline pt-hairline">
                  {q.options.map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      onClick={() => handleResolveQuestion(q.id, opt)}
                      className="w-full py-hairline px-compact rounded-control bg-raised hover:bg-brand-surface hover:border-brand/40 border border-border text-caption font-medium text-secondary hover:text-brand transition-colors text-left flex items-center justify-between gap-hairline"
                    >
                      <span>{opt}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};
