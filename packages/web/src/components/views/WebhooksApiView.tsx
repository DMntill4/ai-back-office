import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Terminal,
  Key,
  Copy,
  Radio,
  ExternalLink,
  CheckCircle2,
  Lock,
  Code,
  ShieldCheck,
  ShieldAlert,
  Server,
  Activity,
  Zap,
  RotateCcw,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Check,
  AlertTriangle,
  Play,
  FileCode,
  Globe,
  Clock,
  Send,
  Eye,
  EyeOff,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "../ui/Button";

// Interfaces para Endpoints, Webhooks y Payloads
export interface ApiEndpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "WS";
  path: string;
  name: string;
  category: "Inbound Webhook" | "Outbound Webhook" | "REST API" | "WebSocket";
  authType: string;
  lastStatus: number;
  lastStatusText: string;
  lastInvocation: string;
  rpm: number;
  targetService: string;
  curlExample: string;
}

export interface GatewayPayload {
  id: string;
  method: "GET" | "POST";
  route: string;
  statusCode: number;
  latencyMs: number;
  timestamp: string;
  headers: Record<string, string>;
  requestBody: Record<string, any>;
  responseBody: Record<string, any>;
}

// Datos semilla de Endpoints & Webhooks
const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "ep-01",
    method: "POST",
    path: "/api/v1/ingest/webhook",
    name: "Ingesta Omnicanal ERP & Pasarelas",
    category: "Inbound Webhook",
    authType: "HMAC-SHA256 (x-mint-signature)",
    lastStatus: 200,
    lastStatusText: "OK",
    lastInvocation: "Hace 14 seg",
    rpm: 48,
    targetService: "Siigo Cloud & SAP Business One",
    curlExample: `curl -X POST http://localhost:3001/api/v1/ingest/webhook \\
  -H "Content-Type: application/json" \\
  -H "x-mint-signature: 9f82c3d1e4a5028bf87412e690a312bc89a712f5" \\
  -d '{"event":"stock_alert","sku":"SKU-SIE-IND18","stock":5,"warehouseId":"wh_bga"}'`,
  },
  {
    id: "ep-02",
    method: "POST",
    path: "/api/v1/approvals/callback",
    name: "Callback de Aprobaciones Remotas HITL",
    category: "Inbound Webhook",
    authType: "Token Un Solo Uso (tokenService.ts)",
    lastStatus: 200,
    lastStatusText: "OK",
    lastInvocation: "Hace 2 min",
    rpm: 12,
    targetService: "Telegram Bot & Consola Operativa",
    curlExample: `curl -X POST http://localhost:3001/api/v1/approvals/callback \\
  -H "Authorization: Bearer mint_sec_live_9f82c3..." \\
  -H "Content-Type: application/json" \\
  -d '{"decisionId":"DEC-004190f7","action":"APPROVED","operator":"Fernando S."}'`,
  },
  {
    id: "ep-03",
    method: "GET",
    path: "/api/v1/telemetry/osrm",
    name: "Telemetría de Rutas y Fletes Santander",
    category: "REST API",
    authType: "Bearer API Key",
    lastStatus: 200,
    lastStatusText: "OK",
    lastInvocation: "Hace 1 min",
    rpm: 24,
    targetService: "Motor OSRM (Rutas Pescadero/Zapatoca)",
    curlExample: `curl "http://localhost:3001/api/v1/telemetry/osrm?origin=BGA&dest=BOG" \\
  -H "Authorization: Bearer mint_sec_live_9f82c3..."`,
  },
  {
    id: "ep-04",
    method: "POST",
    path: "/api/v1/stock/sync",
    name: "Sincronización WMS Bodega Matriz",
    category: "Inbound Webhook",
    authType: "HMAC-SHA256 Obligatorio",
    lastStatus: 422,
    lastStatusText: "UNPROCESSABLE_ENTITY",
    lastInvocation: "Hace 6 min",
    rpm: 6,
    targetService: "WMS Bodega Chimitá",
    curlExample: `curl -X POST http://localhost:3001/api/v1/stock/sync \\
  -H "x-mint-signature: invalid_hash_signature" \\
  -H "Content-Type: application/json" \\
  -d '{"warehouseId":"wh_bga","recalculateROP":true}'`,
  },
  {
    id: "ep-05",
    method: "POST",
    path: "/api/v1/orders/dispatch",
    name: "Despacho de Órdenes a Proveedores",
    category: "Outbound Webhook",
    authType: "mTLS + Firma HMAC",
    lastStatus: 200,
    lastStatusText: "OK",
    lastInvocation: "Hace 15 min",
    rpm: 8,
    targetService: "API DIS Bucaramanga & Ferreterías Bogotá",
    curlExample: `curl -X POST http://localhost:3001/api/v1/orders/dispatch \\
  -H "Authorization: Bearer mint_sec_live_9f82c3..." \\
  -H "Content-Type: application/json" \\
  -d '{"orderId":"PO-2026-0089","totalCop":3780000}'`,
  },
];

