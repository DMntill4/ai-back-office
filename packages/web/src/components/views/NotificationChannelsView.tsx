import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
  Check,
  MessageSquare,
  Mail,
  RotateCcw,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";
import { StatusBadge } from "../ui/StatusBadge";

interface ChannelConfig {
  id: string;
  name: string;
  description: string;
  destination: string;
  status: "conectado" | "degradado" | "desconectado";
  enabled: boolean;
  latencyMs: number;
  eventsCount: number;
  subscribedEvents: string[];
}

const CHANNELS_DATA: ChannelConfig[] = [
  {
    id: "telegram",
    name: "Telegram Bot (Alertas Críticas HITL)",
    description: "Canal prioritario para autorización móvil de órdenes extraordinarias.",
    destination: "@MintSantanderBot · Chat ID: -1004928172",
    status: "conectado",
    enabled: true,
    latencyMs: 42,
    eventsCount: 48,
    subscribedEvents: ["Órdenes de Compra > $5M COP", "Bloqueos Viales OSRM", "Quiebres Inminentes"],
  },
  {
    id: "slack",
    name: "Slack Corporativo (#operaciones-mint)",
    description: "Notificaciones operativas para el equipo de compras y logística.",
    destination: "Workspace Santander · #operaciones-mint",
    status: "conectado",
    enabled: true,
    latencyMs: 65,
    eventsCount: 114,
    subscribedEvents: ["Arribos de Mercancía a Muelle", "Resumen de Margen Diario", "Actualizaciones de Stock"],
  },
  {
    id: "email",
    name: "Correo Electrónico Corporativo",
    description: "Envío formal de remisiones y órdenes de compra firmadas a proveedores.",
    destination: "compras@ferreteriasantander.com (SMTP Seguro)",
    status: "conectado",
    enabled: true,
    latencyMs: 140,
    eventsCount: 36,
    subscribedEvents: ["Envío de Órdenes a Proveedores", "Informes Ejecutivos Semanales"],
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business API",
    description: "Comunicación directa y confirmaciones con conductores en ruta.",
    destination: "+57 (607) 639-0011 (Línea Oficial)",
    status: "conectado",
    enabled: true,
    latencyMs: 85,
    eventsCount: 22,
    subscribedEvents: ["Despachos Asignados", "Alertas de Desvío Vial"],
  },
];

export const NotificationChannelsView: React.FC = () => {
  const [channels, setChannels] = useState<ChannelConfig[]>(CHANNELS_DATA);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleChannel = (id: string) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
    showToast(`Canal ${id} actualizado.`);
  };

  const handleSendTest = (name: string) => {
    showToast(`Mensaje de prueba enviado exitosamente a ${name}. Latencia: 45ms.`);
  };

  const kpis: KpiCardItem[] = [
    {
      title: "Canales Conectados",
      value: "4 / 4 Activos",
      subtitle: "Telegram, Slack, Email, WhatsApp",
      trend: { direction: "up", label: "100% disponibilidad" },
      icon: Bell,
      isHero: true,
      onActionClick: () => showToast("Todos los canales probados exitosamente."),
    },
    {
      title: "Notificaciones Hoy",
      value: "220 Alertas",
      subtitle: "0 fallos de entrega",
      trend: { direction: "up", label: "+14% vs ayer" },
      icon: Send,
    },
    {
      title: "Latencia Promedio",
      value: "68 ms",
      subtitle: "Despacho telemático instantáneo",
      trend: { direction: "up", label: "Óptimo" },
      icon: Zap,
    },
    {
      title: "Integridad de Envío",
      value: "100% Cifrado",
      subtitle: "Firmas HMAC en cada webhook",
      trend: { direction: "up", label: "Seguro" },
      icon: CheckCircle2,
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
            Canales y Notificaciones de Alerta
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Integración de mensajería para alertas HITL, telemetría de conductores y resúmenes ejecutivos
          </p>
        </div>

        <button
          onClick={() => showToast("Enviando ping de verificación a todos los canales...")}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Probar Todos los Canales</span>
        </button>
      </header>

      {/* FILA 1: KPI STRIP DE 4 TARJETAS CON HÉROE */}
      <KpiStrip items={kpis} />

      {/* FILA 2: GRID DE TARJETAS DE 2 NIVELES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {channels.map((ch) => (
          <div
            key={ch.id}
            className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl flex flex-col justify-between transition-all hover:border-emerald-500/30"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    {ch.id === "email" ? (
                      <Mail className="w-4 h-4" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{ch.name}</h3>
                    <span className="text-[10px] text-zinc-500 font-mono">{ch.destination}</span>
                  </div>
                </div>

                {/* Switch Táctil */}
                <div
                  onClick={() => handleToggleChannel(ch.id)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                    ch.enabled ? "bg-emerald-500" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      ch.enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>

              <p className="text-xs text-zinc-300 mt-3 leading-relaxed">
                {ch.description}
              </p>
            </div>

            {/* Sub-caja Well con Eventos y Botón de Prueba */}
            <div className="bg-surface-well rounded-xl p-3.5 mt-4 border border-white/[0.04]">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.04] text-[11px]">
                <span className="text-zinc-400">
                  Latencia: <strong className="text-emerald-400 font-mono">{ch.latencyMs} ms</strong>
                </span>
                <button
                  onClick={() => handleSendTest(ch.name)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>Enviar Alerta de Prueba</span>
                  <Send className="w-3 h-3" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {ch.subscribedEvents.map((evt, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-surface-1 border border-white/[0.06] text-[10px] text-zinc-400"
                  >
                    {evt}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
