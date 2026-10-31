import React, { useState, useEffect, useMemo } from "react";
import {
  Cpu,
  Check,
  Zap,
  Layers,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";
import { EmptyState } from "../ui/EmptyState";
import { api } from "../../services/apiClient";

interface ModelDescriptor {
  id: string;
  name: string;
  badge: string;
  context: string;
  latency: string;
  costPer1k: string;
  desc: string;
}

function buildDescriptor(id: string): ModelDescriptor {
  return {
    id,
    name: id,
    badge: "ACTIVO EN SERVIDOR",
    context: "—",
    latency: "—",
    costPer1k: "—",
    desc: "Modelo configurado en el servidor para solicitudes del agente. Los detalles de capacidad y costo no se inventan si el proveedor no los reporta.",
  };
}

export const ModelsView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [modelIds, setModelIds] = useState<string[]>([]);
  const [costs, setCosts] = useState<{
    totalTokens: number;
    totalCostUsd: number;
    taskCount: number;
  }>({ totalTokens: 0, totalCostUsd: 0, taskCount: 0 });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [configRes, costsRes] = await Promise.all([
        api.config.get(),
        api.telemetry.costs(),
      ]);

      // Extraer modelos configurados de la respuesta de /api/config.
      const cfg: any = configRes?.data ?? {};
      const configuredModel = cfg?.llm?.model;
      const ids = typeof configuredModel === "string" && configuredModel.length > 0
        ? [configuredModel]
        : [];

      setModelIds(ids);
      setIsFallback(Boolean(configRes?.isFallback || costsRes?.isFallback));

      const session = (costsRes?.data as any)?.session;
      if (session) {
        setCosts({
          totalTokens: Number(session.totalTokens) || 0,
          totalCostUsd: Number(session.totalCostUsd) || 0,
          taskCount: Number(session.taskCount) || 0,
        });
      }

    } catch (err: any) {
      setError(err?.message ?? "No se pudo cargar la configuración de modelos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const models = useMemo<ModelDescriptor[]>(
    () => modelIds.map(buildDescriptor),
    [modelIds],
  );

  const kpis: KpiCardItem[] = useMemo(() => {
    const primary = models[0];
    return [
      {
        title: "Modelo Primario Activo",
        value: primary ? primary.name : "Sin configurar",
        subtitle: primary
          ? "Inferencia continua para MINT"
          : "Configura un modelo en Ajustes",
        trend: { direction: "neutral", label: primary ? "Configurado en servidor" : "Pendiente" },
        icon: Cpu,
        isHero: true,
      },
      {
        title: "Tokens Procesados (Sesión)",
        value: `${(costs.totalTokens / 1000).toFixed(1)}k Tokens`,
        subtitle: `Costo acumulado: $${costs.totalCostUsd.toFixed(2)} USD`,
        trend: { direction: "up", label: `${costs.taskCount} tareas` },
        icon: Layers,
      },
      {
        title: "Latencia Promedio",
        value: primary?.latency ?? "—",
        subtitle: "Respuesta en tiempo real",
        trend: { direction: "up", label: "Óptimo" },
        icon: Zap,
      },
      {
        title: "Modelos Configurados",
        value: String(models.length),
        subtitle: "Motores de inferencia disponibles",
        trend: { direction: "neutral", label: "Activos" },
        icon: CheckCircle2,
      },
    ];
  }, [models, costs]);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-primary font-sans flex flex-col p-group space-y-group">
      {/* HEADER SUPERIOR */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-base">
        <div>
          <h1 className="text-page-title font-bold text-primary tracking-tight">
            Motores de Inferencia & Modelos IA
          </h1>
          <p className="text-body text-secondary mt-hairline">
            Configuración del modelo neuronal que impulsa la toma de decisiones autónomas en MINT
          </p>
        </div>

        <div className="flex items-center gap-compact">
          <button
            onClick={load}
            disabled={loading}
            className="px-compact py-hairline rounded-control bg-raised border border-border text-secondary hover:text-primary text-caption font-medium flex items-center gap-hairline transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </header>

      {isFallback && (
        <div className="rounded-control border border-state-attention/40 bg-state-attention-surface px-compact py-hairline text-caption text-state-attention">
          Backend no disponible: mostrando configuración local de referencia.
        </div>
      )}

      {/* FILA 1: KPI STRIP CON HÉROE */}
      <KpiStrip items={kpis} />

      {/* FILA 2: GRID DE MODELOS */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-group">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="bg-panel rounded-container p-group border border-border animate-pulse h-48"
            />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="No se pudieron cargar los modelos"
          description={error}
          actionLabel="Reintentar"
          onAction={load}
        />
      ) : models.length === 0 ? (
        <EmptyState
          title="Sin modelos configurados"
          description="El backend no reporta modelos de inferencia activos. Configura un modelo en Ajustes para habilitar la toma de decisiones autónoma."
          actionLabel="Reintentar"
          onAction={load}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-group">
          {models.map((m) => {
            const isSelected = true;
            return (
              <div
                key={m.id}
                className={`bg-panel rounded-container p-group border transition-all flex flex-col justify-between ${isSelected
                    ? "border-brand ring-1 ring-brand/40"
                    : "border-border hover:border-border-strong"
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-element border-b border-border">
                    <div className="flex items-center gap-compact">
                      <div
                        className={`w-9 h-9 rounded-control flex items-center justify-center ${isSelected
                            ? "bg-brand/20 text-brand"
                            : "bg-raised text-secondary"
                          }`}
                      >
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-label font-bold text-primary">{m.name}</h3>
                        <span className="text-caption font-mono px-1.5 py-0.5 rounded bg-brand/15 text-brand font-bold border border-brand/30">
                          {m.badge}
                        </span>
                      </div>
                    </div>

                    {/* Radio indicador */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                          ? "border-brand bg-brand text-canvas"
                          : "border-border-strong bg-raised"
                        }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-body text-secondary mt-element leading-relaxed">
                    {m.desc}
                  </p>
                </div>

                {/* Sub-caja Well */}
                <div className="bg-raised rounded-control p-element mt-base border border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-compact text-center text-caption font-mono">
                    <div>
                      <span className="text-caption text-muted block">Contexto</span>
                      <span className="text-primary font-bold">{m.context}</span>
                    </div>
                    <div>
                      <span className="text-caption text-muted block">Latencia</span>
                      <span className="text-state-ok font-bold">{m.latency}</span>
                    </div>
                    <div>
                      <span className="text-caption text-muted block">Costo / 1k</span>
                      <span className="text-primary font-bold">{m.costPer1k}</span>
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