// Payloads en vivo del Gateway
const RECENT_PAYLOADS: GatewayPayload[] = [
  {
    id: "req-01",
    method: "POST",
    route: "/api/v1/ingest/webhook",
    statusCode: 200,
    latencyMs: 24,
    timestamp: "10:14:08.241",
    headers: {
      "host": "localhost:3001",
      "user-agent": "SiigoCloud-Dispatcher/2.4",
      "content-type": "application/json",
      "x-mint-signature": "hmac_sha256_9f82c3d1e4a5028b",
      "x-request-id": "req_8812a0f9-21cb-4e92",
    },
    requestBody: {
      event: "stock_threshold_crossed",
      sku: "SKU-SIE-IND18",
      warehouseId: "wh_bga",
      currentStock: 5,
      ropThreshold: 20,
      urgency: "QUIEBRE_INMINENTE_84H",
    },
    responseBody: {
      status: "ACCEPTED",
      decisionTriggered: "DEC-004190f7",
      action: "ENQUEUED_HITL_INBOX",
      executionMs: 24,
    },
  },
  {
    id: "req-02",
    method: "POST",
    route: "/api/v1/approvals/callback",
    statusCode: 200,
    latencyMs: 32,
    timestamp: "09:15:32.118",
    headers: {
      "host": "localhost:3001",
      "authorization": "Bearer mint_sec_live_***a9e334c7d",
      "x-operator-identity": "fernando.s@santander.com",
      "content-type": "application/json",
    },
    requestBody: {
      decisionId: "DEC-008b188f",
      channel: "telegram",
      operator: "Fernando S. (@FernandoS)",
      action: "APPROVED_WITHOUT_MODIFICATION",
      amountCop: 3780000,
    },
    responseBody: {
      success: true,
      receipt: "receipts/po_2026_0089.json",
      notifiedChannels: ["Telegram", "Slack", "Email"],
    },
  },
  {
    id: "req-03",
    method: "POST",
    route: "/api/v1/stock/sync",
    statusCode: 422,
    latencyMs: 12,
    timestamp: "08:20:15.002",
    headers: {
      "host": "localhost:3001",
      "x-mint-signature": "invalid_hash_signature",
      "content-type": "application/json",
    },
    requestBody: {
      warehouseId: "wh_bga",
      syncToken: "expired_token_8812",
      recalculatedROP: 35,
    },
    responseBody: {
      error: "INVALID_HMAC_SIGNATURE",
      code: "AUTH_422_SIGNATURE_MISMATCH",
      message: "Firma HMAC-SHA256 no coincide con la llave simétrica compartida.",
      quarantined: true,
      caseRef: "QUAR-0f1284a1",
    },
  },
];

