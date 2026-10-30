import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Cpu,
  Sparkles,
  Check,
  Sliders,
  Shield,
  Zap,
  Clock,
  DollarSign,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";

export const ModelsView: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState("gemini-2-flash");
  const [temperature, setTemperature] = useState(0.1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const models = [
    {
      id: "gemini-2-flash",
      name: "Google Gemini 2.0 Flash",
      badge: "RECOMENDADO OPERACIONES",
      context: "1.000k tokens",
      latency: "142 ms",
      costPer1k: "$0.0001 USD",
      desc: "Excelente velocidad y precisión para razonamiento estructurado en tiempo real, balanceo ROP y cálculo de fletes.",
    },
    {
      id: "gemini-1-5-pro",
      name: "Google Gemini 1.5 Pro",
      badge: "ALTO RAZONAMIENTO",
      context: "2.000k tokens",
      latency: "280 ms",
      costPer1k: "$0.0012 USD",
      desc: "Ideal para síntesis profunda de auditoría, conciliación de contratos marco y análisis financiero multidimensional.",
    },
    {
      id: "claude-3-5-sonnet",
      name: "Claude 3.5 Sonnet (Anthropic)",
      badge: "ANÁLISIS CONTRACTUAL",
      context: "200k tokens",
      latency: "310 ms",
      costPer1k: "$0.0030 USD",
      desc: "Diseñado para inspección exhaustiva de cláusulas legales y evaluación de riesgo de proveedores.",
    },
    {
      id: "gpt-4o",
      name: "GPT-4o (OpenAI)",
      badge: "MULTIMODAL & OCR",
      context: "128k tokens",
      latency: "240 ms",
      costPer1k: "$0.0025 USD",
      desc: "Adecuado para ingesta de albaranes escaneados, facturación digital y cotejo visual de remisiones.",
    },
  ];

  const kpis: KpiCardItem[] = [
    {
      title: "Modelo Primario Activo",
      value: "Gemini 2.0 Flash",
      subtitle: "Inferencia continua para MINT",
      trend: { direction: "up", label: "Recomendado" },
      icon: Cpu,
      isHero: true,
      onActionClick: () => showToast("Modelo activo verificado."),
    },
    {
      title: "Tokens Procesados Hoy",
      value: "1.24M Tokens",
      subtitle: "Costo acumulado: $1.42 USD",
      trend: { direction: "up", label: "+8.4% vs ayer" },
      icon: Layers,
    },
    {
      title: "Latencia Promedio",
      value: "142 ms",
      subtitle: "Respuesta en tiempo real",
      trend: { direction: "up", label: "Óptimo" },
      icon: Zap,
    },
    {
      title: "Precisión de Estructura",
      value: "100% JSON",
      subtitle: "Cero errores de formato",
      trend: { direction: "up", label: "Validado" },
      icon: CheckCircle2,
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
            className="fixed top-6 right-8 z-50 px-4 py-3 rounded-full flex items-center gap-3 bg-[#0A160E] border border-[#10B981]/40 text-[#34D399] shadow-[0_0_25px_rgba(16,185,129,0.25)]"
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
            Motores de Inferencia & Modelos IA
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configuración del modelo neuronal que impulsa la toma de decisiones autónomas en MINT
          </p>
        </div>

        <button
          onClick={() => showToast(`Modelo ${selectedModel} guardado como motor predeterminado.`)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Activar Modelo Seleccionado</span>
        </button>
      </header>

      {/* FILA 1: KPI STRIP CON HÉROE */}
      <KpiStrip items={kpis} />

      {/* FILA 2: GRID DE MODELOS EN TARJETAS DE 2 NIVELES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {models.map((m) => {
          const isSelected = selectedModel === m.id;
          return (
            <div
              key={m.id}
              onClick={() => {
                setSelectedModel(m.id);
                showToast(`Modelo seleccionado: ${m.name}`);
              }}
              className={`bg-surface-1 rounded-2xl p-5 border cursor-pointer transition-all flex flex-col justify-between ${isSelected
                  ? "border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.18)] ring-1 ring-emerald-400/40"
                  : "border-white/[0.06] hover:border-white/20"
                }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSelected
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-surface-well text-zinc-400"
                        }`}
                    >
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">{m.name}</h3>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                        {m.badge}
                      </span>
                    </div>
                  </div>

                  {/* Radio indicador */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                        ? "border-emerald-400 bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                        : "border-zinc-600 bg-surface-well"
                      }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <p className="text-xs text-zinc-300 mt-3 leading-relaxed">{m.desc}</p>
              </div>

              {/* Sub-caja Well */}
              <div className="bg-surface-well rounded-xl p-3.5 mt-4 border border-white/[0.04]">
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Contexto</span>
                    <span className="text-white font-bold">{m.context}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Latencia</span>
                    <span className="text-emerald-400 font-bold">{m.latency}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Costo / 1k</span>
                    <span className="text-white font-bold">{m.costPer1k}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
