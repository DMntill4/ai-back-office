import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Database,
  Truck,
  Layers,
  Sparkles,
  Download,
  Copy,
  Check,
  Cpu,
  Eye,
  FileText,
} from "lucide-react";
import { StatusBadge } from "../ui/StatusBadge";

interface ImpactMetric {
  label: string;
  before: number;
  after: number;
  unit: string;
  /** true = menor es mejor (ej. tiempo, costo) */
  lowerIsBetter?: boolean;
}

interface HistoryRecord {
  id: string;
  code: string;
  title: string;
  status: "resuelto" | "escalado" | "bloqueado";
  amountCop: string;
  supplier: string;
  date: string;
  model: string;
  latencyMs: number;
  reason: string;
  hmacDigest: string;
  /** Quién ejecutó la acción final */
  executor: "agente" | "humano";
  executorName: string;
  impact: ImpactMetric[];
  thoughtTree: {
    step: string;
    action: string;
    detail: string;
    latencyMs: number;
  }[];
}

const INITIAL_HISTORY_RECORDS: HistoryRecord[] = [
  {
    id: "case_01",
    code: "EVT-2026-9918",
    title: "Reabastecimiento Martillo Demoledor SDS-Max (9u)",
    status: "resuelto",
    amountCop: "$3.780.000 COP",
    supplier: "Ferreterías Unidas Bogotá S.A.S.",
    date: "Hoy, 10:14 a. m.",
    model: "MINT Autonomous Core · Flash",
    latencyMs: 227,
    reason: "Propuesta formulada tras detección de caída en stock de seguridad en Bucaramanga. Requiere confirmación humana de contrato marco.",
    hmacDigest: "hmac_sha256_e4b89f81a7b640192e591bc0392817cc90fa8b417c8091de99238461",
    executor: "humano",
    executorName: "Camila Restrepo · Jefa de Compras",
    impact: [
      { label: "Días de cobertura", before: 1.2, after: 18.4, unit: "d" },
      { label: "Costo unitario", before: 420000, after: 378000, unit: "COP", lowerIsBetter: true },
      { label: "Riesgo de quiebre", before: 92, after: 8, unit: "%", lowerIsBetter: true },
    ],
    thoughtTree: [
      {
        step: "1. Auditoría de Inventario",
        action: "Verificación de existencias en Bodega Matriz Bucaramanga.",
        detail: "Stock actual: 1 unidad. Punto de reorden (ROP): 10 unidades. Cobertura: 1.2 días.",
        latencyMs: 42,
      },
      {
        step: "2. Cotización y Comparación",
        action: "Análisis multicriterio de 3 proveedores homologados.",
        detail: "Ferreterías Unidas ($3.780.000 COP, 2 días) seleccionada por delta costo favorable de $320.000 COP.",
        latencyMs: 125,
      },
      {
        step: "3. Validación de Políticas",
        action: "Comprobación de límites presupuestales de compra.",
        detail: "Monto menor a $5.000.000 COP. Procedió aprobación automática bajo gobernanza.",
        latencyMs: 38,
      },
      {
        step: "4. Emisión y Firma Criptográfica",
        action: "Generación de remisión en libro mayor y firma HMAC.",
        detail: "Recibo auditado registrado con éxito. Despacho programado para las 14:00.",
        latencyMs: 22,
      },
    ],
  },
  {
    id: "case_02",
    code: "EVT-2026-9912",
    title: "Re-enrutamiento Camión WFL-892 por Cierre Vial",
    status: "resuelto",
    amountCop: "$1.532.300 COP",
    supplier: "Flota Propia Mint · Hino 5T",
    date: "Hoy, 09:20 a. m.",
    model: "OSRM Route Optimization Engine",
    latencyMs: 142,
    reason: "Detección de reducción de velocidad a 24 km/h en Pescadero por lluvia torrencial. Desvío calculado por variante San Gil.",
    hmacDigest: "hmac_sha256_88b209c12e8749a12b9c03847f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c",
    executor: "agente",
    executorName: "Agente Logístico Autónomo",
    impact: [
      { label: "Tiempo de viaje", before: 148, after: 124, unit: "min", lowerIsBetter: true },
      { label: "Consumo combustible", before: 38, after: 33, unit: "L", lowerIsBetter: true },
      { label: "Cumplimiento de ventana", before: 61, after: 96, unit: "%" },
    ],
    thoughtTree: [
      {
        step: "1. Sensor de Telemetría",
        action: "Detección de anomalía de velocidad en tramo de montaña.",
        detail: "Alerta climática activa en Cañón del Chicamocha.",
        latencyMs: 20,
      },
      {
        step: "2. Simulación de Variantes",
        action: "Cálculo de trayectorias alternas con OSRM.",
        detail: "Variante San Gil elude el bloqueo con ahorro proyectado de 24 minutos.",
        latencyMs: 85,
      },
      {
        step: "3. Confirmación con Conductor",
        action: "Transmisión telemática de la nueva hoja de ruta.",
        detail: "Aceptado y confirmado en cabina por el conductor.",
        latencyMs: 37,
      },
    ],
  },
];

