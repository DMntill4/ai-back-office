import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Layers,
  Database,
  CheckCircle2,
  Lock,
  Plus,
  Play,
  RefreshCw,
  Radio,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";
import { EmptyState } from "../ui/EmptyState";
import { api } from "../../services/apiClient";

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

const CHANNEL_LABELS: Record<string, { label: string; description: string; auth: string }> = {
  slack: {
    label: "Canal Slack",
    description: "Notificaciones de aprobaciones, quiebres de stock y alertas críticas al espacio de trabajo del equipo.",
    auth: "Webhook firmado",
  },
  telegram: {
    label: "Canal Telegram",
    description: "Aprobaciones remotas con token firmado y alertas operativas al chat del equipo.",
    auth: "Bot Token + Chat ID",
  },
  discord: {
    label: "Canal Discord",
    description: "Difusión de eventos operativos y resúmenes de telemetría al servidor del equipo.",
    auth: "Webhook firmado",
  },
  email: {
    label: "Canal Correo",
    description: "Resúmenes ejecutivos y solicitudes de aprobación por correo electrónico.",
    auth: "SMTP autenticado",
  },
};

function mapChannel(c: any): IntegrationItem {
  const type = String(c?.type ?? "slack").toLowerCase();
  const meta = CHANNEL_LABELS[type] ?? {
    label: `Canal ${type}`,
    description: "Canal de notificación configurado para esta empresa.",
    auth: "Credencial corporativa",
  };
  const topics = Array.isArray(c?.config?.topics) ? c.config.topics : [];
  return {
    id: String(c?.id ?? crypto.randomUUID()),
    name: String(c?.name ?? meta.label),
    categoryLabel: meta.label,
    status: c?.enabled === false ? "warning" : "ok",
    latencyMs: 0,
    description: meta.description,
    lastSync: c?.createdAt
      ? `Alta: ${new Date(c.createdAt).toLocaleDateString("es-CO")}`
      : "Sin registro",
    endpoint: topics.length > 0 ? `Temas: ${topics.join(", ")}` : "Todos los temas",
    authMethod: meta.auth,
    enabled: c?.enabled !== false,
  };
}

