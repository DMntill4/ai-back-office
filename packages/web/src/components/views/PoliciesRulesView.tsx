import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  Sliders,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Save,
  Truck,
  Boxes,
  Zap,
  Sparkles,
  RotateCcw,
  Percent,
  Clock,
  Lock,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";

export const PoliciesRulesView: React.FC = () => {
  const [hitlThreshold, setHitlThreshold] = useState<number>(5000000);
  const [safetyMultiplier, setSafetyMultiplier] = useState<number>(1.5);
  const [maxFreightPct, setMaxFreightPct] = useState<number>(14);
  const [duplicateWindowHours, setDuplicateWindowHours] = useState<number>(72);
  const [minSupplierScore, setMinSupplierScore] = useState<number>(85);
  const [autoRebalanceEnabled, setAutoRebalanceEnabled] = useState<boolean>(true);
  const [strictHmacEnabled, setStrictHmacEnabled] = useState<boolean>(true);
  const [autoSupplierSelection, setAutoSupplierSelection] = useState<boolean>(true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSave = () => {
    showToast("Políticas de gobernanza guardadas y sincronizadas en el libro mayor.");
  };

  const handleReset = () => {
    setHitlThreshold(5000000);
    setSafetyMultiplier(1.5);
    setMaxFreightPct(14);
    setDuplicateWindowHours(72);
    setMinSupplierScore(85);
    setAutoRebalanceEnabled(true);
    setStrictHmacEnabled(true);
    setAutoSupplierSelection(true);
    showToast("Parámetros restablecidos a los valores predeterminados.");
  };

  const kpis: KpiCardItem[] = [
    {
      title: "Umbral Autónomo HITL",
      value: `$${(hitlThreshold / 1000000).toFixed(1)}M COP`,
      subtitle: "Órdenes mayores requieren firma",
      trend: { direction: "up", label: "Gobernanza activa" },
      icon: DollarSign,
      isHero: true,
      onActionClick: handleSave,
    },
    {
      title: "Políticas Operativas",
      value: "8 Activas",
      subtitle: "0 excepciones pendientes",
      trend: { direction: "up", label: "100% auditadas" },
      icon: Shield,
    },
    {
      title: "Score Mínimo Proveedor",
      value: `${minSupplierScore} / 100`,
      subtitle: "Filtro de calidad & SLA",
      trend: { direction: "up", label: "Categoría A homologada" },
      icon: CheckCircle2,
    },
    {
      title: "Firma Criptográfica",
      value: strictHmacEnabled ? "Estricta" : "Permisiva",
      subtitle: "HMAC-SHA256 con llave rotativa",
      trend: { direction: "up", label: "Libro mayor inmutable" },
      icon: Lock,
    },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-[#F9FAFB] font-sans select-none flex flex-col p-6 space-y-6">
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
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Reglas y Políticas de Gobernanza
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Límites financieros, guardrails de seguridad y parámetros de intervención humana
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl bg-surface-1 hover:bg-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white border border-white/[0.08] transition-colors"
          >
            Restablecer Parámetros
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </header>

      {/* FILA 1: KPI STRIP DE 4 TARJETAS CON HÉROE */}
      <KpiStrip items={kpis} />

      {/* FILA 2: GRID DE TARJETAS DE 2 NIVELES (INVENTAR STYLE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Regla 1: Umbral de Aprobación HITL */}
        <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Umbral de Compra Autónoma</h3>
                  <span className="text-[10px] text-zinc-500 font-mono">POL-COMP-01</span>
                </div>
              </div>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                ${(hitlThreshold / 1000000).toFixed(1)}M COP
              </span>
            </div>

            <p className="text-xs text-zinc-300 mt-3 leading-relaxed">
              Las órdenes de compra que superen este valor son retenidas automáticamente en la bandeja HITL para firma humana autorizada.
            </p>
          </div>

          <div className="bg-surface-well rounded-xl p-3.5 mt-4 border border-white/[0.04]">
            <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-2">
              <span>$1.000.000</span>
              <span className="text-white font-bold">${hitlThreshold.toLocaleString("es-CO")} COP</span>
              <span>$20.000.000</span>
            </div>
            <input
              type="range"
              min={1000000}
              max={20000000}
              step={500000}
              value={hitlThreshold}
              onChange={(e) => setHitlThreshold(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Regla 2: Multiplicador de Stock de Seguridad */}
        <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Multiplicador de Stock de Seguridad</h3>
                  <span className="text-[10px] text-zinc-500 font-mono">POL-STK-02</span>
                </div>
              </div>
              <span className="text-sm font-bold text-white font-mono">{safetyMultiplier}x</span>
            </div>

            <p className="text-xs text-zinc-300 mt-3 leading-relaxed">
              Factor aplicado sobre la desviación estándar del tiempo de entrega del proveedor para prevenir quiebres de inventario.
            </p>
          </div>

          <div className="bg-surface-well rounded-xl p-3.5 mt-4 border border-white/[0.04]">
            <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-2">
              <span>1.0x (Mínimo)</span>
              <span className="text-emerald-400 font-bold">{safetyMultiplier}x Cobertura</span>
              <span>3.0x (Máximo)</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={3.0}
              step={0.1}
              value={safetyMultiplier}
              onChange={(e) => setSafetyMultiplier(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Regla 3: Techo Máximo de Flete */}
        <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Tope de Flete sobre Valor de Compra</h3>
                  <span className="text-[10px] text-zinc-500 font-mono">POL-LOG-03</span>
                </div>
              </div>
              <span className="text-sm font-bold text-amber-400 font-mono">{maxFreightPct}%</span>
            </div>

            <p className="text-xs text-zinc-300 mt-3 leading-relaxed">
              Si el flete excede este porcentaje sobre el valor neto de la mercancía, el agente consolida o reprograma la ruta.
            </p>
          </div>

          <div className="bg-surface-well rounded-xl p-3.5 mt-4 border border-white/[0.04]">
            <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-2">
              <span>5%</span>
              <span className="text-white font-bold">{maxFreightPct}% Máximo</span>
              <span>25%</span>
            </div>
            <input
              type="range"
              min={5}
              max={25}
              step={1}
              value={maxFreightPct}
              onChange={(e) => setMaxFreightPct(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Regla 4: Filtro de Calidad SLA de Proveedores */}
        <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Score Mínimo para Órdenes Automáticas</h3>
                  <span className="text-[10px] text-zinc-500 font-mono">POL-PRV-04</span>
                </div>
              </div>
              <span className="text-sm font-bold text-white font-mono">{minSupplierScore} pts</span>
            </div>

            <p className="text-xs text-zinc-300 mt-3 leading-relaxed">
              Solo proveedores con puntaje superior a este umbral califican para generación directa de órdenes sin revisión previa.
            </p>
          </div>

          <div className="bg-surface-well rounded-xl p-3.5 mt-4 border border-white/[0.04]">
            <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-2">
              <span>70 pts</span>
              <span className="text-emerald-400 font-bold">{minSupplierScore} Puntos Mínimos</span>
              <span>95 pts</span>
            </div>
            <input
              type="range"
              min={70}
              max={95}
              step={1}
              value={minSupplierScore}
              onChange={(e) => setMinSupplierScore(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
