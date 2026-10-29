import React, { useState } from "react";
import { Cpu, Sparkles, Check, Sliders, Shield } from "lucide-react";

export const ModelsView: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState("grok-4.6");
  const [temperature, setTemperature] = useState(0.1);
  const [maxTokens, setMaxTokens] = useState(4000);

  const models = [
    {
      id: "grok-4.6",
      name: "Grok-4.6 (xAI)",
      badge: "RECOMENDADO S2",
      context: "128k tokens",
      latency: "180ms",
      costPer1k: "$0.0015",
      desc: "Excelente fidelidad para razonamiento ReAct estructurado, cero alucinaciones y herramientas JSON.",
    },
    {
      id: "grok-beta",
      name: "Grok-Beta (xAI)",
      badge: "ALTA VELOCIDAD",
      context: "128k tokens",
      latency: "110ms",
      costPer1k: "$0.0010",
      desc: "Ideal para el daemon continuo en segundo plano y chequeos rápidos de inventario cada 30 segundos.",
    },
    {
      id: "gpt-4o",
      name: "GPT-4o (OpenAI)",
      badge: "MULTIMODAL",
      context: "128k tokens",
      latency: "260ms",
      costPer1k: "$0.0025",
      desc: "Adecuado para ingesta de albaranes escaneados y notas de entrega complejas con OCR.",
    },
    {
      id: "claude-3-5-sonnet",
      name: "Claude 3.5 Sonnet (Anthropic)",
      badge: "ANÁLISIS FINANCIERO",
      context: "200k tokens",
      latency: "320ms",
      costPer1k: "$0.0030",
      desc: "Optimizado para síntesis ejecutiva profunda y auditoría contable exhaustiva.",
    },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto p-8 bg-[#070c09] space-y-8 select-none">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Models & Inference Engine</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102418] text-mint-400 border border-[#1b3d27]">
            LLM CONFIG
          </span>
        </div>
        <p className="text-xs text-gray-400">
          Ajusta los motores neuronales que impulsan la toma de decisiones del Coordinador Mint.
        </p>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map((m) => {
          const isSelected = selectedModel === m.id;
          return (
            <div
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? "bg-[#0d1d14] border-mint-500 shadow-[0_0_20px_rgba(34,197,94,0.18)] ring-1 ring-mint-400/40"
                  : "bg-[#0c1510] border-[#1a3023] hover:border-[#274b36]"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className={`w-4 h-4 ${isSelected ? "text-mint-400" : "text-gray-400"}`} />
                    <h3 className="text-sm font-bold text-white">{m.name}</h3>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#09150e] text-mint-400 border border-[#183624]">
                    {m.badge}
                  </span>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">{m.desc}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-[#16271e] flex items-center justify-between text-[11px] font-mono text-gray-400">
                <div className="flex items-center gap-3">
                  <span>Contexto: <strong className="text-gray-200">{m.context}</strong></span>
                  <span>Latencia: <strong className="text-mint-400">{m.latency}</strong></span>
                </div>
                {isSelected ? (
                  <span className="flex items-center gap-1 text-mint-400 font-bold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Activo</span>
                  </span>
                ) : (
                  <span className="text-gray-500 group-hover:text-gray-300">Seleccionar</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hyperparameters Controls */}
      <div className="p-6 rounded-2xl bg-[#0c1510] border border-[#1a3023] space-y-5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-mint-400" />
          <h3 className="text-sm font-bold text-gray-100">Hiperparámetros de Razonamiento</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400 font-bold uppercase tracking-wider">Temperatura (Precisión)</span>
              <span className="text-mint-300 font-bold">{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-mint-500 cursor-pointer"
            />
            <p className="text-[11px] text-gray-500">
              0.10 garantiza respuestas deterministas, sin divagaciones ni datos ficticios.
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400 font-bold uppercase tracking-wider">Tope de Tokens por Ciclo</span>
              <span className="text-mint-300 font-bold">{maxTokens} tokens</span>
            </div>
            <input
              type="range"
              min="1000"
              max="8000"
              step="500"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full accent-mint-500 cursor-pointer"
            />
            <p className="text-[11px] text-gray-500">
              Presupuesto máximo de respuesta para los reportes de inventario y cotizaciones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
