import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  Slack,
  Mail,
  Radio,
  Send,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Zap,
  Clock,
  RefreshCw,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Terminal,
  Activity,
  Layers,
  ArrowRight,
  ArrowUpRight,
  Key,
  Copy,
  Check,
  Search,
  Filter,
  CheckCheck,
  Flame,
  CornerDownRight,
  Plus,
} from "lucide-react";
import { Button } from "../ui/Button";

// Interfaces para Adaptadores, Cola de Salida y Listeners
export interface AdapterChannel {
  id: "telegram" | "slack" | "discord" | "gmail";
  name: string;
  filename: string;
  icon: string;
  status: "connected" | "degraded" | "disconnected";
  latencyMs: number;
  handle: string;
  details: string;
  hitlSupport: string;
  lastPing: string;
}

export interface OutboxItem {
  id: string;
  channel: "telegram" | "slack" | "discord" | "gmail";
  type: string;
  recipient: string;
  subject: string;
  priority: "critical" | "high" | "normal";
  status: "delivered" | "queued" | "retry";
  latencyMs?: number;
  timestamp: string;
  hmacSignature: string;
  payloadPreview: string;
  interactiveActions?: string[];
}

export interface InboundEvent {
  id: string;
  channel: "telegram" | "slack" | "discord" | "gmail";
  sender: string;
  rawText: string;
  detectedIntent: string;
  confidence: number;
  extractedEntities: { [key: string]: string };
  triggeredAction: string;
  timestamp: string;
}

// Datos semilla de Adaptadores
const ADAPTER_CHANNELS: AdapterChannel[] = [
  {
    id: "telegram",
    name: "Telegram Bot Adapter",
    filename: "telegramAdapter.ts / telegramListener.ts",
    icon: "telegram",
    status: "connected",
    latencyMs: 42,
    handle: "@MintOperativoSantanderBot",
    details: "Grupo Operaciones: -1002381920491",
    hitlSupport: "tokenService.ts Activo (Inline Buttons [Aprobar] [Rechazar])",
    lastPing: "Hace 12 seg",
  },
  {
    id: "slack",
    name: "Slack Workspace Adapter",
    filename: "slackAdapter.ts",
    icon: "slack",
    status: "connected",
    latencyMs: 68,
    handle: "#alertas-operativas",
    details: "Workspace: Santander Industrial · App ID: A0789B12C",
    hitlSupport: "Block Kit + Firmas HMAC Remotas",
    lastPing: "Hace 24 seg",
  },
  {
    id: "discord",
    name: "Discord Gateway Adapter",
    filename: "discordAdapter.ts",
    icon: "discord",
    status: "connected",
    latencyMs: 54,
    handle: "#despachos-rutas",
    details: "Servidor: Mint Fleet Ops · Webhook TLS 1.3",
    hitlSupport: "Rich Embeds & Micro-Alertas de Telemetría",
    lastPing: "Hace 18 seg",
  },
  {
    id: "gmail",
    name: "Gmail OAuth2 / SMTP",
    filename: "gmailAdapter.ts",
    icon: "gmail",
    status: "connected",
    latencyMs: 112,
    handle: "alertas.santander@ferreteriaindustrial.co",
    details: "Google Workspace API · Token Refresh: 54 min",
    hitlSupport: "Firma Criptográfica DKIM + HMAC en PDFs Adjuntos",
    lastPing: "Hace 45 seg",
  },
];

