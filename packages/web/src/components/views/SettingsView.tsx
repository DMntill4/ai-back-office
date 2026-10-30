import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Settings,
  Building2,
  DollarSign,
  Shield,
  Database,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Copy,
  Sparkles,
  Zap,
  Server,
  Save,
  RotateCcw,
  Cpu,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";

export interface SettingsViewProps {
  /** Sub-pestana solicitada por el router (configuracion_general, empresas_sucursales, ...). */
  initialTab?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab }) => {
  const [activeSection, setActiveSection] = useState<string>(
    initialTab ?? "configuracion_general",
  );
  const [approvalLimit, setApprovalLimit] = useState("5000000");
  const [autonomyLevel, setAutonomyLevel] = useState<"assisted" | "strict" | "auto">("assisted");
  const [primaryModel, setPrimaryModel] = useState("gemini-flash");
  const [temperature, setTemperature] = useState("0.1");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSave = () => {
    showToast("ConfiguraciÃ³n general y parÃ¡metros del sistema guardados con Ã©xito.");
  };

  const handleRunDoctor = () => {
    showToast("DiagnÃ³stico del sistema completado: 6/6 servicios verificados en 42ms.");
  };

  const kpis: KpiCardItem[] = [
    {
      title: "Salud Global del Sistema",
      value: "100% Ã“ptimo",
      subtitle: "6 de 6 mÃ³dulos en lÃ­nea",
      trend: { direction: "up", label: "0 advertencias" },
      icon: CheckCircle2,
      isHero: true,
      onActionClick: handleRunDoctor,
    },
    {
      title: "Tiempo de Actividad",
      value: "99.98%",
      subtitle: "Uptime continuo en 2026",
      trend: { direction: "up", label: "Alta disponibilidad" },
      icon: Server,
    },
    {
      title: "Modo Operativo",
      value: "AutÃ³nomo Supervisado",
      subtitle: "Firma delegada hasta $5M",
      trend: { direction: "up", label: "HITL Activo" },
      icon: Shield,
    },
    {
      title: "Motor de Inferencia",
      value: "MINT Core v2.4",
      subtitle: "Latencia promedio: 142ms",
      trend: { direction: "up", label: "Optimizado" },
      icon: Cpu,
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
              âœ•
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SUPERIOR */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ConfiguraciÃ³n General y DiagnÃ³stico
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Ajuste de parÃ¡metros del sistema, diagnÃ³stico de servicios y credenciales operativas
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunDoctor}
            className="px-3.5 py-2 rounded-xl bg-surface-1 hover:bg-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white border border-white/[0.08] flex items-center gap-1.5 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ejecutar DiagnÃ³stico</span>
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar ConfiguraciÃ³n</span>
          </button>
        </div>
      </header>

      {/* FILA 1: KPI STRIP CON HÃ‰ROE */}
      <KpiStrip items={kpis} />

      {/* FILA 2: GRID DE TARJETAS DE 2 NIVELES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Tarjeta 1: ParÃ¡metros del Motor de Inteligencia */}
        <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Motor de Inferencia y Razonamiento</h3>
                  <span className="text-[10px] text-zinc-500 font-mono">Modelo Principal de IA</span>
                </div>
              </div>
              <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Latencia: 142ms
              </span>
            </div>

            <p className="text-xs text-zinc-300 mt-3 leading-relaxed">
              Selecciona el modelo de inferencia para orquestaciÃ³n de compras, cÃ¡lculo de rotaciÃ³n ROP y enrutamiento logÃ­stico.
            </p>
          </div>

          <div className="bg-surface-well rounded-xl p-3.5 mt-4 border border-white/[0.04] space-y-3">
            <div>
              <label className="text-[10px] font-mono text-zinc-500 block mb-1">
                Modelo Asignado
              </label>
              <select
                value={primaryModel}
                onChange={(e) => setPrimaryModel(e.target.value)}
                className="w-full h-9 bg-surface-1 border border-white/[0.06] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="gemini-flash">Google Gemini 2.0 Flash (Alta Velocidad Â· Recomendado)</option>
                <option value="gemini-pro">Google Gemini 1.5 Pro (Razonamiento Complejo)</option>
                <option value="claude-sonnet">Anthropic Claude 3.5 Sonnet</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
                <span>Temperatura de DecisiÃ³n</span>
                <span className="text-white font-bold">{temperature} (Determinista)</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.5"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Nivel de AutonomÃ­a y Gobernanza */}
        <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Modo de AutonomÃ­a Operacional</h3>
                  <span className="text-[10px] text-zinc-500 font-mono">Control de IntervenciÃ³n</span>
                </div>
              </div>
              <span className="text-xs font-bold font-mono text-white">
                {autonomyLevel === "assisted" ? "Supervisado" : autonomyLevel === "strict" ? "Estricto" : "Completamente AutÃ³nomo"}
              </span>
            </div>

            <p className="text-xs text-zinc-300 mt-3 leading-relaxed">
              Define si las compras recurrentes bajo el umbral de seguridad se emiten directamente o si requieren pre-aprobaciÃ³n en bandeja.
            </p>
          </div>

          <div className="bg-surface-well rounded-xl p-3.5 mt-4 border border-white/[0.04]">
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "strict", label: "Estricto", desc: "Todo a HITL" },
                { id: "assisted", label: "Supervisado", desc: "Umbral $5M" },
                { id: "auto", label: "AutÃ³nomo", desc: "Reglas al 100%" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setAutonomyLevel(m.id as any)}
                  className={`py-2 px-2.5 rounded-xl text-left border transition-all ${
                    autonomyLevel === m.id
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm"
                      : "bg-surface-1 border-white/[0.04] text-zinc-400 hover:text-white"
                  }`}
                >
                  <span className="block text-xs font-bold">{m.label}</span>
                  <span className="block text-[10px] text-zinc-500 mt-0.5">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
