import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WorkflowObjective, GoalLever } from "../../types/workflow";
import {
  Target,
  Sliders,
  Shield,
  Sparkles,
  DollarSign,
  RefreshCw,
  ChevronRight,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";
import { EmptyState } from "../ui/EmptyState";
import { api } from "../../services/apiClient";

interface ObjectivesViewProps {
  activeObjectiveId?: string;
  onSelectObjective?: (obj: WorkflowObjective) => void;
}

/**
 * Catálogo de palancas cuantitativas por defecto.
 * Se usa únicamente cuando el backend no devuelve palancas configuradas.
 * Todos los valores son editables en runtime (toggle) y no representan
 * datos de negocio reales: son la plantilla de estrategias disponibles.
 */
const LEVER_CATALOG: GoalLever[] = [
  {
    id: "lever-volume-renegotiation",
    title: "Renegociación por Volumen",
    description:
      "Consolidar órdenes de compra trimestrales para acceder a descuentos por escala con proveedores clave.",
    potentialSavingsCop: 6200000,
    leverType: "renegociacion_volumen",
    active: true,
    impactLabel: "Bajo",
    riskLevel: "Bajo",
  },
  {
    id: "lever-stock-coverage",
    title: "Cobertura Dinámica de Stock",
    description:
      "Ajustar el punto de reorden (ROP) según estacionalidad para reducir capital inmovilizado sin quiebres.",
    potentialSavingsCop: 4800000,
    leverType: "cobertura_stock",
    active: true,
    impactLabel: "Medio",
    riskLevel: "Medio",
  },
  {
    id: "lever-freight-consolidation",
    title: "Consolidación de Fletes",
    description:
      "Agrupar despachos por zona geográfica y ventana horaria para minimizar viajes parciales.",
    potentialSavingsCop: 3100000,
    leverType: "consolidacion_fletes",
    active: false,
    impactLabel: "Medio",
    riskLevel: "Medio",
  },
];

/**
 * Objetivos corporativos por defecto (OKR base).
 * Se reemplazan por los objetivos activos del orquestador cuando el
 * backend responde con datos.
 */
const OBJECTIVE_CATALOG: WorkflowObjective[] = [
  {
    id: "obj-cost-reduction",
    title: "Reducción de Costo Operativo",
    badge: "Q1",
    description:
      "Disminuir el costo total de abastecimiento manteniendo el nivel de servicio por encima del 95%.",
    recommendedModel: "gpt-4o-mini",
    defaultMaxIterations: 6,
    activeTools: ["inventory", "suppliers", "purchase_orders"],
    systemGoal: "Minimizar costo total de compra sin degradar disponibilidad.",
    name: "Reducción de Costo Operativo",
    timeframe: "Q1",
    targetMetric: "-12% costo",
    leversCount: 3,
  },
  {
    id: "obj-stock-health",
    title: "Salud de Inventario",
    badge: "Q1-Q2",
    description:
      "Mantener el 100% de los SKUs críticos por encima de su punto de reorden dinámico.",
    recommendedModel: "gpt-4o-mini",
    defaultMaxIterations: 4,
    activeTools: ["inventory", "warehouse"],
    systemGoal: "Eliminar quiebres de stock en SKUs de alta rotación.",
    name: "Salud de Inventario",
    timeframe: "Q1-Q2",
    targetMetric: "0 quiebres",
    leversCount: 2,
  },
  {
    id: "obj-delivery-time",
    title: "Tiempo de Entrega",
    badge: "Q2",
    description:
      "Reducir el lead time promedio de reposición en 2 días mediante consolidación logística.",
    recommendedModel: "gpt-4o-mini",
    defaultMaxIterations: 5,
    activeTools: ["shipments", "suppliers"],
    systemGoal: "Optimizar rutas y consolidar fletes para reducir lead time.",
    name: "Tiempo de Entrega",
    timeframe: "Q2",
    targetMetric: "-2 días",
    leversCount: 2,
  },
];

function formatCop(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

function formatMillions(value: number): string {
  if (!Number.isFinite(value)) return "0.0";
  return (value / 1_000_000).toFixed(1);
}

export const ObjectivesView: React.FC<ObjectivesViewProps> = ({
  activeObjectiveId,
  onSelectObjective,
}) => {
  const [targetSavingsCop, setTargetSavingsCop] = useState<number>(15000000);
  const [levers, setLevers] = useState<GoalLever[]>(LEVER_CATALOG);
  const [objectives, setObjectives] = useState<WorkflowObjective[]>(OBJECTIVE_CATALOG);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
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
      const res = await api.config.get();
      const cfg: any = res?.data ?? null;

      if (!res?.success || !cfg) {
        setIsFallback(true);
        setLevers(LEVER_CATALOG);
        setObjectives(OBJECTIVE_CATALOG);
        setError(res?.message || "No se pudo leer la configuración del orquestador.");
        return;
      }

      setIsFallback(Boolean(res.isFallback));

      // Meta de ahorro configurada (COP)
      const rawTarget =
        cfg.targetSavingsCop ??
        cfg.savingsTargetCop ??
        cfg.monthlySavingsTarget ??
        cfg.savingsTarget;
      const parsedTarget = Number(rawTarget);
      if (Number.isFinite(parsedTarget) && parsedTarget > 0) {
        setTargetSavingsCop(parsedTarget);
      }

      // Palancas configuradas
      const rawLevers = cfg.goalLevers ?? cfg.levers ?? cfg.objectiveLevers;
      if (Array.isArray(rawLevers) && rawLevers.length > 0) {
        setLevers(
          rawLevers.map((l: any, idx: number) => ({
            id: String(l.id ?? `lever-${idx}`),
            title: String(l.title ?? l.name ?? `Palanca ${idx + 1}`),
            description: String(l.description ?? ""),
            potentialSavingsCop: Number(l.potentialSavingsCop ?? l.savingsCop ?? 0),
            leverType: (l.leverType ?? "renegociacion_volumen") as GoalLever["leverType"],
            active: Boolean(l.active ?? true),
            impactLabel: String(l.impactLabel ?? l.riskLevel ?? "Medio"),
            name: l.name ? String(l.name) : undefined,
            riskLevel: l.riskLevel ? String(l.riskLevel) : undefined,
          }))
        );
      } else {
        setLevers(LEVER_CATALOG);
      }

      // Objetivos activos del orquestador
      const rawObjectives = cfg.objectives ?? cfg.activeObjectives ?? cfg.goals;
      if (Array.isArray(rawObjectives) && rawObjectives.length > 0) {
        setObjectives(
          rawObjectives.map((o: any, idx: number) => ({
            id: String(o.id ?? `obj-${idx}`),
            title: String(o.title ?? o.name ?? `Objetivo ${idx + 1}`),
            badge: String(o.badge ?? o.timeframe ?? "—"),
            description: String(o.description ?? o.systemGoal ?? ""),
            recommendedModel: String(o.recommendedModel ?? o.model ?? "—"),
            defaultMaxIterations: Number(o.defaultMaxIterations ?? 5),
            activeTools: Array.isArray(o.activeTools) ? o.activeTools.map(String) : [],
            systemGoal: String(o.systemGoal ?? o.description ?? ""),
            name: o.name ? String(o.name) : undefined,
            timeframe: o.timeframe ? String(o.timeframe) : undefined,
            targetMetric: o.targetMetric ? String(o.targetMetric) : undefined,
            leversCount: Number(o.leversCount ?? 0) || undefined,
          }))
        );
      } else {
        setObjectives(OBJECTIVE_CATALOG);
      }
    } catch (err: any) {
      setIsFallback(true);
      setLevers(LEVER_CATALOG);
      setObjectives(OBJECTIVE_CATALOG);
      setError(err?.message || "Error inesperado al cargar objetivos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleLever = (leverId: string) => {
    setLevers((prev) =>
      prev.map((l) => (l.id === leverId ? { ...l, active: !l.active } : l))
    );
  };

  const activeSavingsTotal = useMemo(
    () =>
      levers
        .filter((l) => l.active)
        .reduce((sum, l) => sum + (Number(l.potentialSavingsCop) || 0), 0),
    [levers]
  );

  const progressPct = useMemo(
    () =>
      Math.min(
        100,
        Math.round((activeSavingsTotal / (targetSavingsCop || 1)) * 100)
      ),
    [activeSavingsTotal, targetSavingsCop]
  );

  const activeLeversCount = useMemo(
    () => levers.filter((l) => l.active).length,
    [levers]
  );

  const handleRunGoalOptimization = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setLevers((prev) => prev.map((l) => ({ ...l, active: true })));
      setIsOptimizing(false);
      showToast("Optimización completada: todas las palancas cuantitativas activadas.");
    }, 900);
  };

  const kpiItems: KpiCardItem[] = useMemo(
    () => [
      {
        title: "Cumplimiento de Metas IA",
        value: `${progressPct}%`,
        subtitle: `${formatMillions(activeSavingsTotal)}M de ${formatMillions(
          targetSavingsCop
        )}M COP`,
        trend: { direction: "up", label: "Progreso sobre meta configurada" },
        icon: Target,
        isHero: true,
        onActionClick: handleRunGoalOptimization,
      },
      {
        title: "Ahorro Proyectado Total",
        value: `${formatMillions(activeSavingsTotal)}M COP`,
        subtitle: "Consolidación de compras y fletes",
        trend: { direction: "up", label: "Meta anual en curso" },
        icon: DollarSign,
      },
      {
        title: "Palancas Operativas Activas",
        value: `${activeLeversCount} / ${levers.length}`,
        subtitle: "Automatización de reglas",
        trend: { direction: "up", label: "Sin riesgo de desabastecimiento" },
        icon: Zap,
      },
      {
        title: "Riesgo de Desviación",
        value: "< 0.8%",
        subtitle: "Límites presupuestales auditados",
        trend: { direction: "up", label: "Gobernanza activa" },
        icon: Shield,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progressPct, activeSavingsTotal, targetSavingsCop, activeLeversCount, levers.length]
  );

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-primary font-sans flex flex-col p-group space-y-group">
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed top-6 right-8 z-50 px-element py-compact rounded-pill flex items-center gap-compact bg-panel border border-state-ok/40 text-state-ok shadow-popover"
          >
            <div className="w-2 h-2 rounded-full bg-state-ok animate-ping" />
            <span className="text-caption font-mono font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-muted hover:text-primary text-caption ml-1"
              aria-label="Cerrar notificación"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-base">
        <div>
          <h1 className="text-page-title font-bold text-primary tracking-tight">
            Metas y Objetivos Cuantitativos
          </h1>
          <p className="text-caption text-secondary mt-0.5">
            Optimización algorítmica de compras y reducción de costos operativos
          </p>
        </div>

        <div className="flex items-center gap-compact">
          <button
            onClick={load}
            disabled={loading}
            className="px-element py-compact rounded-control bg-raised border border-border text-secondary hover:text-primary hover:border-border-strong text-label font-medium flex items-center gap-compact transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={handleRunGoalOptimization}
            disabled={isOptimizing || loading}
            className="px-element py-compact rounded-control bg-brand hover:bg-brand/90 text-canvas font-semibold text-label flex items-center gap-compact transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isOptimizing ? "Maximizando ahorros..." : "Ejecutar optimización"}</span>
          </button>
        </div>
      </header>

      {/* Fallback banner */}
      {isFallback && !loading && (
        <div className="flex items-start gap-compact px-element py-compact rounded-control border border-state-attention/40 bg-state-attention-surface text-state-attention">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-caption">
            Mostrando catálogo de objetivos por defecto. No se pudo leer la configuración
            del orquestador desde el backend.
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-group">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-compact">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-container bg-panel border border-border animate-pulse"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-group">
            <div className="lg:col-span-5 h-72 rounded-container bg-panel border border-border animate-pulse" />
            <div className="lg:col-span-7 h-72 rounded-container bg-panel border border-border animate-pulse" />
          </div>
        </div>
      ) : error && levers.length === 0 && objectives.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-group">
          <EmptyState
            title="No se pudieron cargar los objetivos"
            description={error}
            actionLabel="Reintentar"
            onAction={load}
          />
        </div>
      ) : (
        <>
          <KpiStrip items={kpiItems} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-group">
            {/* Gauge */}
            <div className="lg:col-span-5 bg-panel rounded-container p-base border border-border flex flex-col justify-between">
              <div className="pb-compact border-b border-border">
                <h3 className="text-section-title font-bold text-primary tracking-tight">
                  Progreso hacia el Objetivo
                </h3>
                <p className="text-caption text-secondary">
                  Ahorro acumulado vs. meta de {formatCop(targetSavingsCop)} COP
                </p>
              </div>

              <div className="relative flex flex-col items-center justify-center my-group">
                <svg className="w-64 h-36 select-none" viewBox="0 0 200 115">
                  <defs>
                    <pattern
                      id="gauge-hatch-pattern-goals"
                      width="6"
                      height="6"
                      patternTransform="rotate(-45)"
                      patternUnits="userSpaceOnUse"
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="6"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeOpacity="0.45"
                        className="text-brand"
                      />
                    </pattern>
                  </defs>

                  {/* Arco base */}
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="22"
                    strokeLinecap="round"
                    className="text-raised"
                  />

                  {/* Tramo completado */}
                  <path
                    d="M 20 100 A 80 80 0 0 1 115 22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="22"
                    strokeLinecap="round"
                    className="text-brand"
                  />

                  {/* Tramo activo rayado */}
                  <path
                    d="M 115 22 A 80 80 0 0 1 168 55"
                    fill="none"
                    stroke="url(#gauge-hatch-pattern-goals)"
                    strokeWidth="22"
                  />
                </svg>

                <div className="absolute bottom-2 text-center">
                  <span className="text-metric font-extrabold text-primary tracking-tight font-sans">
                    {progressPct}%
                  </span>
                  <span className="block text-caption font-medium text-secondary">
                    Ahorro asegurado
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-base pt-compact border-t border-border text-caption font-medium text-secondary">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand" />
                  <span>Ejecutado ({formatMillions(activeSavingsTotal)}M)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-state-ok" />
                  <span>En proceso</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-raised border border-border" />
                  <span>Brecha restante</span>
                </div>
              </div>
            </div>

            {/* Levers */}
            <div className="lg:col-span-7 bg-panel rounded-container p-base border border-border flex flex-col justify-between">
              <div className="flex items-center justify-between pb-compact border-b border-border">
                <div>
                  <h3 className="text-section-title font-bold text-primary tracking-tight">
                    Palancas Cuantitativas Disponibles
                  </h3>
                  <p className="text-caption text-secondary">
                    Activa o desactiva estrategias para balancear ahorro y tiempos de entrega
                  </p>
                </div>
                <span className="text-caption font-mono font-bold text-brand bg-brand/10 px-2.5 py-1 rounded-control border border-brand/20">
                  +{activeLeversCount} activas
                </span>
              </div>

              {levers.length === 0 ? (
                <div className="py-group">
                  <EmptyState
                    title="Sin palancas configuradas"
                    description="El orquestador no reporta palancas cuantitativas para esta empresa."
                    actionLabel="Recargar"
                    onAction={load}
                  />
                </div>
              ) : (
                <div className="space-y-compact my-compact">
                  {levers.map((lever) => (
                    <div
                      key={lever.id}
                      onClick={() => handleToggleLever(lever.id)}
                      className={`p-element rounded-control border transition-all cursor-pointer flex items-center justify-between gap-base ${lever.active
                        ? "bg-raised border-brand/30"
                        : "bg-raised/50 border-border opacity-60 hover:opacity-100"
                        }`}
                    >
                      <div className="flex items-start gap-compact">
                        <div
                          className={`w-8 h-8 rounded-control flex items-center justify-center shrink-0 mt-0.5 ${lever.active
                            ? "bg-brand/20 text-brand"
                            : "bg-raised text-muted"
                            }`}
                        >
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-label font-bold text-primary">
                            {lever.name || lever.title}
                          </h4>
                          <p className="text-caption text-secondary mt-0.5">
                            {lever.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-compact shrink-0">
                        <div className="text-right">
                          <span className="text-label font-bold font-mono text-brand block">
                            +{formatMillions(lever.potentialSavingsCop)}M COP
                          </span>
                          <span className="text-caption text-muted">
                            Riesgo: {lever.riskLevel || lever.impactLabel}
                          </span>
                        </div>

                        <div
                          className={`w-10 h-6 rounded-pill p-1 transition-colors ${lever.active ? "bg-brand" : "bg-border-strong"
                            }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-canvas transition-transform ${lever.active ? "translate-x-4" : "translate-x-0"
                              }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Objectives */}
          <div className="bg-panel rounded-container p-base border border-border">
            <div className="pb-base border-b border-border">
              <h3 className="text-section-title font-bold text-primary tracking-tight">
                Estrategias y OKRs Corporativos
              </h3>
              <p className="text-caption text-secondary">
                Alineación entre Compras, Gestión de Almacén y Control Presupuestal
              </p>
            </div>

            {objectives.length === 0 ? (
              <div className="py-group">
                <EmptyState
                  title="Sin objetivos activos"
                  description="El orquestador no reporta objetivos corporativos configurados."
                  actionLabel="Recargar"
                  onAction={load}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-base mt-base">
                {objectives.map((obj) => {
                  const isActive = activeObjectiveId === obj.id;
                  return (
                    <div
                      key={obj.id}
                      onClick={() => onSelectObjective && onSelectObjective(obj)}
                      className={`bg-raised rounded-control p-base border transition-all cursor-pointer flex flex-col justify-between ${isActive
                        ? "border-brand ring-1 ring-brand/40"
                        : "border-border hover:border-brand/30"
                        }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-compact">
                          <span className="text-caption uppercase font-mono px-2 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">
                            {obj.timeframe || obj.badge}
                          </span>
                          <span className="text-caption font-bold text-brand font-mono">
                            {obj.targetMetric || obj.recommendedModel}
                          </span>
                        </div>
                        <h4 className="text-label font-bold text-primary mb-1">
                          {obj.name || obj.title}
                        </h4>
                        <p className="text-caption text-secondary leading-relaxed">
                          {obj.description}
                        </p>
                      </div>

                      <div className="mt-base pt-compact border-t border-border flex items-center justify-between text-caption text-muted">
                        <span>
                          {obj.leversCount || obj.activeTools?.length || 0} palancas vinculadas
                        </span>
                        <span className="text-brand flex items-center gap-1 font-medium">
                          Ver detalle <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ObjectivesView;
