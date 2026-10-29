import React, { useState } from "react";
import { WorkflowObjective, GoalLever } from "../../types/workflow";
import { PREDEFINED_OBJECTIVES, INITIAL_GOAL_LEVERS } from "../../data/mockData";
import {
  Target,
  Check,
  Sliders,
  Shield,
  Layers,
  Bot,
  ArrowRight,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Sparkles,
  Calculator,
  RefreshCw,
  Percent,
} from "lucide-react";

interface ObjectivesViewProps {
  activeObjectiveId: string;
  onSelectObjective: (obj: WorkflowObjective) => void;
}

export const ObjectivesView: React.FC<ObjectivesViewProps> = ({
  activeObjectiveId,
  onSelectObjective,
}) => {
  // Goal Engine State (mint goal --target <COP>)
  const [targetSavingsCop, setTargetSavingsCop] = useState<number>(15000000);
  const [levers, setLevers] = useState<GoalLever[]>(INITIAL_GOAL_LEVERS);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizationApplied, setOptimizationApplied] = useState<boolean>(false);

  // Toggle Lever
  const handleToggleLever = (leverId: string) => {
    setLevers((prev) =>
      prev.map((l) => (l.id === leverId ? { ...l, active: !l.active } : l))
    );
  };

  // Cumulative Savings Calculation
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
      // Activate all levers to satisfy the goal
      setLevers((prev) => prev.map((l) => ({ ...l, active: true })));
      setIsOptimizing(false);
      setOptimizationApplied(true);
      setTimeout(() => setOptimizationApplied(false), 4000);
    }, 1000);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-8 bg-[#070c09] space-y-8 select-none max-w-6xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-mint-950 text-mint-400 border border-mint-500/30">
              <Target className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Metas & Motor Cuantitativo
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102418] text-mint-400 border border-[#1b3d27]">
              MINT GOAL
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Define mandatos operacionales y simula combinaciones óptimas de palancas para alcanzar metas de ahorro financiero en COP.
          </p>
        </div>

        {/* CLI Reference Pill */}
        <div className="px-3 py-1.5 rounded-xl bg-[#0a140e] border border-[#162e20] text-xs font-mono text-gray-400">
          CLI: <code className="text-mint-300">mint goal --target {targetSavingsCop.toLocaleString("es-CO")}</code>
        </div>
      </div>

      {/* 2. QUANTITATIVE GOAL-SEEKING SIMULATOR (mint goal) */}
      <div className="p-6 rounded-2xl bg-[#0a130e] border border-[#182f22] shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#14281d]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#12281a] text-mint-400 border border-[#1e452c]">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Simulador de Metas Cuantitativas (mint goal)
              </h3>
              <p className="text-[11px] text-gray-400 font-mono">
                Optimización matemática multi-variable: volumen, rotación y consolidación de fletes.
              </p>
            </div>
          </div>

          {/* Goal Input & Solver Trigger */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#070f0b] border border-[#162f20]">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Meta Objetivo:</span>
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-mint-300">
                <span>$</span>
                <input
                  type="number"
                  step="1000000"
                  value={targetSavingsCop}
                  onChange={(e) => setTargetSavingsCop(Number(e.target.value) || 0)}
                  className="w-28 bg-transparent text-mint-300 font-bold focus:outline-none"
                />
                <span className="text-gray-500 text-[10px]">COP</span>
              </div>
            </div>

            <button
              onClick={handleRunGoalOptimization}
              disabled={isOptimizing}
              className="px-4 py-2 rounded-xl bg-mint-500 hover:bg-mint-400 text-black font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isOptimizing ? "animate-spin" : ""}`} />
              <span>{isOptimizing ? "Resolviendo palancas..." : "Resolver con Mint"}</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & KPI Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 p-4 rounded-xl bg-[#08100c] border border-[#14261c] space-y-2.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-gray-400">Progreso hacia la Meta Financiera:</span>
              <span className="text-mint-300 font-bold">
                ${activeSavingsTotal.toLocaleString("es-CO")} / ${targetSavingsCop.toLocaleString("es-CO")} COP ({progressPct}%)
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="h-3 w-full bg-[#0d1c13] rounded-full overflow-hidden p-0.5 border border-[#163321]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPct >= 100
                    ? "bg-gradient-to-r from-mint-500 to-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.5)]"
                    : "bg-mint-500"
                }`}
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono text-gray-500">
              <span>0 COP</span>
              <span>
                {progressPct >= 100
                  ? "✓ Meta cuantitativa alcanzada satisfactoriamente"
                  : `Faltan $${Math.max(0, targetSavingsCop - activeSavingsTotal).toLocaleString("es-CO")} COP`}
              </span>
              <span>${targetSavingsCop.toLocaleString("es-CO")} COP</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#08100c] border border-[#14261c] flex flex-col justify-between">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
              Palancas Activas
            </span>
            <div className="my-1">
              <span className="text-2xl font-bold font-mono text-white">
                {levers.filter((l) => l.active).length} / {levers.length}
              </span>
              <span className="text-xs text-mint-400 font-mono block">Estrategias combinadas</span>
            </div>
            <span className="text-[10px] font-mono text-gray-500">
              Garantiza guardrail presupuestal de $5M COP
            </span>
          </div>
        </div>

        {/* Interactive Levers Cards */}
        <div className="space-y-3">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-wider block">
            Palancas Estratégicas Disponibles:
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {levers.map((lever) => (
              <div
                key={lever.id}
                onClick={() => handleToggleLever(lever.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  lever.active
                    ? "bg-[#0d1e14] border-mint-500/70 shadow-[0_0_15px_rgba(34,197,94,0.12)]"
                    : "bg-[#080f0b] border-[#15291d] opacity-60 hover:opacity-100"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102418] text-mint-300 font-bold border border-[#1a3f28]">
                      {lever.impactLabel}
                    </span>
                    <input
                      type="checkbox"
                      checked={lever.active}
                      onChange={() => {}} // Handled by parent div
                      className="w-4 h-4 accent-mint-500 rounded cursor-pointer"
                    />
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug">
                    {lever.title}
                  </h4>

                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {lever.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#14261c] flex items-center justify-between font-mono">
                  <span className="text-[10px] text-gray-500">Ahorro Estimado:</span>
                  <span className="text-xs font-bold text-mint-300">
                    +${lever.potentialSavingsCop.toLocaleString("es-CO")} COP
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. OPERATIONAL DIRECTIVES (PREDEFINED OBJECTIVES) */}
      <div className="space-y-4 pt-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white tracking-tight">
            Directivas & Mandatos Operacionales del Agente
          </h3>
          <p className="text-xs text-gray-400">
            Define la conducta del agente autónomo en el Lienzo Operativo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PREDEFINED_OBJECTIVES.map((obj) => {
            const isActive = activeObjectiveId === obj.id;
            return (
              <div
                key={obj.id}
                className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                  isActive
                    ? "bg-[#0d1d14] border-mint-500 shadow-[0_0_20px_rgba(34,197,94,0.18)] ring-1 ring-mint-400/40"
                    : "bg-[#0c1510] border-[#1a3023] hover:border-[#274b36]"
                }`}
              >
                <div className="space-y-4">
                  {/* Header: Title and badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-xl ${
                          isActive
                            ? "bg-mint-950 text-mint-400 border border-mint-500/40"
                            : "bg-[#112017] text-gray-400"
                        }`}
                      >
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{obj.title}</h3>
                        <span className="text-[10px] font-mono text-gray-500 uppercase">
                          {obj.badge}
                        </span>
                      </div>
                    </div>

                    {isActive && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-mint-400 font-bold px-2 py-0.5 rounded bg-[#09150e] border border-[#183624]">
                        <Check className="w-3.5 h-3.5" />
                        <span>ACTIVO</span>
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {obj.description}
                  </p>

                  {/* System Goal Quote */}
                  <div className="p-3 rounded-xl bg-[#080f0b] border border-[#14261c] text-[11px] font-mono text-mint-300/90 leading-relaxed">
                    <span className="text-gray-500 block mb-1 uppercase text-[9px] font-bold">
                      Directiva Base:
                    </span>
                    "{obj.systemGoal}"
                  </div>

                  {/* Metadata Pills */}
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono text-gray-400">
                    <span className="px-2 py-1 rounded bg-[#09120d] border border-[#14261c]">
                      Modelo: <strong className="text-gray-200">{obj.recommendedModel}</strong>
                    </span>
                    <span className="px-2 py-1 rounded bg-[#09120d] border border-[#14261c]">
                      Max Pasos: <strong className="text-gray-200">{obj.defaultMaxIterations}</strong>
                    </span>
                    <span className="px-2 py-1 rounded bg-[#09120d] border border-[#14261c]">
                      Tope HITL: <strong className="text-mint-400">$5,000,000 COP</strong>
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4 mt-4 border-t border-[#16271e] flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 font-mono">
                    {isActive ? "Asignado al agente principal" : "Disponible para activación"}
                  </span>

                  <button
                    onClick={() => onSelectObjective(obj)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                      isActive
                        ? "bg-transparent text-mint-400 border border-mint-500/30"
                        : "bg-[#112419] hover:bg-[#163323] text-mint-300 border border-[#214931]"
                    }`}
                  >
                    <span>{isActive ? "Aplicado" : "Seleccionar"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
