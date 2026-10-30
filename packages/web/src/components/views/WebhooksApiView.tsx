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

  const maskPath = (path: string) => {
    const parts = path.split("/");
    const last = parts[parts.length - 1];
    if (last.length <= 4) return path;
    return `${parts.slice(0, -1).join("/")}/${last.slice(0, 3)}${"•".repeat(
      Math.min(last.length - 3, 8)
    )}`;
  };

  const methodTone = (method: EndpointItem["method"]) =>
    method === "POST"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : method === "GET"
        ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
        : "bg-violet-500/15 text-violet-400 border-violet-500/30";

  return (
    <div className="flex flex-col gap-5">
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

      {/* BARRA DE ACCIONES DE LA SUB-PESTAÑA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
          <span className="px-2 py-1 rounded-lg bg-surface-1 border border-white/[0.06] text-zinc-300">
            {endpoints.length} endpoints publicados
          </span>
          <span className="hidden sm:inline">48.250 peticiones en 24 h · 0 errores 5xx</span>
        </div>

        <button
          onClick={() => showToast("Abriendo asistente para registrar nuevo webhook...")}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Nuevo Endpoint</span>
        </button>
      </div>

      {/* FILA 1: KPI STRIP CON HÉROE */}
      <KpiStrip items={kpis} />

      {/* FILA 2: GRID DE TARJETAS DE 2 NIVELES */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {endpoints.map((ep) => {
          const total = Math.round((ep.rpm * 60 * 24) / 1000) * 1000;
          const errors = Math.round(total * (1 - ep.successRatePct / 100));
          return (
            <div
              key={ep.id}
              className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-card flex flex-col justify-between transition-all hover:border-emerald-500/30"
            >
              <div>
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${methodTone(
                        ep.method
                      )}`}
                    >
                      {ep.method}
                    </span>
                    <h3 className="text-xs font-bold text-white font-mono truncate">
                      {maskPath(ep.path)}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">{ep.category}</span>
                </div>

                <h4 className="text-xs font-bold text-white mt-3">{ep.name}</h4>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{ep.description}</p>
              </div>

              {/* Sub-caja Well con métricas 2xx / 5xx */}
              <div className="bg-surface-well rounded-xl p-3.5 mt-4 border border-white/[0.04] space-y-2.5">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-surface-1/60 rounded-lg px-2.5 py-2 border border-white/[0.04]">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block">
                      Latencia
                    </span>
                    <span className="text-xs font-mono font-bold text-white tabular-numbers">
                      {ep.latencyMs} ms
                    </span>
                  </div>
                  <div className="bg-surface-1/60 rounded-lg px-2.5 py-2 border border-emerald-500/15">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block">
                      2xx Éxito
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400 tabular-numbers">
                      {ep.successRatePct}%
                    </span>
                  </div>
                  <div className="bg-surface-1/60 rounded-lg px-2.5 py-2 border border-white/[0.04]">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block">
                      5xx Errores
                    </span>
                    <span
                      className={`text-xs font-mono font-bold tabular-numbers ${errors === 0 ? "text-zinc-400" : "text-rose-400"
                        }`}
                    >
                      {errors}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                  <span className="text-[10px] font-mono text-zinc-500">
                    {ep.rpm} req/min · {total.toLocaleString("es-CO")} req/día
                  </span>
                  <button
                    onClick={() => handleTestEndpoint(ep.name)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>Probar</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FILA 3: VISOR DE REGISTROS ESTRUCTURADOS */}
      <div className="bg-surface-1 rounded-2xl border border-white/[0.06] shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Registro de Tráfico en Vivo</h3>
              <span className="text-[10px] text-zinc-500 font-mono">
                Últimas peticiones procesadas por el gateway
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-mono text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Streaming
          </span>
        </div>

        <div className="bg-[#070B09] p-4 font-mono text-[11px] leading-relaxed overflow-x-auto custom-scrollbar">
          {[
            { t: "06:14:02", code: 200, method: "POST", path: "/api/v1/ingest/webhook", ms: 18 },
            { t: "06:14:01", code: 200, method: "GET", path: "/api/v1/stock/health", ms: 14 },
            { t: "06:13:58", code: 200, method: "POST", path: "/api/v1/hitl/decision", ms: 32 },
            { t: "06:13:55", code: 200, method: "WS", path: "/api/v1/telemetry/stream", ms: 8 },
            { t: "06:13:51", code: 429, method: "POST", path: "/api/v1/ingest/webhook", ms: 4 },
            { t: "06:13:47", code: 200, method: "GET", path: "/api/v1/stock/health", ms: 12 },
          ].map((log, idx) => (
            <div key={idx} className="flex items-center gap-3 whitespace-nowrap">
              <span className="text-zinc-500">{log.t}</span>
              <span
                className={`px-1.5 rounded ${log.code < 300
                  ? "bg-emerald-500/15 text-emerald-400"
                  : log.code < 500
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-rose-500/15 text-rose-400"
                  }`}
              >
                {log.code}
              </span>
              <span className="text-sky-400 w-10">{log.method}</span>
              <span className="text-zinc-300 flex-1">{log.path}</span>
              <span className="text-zinc-500 tabular-numbers">{log.ms} ms</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
