import React, { useState } from "react";
import { WorkflowObjective, GoalLever } from "../../types/workflow";
import { PREDEFINED_OBJECTIVES, INITIAL_GOAL_LEVERS } from "../../data/mockData";
import {
  Target,
  Check,
  Sliders,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  RefreshCw,
  Percent,
  ChevronRight,
  Zap,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";

interface ObjectivesViewProps {
  activeObjectiveId?: string;
  onSelectObjective?: (obj: WorkflowObjective) => void;
}

export const ObjectivesView: React.FC<ObjectivesViewProps> = ({
  activeObjectiveId,
  onSelectObjective,
}) => {
  const [targetSavingsCop, setTargetSavingsCop] = useState<number>(15000000);
  const [levers, setLevers] = useState<GoalLever[]>(INITIAL_GOAL_LEVERS);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleLever = (leverId: string) => {
    setLevers((prev) =>
      prev.map((l) => (l.id === leverId ? { ...l, active: !l.active } : l))
    );
  };

  const activeSavingsTotal = levers
    .filter((l) => l.active)
    .reduce((sum, l) => sum + l.potentialSavingsCop, 0);

  const progressPct = Math.min(
    100,
    Math.round((activeSavingsTotal / (targetSavingsCop || 1)) * 100)
  );

  const handleRunGoalOptimization = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setLevers((prev) => prev.map((l) => ({ ...l, active: true })));
      setIsOptimizing(false);
      showToast("Optimización completada: Todas las palancas cuantitativas activadas al 100%.");
    }, 1000);
  };

  // KPIs
  const kpiItems: KpiCardItem[] = [
    {
      title: "Cumplimiento de Metas IA",
      value: `${progressPct}%`,
      subtitle: `$${(activeSavingsTotal / 1000000).toFixed(1)}M de $${(targetSavingsCop / 1000000).toFixed(1)}M COP`,
      trend: { direction: "up", label: "+18.4% vs mes anterior" },
      icon: Target,
      isHero: true,
      onActionClick: handleRunGoalOptimization,
    },
    {
      title: "Ahorro Proyectado Total",
      value: `$${(activeSavingsTotal / 1000000).toFixed(2)}M COP`,
      subtitle: "Consolidación de compras & fletes",
      trend: { direction: "up", label: "Meta anual en curso" },
      icon: DollarSign,
    },
    {
      title: "Palancas Operativas Activas",
      value: `${levers.filter((l) => l.active).length} / ${levers.length}`,
      subtitle: "Automatización de reglas",
      trend: { direction: "up", label: "Sin riesgo de desabastecimiento" },
      icon: Zap,
    },
    {
      title: "Riesgo de Desviación",
      value: "< 0.8%",
      subtitle: "Límites presupuestales auditados",
      trend: { direction: "up", label: "Gobernanza 100% activa" },
      icon: Shield,
    },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-[#F9FAFB] font-sans select-none flex flex-col p-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-8 z-50 px-4 py-3 rounded-full flex items-center gap-3 bg-[#0A160E] border border-[#10B981]/40 text-[#34D399] shadow-[0_0_25px_rgba(16,185,129,0.25)]">
          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          <span className="text-xs font-mono font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[#8E9893] hover:text-[#F9FAFB] text-xs ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* HEADER SUPERIOR                                           */}
      {/* ========================================================= */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Metas y Objetivos Cuantitativos
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Optimización algorítmica de compras y reducción de costos operativos
          </p>
        </div>

        <button
          onClick={handleRunGoalOptimization}
          disabled={isOptimizing}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isOptimizing ? "Maximizando Ahorros..." : "✦ Ejecutar Optimización Cuantitativa"}</span>
        </button>
      </header>

      {/* ========================================================= */}
      {/* 1. FILA 1: KPI STRIP DE 4 TARJETAS CON HÉROE              */}
      {/* ========================================================= */}
      <KpiStrip items={kpiItems} />

      {/* ========================================================= */}
      {/* 2. FILA 2: BENTO VISUAL DE 3 BLOQUES                      */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bloque Izquierdo (5 Cols): Medidor Semicircular de 180° Donezo */}
        <div className="lg:col-span-5 bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] flex flex-col justify-between">
          <div className="pb-3 border-b border-white/[0.06]">
            <h3 className="text-base font-bold text-white tracking-tight">
              Progreso hacia el Objetivo
            </h3>
            <p className="text-xs text-zinc-400">
              Ahorro acumulado vs. Meta de $15.000.000 COP
            </p>
          </div>

          {/* Medidor Semicircular de 180° */}
          <div className="relative flex flex-col items-center justify-center my-6">
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
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeOpacity="0.45"
                  />
                </pattern>
              </defs>

              {/* Arco base gris */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#1B2620"
                strokeWidth="22"
                strokeLinecap="round"
              />

              {/* Tramo Completado Sólido */}
              <path
                d="M 20 100 A 80 80 0 0 1 115 22"
                fill="none"
                stroke="#0E684D"
                strokeWidth="22"
                strokeLinecap="round"
              />

              {/* Tramo Activo Rayado */}
              <path
                d="M 115 22 A 80 80 0 0 1 168 55"
                fill="none"
                stroke="url(#gauge-hatch-pattern-goals)"
                strokeWidth="22"
              />
            </svg>

            <div className="absolute bottom-2 text-center">
              <span className="text-4xl font-extrabold text-white tracking-tight font-sans">
                {progressPct}%
              </span>
              <span className="block text-xs font-medium text-zinc-400">
                Ahorro Asegurado
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pt-3 border-t border-white/[0.04] text-[11px] font-medium text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0E684D]" />
              <span>Ejecutado (${(activeSavingsTotal / 1000000).toFixed(1)}M)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>En Proceso</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1B2620]" />
              <span>Brecha Restante</span>
            </div>
          </div>
        </div>

        {/* Bloque Derecho (7 Cols): Palancas de Optimización Cuantitativa */}
        <div className="lg:col-span-7 bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Palancas Cuantitativas Disponibles
              </h3>
              <p className="text-xs text-zinc-400">
                Activa o desactiva estrategias para balancear ahorro y tiempos de entrega
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              +{levers.filter((l) => l.active).length} activas
            </span>
          </div>

          {/* Lista de Palancas en Contenedores Well */}
          <div className="space-y-3 my-3">
            {levers.map((lever) => (
              <div
                key={lever.id}
                onClick={() => handleToggleLever(lever.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${lever.active
                  ? "bg-surface-well border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
                  : "bg-surface-well/50 border-white/[0.04] opacity-60 hover:opacity-100"
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${lever.active
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-white/[0.04] text-zinc-500"
                      }`}
                  >
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {lever.name || lever.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {lever.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-emerald-400 block">
                      +${(lever.potentialSavingsCop / 1000000).toFixed(1)}M COP
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Riesgo: {lever.riskLevel || lever.impactLabel}
                    </span>
                  </div>

                  {/* Switch Táctil */}
                  <div
                    className={`w-10 h-6 rounded-full p-1 transition-colors ${lever.active ? "bg-emerald-500" : "bg-white/10"
                      }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${lever.active ? "translate-x-4" : "translate-x-0"
                        }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. FILA 3: MATRIZ DE OBJETIVOS POR DEPARTAMENTO           */}
      {/* ========================================================= */}
      <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
        <div className="pb-4 border-b border-white/[0.06]">
          <h3 className="text-base font-bold text-white tracking-tight">
            Estrategias y OKRs Corporativos
          </h3>
          <p className="text-xs text-zinc-400">
            Alineación entre Compras, Gestión de Almacén y Control Presupuestal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {PREDEFINED_OBJECTIVES.map((obj) => (
            <div
              key={obj.id}
              onClick={() => onSelectObjective && onSelectObjective(obj)}
              className="bg-surface-well rounded-xl p-4 border border-white/[0.04] hover:border-emerald-500/30 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {obj.timeframe || obj.badge}
                  </span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {obj.targetMetric || obj.recommendedModel}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white mb-1">
                  {obj.name || obj.title}
                </h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {obj.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500">
                <span>{obj.leversCount || obj.activeTools?.length || 3} palancas vinculadas</span>
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  Ver detalle <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

