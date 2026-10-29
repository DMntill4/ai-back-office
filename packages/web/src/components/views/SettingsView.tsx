import React, { useState } from "react";
import {
  Settings,
  Building2,
  DollarSign,
  Shield,
  Activity,
  Database,
  Cpu,
  FolderGit2,
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Sliders,
  Sparkles,
  Zap,
  Server,
  Key,
  Globe,
  Clock,
  Terminal,
} from "lucide-react";
import { Button } from "../ui/Button";
import { INITIAL_DOCTOR_CHECKS } from "../../data/mockData";
import { DoctorCheckItem } from "../../types/workflow";

export const SettingsView: React.FC = () => {
  const [approvalLimit, setApprovalLimit] = useState("5000000");
  const [autonomyLevel, setAutonomyLevel] = useState<"assisted" | "strict" | "auto">("assisted");
  const [saved, setSaved] = useState(false);
  const [doctorChecks, setDoctorChecks] = useState<DoctorCheckItem[]>(INITIAL_DOCTOR_CHECKS);
  const [isRunningDoctor, setIsRunningDoctor] = useState(false);
  const [lastDoctorRun, setLastDoctorRun] = useState<string>("Hoy, 10:45 a. m.");
  const [primaryModel, setPrimaryModel] = useState("grok-4.6");
  const [temperature, setTemperature] = useState("0.1");
  const [showDbSecret, setShowDbSecret] = useState(false);
  const [showHmacSecret, setShowHmacSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleRunDoctor = () => {
    setIsRunningDoctor(true);
    setTimeout(() => {
      setDoctorChecks((prev) =>
        prev.map((c) => ({
          ...c,
          latencyMs: c.latencyMs ? Math.floor(c.latencyMs * (0.85 + Math.random() * 0.3)) : undefined,
        }))
      );
      setIsRunningDoctor(false);
      setLastDoctorRun("Justo ahora (100% Óptimo)");
    }, 1200);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#050806] text-slate-100 p-6 space-y-6">
      {/* 1. Header con estilo Obsidian Emerald */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-2 font-mono text-[11px] text-emerald-400/80">
            <span>CONFIGURACIÓN</span>
            <span className="text-zinc-600">/</span>
            <span>daemonConfig.ts & systemDoctor.ts</span>
            <span className="text-zinc-600">/</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px]">
              SISTEMA OPERACIONAL · VERSIÓN 1.0.0
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Configuración general
            </h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Gobernanza Activa
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Diagnóstico de componentes en tiempo real (mint doctor), selección de modelos de razonamiento cognitivo, umbrales presupuestales HITL y secretos de cifrado criptográfico.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            className="shadow-sm shadow-emerald-500/20"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            <span>Guardar configuración</span>
          </Button>
        </div>
      </div>

      {/* Alerta de guardado */}
      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Configuración persistida con éxito en PostgreSQL y sincronizada con el daemon autónomo.</span>
          </div>
          <button onClick={() => setSaved(false)} className="text-zinc-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* 2. Franja de Telemetría (5 KPI Cards Landa style) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Salud del Motor</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">100%</span>
          </div>
          <span className="text-[11px] text-emerald-400/90 block mt-0.5">5 diagnósticos superados</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Modelo Primario</span>
            <Cpu className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">Grok-4.6</span>
          </div>
          <span className="text-[11px] text-zinc-500 block mt-0.5">api.reto.pltk.mx (Streaming)</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Modo Autonomía</span>
            <Shield className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">Asistido</span>
          </div>
          <span className="text-[11px] text-amber-400 block mt-0.5">Firma compras &gt; $5M COP</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Persistencia ACID</span>
            <Database className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">Postgres</span>
          </div>
          <span className="text-[11px] text-zinc-500 block mt-0.5">15 tablas en puerto 5432</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Latencia P95</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">18</span>
            <span className="text-xs text-zinc-400">ms</span>
          </div>
          <span className="text-[11px] text-emerald-400/90 block mt-0.5">Infraestructura local</span>
        </div>
      </div>

      {/* 3. Panel mint doctor: Diagnóstico de Salud Técnica */}
      <div className="rounded-2xl bg-[#0A0F0C] border border-white/[0.08] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Diagnóstico del sistema (mint doctor)
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Última verificación: {lastDoctorRun}
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRunDoctor}
            disabled={isRunningDoctor}
            className="border-white/[0.08] hover:border-emerald-500/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRunningDoctor ? "animate-spin" : ""}`} />
            <span>{isRunningDoctor ? "Comprobando..." : "Ejecutar mint doctor"}</span>
          </Button>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {doctorChecks.map((chk) => (
            <div key={chk.id} className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">{chk.label}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/[0.06]">
                    {chk.category}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">{chk.details}</p>
              </div>

              <div className="flex items-center gap-4">
                {chk.latencyMs && (
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {chk.latencyMs} ms
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                    chk.status === "ok"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {chk.status === "ok" ? "Óptimo" : "Advertencia"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Módulos de Configuración en Grid de 2 Columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nivel de Autonomía y Gobernanza Presupuestal */}
        <div className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Modo de autonomía del agente</h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Define el grado de independencia operativa del agente para evaluar proveedores, generar órdenes de compra y autorizar despachos.
          </p>

          <div className="space-y-2">
            {[
              {
                id: "assisted",
                title: "Asistido con HITL (Recomendado)",
                desc: "Audita stock y cotiza autónomamente; retiene cualquier orden superior al umbral configurado para firma calificada.",
              },
              {
                id: "strict",
                title: "Supervisión Estricta",
                desc: "Cualquier orden o movimiento de inventario entre bodegas requiere confirmación manual previa.",
              },
              {
                id: "auto",
                title: "Autonomía Total con Guardrails",
                desc: "El agente emite y despacha órdenes automáticamente dentro de los límites presupuestales fijados.",
              },
            ].map((opt) => (
              <div
                key={opt.id}
                onClick={() => setAutonomyLevel(opt.id as any)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  autonomyLevel === opt.id
                    ? "bg-[#0d1611] border-emerald-500/50 shadow-md shadow-emerald-950/30"
                    : "bg-[#070b09] border-white/[0.06] hover:border-white/[0.15]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{opt.title}</span>
                  {autonomyLevel === opt.id && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{opt.desc}</p>
              </div>
            ))}
          </div>

          {/* Umbral de Aprobación Autónoma en COP */}
          <div className="pt-2 border-t border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="text-zinc-300 font-medium">Tope de compra autónoma (COP):</label>
              <span className="text-emerald-400 font-mono font-bold">
                ${Number(approvalLimit).toLocaleString("es-CO")} COP
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1000000"
                max="20000000"
                step="500000"
                value={approvalLimit}
                onChange={(e) => setApprovalLimit(e.target.value)}
                className="flex-1 accent-emerald-500 cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <button onClick={() => setApprovalLimit("2000000")} className="hover:text-emerald-400">$2M</button>
              <button onClick={() => setApprovalLimit("5000000")} className="hover:text-emerald-400 font-bold text-emerald-400/90">$5M (POL-01)</button>
              <button onClick={() => setApprovalLimit("10000000")} className="hover:text-emerald-400">$10M</button>
              <button onClick={() => setApprovalLimit("20000000")} className="hover:text-emerald-400">$20M</button>
            </div>
          </div>
        </div>

        {/* Modelo de Inferencia y Temperatura LLM */}
        <div className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Configuración de inferencia IA</h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Motor de razonamiento para la evaluación multicriterio de proveedores, inferencia ROP y síntesis de reportes ejecutivos.
          </p>

          <div className="space-y-3.5">
            <div>
              <label className="text-xs text-zinc-300 block mb-1 font-medium">
                Modelo cognitivo primario
              </label>
              <select
                value={primaryModel}
                onChange={(e) => setPrimaryModel(e.target.value)}
                className="w-full bg-[#070b09] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 font-mono"
              >
                <option value="grok-4.6">Grok-4.6 (api.reto.pltk.mx — Primario Recomendado)</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Anthropic 20241022)</option>
                <option value="gpt-4o">GPT-4o (OpenAI Direct API)</option>
                <option value="llama-3-1-70b">Llama 3.1 70B (Ollama Local Sandbox)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="text-zinc-300 font-medium">
                  Temperatura de inferencia:
                </label>
                <span className="text-emerald-400 font-mono font-bold">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mt-1">
                <span>0.0 (Determinista / ROP)</span>
                <span>0.5 (Balanceado)</span>
                <span>1.0 (Creativo)</span>
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">
                Fijado en 0.1 para asegurar consistencia matemática estricta en el cálculo de compras.
              </span>
            </div>

            <div className="pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-white block">Respuestas en Streaming</span>
                  <span className="text-[11px] text-zinc-500">Renderiza tokens conforme el motor razona.</span>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Módulo de Variables de Entorno & Secretos Criptográficos */}
      <div className="rounded-2xl bg-[#0A0F0C] border border-white/[0.08] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Secretos criptográficos y variables de entorno</h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            ENCRIPTADO CON AES-256 GCM
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#070b09] border border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span>DATABASE_URL (PostgreSQL 16)</span>
              <button
                onClick={() => setShowDbSecret(!showDbSecret)}
                className="text-zinc-500 hover:text-white"
              >
                {showDbSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-center justify-between bg-[#050806] p-2 rounded-lg border border-white/[0.04]">
              <span className="text-zinc-300 truncate max-w-[280px]">
                {showDbSecret
                  ? "postgresql://mint_app:SuperSecretPwd2026@localhost:5432/mint_santander"
                  : "postgresql://mint_app:••••••••••••••••@localhost:5432/mint_santander"}
              </span>
              <button
                onClick={() => handleCopy("postgresql://mint_app:SuperSecretPwd2026@localhost:5432/mint_santander", "db")}
                className="text-zinc-500 hover:text-emerald-400 ml-2"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#070b09] border border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span>HMAC_SECRET_KEY (Firma Digital)</span>
              <button
                onClick={() => setShowHmacSecret(!showHmacSecret)}
                className="text-zinc-500 hover:text-white"
              >
                {showHmacSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-center justify-between bg-[#050806] p-2 rounded-lg border border-white/[0.04]">
              <span className="text-emerald-400 truncate max-w-[280px]">
                {showHmacSecret
                  ? "hmac_live_sec_7f3a8b29c01d4e5f6a7b8c9d0e1f2a3b"
                  : "hmac_live_sec_••••••••••••••••••••••••••••••••"}
              </span>
              <button
                onClick={() => handleCopy("hmac_live_sec_7f3a8b29c01d4e5f6a7b8c9d0e1f2a3b", "hmac")}
                className="text-zinc-500 hover:text-emerald-400 ml-2"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
