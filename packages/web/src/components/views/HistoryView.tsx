import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  CheckCircle2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Cpu,
  Eye,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "../ui/StatusBadge";
import { EmptyState } from "../ui/EmptyState";
import { api } from "../../services/apiClient";

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

function formatDate(value: any): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function mapDecisionToRecord(d: any): HistoryRecord {
  const evidence = d?.evidencePayload ?? d?.evidence ?? {};
  const costNum = Number(d?.costMxn ?? d?.costCop ?? 0);
  const statusRaw = String(d?.status ?? d?.policyDecision ?? "").toLowerCase();
  const status: HistoryRecord["status"] =
    statusRaw.includes("reject") || statusRaw.includes("block")
      ? "bloqueado"
      : statusRaw.includes("escal") || statusRaw.includes("pending")
        ? "escalado"
        : "resuelto";

  const executor: HistoryRecord["executor"] =
    statusRaw.includes("auto") || d?.executedBy === "agent" ? "agente" : "humano";

  const tokens = Number(evidence?.totalTokens ?? evidence?.tokens ?? 0);
  const latencyMs = Number(evidence?.latencyMs ?? evidence?.latency ?? 0);

  return {
    id: String(d?.id ?? `dec_${Math.random().toString(36).slice(2)}`),
    code: String(d?.caseId ?? d?.id ?? "EVT"),
    title: String(d?.title ?? "Decisión sin título"),
    status,
    amountCop: `$${costNum.toLocaleString("es-CO")} COP`,
    supplier: String(d?.supplierName ?? d?.proposingAgent ?? "—"),
    date: formatDate(d?.createdAt ?? d?.updatedAt),
    model: String(evidence?.modelUsed ?? evidence?.model ?? "MINT Autonomous Core"),
    latencyMs,
    reason: String(d?.policyReason ?? d?.reason ?? "Sin justificación registrada."),
    hmacDigest: String(d?.hmacSignature ?? d?.hmacDigest ?? d?.signature ?? "—"),
    executor,
    executorName:
      executor === "agente"
        ? String(d?.proposingAgent ?? "Agente Autónomo")
        : String(d?.resolvedBy ?? "Operador Humano"),
    impact: [],
    thoughtTree: tokens
      ? [
        {
          step: "1. Evidencia de la Decisión",
          action: "Registro de tokens y modelo utilizados.",
          detail: `${tokens} tokens procesados con ${evidence?.modelUsed ?? "modelo configurado"}.`,
          latencyMs,
        },
      ]
      : [],
  };
}