export const IntegrationsView: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.channels.list();
      const rows = Array.isArray(res.data) ? res.data : [];
      setIntegrations(rows.map(mapChannel));
      setIsFallback(Boolean(res.isFallback));
      if (!res.success) setError(res.message ?? "No fue posible leer los canales.");
    } catch (err: any) {
      setError(err?.message ?? "Error de red al consultar los canales.");
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggle = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)),
    );
    showToast("Preferencia de canal actualizada.");
  };

  const handleTestConnection = async (item: IntegrationItem) => {
    try {
      await api.channels.test({ type: item.categoryLabel, topic: "logs" });
      showToast(`Conexión con "${item.name}" verificada.`);
    } catch {
      showToast(`No fue posible verificar "${item.name}".`);
    }
  };

  const kpis: KpiCardItem[] = useMemo(() => {
    const active = integrations.filter((i) => i.enabled).length;
    return [
      {
        title: "Canales Configurados",
        value: `${active} / ${integrations.length} Activos`,
        subtitle: "Slack, Telegram, Discord, Correo",
        trend: { direction: "up", label: `${active} en operación` },
        icon: Layers,
        isHero: true,
        onActionClick: () => showToast("Verificando todos los canales..."),
      },
      {
        title: "Cobertura de Alertas",
        value: integrations.length > 0 ? "100%" : "0%",
        subtitle: "Eventos críticos con destino asignado",
        trend: { direction: "up", label: integrations.length > 0 ? "Completa" : "Sin canales" },
        icon: Radio,
      },
      {
        title: "Aprobaciones Remotas",
        value: integrations.some((i) => i.categoryLabel.includes("Telegram")) ? "Habilitadas" : "No configuradas",
        subtitle: "Firma por token desde el chat",
        trend: { direction: "up", label: "Gobernanza activa" },
        icon: CheckCircle2,
      },
      {
        title: "Integridad de Entrega",
        value: "Firmas validadas",
        subtitle: "Webhooks y tokens verificados",
        trend: { direction: "up", label: "Cero pérdidas" },
        icon: Lock,
      },
    ];
  }, [integrations]);

  return (
    <div className="flex flex-col gap-group">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-compact py-compact rounded-pill flex items-center gap-compact bg-state-ok-surface border border-brand/40 text-state-ok"
          >
            <div className="w-2 h-2 rounded-full bg-state-ok animate-pulse" />
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact">
        <div className="flex items-center gap-compact text-caption font-mono text-muted">
          <span className="px-compact py-hairline rounded-control bg-raised border border-border text-secondary">
            {integrations.filter((i) => i.enabled).length} de {integrations.length} canales activos
          </span>
          <span className="hidden sm:inline">Sincronización continua de eventos</span>
        </div>

        <div className="flex items-center gap-compact">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="h-9 px-compact rounded-control bg-raised border border-border hover:border-border-strong text-secondary hover:text-primary text-caption font-medium flex items-center gap-hairline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={() => showToast("Abriendo catálogo de canales de notificación...")}
            className="h-9 px-compact rounded-control bg-brand hover:bg-brand/90 text-canvas font-semibold text-caption flex items-center gap-hairline transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Canal</span>
          </button>
        </div>
      </div>

      {isFallback && (
        <div className="px-compact py-compact rounded-control bg-state-attention-surface border border-border text-caption text-state-attention">
          Mostrando datos de respaldo: el backend no respondió con los canales reales.
        </div>
      )}

      {error && (
        <div className="px-compact py-compact rounded-control bg-state-error-surface border border-border text-caption text-state-error">
          {error}
        </div>
      )}

      <KpiStrip items={kpis} />

      {loading && integrations.length === 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-group" aria-busy="true" aria-label="Cargando canales">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-container bg-raised animate-pulse" />
          ))}
        </div>
      ) : integrations.length === 0 ? (
        <EmptyState
          title="Sin canales de notificación"
          description="El backend no devolvió canales configurados. Agrega un canal de Slack, Telegram, Discord o correo para recibir aprobaciones y alertas."
          actionLabel="Actualizar"
          onAction={() => void load()}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-group">
          {integrations.map((item) => {
            const statusTone =
              item.status === "ok"
                ? { dot: "bg-state-ok", text: "text-state-ok", label: "Operativo" }
                : item.status === "syncing"
                  ? { dot: "bg-state-pending", text: "text-state-pending", label: "Sincronizando" }
                  : { dot: "bg-state-attention", text: "text-state-attention", label: "Degradado" };

            return (
              <div
                key={item.id}
                className={`bg-panel rounded-container p-base border flex flex-col justify-between transition-colors ${item.enabled
                  ? "border-border hover:border-border-strong"
                  : "border-border opacity-70"
                  }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-compact pb-compact border-b border-border">
                    <div className="flex items-center gap-element min-w-0">
                      <div
                        className={`w-9 h-9 rounded-control flex items-center justify-center shrink-0 ${item.enabled
                          ? "bg-brand-surface text-brand"
                          : "bg-raised text-muted"
                          }`}
                      >
                        <Database className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-label font-bold text-primary truncate">{item.name}</h3>
                        <span className="text-caption text-muted font-mono truncate block">
                          {item.categoryLabel}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.enabled}
                      aria-label={`Activar ${item.name}`}
                      onClick={() => handleToggle(item.id)}
                      className={`relative w-11 h-6 rounded-pill shrink-0 transition-colors duration-200 border ${item.enabled
                        ? "bg-brand border-brand"
                        : "bg-raised border-border"
                        }`}
                    >
                      <span
                        className={`absolute top-0.5 rounded-pill transition-all duration-200 ${item.enabled ? "left-[22px] bg-canvas" : "left-0.5 bg-muted"
                          }`}
                        style={{ width: 18, height: 18 }}
                      />
                    </button>
                  </div>

                  <p className="text-caption text-secondary mt-compact leading-relaxed">{item.description}</p>
                </div>

                <div className="bg-raised rounded-control p-compact mt-base border border-border space-y-compact">
                  <div className="flex items-center justify-between text-caption">
                    <span className="flex items-center gap-hairline font-mono">
                      <span className={`w-1.5 h-1.5 rounded-full ${statusTone.dot}`} />
                      <span className={statusTone.text}>{statusTone.label}</span>
                    </span>
                    <button
                      onClick={() => void handleTestConnection(item)}
                      className="text-caption text-brand hover:text-brand/80 font-medium flex items-center gap-hairline cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>Probar Conexión</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-compact">
                    <div className="bg-panel rounded-control px-compact py-compact border border-border">
                      <span className="text-caption font-mono text-muted block">Estado</span>
                      <span className="text-caption font-mono font-bold text-brand tabular-nums">
                        {item.enabled ? "Activo" : "Pausado"}
                      </span>
                    </div>
                    <div className="bg-panel rounded-control px-compact py-compact border border-border">
                      <span className="text-caption font-mono text-muted block">Última Sincronización</span>
                      <span className="text-caption font-medium text-secondary">{item.lastSync}</span>
                    </div>
                  </div>

                  <div className="pt-compact border-t border-border space-y-hairline">
                    <div className="text-caption font-mono text-secondary truncate">
                      <span className="text-muted">Destino:</span> {item.endpoint}
                    </div>
                    <div className="text-caption font-mono text-secondary truncate">
                      <span className="text-muted">Autenticación:</span> {item.authMethod}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
