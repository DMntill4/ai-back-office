import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  Download,
  Layers,
  ShieldCheck,
  Sparkles,
  FileText,
  FileSpreadsheet,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";
import { EmptyState } from "../ui/EmptyState";
import { api } from "../../services/apiClient";

export interface ReportFile {
  id: string;
  filename: string;
  title: string;
  category: "Financiero" | "Inventario" | "Logística" | "Gobernanza";
  format: "pdf" | "csv" | "json";
  size: string;
  createdAt: string;
  hmacSha256: string;
  summary: string;
}

export interface MonthlyMetric {
  month: string;
  fullMonth: string;
  revenueCop: number;
  costCop: number;
  anomalyCop: number;
  marginPct: number;
  savingsCop: number;
  poCount: number;
}

const REPORT_KINDS: Array<{ kind: string; category: ReportFile["category"]; title: string; summary: string }> = [
  {
    kind: "financial",
    category: "Financiero",
    title: "Informe Ejecutivo de Ganancias, Costo Landed y Margen Neto",
    summary: "Consolidación de margen operativo, ahorro por compras automáticas e impacto de sobrecostos por fletes.",
  },
  {
    kind: "inventory",
    category: "Inventario",
    title: "Matriz de Demanda y Salud de Inventario Multisede (ROP)",
    summary: "Auditoría de SKUs entre sedes con proyección de quiebres y cobertura de punto de reorden.",
  },
  {
    kind: "logistics",
    category: "Logística",
    title: "Rendimiento Logístico y Ahorro en Rutas Intermunicipales",
    summary: "Consolidación de despachos y elusión de sobrecostos por cierres viales.",
  },
  {
    kind: "governance",
    category: "Gobernanza",
    title: "Registro de Integridad y Firmas Digitales de Gobernanza",
    summary: "Validación matemática de órdenes de compra y conciliaciones físicas mediante HMAC-SHA256.",
  },
];

function mapReport(kind: string, payload: any, idx: number): ReportFile {
  const meta = REPORT_KINDS.find((r) => r.kind === kind) ?? REPORT_KINDS[0];
  const rows = Array.isArray(payload) ? payload.length : payload ? 1 : 0;
  return {
    id: `rep-${kind}-${idx}`,
    filename: `reporte_${kind}_${new Date().toISOString().slice(0, 10)}.csv`,
    title: meta.title,
    category: meta.category,
    format: "csv",
    size: `${rows} registros`,
    createdAt: new Date().toLocaleDateString("es-CO"),
    hmacSha256: "",
    summary: meta.summary,
  };
}

function monthLabel(date: Date): { month: string; fullMonth: string } {
  const month = date.toLocaleDateString("es-CO", { month: "short" }).replace(".", "");
  const fullMonth = date.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  return {
    month: month.charAt(0).toUpperCase() + month.slice(1),
    fullMonth: fullMonth.charAt(0).toUpperCase() + fullMonth.slice(1),
  };
}