export const WebhooksApiView: React.FC = () => {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>(API_ENDPOINTS);
  const [payloads, setPayloads] = useState<GatewayPayload[]>(RECENT_PAYLOADS);
  const [selectedPayloadId, setSelectedPayloadId] = useState<string>("req-01");
  const [apiKey, setApiKey] = useState("mint_sec_live_9f82c3d1e4a5028bf87412e690a312bc89a712f5");
  const [isKeyRevealed, setIsKeyRevealed] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurlId, setCopiedCurlId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const handleCopyKey = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      showToast("API Key copiada al portapapeles.");
    }
  };

  const handleCopyCurl = (epId: string, curl: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(curl);
      setCopiedCurlId(epId);
      setTimeout(() => setCopiedCurlId(null), 2000);
      showToast("Comando cURL copiado al portapapeles.");
    }
  };

  const handleRotateKey = () => {
    const newKey = `mint_sec_live_${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;
    setApiKey(newKey);
    showToast("Clave API rotada con éxito en tokenService.ts. Clave previa revocada.");
  };

  const handleReplayEvent = (payload: GatewayPayload) => {
    setIsReplaying(true);
    showToast(`Re-disparando evento ${payload.route} a través de daemonService.ts...`);

    setTimeout(() => {
      setIsReplaying(false);
      showToast(`Evento re-ejecutado con éxito: 200 OK (${payload.latencyMs}ms).`);
    }, 1100);
  };

  const activePayload = payloads.find((p) => p.id === selectedPayloadId) || payloads[0];

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#050806] text-[#F9FAFB] font-sans antialiased select-none overflow-y-auto">
      {/* 1. Header Bar de la Vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-white/[0.08] bg-[#0A0F0C]/90 backdrop-blur-md flex-none z-20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-[#8E9893] uppercase tracking-wider">
              Comunicaciones
            </span>
            <span className="text-white/20">/</span>
            <span className="text-[11px] font-mono text-[#10B981] flex items-center gap-1">
              <Server className="w-3 h-3" />
              server.ts & daemonService.ts
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Webhooks y API
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/30">
              GATEWAY ACTIVO · PORT 3001
            </span>
          </div>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => showToast("Cache de rutas y validadores HMAC recargados.")}
          >
            Recargar Gateway
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Key className="w-3.5 h-3.5" />}
            onClick={handleRotateKey}
          >
            Rotar API Key
          </Button>
        </div>
      </div>

      {/* Toast Flotante */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 right-6 z-50 px-4 py-2 rounded-xl bg-[#0A0F0C] border border-[#10B981]/50 text-[#34D399] text-xs font-mono shadow-[0_4px_24px_rgba(16,185,129,0.2)] flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido Principal */}
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* 1. CABECERA TÉCNICA DE ESTADO DEL SERVIDOR (server.ts & daemonService.ts) */}
        {/* ========================================================================= */}
        <div className="p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] relative overflow-hidden shadow-subtle space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Mint API Gateway · Fastify & Node.js Daemon (server.ts)
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-[#8E9893]">Daemon PID:</span>
              <span className="text-emerald-400 font-bold">4092</span>
              <span className="text-white/20">|</span>
              <span className="text-[#8E9893]">Protocolo:</span>
              <span className="text-white font-bold">HTTP/2 · TLS 1.3</span>
            </div>
          </div>

          {/* Grid de Métricas Técnicas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono pt-1">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
              <span className="text-[10px] text-[#8E9893] block">Puerto Activo:</span>
              <a
                href="http://localhost:3001"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 font-bold hover:underline flex items-center gap-1 mt-0.5"
              >
                :3001 <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
              <span className="text-[10px] text-[#8E9893] block">Estado Gateway:</span>
              <span className="text-[#34D399] font-bold block mt-0.5">ONLINE · 100%</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
              <span className="text-[10px] text-[#8E9893] block">Uptime Daemon:</span>
              <span className="text-white font-bold block mt-0.5">14d 6h 22m</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
              <span className="text-[10px] text-[#8E9893] block">Tasa de Peticiones:</span>
              <span className="text-white font-bold block mt-0.5 tabular-nums">142 RPM</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
              <span className="text-[10px] text-[#8E9893] block">Latencia P95 / P99:</span>
              <span className="text-[#34D399] font-bold block mt-0.5 tabular-nums">18.4ms / 32ms</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
              <span className="text-[10px] text-[#8E9893] block">Memoria RSS:</span>
              <span className="text-gray-300 font-bold block mt-0.5 tabular-nums">64.2 MB / 512MB</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. LAYOUT DIVIDIDO: Endpoints (55%) + Inspector & API Keys (45%)          */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
          {/* --------------------------------------------------------------------- */}
          {/* COLUMNA IZQUIERDA: Endpoints & Webhooks (55% / 7 cols)                */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] shadow-subtle space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#10B981]" />
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Rutas de API & Webhooks Entrantes/Salientes
                    </h3>
                    <span className="text-[10px] font-mono text-[#8E9893]">
                      Contratos de integración con Siigo, SAP, bots y pasarelas
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/30">
                  {endpoints.length} ENDPOINTS
                </span>
              </div>

              {/* Lista de Endpoints */}
              <div className="space-y-2.5">
                {endpoints.map((ep) => {
                  const isSuccess = ep.lastStatus === 200;
                  const isPost = ep.method === "POST";
                  const isCopied = copiedCurlId === ep.id;

                  return (
                    <div
                      key={ep.id}
                      className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] hover:border-[#10B981]/30 transition-all space-y-2.5 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {/* Badge de Método */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              isPost
                                ? "bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30"
                                : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                            }`}
                          >
                            {ep.method}
                          </span>
                          <span className="font-mono text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                            {ep.path}
                          </span>
                        </div>

                        {/* Status Code */}
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              isSuccess
                                ? "bg-[#10B981]/10 text-[#34D399]"
                                : "bg-amber-400/10 text-amber-400 border border-amber-400/30"
                            }`}
                          >
                            {ep.lastStatus} {ep.lastStatusText}
                          </span>
                          <span className="text-[#8E9893]">{ep.lastInvocation}</span>
                        </div>
                      </div>

                      {/* Descripción y Detalles */}
                      <div className="flex items-center justify-between text-xs text-[#8E9893]">
                        <span className="font-sans text-gray-300">{ep.name}</span>
                        <span className="font-mono text-[11px] text-[#8E9893] tabular-nums">
                          {ep.rpm} req/min
                        </span>
                      </div>

                      {/* Footer con Auth y Copiar cURL */}
                      <div className="pt-2 border-t border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono">
                        <span className="text-[#8E9893] flex items-center gap-1.5 truncate">
                          <Lock className="w-2.5 h-2.5 text-[#10B981]" />
                          {ep.authType} · {ep.targetService}
                        </span>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleCopyCurl(ep.id, ep.curlExample)}
                            className="px-2 py-0.5 rounded bg-black/60 hover:bg-[#10B981]/20 text-gray-300 hover:text-emerald-300 border border-white/[0.08] hover:border-[#10B981]/30 transition-all flex items-center gap-1 cursor-pointer"
                            title="Copiar comando cURL completo"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-[#10B981]" />
                                <span className="text-emerald-400">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-[#8E9893]" />
                                <span>Copiar cURL</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono text-[#8E9893]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                Validación de firmas HMAC-SHA256 aplicada en todos los webhooks
              </span>
              <a
                href="http://localhost:3001/documentation"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1"
              >
                Swagger OpenAPI <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* COLUMNA DERECHA: API Keys (Arriba) + Live Payloads Inspector (Abajo)  */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
            {/* PARTE A: Gestor de API Keys & Tokens (tokenService.ts) */}
            <div className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] shadow-subtle space-y-3.5">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#10B981]" />
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    API Key de Producción (tokenService.ts)
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/30">
                  ACTIVA
                </span>
              </div>

              {/* Visualización de la Clave con Reveal y Copiar */}
              <div className="p-3 rounded-xl bg-black/60 border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#8E9893]">Clave de Autorización Bearer:</span>
                  <button
                    onClick={() => setIsKeyRevealed(!isKeyRevealed)}
                    className="text-[#8E9893] hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    {isKeyRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{isKeyRevealed ? "Ocultar" : "Revelar"}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 font-mono text-xs text-white bg-black/80 p-2.5 rounded-lg border border-white/[0.04]">
                  <span className="truncate">
                    {isKeyRevealed ? apiKey : "mint_sec_live_••••••••••••••••••••••••••••••••"}
                  </span>
                  <button
                    onClick={handleCopyKey}
                    className="p-1 hover:bg-white/[0.08] rounded text-[#8E9893] hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                    title="Copiar Clave Completa"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9893]">
                <span>Permisos: <strong className="text-white">FULL_OPERATOR</strong></span>
                <span>Expira en: <strong className="text-emerald-400">78 días</strong></span>
              </div>
            </div>

            {/* PARTE B: Visor de Payloads JSON en Tiempo Real */}
            <div className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] shadow-subtle space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Inspector de Payloads en Vivo
                      </h3>
                      <span className="text-[10px] font-mono text-[#8E9893]">
                        Últimos requests JSON que atravesaron el API Gateway
                      </span>
                    </div>
                  </div>

                  {/* Selector de Evento Reciente */}
                  <div className="flex items-center gap-1">
                    {payloads.map((p, idx) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPayloadId(p.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                          selectedPayloadId === p.id
                            ? "bg-[#10B981] text-black font-bold"
                            : "bg-black/40 text-[#8E9893] hover:text-white border border-white/[0.06]"
                        }`}
                      >
                        #{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Encabezado del Request Seleccionado */}
                <div className="flex items-center justify-between text-xs font-mono bg-black/40 p-2.5 rounded-xl border border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#10B981]/20 text-[#34D399] font-bold">
                      {activePayload.method}
                    </span>
                    <span className="text-white font-bold">{activePayload.route}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-emerald-400 font-bold">{activePayload.statusCode}</span>
                    <span className="text-[#8E9893] tabular-nums">{activePayload.latencyMs}ms</span>
                    <span className="text-[#8E9893]">{activePayload.timestamp}</span>
                  </div>
                </div>

                {/* Visor de Código JSON Estilizado en JetBrains Mono */}
                <div className="p-3.5 rounded-xl bg-black border border-white/[0.08] font-mono text-[11px] text-gray-300 leading-relaxed overflow-x-auto max-h-[220px]">
                  <div className="text-[10px] text-[#8E9893] mb-1">// Request Body & Trigger:</div>
                  <pre className="text-emerald-300">
                    {JSON.stringify(activePayload.requestBody, null, 2)}
                  </pre>
                  <div className="text-[10px] text-[#8E9893] mt-2 mb-1">// Gateway Response:</div>
                  <pre className="text-gray-400">
                    {JSON.stringify(activePayload.responseBody, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Botón Replay Event */}
              <div className="pt-2 border-t border-white/[0.04]">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  disabled={isReplaying}
                  icon={isReplaying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  onClick={() => handleReplayEvent(activePayload)}
                >
                  {isReplaying ? "Re-ejecutando en Gateway..." : "Re-disparar Evento (Replay en Vivo)"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