export const HistoryView: React.FC = () => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.decisions.history({ limit: 50 });
      const rows = Array.isArray(res?.data) ? res.data : [];
      const mapped = rows.map(mapDecisionToRecord);
      setRecords(mapped);
      setIsFallback(Boolean(res?.isFallback));
      if (mapped.length > 0) {
        setSelectedId((prev) => (prev && mapped.some((r) => r.id === prev) ? prev : mapped[0].id));
      }
    } catch (err: any) {
      setError(err?.message ?? "No se pudo cargar el historial de auditoría.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentIdx = useMemo(
    () => records.findIndex((r) => r.id === selectedId),
    [records, selectedId],
  );
  const selectedRecord = records[currentIdx] || records[0];

  const handlePrev = () => {
    if (records.length === 0) return;
    const nextIdx = (currentIdx - 1 + records.length) % records.length;
    setSelectedId(records[nextIdx].id);
  };

  const handleNext = () => {
    if (records.length === 0) return;
    const nextIdx = (currentIdx + 1) % records.length;
    setSelectedId(records[nextIdx].id);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-canvas text-primary font-sans overflow-hidden relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-compact py-element rounded-pill flex items-center gap-compact bg-panel border border-state-ok/40 text-state-ok shadow-popover"
          >
            <div className="w-2 h-2 rounded-full bg-state-ok animate-ping" />
            <span className="text-caption font-mono font-medium tracking-tight">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-muted hover:text-primary text-caption ml-1"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SUPERIOR */}
      <header className="px-group py-base bg-canvas border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-base z-20 shrink-0">
        <div>
          <div className="flex items-center gap-compact">
            <span className="text-caption font-mono text-secondary">Gobernanza</span>
            <span className="text-muted">/</span>
            <h1 className="text-page-title font-bold text-primary tracking-tight">
              Auditoría de Eventos & Trazabilidad
            </h1>
          </div>
          <p className="text-body text-secondary mt-hairline">
            Registro inmutable de razonamiento algorítmico, decisiones y firmas de integridad
          </p>
        </div>

        <div className="flex items-center gap-compact">
          <button
            onClick={load}
            disabled={loading}
            className="px-compact py-hairline rounded-control bg-raised border border-border text-secondary hover:text-primary text-caption font-medium flex items-center gap-hairline transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={() => showToast("Exportando registro completo de auditoría...")}
            className="px-compact py-hairline rounded-control bg-raised hover:bg-panel border border-border text-caption font-medium text-secondary hover:text-primary flex items-center gap-hairline transition-all"
          >
            <Download className="w-3.5 h-3.5 text-brand" />
            <span>Exportar Libro Mayor (CSV)</span>
          </button>
        </div>
      </header>

      {isFallback && (
        <div className="mx-group mt-compact rounded-control border border-state-attention/40 bg-state-attention-surface px-compact py-hairline text-caption text-state-attention">
          Backend no disponible: el historial puede estar incompleto.
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-compact text-secondary">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-body">Cargando historial de auditoría…</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center p-group">
          <EmptyState
            title="No se pudo cargar el historial"
            description={error}
            actionLabel="Reintentar"
            onAction={load}
          />
        </div>
      ) : records.length === 0 || !selectedRecord ? (
        <div className="flex-1 flex items-center justify-center p-group">
          <EmptyState
            title="Sin eventos de auditoría"
            description="Aún no hay decisiones registradas en el libro mayor. Las decisiones aprobadas o rechazadas aparecerán aquí."
            actionLabel="Reintentar"
            onAction={load}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
          {/* PANEL IZQUIERDO (50%): DOSSIER DEL EVENTO */}
          <div className="w-full lg:w-1/2 h-full bg-canvas overflow-y-auto p-group flex flex-col gap-compact border-b lg:border-b-0 lg:border-r border-border">
            {/* Fila 1: Selector y Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-base pb-base border-b border-border">
              <div>
                <div className="flex flex-wrap items-center gap-compact mb-hairline">
                  <span className="text-section-title font-bold tracking-tight text-primary font-mono">
                    {selectedRecord.code}
                  </span>

                  <StatusBadge variant="success" label="Auditado & Válido" />

                  <div className="flex items-center bg-raised rounded-control border border-border p-0.5">
                    <button
                      onClick={handlePrev}
                      className="p-1 hover:bg-panel rounded text-secondary hover:text-primary transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-caption font-mono px-1.5 text-secondary">
                      {currentIdx + 1}/{records.length}
                    </span>
                    <button
                      onClick={handleNext}
                      className="p-1 hover:bg-panel rounded text-secondary hover:text-primary transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-compact mt-hairline">
                  <p className="text-caption text-secondary">
                    Registrado: <span className="text-primary font-medium">{selectedRecord.date}</span> · Entidad:{" "}
                    <span className="text-brand font-medium">{selectedRecord.supplier}</span>
                  </p>
                </div>

                {/* Badge de Ejecutor: Agente Autónomo vs Firma Humana */}
                <div className="flex flex-wrap items-center gap-compact mt-element">
                  <span
                    className={`inline-flex items-center gap-hairline px-2.5 py-1 rounded-control text-caption font-semibold border ${selectedRecord.executor === "agente"
                      ? "bg-state-ok-surface text-state-ok border-state-ok/30"
                      : "bg-state-pending-surface text-state-pending border-state-pending/30"
                      }`}
                  >
                    {selectedRecord.executor === "agente" ? (
                      <Cpu className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    {selectedRecord.executor === "agente" ? "Agente Autónomo" : "Firma Humana"}
                  </span>
                  <span className="text-caption text-secondary">{selectedRecord.executorName}</span>
                </div>
              </div>
            </div>

            {/* Fila 2: Stepper de 4 Fases y Métricas */}
            <div className="bg-panel rounded-container p-group border border-border">
              <h3 className="text-label font-bold text-primary mb-hairline">{selectedRecord.title}</h3>

              <div className="bg-raised rounded-control p-base mt-element border border-border">
                <div className="relative flex items-center justify-between">
                  <div className="absolute top-1/2 left-4 right-4 h-1 bg-border -translate-y-1/2 z-0" />
                  <div className="absolute top-1/2 left-4 right-4 h-1 bg-brand -translate-y-1/2 z-0" />

                  {[
                    { label: "Detección", icon: Eye },
                    { label: "Razonamiento", icon: Cpu },
                    { label: "Gobernanza", icon: ShieldCheck },
                    { label: "Libro Mayor", icon: CheckCircle2 },
                  ].map((s, idx) => (
                    <div key={idx} className="relative z-10 flex flex-col items-center">
                      <div className="w-9 h-9 rounded-full bg-brand text-canvas flex items-center justify-center">
                        <s.icon className="w-4 h-4" />
                      </div>
                      <span className="text-caption font-semibold text-secondary mt-hairline">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-base mt-base pt-base border-t border-border">
                <div>
                  <span className="text-caption text-muted block mb-hairline">
                    Monto Involucrado
                  </span>
                  <span className="text-label font-bold text-primary font-mono">{selectedRecord.amountCop}</span>
                </div>
                <div>
                  <span className="text-caption text-muted block mb-hairline">
                    Latencia Total
                  </span>
                  <span className="text-label font-semibold text-state-ok font-mono">
                    {selectedRecord.latencyMs} ms
                  </span>
                </div>
                <div>
                  <span className="text-caption text-muted block mb-hairline">
                    Motor de Decisión
                  </span>
                  <span className="text-caption font-semibold text-secondary truncate block">
                    {selectedRecord.model}
                  </span>
                </div>
              </div>
            </div>

            {/* Fila 2b: Comparativa de Impacto Antes / Después */}
            {selectedRecord.impact.length > 0 && (
              <div className="bg-panel rounded-container p-group border border-border">
                <div className="flex items-center justify-between pb-element mb-base border-b border-border">
                  <h3 className="text-label font-bold text-primary tracking-tight">
                    Impacto Operativo del Evento
                  </h3>
                  <div className="flex items-center gap-compact text-caption text-muted">
                    <span className="flex items-center gap-hairline">
                      <span className="w-2.5 h-2.5 rounded-sm bg-border-strong" />
                      Antes
                    </span>
                    <span className="flex items-center gap-hairline">
                      <span className="w-2.5 h-2.5 rounded-sm bg-brand" />
                      Después
                    </span>
                  </div>
                </div>

                <div className="space-y-base">
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
                        <div className="flex items-center justify-between mb-hairline">
                          <span className="text-caption font-medium text-secondary">{m.label}</span>
                          <span
                            className={`text-caption font-mono font-bold px-1.5 py-0.5 rounded ${improved
                              ? "bg-state-ok-surface text-state-ok"
                              : "bg-state-error-surface text-state-error"
                              }`}
                          >
                            {deltaPct > 0 ? "+" : ""}
                            {deltaPct.toFixed(0)}%
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-compact">
                            <span className="text-caption font-mono text-secondary w-10 shrink-0">
                              Antes
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-raised overflow-hidden">
                              <div
                                className="h-full rounded-full bg-border-strong"
                                style={{ width: `${beforePct}%` }}
                              />
                            </div>
                            <span className="text-caption font-mono tabular-numbers text-secondary w-16 text-right shrink-0">
                              {fmt(m.before)} {m.unit}
                            </span>
                          </div>

                          <div className="flex items-center gap-compact">
                            <span className="text-caption font-mono text-brand/70 w-10 shrink-0">
                              Después
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-raised overflow-hidden">
                              <div
                                className={`h-full rounded-full ${improved ? "bg-brand" : "bg-state-error"}`}
                                style={{ width: `${afterPct}%` }}
                              />
                            </div>
                            <span className="text-caption font-mono tabular-numbers text-primary w-16 text-right shrink-0">
                              {fmt(m.after)} {m.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fila 3: Bitácora del Árbol de Razonamiento */}
            {selectedRecord.thoughtTree.length > 0 && (
              <div className="bg-panel rounded-container p-group border border-border">
                <h3 className="text-label font-bold text-primary tracking-tight mb-base">
                  Cadena de Inferencia Auditada
                </h3>
                <div className="relative pl-6 space-y-compact">
                  <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border" />
                  {selectedRecord.thoughtTree.map((step, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-brand border-2 border-canvas" />
                      <div className="flex items-center justify-between">
                        <h4 className="text-caption font-bold text-primary">{step.step}</h4>
                        <span className="text-caption font-mono text-muted">{step.latencyMs} ms</span>
                      </div>
                      <p className="text-caption text-brand mt-0.5">{step.action}</p>
                      <p className="text-caption text-secondary mt-0.5">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PANEL DERECHO (50%): INSPECTOR CRIPTOGRÁFICO */}
          <div className="w-full lg:w-1/2 h-full bg-raised overflow-y-auto p-group flex flex-col gap-compact">
            <div className="bg-panel rounded-container p-group border border-border">
              <div className="flex items-center justify-between pb-element mb-base border-b border-border">
                <h3 className="text-label font-bold text-primary flex items-center gap-compact">
                  <ShieldCheck className="w-4 h-4 text-brand" />
                  <span>Prueba de Integridad de la Cadena</span>
                </h3>
                <span className="text-caption font-mono text-brand bg-brand/10 px-2 py-0.5 rounded border border-brand/20">
                  Inmutable
                </span>
              </div>

              <div className="bg-raised rounded-control p-base border border-border space-y-base font-mono text-caption">
                <div>
                  <span className="text-caption text-muted block mb-hairline">
                    Digest Criptográfico (HMAC-SHA256)
                  </span>
                  <span className="text-brand text-caption break-all block bg-panel p-2 rounded-control border border-border">
                    {selectedRecord.hmacDigest}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-element pt-2 border-t border-border text-caption">
                  <div>
                    <span className="text-muted block">Esquema de Validación</span>
                    <span className="text-primary">HMAC-SHA256 con llave rotativa</span>
                  </div>
                  <div>
                    <span className="text-muted block">Estado del Bloque</span>
                    <span className="text-state-ok font-bold">Verificado y Sellado ✓</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Línea de Tiempo Cronológica de Auditoría */}
            <div className="bg-panel rounded-container p-group border border-border flex-1">
              <div className="flex items-center justify-between pb-element mb-base border-b border-border">
                <h3 className="text-label font-bold text-primary flex items-center gap-compact">
                  <Clock className="w-4 h-4 text-brand" />
                  <span>Línea de Tiempo de Auditoría</span>
                </h3>
                <span className="text-caption font-mono text-muted">
                  {selectedRecord.thoughtTree.length} hitos
                </span>
              </div>

              {selectedRecord.thoughtTree.length === 0 ? (
                <p className="text-caption text-secondary">
                  No hay hitos de razonamiento registrados para este evento.
                </p>
              ) : (
                <div className="relative pl-5">
                  <div className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-gradient-to-b from-brand/60 via-brand/25 to-transparent" />
                  {selectedRecord.thoughtTree.map((step, idx) => {
                    const isLast = idx === selectedRecord.thoughtTree.length - 1;
                    return (
                      <div key={idx} className={isLast ? "" : "pb-base"}>
                        <div className="relative">
                          <span
                            className={`absolute -left-5 top-1 w-[9px] h-[9px] rounded-full border-2 ${isLast
                              ? "bg-brand border-brand"
                              : "bg-raised border-brand/60"
                              }`}
                          />
                          <div className="flex items-start justify-between gap-compact">
                            <span className="text-caption font-semibold text-primary leading-snug">
                              {step.step}
                            </span>
                            <span className="text-caption font-mono text-muted shrink-0 mt-0.5">
                              +{step.latencyMs} ms
                            </span>
                          </div>
                          <p className="text-caption text-brand/80 mt-0.5 leading-snug">
                            {step.action}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-base pt-element border-t border-border flex items-center justify-between text-caption">
                <span className="text-muted">Latencia acumulada</span>
                <span className="font-mono tabular-numbers text-brand font-bold">
                  {selectedRecord.thoughtTree.reduce((acc, s) => acc + s.latencyMs, 0)} ms
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