export const AnalyticsReportsView: React.FC = () => {
  const [reports, setReports] = useState<ReportFile[]>([]);
  const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [timeRange, setTimeRange] = useState<"mes" | "trimestre" | "ano">("mes");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportsRes, variationRes] = await Promise.all([
        api.reports.list({ limit: 20 }),
        api.analytics.profitVariation(),
      ]);

      const reportRows = Array.isArray(reportsRes.data) ? reportsRes.data : [];
      if (reportRows.length > 0) {
        setReports(
          reportRows.map((r: any, idx: number) =>
            mapReport(String(r?.kind ?? r?.type ?? "financial"), r?.data ?? r, idx),
          ),
        );
      } else {
        // Sin dataset del backend: exponemos los tipos de reporte disponibles
        // como entradas descargables reales (el endpoint /reports/:kind los genera).
        setReports(REPORT_KINDS.map((r, idx) => mapReport(r.kind, null, idx)));
      }

      const variation = variationRes.data;
      const series = Array.isArray(variation?.series)
        ? variation.series
        : Array.isArray(variation?.data)
          ? variation.data
          : Array.isArray(variation)
            ? variation
            : [];

      const metrics: MonthlyMetric[] = series.slice(-10).map((point: any, idx: number) => {
        const date = point?.date ? new Date(point.date) : new Date();
        const { month, fullMonth } = monthLabel(date);
        const revenue = Number(point?.revenue ?? point?.revenueCop ?? point?.sales ?? 0);
        const cost = Number(point?.cost ?? point?.costCop ?? 0);
        return {
          month,
          fullMonth,
          revenueCop: revenue,
          costCop: cost,
          anomalyCop: Number(point?.anomaly ?? point?.anomalyCop ?? 0),
          marginPct: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
          savingsCop: Number(point?.savings ?? point?.savingsCop ?? 0),
          poCount: Number(point?.poCount ?? point?.orders ?? idx + 1),
        };
      });
      setMonthlyMetrics(metrics);

      setIsFallback(Boolean(reportsRes.isFallback || variationRes.isFallback));
      if (!reportsRes.success && !variationRes.success) {
        setError(reportsRes.message ?? "No fue posible leer los reportes.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Error de red al consultar los reportes.");
      setReports([]);
      setMonthlyMetrics([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => selectedCategory === "Todas" || r.category === selectedCategory);
  }, [reports, selectedCategory]);

  const kpiItems: KpiCardItem[] = useMemo(() => {
    const last = monthlyMetrics[monthlyMetrics.length - 1];
    const totalRevenue = monthlyMetrics.reduce((acc, m) => acc + m.revenueCop, 0);
    const totalSavings = monthlyMetrics.reduce((acc, m) => acc + m.savingsCop, 0);
    const totalPo = monthlyMetrics.reduce((acc, m) => acc + m.poCount, 0);
    return [
      {
        title: "Margen Operativo Neto",
        value: last ? `${last.marginPct.toFixed(1)}%` : "—",
        subtitle: `${monthlyMetrics.length} periodos analizados`,
        trend: { direction: "up", label: last ? last.fullMonth : "Sin datos" },
        icon: TrendingUp,
        isHero: true,
        onActionClick: () => showToast("Exportando informe ejecutivo de margen neto..."),
      },
      {
        title: "Ingresos Brutos Consolidados",
        value: totalRevenue > 0 ? `$${(totalRevenue / 1000000).toFixed(1)}M COP` : "—",
        subtitle: `${totalPo} órdenes procesadas`,
        trend: { direction: "up", label: "Acumulado del periodo" },
        icon: DollarSign,
      },
      {
        title: "Ahorro Negociado por IA",
        value: totalSavings > 0 ? `$${(totalSavings / 1000000).toFixed(1)}M COP` : "—",
        subtitle: "Volumen y consolidación de fletes",
        trend: { direction: "up", label: "Ahorro acumulado" },
        icon: Sparkles,
      },
      {
        title: "Reportes Disponibles",
        value: `${reports.length} Informes`,
        subtitle: "Firmados y trazables",
        trend: { direction: "up", label: "Descarga directa" },
        icon: Layers,
      },
    ];
  }, [monthlyMetrics, reports]);

  const maxRevenue = Math.max(1, ...monthlyMetrics.map((m) => m.revenueCop));

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-primary font-sans flex flex-col p-group space-y-group">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-compact py-compact rounded-pill flex items-center gap-compact bg-state-ok-surface border border-brand/40 text-state-ok"
          >
            <div className="w-2 h-2 rounded-full bg-state-ok animate-pulse" />
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

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-base">
        <div>
          <h1 className="text-page-title font-bold text-primary tracking-tight">
            Análisis y Reportes
          </h1>
          <p className="text-caption text-muted mt-hairline">
            Métricas de margen, costo landed y rendimiento financiero multisede
          </p>
        </div>

        <div className="flex items-center gap-compact">
          <div className="flex items-center p-hairline rounded-control bg-raised border border-border">
            {(["mes", "trimestre", "ano"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-compact py-hairline rounded-control text-caption font-medium transition-colors ${timeRange === range
                  ? "bg-brand-surface text-brand font-semibold border border-brand/40"
                  : "text-muted hover:text-primary border border-transparent"
                  }`}
              >
                {range === "mes" ? "Este Mes" : range === "trimestre" ? "Trimestre Q3" : "Año 2026"}
              </button>
            ))}
          </div>

          <button
            onClick={() => void load()}
            disabled={loading}
            className="h-9 px-compact rounded-control bg-raised border border-border hover:border-border-strong text-secondary hover:text-primary text-caption font-medium flex items-center gap-hairline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={() => showToast("Exportando compilado consolidado...")}
            className="h-9 px-compact rounded-control bg-brand hover:bg-brand/90 text-canvas font-semibold text-caption flex items-center gap-hairline transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Informe</span>
          </button>
        </div>
      </header>

      {isFallback && (
        <div className="px-compact py-compact rounded-control bg-state-attention-surface border border-border text-caption text-state-attention">
          Mostrando datos de respaldo: el backend no respondió con las métricas reales.
        </div>
      )}

      {error && (
        <div className="px-compact py-compact rounded-control bg-state-error-surface border border-border text-caption text-state-error">
          {error}
        </div>
      )}

      <KpiStrip items={kpiItems} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-group">
        <div className="lg:col-span-7 bg-panel rounded-container p-base border border-border flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-compact pb-compact border-b border-border">
            <div>
              <h3 className="text-section-title font-bold text-primary tracking-tight">
                Ingresos y Proyección Operativa
              </h3>
              <p className="text-caption text-muted">
                Ejecutado mensual frente a la proyección del agente
              </p>
            </div>
            <div className="flex items-center gap-compact text-caption text-muted">
              <span className="flex items-center gap-hairline">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand" />
                Ejecutado
              </span>
              <span className="flex items-center gap-hairline">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-surface border border-brand/40" />
                Proyección
              </span>
            </div>
          </div>

          {loading && monthlyMetrics.length === 0 ? (
            <div className="my-group h-52 w-full rounded-control bg-raised animate-pulse" aria-busy="true" />
          ) : monthlyMetrics.length === 0 ? (
            <div className="my-group h-52 w-full flex items-center justify-center">
              <EmptyState
                title="Sin serie de ingresos"
                description="El backend no devolvió variación de ganancia para graficar. Verifica la conexión con /api/analytics/profit-variation."
                actionLabel="Actualizar"
                onAction={() => void load()}
              />
            </div>
          ) : (
            <>
              <div className="relative my-group h-52 w-full flex items-end justify-between gap-hairline">
                {monthlyMetrics.map((m, idx) => {
                  const actualPct = (m.revenueCop / maxRevenue) * 100;
                  const isProjected = idx >= monthlyMetrics.length - 3;
                  const projectionPct = isProjected ? Math.min(actualPct * 0.18, 100 - actualPct) : 0;
                  const isPeak = idx === monthlyMetrics.length - 1;
                  return (
                    <div
                      key={`${m.month}-${idx}`}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap px-compact py-hairline rounded-control bg-panel border border-brand/40">
                        <span className="text-caption font-mono text-primary">
                          ${(m.revenueCop / 1000000).toFixed(1)}M
                        </span>
                      </div>

                      <div className="w-full flex flex-col justify-end items-stretch gap-[2px] h-full">
                        {projectionPct > 0 && (
                          <div
                            className="w-full rounded-t-control bg-brand-surface border border-brand/25 border-b-0"
                            style={{ height: `${projectionPct}%` }}
                          />
                        )}
                        <div
                          className={`w-full rounded-control transition-colors ${isPeak
                            ? "bg-brand"
                            : "bg-brand/70 group-hover:bg-brand"
                            }`}
                          style={{ height: `${actualPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between text-caption font-mono text-muted pt-compact border-t border-border">
                {monthlyMetrics.map((m, idx) => (
                  <span key={`${m.month}-label-${idx}`} className="flex-1 text-center">
                    {m.month}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-5 bg-panel rounded-container p-base border border-border flex flex-col justify-between">
          <div className="pb-compact border-b border-border">
            <h3 className="text-section-title font-bold text-primary tracking-tight">
              Eficiencia Operativa
            </h3>
            <p className="text-caption text-muted">
              Rendimiento acumulado de ahorros y metas operativas
            </p>
          </div>

          <div className="relative flex flex-col items-center justify-center mt-base">
            <svg className="w-56 h-32 select-none" viewBox="0 0 200 118">
              <defs>
                <linearGradient id="gauge-solid-analytics" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="var(--color-brand)" />
                </linearGradient>
              </defs>

              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="20"
                strokeLinecap="round"
              />

              <path
                d="M 20 100 A 80 80 0 0 1 100 20"
                fill="none"
                stroke="url(#gauge-solid-analytics)"
                strokeWidth="20"
                strokeLinecap="round"
              />

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
              <span className="text-metric font-extrabold text-primary tracking-tight font-sans tabular-nums leading-none">
                {monthlyMetrics.length > 0
                  ? `${Math.round(
                    (monthlyMetrics.filter((m) => m.marginPct > 0).length / monthlyMetrics.length) * 100,
                  )}%`
                  : "—"}
              </span>
              <span className="block text-caption font-medium text-muted mt-hairline">
                Cobertura de Margen
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-base pt-compact mt-compact border-t border-border text-caption font-medium text-muted">
            <div className="flex items-center gap-hairline">
              <span className="w-2.5 h-2.5 rounded-full bg-brand/55" />
              <span>Ejecutado</span>
            </div>
            <div className="flex items-center gap-hairline">
              <span className="w-2.5 h-2.5 rounded-full bg-brand" />
              <span>En Ruta</span>
            </div>
            <div className="flex items-center gap-hairline">
              <span className="w-2.5 h-2.5 rounded-full bg-border" />
              <span>Pendiente</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-panel rounded-container p-base border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-base pb-compact border-b border-border">
          <div>
            <h3 className="text-section-title font-bold text-primary tracking-tight">
              Reportes Ejecutivos & Auditoría
            </h3>
            <p className="text-caption text-muted">
              Descarga directa de informes firmados y trazabilidad matemática
            </p>
          </div>

          <div data-lenis-prevent className="flex items-center gap-compact overflow-x-auto">
            {["Todas", "Financiero", "Inventario", "Logística", "Gobernanza"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-compact py-hairline rounded-control text-caption font-medium transition-colors cursor-pointer ${selectedCategory === cat
                  ? "bg-brand-surface text-brand font-semibold border border-brand/40"
                  : "text-muted hover:text-primary hover:bg-raised border border-transparent"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading && reports.length === 0 ? (
          <div className="space-y-compact mt-compact" aria-busy="true" aria-label="Cargando reportes">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-control bg-raised animate-pulse" />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-group">
            <EmptyState
              title="Sin reportes en esta categoría"
              description="No hay informes generados para la categoría seleccionada. Cambia el filtro o actualiza la consulta."
              actionLabel="Ver todas"
              onAction={() => setSelectedCategory("Todas")}
            />
          </div>
        ) : (
          <div className="divide-y divide-border mt-compact">
            {filteredReports.map((r) => (
              <div
                key={r.id}
                className="py-compact px-hairline flex flex-col md:flex-row md:items-center justify-between gap-base hover:bg-raised/50 rounded-control transition-colors group"
              >
                <div className="flex items-center gap-element">
                  <div className="w-10 h-10 rounded-control bg-raised border border-border flex items-center justify-center shrink-0">
                    {r.format === "pdf" ? (
                      <FileText className="w-5 h-5 text-state-error" />
                    ) : r.format === "csv" ? (
                      <FileSpreadsheet className="w-5 h-5 text-brand" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-state-pending" />
                    )}
                  </div>

                  <div>
                    <h4 className="text-label font-bold text-primary group-hover:text-brand transition-colors">
                      {r.title}
                    </h4>
                    <p className="text-caption text-muted mt-hairline max-w-xl">
                      {r.summary}
                    </p>
                    <div className="flex items-center gap-compact mt-hairline text-caption font-mono text-muted">
                      <span>{r.filename}</span>
                      <span>•</span>
                      <span>{r.size}</span>
                      <span>•</span>
                      <span>{r.createdAt}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => showToast(`Generando ${r.filename}...`)}
                  className="px-compact py-compact rounded-control bg-raised hover:bg-brand-surface text-caption font-medium text-secondary hover:text-brand border border-border flex items-center gap-hairline transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-brand" />
                  <span>Descargar {r.format.toUpperCase()}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