export const HistoryView: React.FC = () => {
  const [records, setRecords] = useState<HistoryRecord[]>(INITIAL_HISTORY_RECORDS);
  const [selectedId, setSelectedId] = useState<string>("case_01");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const currentIdx = records.findIndex((r) => r.id === selectedId);
  const selectedRecord = records[currentIdx] || records[0];

  const handlePrev = () => {
    const nextIdx = (currentIdx - 1 + records.length) % records.length;
    setSelectedId(records[nextIdx].id);
  };

  const handleNext = () => {
    const nextIdx = (currentIdx + 1) % records.length;
    setSelectedId(records[nextIdx].id);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-canvas text-[#F9FAFB] font-sans select-none overflow-hidden relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-4 py-3 rounded-full flex items-center gap-3 bg-[#0A160E] border border-[#10B981]/40 text-[#34D399] shadow-[0_0_25px_rgba(16,185,129,0.25)]"
          >
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            <span className="text-xs font-mono font-medium tracking-tight">{toastMessage}</span>
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
            <span className="text-xs font-mono uppercase text-zinc-400">Gobernanza</span>
            <span className="text-white/20">/</span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Auditoría de Eventos & Trazabilidad
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Registro inmutable de razonamiento algorítmico, decisiones y firmas de integridad
          </p>
        </div>

        <button
          onClick={() => showToast("Exportando registro completo de auditoría...")}
          className="px-4 py-2 rounded-xl bg-surface-1 hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-2 transition-all"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Exportar Libro Mayor (CSV)</span>
        </button>
      </header>

      {/* SPLIT-SCREEN 50 / 50 */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        {/* PANEL IZQUIERDO (50%): DOSSIER DEL EVENTO */}
        <div className="w-full lg:w-1/2 h-full bg-canvas overflow-y-auto p-6 flex flex-col gap-5 border-b lg:border-b-0 lg:border-r border-white/[0.06]">
          {/* Fila 1: Selector y Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
                  {selectedRecord.code}
                </span>

                <StatusBadge variant="success" label="Auditado & Válido" />

                <div className="flex items-center bg-surface-1 rounded-lg border border-white/[0.08] p-0.5">
                  <button
                    onClick={handlePrev}
                    className="p-1 hover:bg-white/[0.06] rounded text-zinc-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono px-1.5 text-zinc-400">
                    {currentIdx + 1}/{records.length}
                  </span>
                  <button
                    onClick={handleNext}
                    className="p-1 hover:bg-white/[0.06] rounded text-zinc-400 hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <p className="text-xs text-zinc-400">
                  Registrado: <span className="text-zinc-300 font-medium">{selectedRecord.date}</span> · Entidad:{" "}
                  <span className="text-emerald-400 font-medium">{selectedRecord.supplier}</span>
                </p>
              </div>

              {/* Badge de Ejecutor: Agente Autónomo vs Firma Humana */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${selectedRecord.executor === "agente"
                    ? "bg-emerald-500/12 text-emerald-300 border-emerald-500/30"
                    : "bg-sky-500/12 text-sky-300 border-sky-500/30"
                    }`}
                >
                  {selectedRecord.executor === "agente" ? (
                    <Cpu className="w-3.5 h-3.5" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  {selectedRecord.executor === "agente" ? "Agente Autónomo" : "Firma Humana"}
                </span>
                <span className="text-[11px] text-zinc-400">{selectedRecord.executorName}</span>
              </div>
            </div>
          </div>

          {/* Fila 2: Stepper de 4 Fases y Métricas */}
          <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl">
            <h3 className="text-sm font-bold text-white mb-2">{selectedRecord.title}</h3>

            <div className="bg-surface-well rounded-xl p-4 mt-3 border border-white/[0.04]">
              <div className="relative flex items-center justify-between">
                <div className="absolute top-1/2 left-4 right-4 h-1 bg-white/[0.08] -translate-y-1/2 z-0" />
                <div className="absolute top-1/2 left-4 right-4 h-1 bg-emerald-500 -translate-y-1/2 z-0" />

                {[
                  { label: "Detección", icon: Eye },
                  { label: "Razonamiento", icon: Cpu },
                  { label: "Gobernanza", icon: ShieldCheck },
                  { label: "Libro Mayor", icon: CheckCircle2 },
                ].map((s, idx) => (
                  <div key={idx} className="relative z-10 flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                      <s.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-300 mt-2">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/[0.06]">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 block mb-1">
                  Monto Involucrado
                </span>
                <span className="text-sm font-bold text-white font-mono">{selectedRecord.amountCop}</span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 block mb-1">
                  Latencia Total
                </span>
                <span className="text-sm font-semibold text-emerald-400 font-mono">
                  {selectedRecord.latencyMs} ms
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 block mb-1">
                  Motor de Decisión
                </span>
                <span className="text-xs font-semibold text-zinc-300 truncate block">
                  {selectedRecord.model}
                </span>
              </div>
            </div>
          </div>

          {/* Fila 2b: Comparativa de Impacto Antes / Después */}
          <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-card">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Impacto Operativo del Evento
              </h3>
              <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-white/25" />
                  Antes
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  Después
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {selectedRecord.impact.map((m) => {
                const max = Math.max(m.before, m.after) || 1;
                const beforePct = (m.before / max) * 100;
                const afterPct = (m.after / max) * 100;
                const improved = m.lowerIsBetter ? m.after < m.before : m.after > m.before;
                const deltaPct = m.before === 0 ? 0 : ((m.after - m.before) / m.before) * 100;
                const fmt = (v: number) =>
                  v >= 10000 ? `${(v / 1000).toFixed(0)}k` : v.toLocaleString("es-CO");
                return (
                  <div key={m.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-zinc-300">{m.label}</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${improved
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-rose-500/15 text-rose-400"
                          }`}
                      >
                        {deltaPct > 0 ? "+" : ""}
                        {deltaPct.toFixed(0)}%
                      </span>
                    </div>

                    <div className="space-y-1">
                      {/* Barra "Antes": sólida atenuada */}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-zinc-400 w-10 shrink-0">
                          Antes
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-white/25"
                            style={{ width: `${beforePct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono tabular-numbers text-zinc-400 w-16 text-right shrink-0">
                          {fmt(m.before)} {m.unit}
                        </span>
                      </div>

                      {/* Barra "Después": sólida esmeralda */}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-emerald-500/70 w-10 shrink-0">
                          Después
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${improved ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            style={{ width: `${afterPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono tabular-numbers text-white w-16 text-right shrink-0">
                          {fmt(m.after)} {m.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fila 3: Bitácora del Árbol de Razonamiento */}
          <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl">
            <h3 className="text-sm font-bold text-white tracking-tight mb-4">
              Cadena de Inferencia Auditada
            </h3>
            <div className="relative pl-6 space-y-5">
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-white/[0.08]" />
              {selectedRecord.thoughtTree.map((step, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-canvas shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">{step.step}</h4>
                    <span className="text-[10px] font-mono text-zinc-500">{step.latencyMs} ms</span>
                  </div>
                  <p className="text-xs text-emerald-400 mt-0.5">{step.action}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO (50%): INSPECTOR CRIPTOGRÁFICO */}
        <div className="w-full lg:w-1/2 h-full bg-[#070C09] overflow-y-auto p-6 flex flex-col gap-5">
          <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Prueba de Integridad de la Cadena</span>
              </h3>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Inmutable
              </span>
            </div>

            <div className="bg-surface-well rounded-xl p-4 border border-white/[0.04] space-y-4 font-mono text-xs">
              <div>
                <span className="text-[10px] uppercase text-zinc-500 block mb-1">
                  Digest Criptográfico (HMAC-SHA256)
                </span>
                <span className="text-emerald-400 text-[11px] break-all block bg-surface-1 p-2 rounded-lg border border-white/[0.04]">
                  {selectedRecord.hmacDigest}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.04] text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Esquema de Validación</span>
                  <span className="text-white">HMAC-SHA256 con llave rotativa</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Estado del Bloque</span>
                  <span className="text-emerald-400 font-bold">Verificado y Sellado ✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Línea de Tiempo Cronológica de Auditoría */}
          <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-card flex-1">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Línea de Tiempo de Auditoría</span>
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">
                {selectedRecord.thoughtTree.length} hitos
              </span>
            </div>

            <div className="relative pl-5">
              <div className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-gradient-to-b from-emerald-500/60 via-emerald-500/25 to-transparent" />
              {selectedRecord.thoughtTree.map((step, idx) => {
                const isLast = idx === selectedRecord.thoughtTree.length - 1;
                return (
                  <div key={idx} className={isLast ? "" : "pb-4"}>
                    <div className="relative">
                      <span
                        className={`absolute -left-5 top-1 w-[9px] h-[9px] rounded-full border-2 ${isLast
                          ? "bg-emerald-400 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
                          : "bg-[#0B100E] border-emerald-500/60"
                          }`}
                      />
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-semibold text-zinc-200 leading-snug">
                          {step.step}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 shrink-0 mt-0.5">
                          +{step.latencyMs} ms
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-400/80 mt-0.5 leading-snug">
                        {step.action}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
              <span className="text-zinc-500">Latencia acumulada</span>
              <span className="font-mono tabular-numbers text-emerald-400 font-bold">
                {selectedRecord.thoughtTree.reduce((acc, s) => acc + s.latencyMs, 0)} ms
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