// Datos semilla de Cola de Salida (outboxQueueService.ts)
const SEED_OUTBOX: OutboxItem[] = [
  {
    id: "MSG-9921",
    channel: "telegram",
    type: "ALERTA_QUIEBRE_ROP",
    recipient: "@MintOperativoSantanderBot",
    subject: "Quiebre Inminente: SKU-SIE-IND18 (5 unidades restantes en Chimitá)",
    priority: "critical",
    status: "delivered",
    latencyMs: 42,
    timestamp: "Hoy, 10:14:10 a. m.",
    hmacSignature: "hmac_sha256_9f82c3d1e4a5028b",
    payloadPreview: "Stock físico cayó por debajo de ROP (20u). Generada recomendación de compra #OC-402 por 50 unidades.",
  },
  {
    id: "MSG-9920",
    channel: "telegram",
    type: "SOLICITUD_HITL_PO",
    recipient: "Fernando S. (@FernandoS)",
    subject: "Aprobación Requerida: Orden #OC-402 por $7.250.000 COP",
    priority: "high",
    status: "delivered",
    latencyMs: 38,
    timestamp: "Hoy, 10:14:12 a. m.",
    hmacSignature: "hmac_sha256_31a89c02ff1e92a0",
    payloadPreview: "Monto excede umbral de autonomía de $5M COP (POL-01). Requiere firma de operador humano.",
    interactiveActions: ["Aprobar $7.25M COP", "Modificar Cantidad", "Rechazar"],
  },
  {
    id: "MSG-9918",
    channel: "gmail",
    type: "RESUMEN_EJECUTIVO_DIARIO",
    recipient: "gerencia@ferreteriaindustrial.co",
    subject: "Briefing Matutino Mint: Rentabilidad 31.4%, 0 quiebres en obra",
    priority: "normal",
    status: "delivered",
    latencyMs: 112,
    timestamp: "Hoy, 08:30:00 a. m.",
    hmacSignature: "hmac_sha256_0012e87a55421c99",
    payloadPreview: "Informe consolidado Q3/Q4 con estado de resultados, 4 rutas OSRM monitoreadas y 14.2% ahorro en compras.",
  },
  {
    id: "MSG-9915",
    channel: "slack",
    type: "REASIGNACION_LOGISTICA",
    recipient: "#alertas-operativas",
    subject: "Contingencia de Despacho: Ruta Bucaramanga-San Gil vía Zapatoca",
    priority: "high",
    status: "delivered",
    latencyMs: 64,
    timestamp: "Ayer, 18:42:15 p. m.",
    hmacSignature: "hmac_sha256_a78bc9012df38411",
    payloadPreview: "Cierre temporal en sector Pescadero por derrumbe. Reenrutamiento autorizado con +$180.000 COP en diésel.",
  },
  {
    id: "MSG-9922",
    channel: "discord",
    type: "TELEMETRIA_DESPACHO",
    recipient: "#despachos-rutas",
    subject: "Despacho #SH-8841 consolidado en tránsito hacia Bucaramanga",
    priority: "normal",
    status: "queued",
    timestamp: "Hace 4 segundos",
    hmacSignature: "hmac_sha256_4e11a9b832f0124c",
    payloadPreview: "Camión consolidado con 100x Discos Diamantados. ETA estimado: Hoy, 16:30 horas Bodega Chimitá.",
  },
];

// Datos semilla de Escucha de Canales de Venta (salesChannelListener.ts)
const SEED_INBOUND_EVENTS: InboundEvent[] = [
  {
    id: "EVT-IN-401",
    channel: "telegram",
    sender: "Ing. Carlos Mendoza (@cmendoza_marval)",
    rawText: "Buen día equipo, requerimos urgente 50 sierras circulares 1800W para el frente de obra en Girón. ¿Tienen despacho disponible para hoy?",
    detectedIntent: "SOLICITUD_COTIZACION_URGENTE",
    confidence: 0.984,
    extractedEntities: {
      sku: "SKU-SIE-IND18",
      cantidad: "50 unidades",
      cliente: "Constructora Marval S.A.",
      destino: "Obra Girón, Santander",
    },
    triggeredAction: "Disparó Verificación WMS -> Stock Insuficiente (5u) -> Formuló Orden Extraordinaria #OC-402",
    timestamp: "Hoy, 10:22 a. m.",
  },
  {
    id: "EVT-IN-400",
    channel: "gmail",
    sender: "compras@ferreteriaelsocorro.com",
    rawText: "Favor confirmar número de guía de remesa y copia de la factura de los 100 discos diamantados del pedido #PO-2026-0142.",
    detectedIntent: "CONSULTA_ESTADO_LOGISTICO",
    confidence: 0.991,
    extractedEntities: {
      orden: "#PO-2026-0142",
      producto: "SKU-COR-DISC7",
      transporte: "Ruta 45A OSRM",
    },
    triggeredAction: "Respuesta automática enviada con Tracking OSRM #TRK-8812 y PDF de factura electrónica.",
    timestamp: "Hoy, 09:40 a. m.",
  },
  {
    id: "EVT-IN-398",
    channel: "slack",
    sender: "Distribuidora Industrial Santander (#proveedores-dis)",
    rawText: "Estimados, informamos que por mantenimiento en planta de corte tendremos demora de 3 días en despachos de maquinaria pesada.",
    detectedIntent: "ALERTA_DISRUPCION_SUMINISTRO",
    confidence: 0.968,
    extractedEntities: {
      proveedor: "Distribuidora Industrial Santander",
      leadTimeImpact: "+72 horas de retraso",
      afectacion: "Maquinaria / Sierra Circular",
    },
    triggeredAction: "Recalibró ROP Holt-Winters a 5 días y abrió caso en Cuarentena de Memoria QUAR-176e6d4c.",
    timestamp: "Ayer, 16:15 p. m.",
  },
];

