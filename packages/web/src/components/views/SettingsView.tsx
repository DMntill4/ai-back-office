import React, { useState } from "react";
import {
  Settings,
  Building2,
  MapPin,
  DollarSign,
  Shield,
  Save,
  Check,
  Stethoscope,
  Activity,
  Database,
  Cpu,
  FolderGit2,
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { INITIAL_DOCTOR_CHECKS } from "../../data/mockData";
import { DoctorCheckItem } from "../../types/workflow";

export const SettingsView: React.FC = () => {
  const [companyName, setCompanyName] = useState("Ferretería Industrial Santandereana S.A.S.");
  const [currency, setCurrency] = useState("COP");
  const [approvalLimit, setApprovalLimit] = useState("5000000");
  const [autonomyLevel, setAutonomyLevel] = useState<"dry-run" | "assisted" | "auto">("assisted");
  const [saved, setSaved] = useState(false);

  // mint doctor state
  const [doctorChecks, setDoctorChecks] = useState<DoctorCheckItem[]>(INITIAL_DOCTOR_CHECKS);
  const [isRunningDoctor, setIsRunningDoctor] = useState(false);
  const [lastDoctorRun, setLastDoctorRun] = useState<string>("Hoy, 10:45");

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRunDoctor = () => {
    setIsRunningDoctor(true);
    setTimeout(() => {
      // Simulate updated latencies
      setDoctorChecks((prev) =>
        prev.map((c) => ({
          ...c,
          latencyMs: c.latencyMs ? Math.floor(c.latencyMs * (0.9 + Math.random() * 0.2)) : undefined,
        }))
      );
      setIsRunningDoctor(false);
      setLastDoctorRun("Justo ahora");
    }, 1200);
  };

  const getCategoryIcon = (category: DoctorCheckItem["category"]) => {
    switch (category) {
      case "database":
        return <Database className="w-4 h-4 text-mint-400" />;
      case "llm":
        return <Cpu className="w-4 h-4 text-cyan-400" />;
      case "vault":
        return <FolderGit2 className="w-4 h-4 text-purple-400" />;
      case "daemon":
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case "channels":
        return <Radio className="w-4 h-4 text-amber-400" />;
      default:
        return <Shield className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-8 bg-[#070c09] space-y-8 select-none max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-mint-950 text-mint-400 border border-mint-500/30">
              <Settings className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Configuración & Diagnóstico del Sistema
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102418] text-mint-400 border border-[#1b3d27]">
              MINT DOCTOR & CONFIG
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Parámetros de empresa, sedes logísticas en Colombia y diagnóstico de arquitectura integral (`mint doctor`).
          </p>
        </div>

        {/* CLI Reference */}
        <div className="px-3 py-1.5 rounded-xl bg-[#0a140e] border border-[#162e20] text-xs font-mono text-gray-400">
          CLI: <code className="text-mint-300">mint doctor</code>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. MINT DOCTOR: ARCHITECTURE DIAGNOSTICS */}
        <div className="p-6 rounded-2xl bg-[#0a130e] border border-[#182f22] space-y-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#14261c]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#12281a] text-mint-400 border border-[#1e452c]">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Diagnóstico de Arquitectura (`mint doctor`)
                </h3>
                <p className="text-[11px] text-gray-400 font-mono">
                  Supervisión de salud de base de datos, motor cognitivo, bóveda Obsidian y demonios.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-gray-500">
                Última auditoría: {lastDoctorRun}
              </span>
              <button
                onClick={handleRunDoctor}
                disabled={isRunningDoctor}
                className="px-4 py-2 rounded-xl bg-[#112419] hover:bg-[#163323] text-mint-300 border border-[#214931] text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(34,197,94,0.12)] active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningDoctor ? "animate-spin text-mint-400" : ""}`} />
                <span>{isRunningDoctor ? "Comprobando arquitectura..." : "Ejecutar Diagnóstico (mint doctor)"}</span>
              </button>
            </div>
          </div>

          {/* Checks List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {doctorChecks.map((check) => (
              <div
                key={check.id}
                className="p-3.5 rounded-xl bg-[#08100c] border border-[#14261c] flex items-start justify-between gap-3 font-mono text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#0c1611] border border-[#16271e] mt-0.5">
                    {getCategoryIcon(check.category)}
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-gray-200 block text-xs">
                      {check.label}
                    </span>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                      {check.details}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                      check.status === "ok"
                        ? "bg-[#102418] text-mint-400 border border-[#1b3d27]"
                        : "bg-amber-950 text-amber-400 border border-amber-800"
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{check.status.toUpperCase()}</span>
                  </span>
                  {check.latencyMs && (
                    <span className="text-[10px] text-gray-500 block mt-1">
                      {check.latencyMs} ms
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. COMPANY IDENTITY */}
        <div className="p-6 rounded-2xl bg-[#0c1510] border border-[#1a3023] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
            <Building2 className="w-4 h-4 text-mint-400" />
            <span>Identidad de la Empresa</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5 font-mono">
                Razón Social
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#09100c] border border-[#1a3223] text-xs font-semibold text-white focus:outline-none focus:border-mint-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5 font-mono">
                Moneda Base Operativa
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#09100c] border border-[#1a3223] text-xs font-mono text-gray-300">
                <DollarSign className="w-4 h-4 text-mint-400" />
                <span>COP — Pesos Colombianos</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. WAREHOUSES / LOGISTICS NODES */}
        <div className="p-6 rounded-2xl bg-[#0c1510] border border-[#1a3023] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
            <MapPin className="w-4 h-4 text-mint-400" />
            <span>Red de Bodegas y Nodos Logísticos (Colombia)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-[#09100c] border border-[#1a3223] space-y-1">
              <span className="text-[10px] font-bold text-mint-400">SEDE PRINCIPAL</span>
              <h4 className="font-bold text-white">Bucaramanga (Matriz)</h4>
              <p className="text-[11px] text-gray-400">Lat: 7.1193, Lon: -73.1227</p>
              <p className="text-[10px] text-mint-400">Capacidad: 1,200 m³</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#09100c] border border-[#1a3223] space-y-1">
              <span className="text-[10px] font-bold text-gray-400">CENTRO DISTRIBUCIÓN</span>
              <h4 className="font-bold text-white">Bogotá D.C.</h4>
              <p className="text-[11px] text-gray-400">Lat: 4.7110, Lon: -74.0721</p>
              <p className="text-[10px] text-mint-400">Capacidad: 3,500 m³</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#09100c] border border-[#1a3223] space-y-1">
              <span className="text-[10px] font-bold text-gray-400">CENTRO DISTRIBUCIÓN</span>
              <h4 className="font-bold text-white">Medellín</h4>
              <p className="text-[11px] text-gray-400">Lat: 6.2442, Lon: -75.5812</p>
              <p className="text-[10px] text-mint-400">Capacidad: 2,200 m³</p>
            </div>
          </div>
        </div>

        {/* 4. GOVERNANCE & POLICY ENGINE RULES */}
        <div className="p-6 rounded-2xl bg-[#0c1510] border border-[#1a3023] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
            <Shield className="w-4 h-4 text-mint-400" />
            <span>Motor de Políticas Determinista (`evaluatePolicy`)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5 font-mono">
                Umbral de Aprobación Humana (HITL)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={approvalLimit}
                  onChange={(e) => setApprovalLimit(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#09100c] border border-[#1a3223] text-xs font-mono font-bold text-white focus:outline-none focus:border-mint-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-mint-400 font-bold">
                  COP
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-mono">
                Toda compra por encima de este valor exige firma HMAC explícita en /inbox.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5 font-mono">
                Modo de Autonomía
              </label>
              <select
                value={autonomyLevel}
                onChange={(e) => setAutonomyLevel(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#09100c] border border-[#1a3223] text-xs text-white focus:outline-none focus:border-mint-500 font-mono"
              >
                <option value="assisted">Assisted (Recomendado — HITL obligatorio sobre umbral)</option>
                <option value="dry-run">Dry-Run (Simulación pura sin mutaciones en BD)</option>
                <option value="auto">Auto (Bajo umbral con proveedores homologados)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-[11px] font-mono text-gray-500">
            Los parámetros se persisten en PostgreSQL con versionado inmutable.
          </span>

          <button
            onClick={handleSave}
            type="button"
            className="px-6 py-2.5 rounded-xl bg-mint-500 hover:bg-mint-400 text-black font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all active:scale-95"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Configuración guardada</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar cambios</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
