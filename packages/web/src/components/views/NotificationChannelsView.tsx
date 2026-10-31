import React, { useCallback, useEffect, useState } from "react";
import { BellRing, CheckCircle2, Database, Play, RefreshCw, ShieldAlert } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { api } from "../../services/apiClient";

interface NotificationChannel {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  source: "environment" | "database";
  available: boolean;
  createdAt: string | null;
  topics: string[];
}

export const NotificationChannelsView: React.FC = () => {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.channels.list();
      if (!response.success || response.isFallback) {
        setChannels([]);
        setError(response.message ?? "No fue posible consultar los canales en el backend.");
        return;
      }
      setChannels(Array.isArray(response.data) ? response.data : []);
    } catch (cause) {
      setChannels([]);
      setError(cause instanceof Error ? cause.message : "Error al consultar los canales.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (channel: NotificationChannel) => {
    setError(null);
    try {
      await api.channels.update(channel.id, !channel.isActive);
      setMessage(`Se actualizó el estado de ${channel.name}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el canal.");
    }
  };

  const test = async (channel: NotificationChannel) => {
    setError(null);
    setMessage(null);
    try {
      const response = await api.channels.test(channel.id);
      if (response?.result?.success === false) {
        throw new Error(response.result.error ?? "El proveedor no aceptó el mensaje de prueba.");
      }
      setMessage(`El backend confirmó el envío de prueba para ${channel.name}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible probar el canal.");
    }
  };

  return (
    <section className="flex flex-col gap-group">
      <div className="flex flex-wrap items-center justify-between gap-compact">
        <p className="text-caption text-secondary">
          Canales de notificación disponibles para la empresa activa, consultados al backend.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="h-9 px-compact rounded-control bg-raised border border-border text-secondary hover:text-primary text-caption flex items-center gap-hairline disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-control border border-state-error/30 bg-state-error-surface px-compact py-compact text-caption text-state-error">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="rounded-control border border-state-ok/30 bg-state-ok-surface px-compact py-compact text-caption text-state-ok">
          {message}
        </div>
      )}

      {loading && channels.length === 0 ? (
        <div className="grid gap-group md:grid-cols-2" aria-busy="true">
          {[0, 1].map((item) => <div key={item} className="h-40 rounded-container bg-raised animate-pulse" />)}
        </div>
      ) : channels.length === 0 ? (
        <EmptyState
          title="No hay canales de alerta disponibles"
          description="Cuando el backend detecte canales configurados en el entorno o en la base de datos, aparecerán aquí."
          actionLabel="Volver a consultar"
          onAction={() => void load()}
        />
      ) : (
        <div className="grid gap-group md:grid-cols-2">
          {channels.map((channel) => (
            <article key={channel.id} className="rounded-container border border-border bg-panel p-base">
              <header className="flex items-start justify-between gap-compact">
                <div className="flex min-w-0 items-center gap-compact">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-surface text-brand">
                    <BellRing className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-label font-semibold text-primary">{channel.name}</h2>
                    <p className="text-caption font-mono text-muted">{channel.type}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-hairline text-caption ${channel.available ? "text-state-ok" : "text-state-attention"}`}>
                  {channel.available ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                  {channel.available ? "Credenciales disponibles" : "Faltan credenciales"}
                </span>
              </header>

              <div className="mt-compact flex items-center gap-hairline text-caption text-secondary">
                <Database className="h-3.5 w-3.5 text-muted" />
                <span>{channel.source === "environment" ? "Gestionado por entorno" : "Guardado en base de datos"}</span>
              </div>
              <p className="mt-hairline text-caption text-muted">
                {channel.topics.length ? `Temas: ${channel.topics.join(", ")}` : "Suscrito a los temas configurados por el servidor."}
              </p>

              <footer className="mt-base flex flex-wrap items-center justify-between gap-compact border-t border-border pt-compact">
                <span className={`text-caption font-medium ${channel.isActive && channel.available ? "text-state-ok" : "text-muted"}`}>
                  {channel.isActive && channel.available ? "Activo" : channel.isActive ? "No disponible" : "Pausado"}
                  {channel.createdAt ? ` · Alta ${new Date(channel.createdAt).toLocaleDateString("es-CO")}` : ""}
                </span>
                <div className="flex items-center gap-compact">
                  {channel.source === "database" && channel.available && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={channel.isActive}
                      onClick={() => void toggle(channel)}
                      className="rounded-control border border-border px-compact py-hairline text-caption text-secondary hover:text-primary"
                    >
                      {channel.isActive ? "Pausar" : "Activar"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!channel.isActive || !channel.available}
                    onClick={() => void test(channel)}
                    className="inline-flex items-center gap-hairline rounded-control border border-border px-compact py-hairline text-caption text-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Play className="h-3 w-3" />
                    Enviar prueba
                  </button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
