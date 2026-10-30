import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Terminal,
  Key,
  Copy,
  ExternalLink,
  CheckCircle2,
  Lock,
  Code,
  ShieldCheck,
  Server,
  Zap,
  Check,
  Play,
  Clock,
  Send,
  Plus,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";

interface EndpointItem {
  id: string;
  method: "POST" | "GET" | "WS";
  path: string;
  name: string;
  category: string;
  latencyMs: number;
  rpm: number;
  successRatePct: number;
  description: string;
}

const ENDPOINTS_DATA: EndpointItem[] = [
  {
    id: "ep-01",
    method: "POST",
    path: "/api/v1/ingest/webhook",
    name: "Ingesta de Órdenes y Eventos ERP",
    category: "Inbound Webhook",
    latencyMs: 18,
    rpm: 142,
    successRatePct: 99.98,
    description: "Recepción de remisiones, facturación electrónica y cambios de inventario desde el ERP.",
  },
  {
    id: "ep-02",
    method: "POST",
    path: "/api/v1/hitl/decision",
    name: "Resolución de Aprobaciones Humanas",
    category: "Gobernanza",
    latencyMs: 32,
    rpm: 28,
    successRatePct: 100,
    description: "Recepción de firmas de autorización emitidas por el administrador desde la app o Telegram.",
  },
  {
    id: "ep-03",
    method: "GET",
    path: "/api/v1/stock/health",
    name: "Salud y Punto de Reorden (ROP)",
    category: "Consultas",
    latencyMs: 14,
    rpm: 380,
    successRatePct: 100,
    description: "Consulta de estado de 338 SKUs y proyección de quiebres por bodega.",
  },
  {
    id: "ep-04",
    method: "WS",
    path: "/api/v1/telemetry/stream",
    name: "Telemetría Satelital de Flota en Vivo",
    category: "Streaming",
    latencyMs: 8,
    rpm: 850,
    successRatePct: 99.95,
    description: "Transmisión continua de coordenadas GPS, velocidad y alertas de camiones en ruta.",
  },
];

export const WebhooksApiView: React.FC = () => {
  const [endpoints, setEndpoints] = useState<EndpointItem[]>(ENDPOINTS_DATA);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTestEndpoint = (name: string) => {
    showToast(`Petición de prueba a "${name}" ejecutada: Código 200 OK (18ms).`);
  };

  const kpis: KpiCardItem[] = [
    {
      title: "Gateway de Conectores",
      value: "4 Endpoints",
      subtitle: "REST API & Webhooks en Vivo",
      trend: { direction: "up", label: "100% operativos" },
      icon: Server,
      isHero: true,
      onActionClick: () => showToast("Todos los endpoints probados con éxito."),
    },
    {
      title: "Tráfico en 24 Horas",
      value: "48.250 Peticiones",
      subtitle: "Tasa de éxito 99.98%",
      trend: { direction: "up", label: "0 errores 5xx" },
      icon: Zap,
    },
    {
      title: "Latencia Promedio",
      value: "18 ms",
      subtitle: "Tiempo de respuesta del Gateway",
      trend: { direction: "up", label: "Excelente" },
      icon: Clock,
    },
    {
      title: "Firma Criptográfica",
      value: "HMAC-SHA256",
      subtitle: "Cifrado en cada payload",
      trend: { direction: "up", label: "Autenticado" },
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
            Webhooks y API Gateway
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Puntos de integración telemática, ingesta de órdenes y streaming de telemetría
          </p>
        </div>

        <button
          onClick={() => showToast("Abriendo asistente para registrar nuevo webhook...")}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Nuevo Endpoint</span>
        </button>
      </header>

      {/* FILA 1: KPI STRIP CON HÉROE */}
      <KpiStrip items={kpis} />

      {/* FILA 2: GRID DE TARJETAS DE 2 NIVELES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {endpoints.map((ep) => (
          <div
            key={ep.id}
            className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl flex flex-col justify-between transition-all hover:border-emerald-500/30"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      ep.method === "POST"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : ep.method === "GET"
                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                        : "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                    }`}
                  >
                    {ep.method}
                  </span>
                  <h3 className="text-xs font-bold text-white font-mono">{ep.path}</h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">{ep.category}</span>
              </div>

              <h4 className="text-xs font-bold text-white mt-3">{ep.name}</h4>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{ep.description}</p>
            </div>

            {/* Sub-caja Well */}
            <div className="bg-surface-well rounded-xl p-3.5 mt-4 border border-white/[0.04]">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-400">
                  Latencia: <strong className="text-white">{ep.latencyMs} ms</strong> · Éxito:{" "}
                  <strong className="text-emerald-400">{ep.successRatePct}%</strong>
                </span>
                <button
                  onClick={() => handleTestEndpoint(ep.name)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer font-sans"
                >
                  <Play className="w-3 h-3" />
                  <span>Probar Conexión</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
