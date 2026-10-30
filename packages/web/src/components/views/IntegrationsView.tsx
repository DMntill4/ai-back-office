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
    name: "PostgreSQL 16 (Drizzle ORM)",
    categoryLabel: "Base de Datos Transaccional",
    status: "ok",
    latencyMs: 1.8,
    description: "Almacenamiento ACID de inventario, proveedores, registros inmutables de auditoría y firmas criptográficas HMAC-SHA256.",
    lastSync: "Hace 4 segundos",
    endpoint: "postgresql://localhost:5432/mint_santander",
    authMethod: "SCRAM-SHA-256 · Pool de 20 conexiones",
    enabled: true,
  },
  {
    id: "int_osrm",
    name: "Motor de Rutas OSRM",
    categoryLabel: "Cálculo Geoespacial & Fletes",
    status: "ok",
    latencyMs: 14.2,
    description: "Servidor local para optimizar rutas, tiempos de tránsito y fletes entre Bucaramanga, Bogotá y Medellín.",
    lastSync: "Hace 30 segundos",
    endpoint: "http://127.0.0.1:5000/route/v1",
    authMethod: "Servicio Local HTTP",
    enabled: true,
  },
  {
    id: "int_dian",
    name: "DIAN Facturación Electrónica",
    categoryLabel: "Cumplimiento Tributario",
    status: "ok",
    latencyMs: 48.0,
    description: "Emisión y validación previa de facturas electrónicas y notas de remisión XML v1.9 con firma digital.",
    lastSync: "Hace 2 minutos",
    endpoint: "https://vpfe.dian.gov.co/wsdl",
    authMethod: "Certificado Digital X.509",
    enabled: true,
  },
  {
    id: "int_erp",
    name: "Conector ERP Siigo / SAP",
    categoryLabel: "Sincronización Contable",
    status: "ok",
    latencyMs: 35.0,
    description: "Sincronización bidireccional de catálogo de productos, cuentas por pagar y movimientos de almacén.",
    lastSync: "Hace 1 minuto",
    endpoint: "https://api.siigo.com/v1",
    authMethod: "OAuth 2.0 Bearer Token",
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
      title: "Conectores Activos",
      value: "4 / 4 Operativos",
      subtitle: "PostgreSQL, OSRM, DIAN, ERP",
      trend: { direction: "up", label: "100% sincronizados" },
      icon: Layers,
      isHero: true,
      onActionClick: () => showToast("Todos los conectores verificados."),
    },
    {
      title: "Latencia Base de Datos",
      value: "1.8 ms",
      subtitle: "PostgreSQL transaccional",
      trend: { direction: "up", label: "Óptimo" },
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
      title: "Integridad de Esquema",
      value: "15 Tablas Mapeadas",
      subtitle: "Drizzle ORM con TypeScript",
      trend: { direction: "up", label: "Cero discrepancias" },
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
            Integraciones y Conectores de Datos
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Conexión con base de datos, motor de enrutamiento OSRM, DIAN y sistemas contables
          </p>
        </div>

        <button
          onClick={() => showToast("Abriendo catálogo de conectores empresariales...")}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Nueva Integración</span>
        </button>
      </header>

      {/* FILA 1: KPI STRIP CON HÉROE */}
      <KpiStrip items={kpis} />

      {/* FILA 2: GRID DE TARJETAS DE 2 NIVELES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl flex flex-col justify-between transition-all hover:border-emerald-500/30"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{item.name}</h3>
                    <span className="text-[10px] text-zinc-500 font-mono">{item.categoryLabel}</span>
                  </div>
                </div>

                {/* Switch Táctil */}
                <div
                  onClick={() => handleToggle(item.id)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                    item.enabled ? "bg-emerald-500" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      item.enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>

              <p className="text-xs text-zinc-300 mt-3 leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Sub-caja Well */}
            <div className="bg-surface-well rounded-xl p-3.5 mt-4 border border-white/[0.04]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.04] text-[11px] font-mono">
                <span className="text-zinc-400">
                  Latencia: <strong className="text-emerald-400">{item.latencyMs} ms</strong> · Sincronizado:{" "}
                  <span className="text-zinc-500">{item.lastSync}</span>
                </span>
                <button
                  onClick={() => handleTestConnection(item.name)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer font-sans"
                >
                  <Play className="w-3 h-3" />
                  <span>Probar Conexión</span>
                </button>
              </div>

              <div className="text-[10px] font-mono text-zinc-500 truncate">
                {item.endpoint} · {item.authMethod}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
