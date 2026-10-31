import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Database, RefreshCw, Sparkles } from "lucide-react";
import { request } from "../../services/apiClient";

type ConnectorState = "connected" | "configured" | "unavailable" | "unknown";

interface ConnectorStatus {
  state: ConnectorState;
  detail: string;
}

interface IntegrationStatus {
  database: ConnectorStatus;
  llm: ConnectorStatus;
}

const initialStatus: IntegrationStatus = {
  database: { state: "unknown", detail: "Consultando estado de PostgreSQL…" },
  llm: { state: "unknown", detail: "Consultando configuración del servidor…" },
};

function statusLabel(state: ConnectorState): string {
  switch (state) {
    case "connected": return "Conectado";
    case "configured": return "Configurado";
    case "unavailable": return "No disponible";
    default: return "Sin verificar";
  }
}

export const IntegrationsView: React.FC = () => {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [databaseResult, configResult] = await Promise.allSettled([
      request<{ success: boolean; data?: { connected?: boolean; provider?: string; error?: string } }>("/db/status"),
      apiConfig(),
    ]);

    setStatus({
      database: databaseResult.status === "fulfilled"
        ? {
          state: databaseResult.value.success && databaseResult.value.data?.connected ? "connected" : "unavailable",
          detail: databaseResult.value.data?.connected
            ? `${databaseResult.value.data.provider ?? "PostgreSQL"} · conexión verificada por el backend`
            : databaseResult.value.data?.error ?? "El backend reporta que PostgreSQL no está conectado.",
        }
        : { state: "unavailable", detail: "No fue posible consultar el estado de PostgreSQL." },
      llm: configResult.status === "fulfilled"
        ? configResult.value
        : { state: "unavailable", detail: "No fue posible consultar la configuración del proveedor de IA." },
    });

    if (databaseResult.status === "rejected" && configResult.status === "rejected") {
      setError("No se pudieron consultar los servicios. Verifica que la API esté disponible.");
    }
    setRefreshedAt(new Date().toLocaleTimeString("es-CO"));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="flex flex-col gap-group">
      <header className="flex flex-wrap items-center justify-between gap-compact">
        <p className="max-w-3xl text-caption text-secondary">
          Estado de los servicios que conectan Mint con sus datos y motor de IA. La información se consulta al backend; no se muestran conectores de demostración.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="h-9 px-compact rounded-control bg-raised border border-border text-secondary hover:text-primary text-caption flex items-center gap-hairline disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar estado
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-center gap-compact rounded-control border border-state-attention/30 bg-state-attention-surface px-compact py-compact text-caption text-state-attention">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-group lg:grid-cols-2" aria-busy={loading}>
        <ConnectorCard
          icon={<Database className="h-4 w-4" />}
          title="Base de datos"
          subtitle="PostgreSQL"
          connector={status.database}
        />
        <ConnectorCard
          icon={<Sparkles className="h-4 w-4" />}
          title="Motor de IA"
          subtitle="Proveedor configurado en el servidor"
          connector={status.llm}
        />
      </div>

      <div className="rounded-container border border-border bg-raised p-base">
        <h2 className="text-label font-semibold text-primary">Canales de alerta</h2>
        <p className="mt-hairline text-caption text-secondary">
          La configuración y las pruebas de Telegram y otros canales están en su sección dedicada.
        </p>
        <a
          href="#canales_notificaciones"
          className="mt-compact inline-flex rounded-control border border-border bg-panel px-compact py-hairline text-caption font-medium text-brand hover:text-primary"
        >
          Administrar canales de alerta
        </a>
      </div>

      <p className="text-caption text-muted">
        {refreshedAt ? `Última consulta al backend: ${refreshedAt}` : "Aún no se ha consultado el backend."}
      </p>
    </section>
  );
};

async function apiConfig(): Promise<ConnectorStatus> {
  const response = await request<{
    success: boolean;
    data?: { llm?: { provider?: string; model?: string } };
  }>("/config");
  const provider = response.data?.llm?.provider;
  const model = response.data?.llm?.model;
  if (!response.success || !provider || !model) {
    return { state: "unavailable", detail: "El backend no devolvió un proveedor y modelo configurados." };
  }
  return {
    state: "configured",
    detail: `${provider} · ${model}. Configuración del servidor confirmada; no se ejecuta una llamada de prueba facturable.`,
  };
}

const ConnectorCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  connector: ConnectorStatus;
}> = ({ icon, title, subtitle, connector }) => {
  const ready = connector.state === "connected" || connector.state === "configured";
  return (
    <article className="rounded-container border border-border bg-panel p-base">
      <header className="flex items-start justify-between gap-compact">
        <div className="flex items-center gap-compact">
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-brand-surface text-brand">
            {icon}
          </span>
          <div>
            <h2 className="text-label font-semibold text-primary">{title}</h2>
            <p className="text-caption text-muted">{subtitle}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-hairline text-caption ${ready ? "text-state-ok" : connector.state === "unavailable" ? "text-state-error" : "text-muted"}`}>
          {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {statusLabel(connector.state)}
        </span>
      </header>
      <p className="mt-base border-t border-border pt-compact text-caption text-secondary">
        {connector.detail}
      </p>
    </article>
  );
};
