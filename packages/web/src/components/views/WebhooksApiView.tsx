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
    path: "/api/v1/approvals/decision",
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
      ? "bg-brand-surface text-brand border-brand/30"
      : method === "GET"
        ? "bg-state-pending/15 text-state-pending border-state-pending/30"
        : "bg-raised text-secondary border-border";

  return (
    <div className="flex flex-col gap-group">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-compact py-hairline rounded-pill flex items-center gap-compact bg-brand-surface border border-brand/40 text-brand shadow-popover"
          >
            <div className="w-2 h-2 rounded-pill bg-brand animate-ping" />
            <span className="text-caption font-mono font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-muted hover:text-primary text-caption ml-hairline"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BARRA DE ACCIONES DE LA SUB-PESTAÑA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact">
        <div className="flex items-center gap-hairline text-caption font-mono text-muted">
          <span className="px-hairline py-hairline rounded-control bg-panel border border-border text-secondary">
            {endpoints.length} endpoints publicados
          </span>
          <span className="hidden sm:inline">48.250 peticiones en 24 h · 0 errores 5xx</span>
        </div>

        <button
          onClick={() => showToast("Abriendo asistente para registrar nuevo webhook...")}
          className="px-base py-hairline rounded-control bg-brand hover:bg-brand text-canvas font-semibold text-caption flex items-center gap-hairline transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Nuevo Endpoint</span>
        </button>
      </div>

      {/* FILA 1: KPI STRIP CON HÉROE */}
      <KpiStrip items={kpis} />

      {/* FILA 2: GRID DE TARJETAS DE 2 NIVELES */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-group">
        {endpoints.map((ep) => {
          const total = Math.round((ep.rpm * 60 * 24) / 1000) * 1000;
          const errors = Math.round(total * (1 - ep.successRatePct / 100));
          return (
            <div
              key={ep.id}
              className="bg-panel rounded-container p-base border border-border flex flex-col justify-between transition-colors hover:border-brand/30"
            >
              <div>
                <div className="flex items-center justify-between gap-hairline pb-compact border-b border-border">
                  <div className="flex items-center gap-compact min-w-0">
                    <span
                      className={`px-hairline py-hairline rounded-control text-caption font-mono font-bold border shrink-0 ${methodTone(
                        ep.method
                      )}`}
                    >
                      {ep.method}
                    </span>
                    <h3 className="text-caption font-semibold text-primary font-mono truncate">
                      {maskPath(ep.path)}
                    </h3>
                  </div>
                  <span className="text-caption font-mono text-muted shrink-0">{ep.category}</span>
                </div>

                <h4 className="text-caption font-semibold text-primary mt-compact">{ep.name}</h4>
                <p className="text-caption text-secondary mt-hairline leading-relaxed">{ep.description}</p>
              </div>

              {/* Sub-caja con métricas 2xx / 5xx */}
              <div className="bg-raised rounded-control p-compact mt-base border border-border space-y-hairline">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-hairline">
                  <div className="bg-panel rounded-control px-hairline py-hairline border border-border">
                    <span className="text-caption font-mono text-muted block">
                      Latencia
                    </span>
                    <span className="text-caption font-mono font-semibold text-primary tabular-numbers">
                      {ep.latencyMs} ms
                    </span>
                  </div>
                  <div className="bg-panel rounded-control px-hairline py-hairline border border-brand/20">
                    <span className="text-caption font-mono text-muted block">
                      2xx Éxito
                    </span>
                    <span className="text-caption font-mono font-semibold text-brand tabular-numbers">
                      {ep.successRatePct}%
                    </span>
                  </div>
                  <div className="bg-panel rounded-control px-hairline py-hairline border border-border">
                    <span className="text-caption font-mono text-muted block">
                      5xx Errores
                    </span>
                    <span
                      className={`text-caption font-mono font-semibold tabular-numbers ${errors === 0 ? "text-secondary" : "text-state-error"
                        }`}
                    >
                      {errors}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-hairline border-t border-border">
                  <span className="text-caption font-mono text-muted">
                    {ep.rpm} req/min · {total.toLocaleString("es-CO")} req/día
                  </span>
                  <button
                    onClick={() => handleTestEndpoint(ep.name)}
                    className="text-caption text-brand hover:text-brand font-medium flex items-center gap-hairline cursor-pointer"
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
      <div className="bg-panel rounded-container border border-border overflow-hidden">
        <div className="flex items-center justify-between px-base py-compact border-b border-border">
          <div className="flex items-center gap-compact">
            <div className="w-8 h-8 rounded-control bg-brand-surface text-brand flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-caption font-semibold text-primary">Registro de Tráfico en Vivo</h3>
              <span className="text-caption text-muted font-mono">
                Últimas peticiones procesadas por el gateway
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-hairline px-hairline py-hairline rounded-control bg-brand-surface border border-brand/25 text-caption font-mono text-brand">
            <span className="w-1.5 h-1.5 rounded-pill bg-brand animate-pulse" />
            Streaming
          </span>
        </div>

        <div className="bg-canvas p-base font-mono text-caption leading-relaxed overflow-x-auto custom-scrollbar">
          {[
            { t: "06:14:02", code: 200, method: "POST", path: "/api/v1/ingest/webhook", ms: 18 },
            { t: "06:14:01", code: 200, method: "GET", path: "/api/v1/stock/health", ms: 14 },
            { t: "06:13:58", code: 200, method: "POST", path: "/api/v1/approvals/decision", ms: 32 },
            { t: "06:13:55", code: 200, method: "WS", path: "/api/v1/telemetry/stream", ms: 8 },
            { t: "06:13:51", code: 429, method: "POST", path: "/api/v1/ingest/webhook", ms: 4 },
            { t: "06:13:47", code: 200, method: "GET", path: "/api/v1/stock/health", ms: 12 },
          ].map((log, idx) => (
            <div key={idx} className="flex items-center gap-compact whitespace-nowrap">
              <span className="text-muted">{log.t}</span>
              <span
                className={`px-hairline rounded-control ${log.code < 300
                  ? "bg-brand-surface text-brand"
                  : log.code < 500
                    ? "bg-state-attention/15 text-state-attention"
                    : "bg-state-error/15 text-state-error"
                  }`}
              >
                {log.code}
              </span>
              <span className="text-state-pending w-10">{log.method}</span>
              <span className="text-secondary flex-1">{log.path}</span>
              <span className="text-muted tabular-numbers">{log.ms} ms</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
