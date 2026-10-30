import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Layers,
  Database,
  Radio,
  CheckCircle2,
  Cpu,
  Server,
  Zap,
  Globe,
  Lock,
  Plus,
  Play,
  Clock,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";

interface IntegrationItem {
  id: string;
  name: string;
  categoryLabel: string;
  status: "ok" | "syncing" | "warning";
  latencyMs: number;
  description: string;
  lastSync: string;
  endpoint: string;
  authMethod: string;
  enabled: boolean;
}

const INITIAL_INTEGRATIONS: IntegrationItem[] = [
  {
    id: "int_pg",
    name: "Conector Central ERP & Catálogo Maestro",
    categoryLabel: "Repositorio Transaccional Corporativo",
    status: "ok",
    latencyMs: 1.8,
    description: "Sincronización transaccional de existencias, catálogo de proveedores homologados, trazabilidad de auditoría y firmas HMAC-SHA256.",
    lastSync: "Hace 4 segundos",
    endpoint: "srv-erp-central.mint.interno:5432",
    authMethod: "Cifrado Empresarial · Pool de 20 Conexiones Seguras",
    enabled: true,
  },
  {
    id: "int_osrm",
    name: "Motor de Rutas & Despachos (OSRM)",
    categoryLabel: "Cálculo Geoespacial & Fletes",
    status: "ok",
    latencyMs: 14.2,
    description: "Optimización continua de rutas terrestres, tiempos estimados de tránsito y costos de flete entre Bucaramanga, Bogotá y Medellín.",
    lastSync: "Hace 30 segundos",
    endpoint: "logistica.mint.interno/rutas/v1",
    authMethod: "Servicio Local Seguro",
    enabled: true,
  },
  {
    id: "int_dian",
    name: "DIAN Facturación & Remisiones",
    categoryLabel: "Cumplimiento Tributario y Legal",
    status: "ok",
    latencyMs: 48.0,
    description: "Emisión, validación y timbrado de facturación electrónica y remisiones XML con certificado digital oficial.",
    lastSync: "Hace 2 minutos",
    endpoint: "vpfe.dian.gov.co/servicios",
    authMethod: "Certificado Digital X.509 Vigente",
    enabled: true,
  },
  {
    id: "int_erp",
    name: "Conector Contable ERP (Siigo / SAP)",
    categoryLabel: "Sincronización Financiera",
    status: "ok",
    latencyMs: 35.0,
    description: "Intercambio automatizado de cuentas por pagar, conciliación de facturas de proveedores y libro mayor.",
    lastSync: "Hace 1 minuto",
    endpoint: "api.siigo.com/v1",
    authMethod: "Credencial Corporativa OAuth 2.0",
    enabled: true,
  },
];

export const IntegrationsView: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(INITIAL_INTEGRATIONS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggle = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
    showToast(`Integración ${id} actualizada.`);
  };

  const handleTestConnection = (name: string) => {
    showToast(`Conexión con "${name}" verificada: 100% operativa.`);
  };

  const kpis: KpiCardItem[] = [
    {
      title: "Conectores Corporativos",
      value: "4 / 4 Operativos",
      subtitle: "ERP Central, Rutas, DIAN, Contabilidad",
      trend: { direction: "up", label: "100% sincronizados" },
      icon: Layers,
      isHero: true,
      onActionClick: () => showToast("Todos los conectores verificados."),
    },
    {
      title: "Latencia de Conexión",
      value: "1.8 ms",
      subtitle: "Tiempo de respuesta en enlace local",
      trend: { direction: "up", label: "Excelente" },
      icon: Database,
    },
    {
      title: "Sincronización Fiscal",
      value: "DIAN Conectada",
      subtitle: "Certificado digital vigente",
      trend: { direction: "up", label: "Habilitado 2026" },
      icon: CheckCircle2,
    },
    {
      title: "Integridad de Datos",
      value: "15 Modelos Sincronizados",
      subtitle: "Catálogos y reglas sin discrepancias",
      trend: { direction: "up", label: "Cero inconsistencias" },
      icon: Lock,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
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

      {/* BARRA DE ACCIONES DE LA SUB-PESTAÑA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
          <span className="px-2 py-1 rounded-lg bg-surface-1 border border-white/[0.06] text-zinc-300">
            {integrations.filter((i) => i.enabled).length} de {integrations.length} conectores activos
          </span>
          <span className="hidden sm:inline">Sincronización continua cada 30 s</span>
        </div>

        <button
          onClick={() => showToast("Abriendo catálogo de conectores empresariales...")}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Nueva Integración</span>
        </button>
      </div>

      {/* FILA 1: KPI STRIP CON HÉROE */}
      <KpiStrip items={kpis} />

      {/* FILA 2: GRID DE TARJETAS DE 2 NIVELES */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {integrations.map((item) => {
          const statusTone =
            item.status === "ok"
              ? { dot: "bg-emerald-400", text: "text-emerald-300", label: "Operativo" }
              : item.status === "syncing"
                ? { dot: "bg-sky-400", text: "text-sky-300", label: "Sincronizando" }
                : { dot: "bg-amber-400", text: "text-amber-300", label: "Degradado" };

          return (
            <div
              key={item.id}
              className={`bg-surface-1 rounded-2xl p-5 border shadow-card flex flex-col justify-between transition-all ${item.enabled
                ? "border-white/[0.06] hover:border-emerald-500/30"
                : "border-white/[0.04] opacity-70"
                }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.enabled
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-white/[0.04] text-zinc-500"
                        }`}
                    >
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-white truncate">{item.name}</h3>
                      <span className="text-[10px] text-zinc-500 font-mono truncate block">
                        {item.categoryLabel}
                      </span>
                    </div>
                  </div>

                  {/* Switch Táctil */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.enabled}
                    aria-label={`Activar ${item.name}`}
                    onClick={() => handleToggle(item.id)}
                    className={`relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200 border ${item.enabled
                      ? "bg-emerald-500 border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.45)]"
                      : "bg-[#0B100E] border-white/[0.12]"
                      }`}
                  >
                    <span
                      className={`absolute top-0.5 rounded-full transition-all duration-200 ${item.enabled ? "left-[22px] bg-black" : "left-0.5 bg-zinc-500"
                        }`}
                      style={{ width: 18, height: 18 }}
                    />
                  </button>
                </div>

                <p className="text-xs text-zinc-300 mt-3 leading-relaxed">{item.description}</p>
              </div>

              {/* Sub-caja Well */}
              <div className="bg-surface-well rounded-xl p-3.5 mt-4 border border-white/[0.04] space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 font-mono">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusTone.dot}`} />
                    <span className={statusTone.text}>{statusTone.label}</span>
                  </span>
                  <button
                    onClick={() => handleTestConnection(item.name)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>Probar Conexión</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-surface-1/60 rounded-lg px-2.5 py-2 border border-white/[0.04]">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block">
                      Latencia
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400 tabular-numbers">
                      {item.latencyMs} ms
                    </span>
                  </div>
                  <div className="bg-surface-1/60 rounded-lg px-2.5 py-2 border border-white/[0.04]">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block">
                      Última Sincronización
                    </span>
                    <span className="text-xs font-medium text-zinc-200">{item.lastSync}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.04] space-y-1">
                  <div className="text-[10px] font-mono text-zinc-400 truncate">
                    <span className="text-zinc-500">Endpoint:</span> {item.endpoint}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 truncate">
                    <span className="text-zinc-500">Autenticación:</span> {item.authMethod}
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