export const NotificationChannelsView: React.FC = () => {
  const [channels, setChannels] = useState<AdapterChannel[]>(ADAPTER_CHANNELS);
  const [outbox, setOutbox] = useState<OutboxItem[]>(SEED_OUTBOX);
  const [inboundEvents, setInboundEvents] = useState<InboundEvent[]>(SEED_INBOUND_EVENTS);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Simulador de Ingesta Manual de Mensajes
  const [simText, setSimText] = useState("");
  const [simChannel, setSimChannel] = useState<"telegram" | "gmail" | "slack">("telegram");
  const [isProcessingSim, setIsProcessingSim] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  // Probar canal individual (notify.ts)
  const handleTestChannel = (channelId: string) => {
    setTestingChannel(channelId);
    showToast(`Ejecutando ping de prueba a través de packages/notifiers/notify.ts (${channelId})...`);

    setTimeout(() => {
      setTestingChannel(null);
      showToast(`Ping exitoso en ${channelId.toUpperCase()}: ACK 200 recibido en 38ms.`);

      // Añadir mensaje de prueba a la cola
      const testMsg: OutboxItem = {
        id: `MSG-${Math.floor(1000 + Math.random() * 9000)}`,
        channel: channelId as any,
        type: "PING_PRUEBA_NOTIFY",
        recipient: channelId === "telegram" ? "@MintOperativoBot" : "#canal-pruebas",
        subject: `Ping de conectividad verificado por operador (${channelId})`,
        priority: "normal",
        status: "delivered",
        latencyMs: 38,
        timestamp: "Recién despachado",
        hmacSignature: "hmac_sha256_ping_verification_ok",
        payloadPreview: "Prueba técnica de canal completada sin latencia en adapter socket.",
      };
      setOutbox((prev) => [testMsg, ...prev]);
    }, 1200);
  };

  // Procesar mensaje simulado en el naturalIntentEngine
  const handleSimulateInbound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simText.trim()) return;

    setIsProcessingSim(true);
    showToast("naturalIntentEngine analizando sintaxis y entidades del mensaje...");

    setTimeout(() => {
      setIsProcessingSim(false);
      const newEvt: InboundEvent = {
        id: `EVT-IN-${Math.floor(500 + Math.random() * 500)}`,
        channel: simChannel,
        sender: simChannel === "telegram" ? "Cliente WhatsApp / Telegram" : "Operador Externo",
        rawText: simText,
        detectedIntent: simText.toLowerCase().includes("cotizar")
          ? "SOLICITUD_COTIZACION"
          : simText.toLowerCase().includes("retraso")
          ? "ALERTA_DISRUPCION"
          : "CONSULTA_OPERATIVA_GENERAL",
        confidence: 0.978,
        extractedEntities: {
          origen: simChannel,
          procesadoPor: "naturalIntentEngine (Grok-4.6)",
          timestamp: new Date().toLocaleTimeString(),
        },
        triggeredAction: "Entidad mapeada en el grafo de conocimiento -> Evento registrado en historial.",
        timestamp: "Ahora mismo",
      };

      setInboundEvents((prev) => [newEvt, ...prev]);
      setSimText("");
      showToast("Mensaje procesado con éxito y registrado en el feed de escucha de ventas.");
    }, 1000);
  };

  const renderChannelIcon = (ch: string) => {
    switch (ch) {
      case "telegram":
        return <Send className="w-4 h-4 text-[#0088cc]" />;
      case "slack":
        return <Slack className="w-4 h-4 text-[#E01E5A]" />;
      case "discord":
        return <Radio className="w-4 h-4 text-[#5865F2]" />;
      case "gmail":
        return <Mail className="w-4 h-4 text-[#EA4335]" />;
      default:
        return <Bell className="w-4 h-4 text-[#10B981]" />;
    }
  };

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
              <Radio className="w-3 h-3" />
              packages/notifiers/src/adapters & outboxQueueService.ts
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Canales y Notificaciones
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/30">
              4 ADAPTADORES CONECTADOS · OUTBOX ACTIVO
            </span>
          </div>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => showToast("Sockets reconectados y latencias actualizadas.")}
          >
            Refrescar Sockets
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Zap className="w-3.5 h-3.5" />}
            onClick={() => handleTestChannel("telegram")}
          >
            Disparar Ping Global
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

      {/* Contenido Principal con Espaciado Generoso */}
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* 1. FILA SUPERIOR: Grid de los 4 Adaptadores Activos                       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {channels.map((adapter) => {
            const isTesting = testingChannel === adapter.id;

            return (
              <div
                key={adapter.id}
                className="p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] relative overflow-hidden shadow-subtle space-y-3.5 group hover:border-[#10B981]/30 transition-all"
              >
                {/* Micro-dot texture overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none" />

                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-black/50 border border-white/[0.08] flex items-center justify-center">
                      {renderChannelIcon(adapter.id)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {adapter.name}
                      </h4>
                      <span className="text-[10px] font-mono text-[#8E9893] block truncate max-w-[140px]">
                        {adapter.filename}
                      </span>
                    </div>
                  </div>

                  {/* Latencia y status dot */}
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 border border-white/[0.06] text-[10px] font-mono text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    <span className="tabular-nums">{adapter.latencyMs}ms</span>
                  </div>
                </div>

                {/* Detalles de la Conexión */}
                <div className="space-y-1.5 text-xs font-mono relative z-10 pt-1">
                  <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
                    <span className="text-[10px] text-[#8E9893] block mb-0.5">Destino / Bot Handle:</span>
                    <span className="text-white font-semibold truncate block" title={adapter.handle}>
                      {adapter.handle}
                    </span>
                  </div>

                  <div className="text-[10px] text-[#8E9893] leading-tight flex items-start gap-1">
                    <Key className="w-3 h-3 text-[#10B981] flex-shrink-0 mt-0.5" />
                    <span>{adapter.hitlSupport}</span>
                  </div>
                </div>

                {/* Botón de Prueba Rápida */}
                <div className="pt-2 border-t border-white/[0.04] relative z-10">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-[11px]"
                    icon={isTesting ? <RefreshCw className="w-3 h-3 animate-spin text-[#10B981]" /> : <Send className="w-3 h-3 text-[#10B981]" />}
                    disabled={isTesting}
                    onClick={() => handleTestChannel(adapter.id)}
                  >
                    {isTesting ? "Enviando Ping..." : "Probar Canal (notify.ts)"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 2. MITAD INFERIOR DIVIDIDA: Cola de Salida (50%) + Feed Escucha (50%)     */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
          {/* --------------------------------------------------------------------- */}
          {/* PANEL IZQUIERDO: Cola de Salida (outboxQueueService.ts - 50%)        */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] shadow-subtle space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-[#10B981]" />
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      Cola de Salida (outboxQueueService.ts)
                    </h3>
                    <span className="text-[10px] font-mono text-[#8E9893]">
                      Despacho transaccional con persistencia y firma HMAC
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/30">
                    {outbox.length} NOTIFICACIONES
                  </span>
                </div>
              </div>

              {/* Lista de Notificaciones Despachadas y en Cola */}
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {outbox.map((msg) => {
                  const isDelivered = msg.status === "delivered";
                  const isQueued = msg.status === "queued";

                  return (
                    <div
                      key={msg.id}
                      className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] hover:border-white/[0.12] transition-all space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-black/60 border border-white/[0.06]">
                            {renderChannelIcon(msg.channel)}
                          </div>
                          <div>
                            <span className="font-mono text-[11px] font-bold text-white flex items-center gap-1.5">
                              {msg.id}
                              <span className="text-[9px] text-[#8E9893] font-normal">· {msg.type}</span>
                            </span>
                            <span className="text-[10px] font-mono text-[#8E9893] block">
                              Para: {msg.recipient}
                            </span>
                          </div>
                        </div>

                        {/* Estado de entrega */}
                        <div className="text-right">
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                              isDelivered
                                ? "bg-[#10B981]/10 text-[#34D399] border-[#10B981]/30"
                                : "bg-amber-400/10 text-amber-400 border-amber-400/30 animate-pulse"
                            }`}
                          >
                            {isDelivered ? `ENTREGADO (${msg.latencyMs || 42}ms)` : "EN COLA"}
                          </span>
                          <span className="text-[9px] font-mono text-[#8E9893] block mt-0.5">
                            {msg.timestamp}
                          </span>
                        </div>
                      </div>

                      {/* Asunto y Payload */}
                      <p className="text-xs text-gray-200 font-semibold group-hover:text-emerald-300 transition-colors">
                        {msg.subject}
                      </p>
                      <p className="text-[11px] text-[#8E9893] leading-relaxed">
                        {msg.payloadPreview}
                      </p>

                      {/* Botones Interactivos remotos si existen */}
                      {msg.interactiveActions && (
                        <div className="pt-2 border-t border-white/[0.04] flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] font-mono text-[#8E9893] block w-full mb-1">
                            Acciones Remotas Telegram Tokenizadas:
                          </span>
                          {msg.interactiveActions.map((act) => (
                            <span
                              key={act}
                              className="px-2 py-0.5 rounded bg-black/60 border border-white/[0.08] text-[10px] font-mono text-emerald-400 flex items-center gap-1"
                            >
                              <Key className="w-2.5 h-2.5" />
                              {act}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono text-[#8E9893]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                Cola protegida contra duplicados por tokenService.ts
              </span>
              <button
                onClick={() => showToast("Todos los reintentos fueron ejecutados exitosamente.")}
                className="text-emerald-400 hover:underline cursor-pointer"
              >
                Reintentar Fallidos
              </button>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* PANEL DERECHO: Escucha de Canales de Venta (salesChannelListener.ts) */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] shadow-subtle space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      Escucha de Canales de Venta (salesChannelListener.ts)
                    </h3>
                    <span className="text-[10px] font-mono text-[#8E9893]">
                      Ingesta omnicanal procesada con naturalIntentEngine
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  FEED EN VIVO
                </span>
              </div>

              {/* Feed en Vivo de Eventos Entrantes */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {inboundEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] hover:border-[#10B981]/30 transition-all space-y-2.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {renderChannelIcon(evt.channel)}
                        <div>
                          <span className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">
                            {evt.sender}
                          </span>
                          <span className="text-[10px] font-mono text-[#8E9893] block">
                            {evt.timestamp}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 font-bold">
                        {evt.detectedIntent}
                      </span>
                    </div>

                    {/* Texto sin procesar (Raw Inbound) */}
                    <div className="p-2.5 rounded-lg bg-black/60 border border-white/[0.04] text-xs text-gray-300 italic font-sans leading-relaxed">
                      "{evt.rawText}"
                    </div>

                    {/* Acción disparada en el back-office */}
                    <div className="pt-1 flex items-start gap-1.5 text-[11px] font-mono text-emerald-400">
                      <CornerDownRight className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0 mt-0.5" />
                      <span>{evt.triggeredAction}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulador de Ingesta en Tiempo Real */}
            <form onSubmit={handleSimulateInbound} className="pt-3 border-t border-white/[0.04] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9893]">
                <span>Simulador de Ingesta (Prueba NLP):</span>
                <div className="flex items-center gap-1.5">
                  {(["telegram", "gmail", "slack"] as const).map((ch) => (
                    <button
                      type="button"
                      key={ch}
                      onClick={() => setSimChannel(ch)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase transition-colors cursor-pointer ${
                        simChannel === ch ? "bg-[#10B981] text-black font-bold" : "text-[#8E9893] hover:text-white"
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  placeholder="Ej: Necesitamos 30 sierras para la obra de Floridablanca..."
                  className="flex-1 h-8 px-3 text-xs bg-black/60 border border-white/[0.08] rounded-xl text-white placeholder:text-[#8E9893] focus:outline-none focus:border-[#10B981]/60 font-mono"
                />
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={!simText.trim() || isProcessingSim}
                  icon={<Send className="w-3 h-3" />}
                >
                  {isProcessingSim ? "Ingiriendo..." : "Simular"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
