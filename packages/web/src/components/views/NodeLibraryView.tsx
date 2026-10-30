import React, { useEffect, useMemo, useState } from "react";
import {
  Database,
  Bot,
  Zap,
  CheckCircle2,
  Bell,
  FileSpreadsheet,
  Plus,
  Shield,
  Truck,
  TrendingUp,
  Sliders,
  RefreshCw,
} from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { api } from "../../services/apiClient";
import type { MintGraphNode } from "../../types/graph";

interface NodeLibraryViewProps {
  onAddNode: (type: string, title: string) => void;
}

interface LibraryItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  type: string;
}

interface LibraryCategory {
  title: string;
  badge: string;
  items: LibraryItem[];
}

/**
 * Catálogo de referencia. Se usa cuando el grafo de conocimiento no reporta
 * nodos (backend caído o vault vacío) para que la biblioteca nunca quede en
 * blanco. Cuando el backend responde, las categorías se derivan de los nodos
 * reales del grafo (`agent`, `tool`, `database`).
 */
const FALLBACK_CATEGORIES: LibraryCategory[] = [
  {
    title: "Fuentes de Datos & Sensores",
    badge: "ENTRADAS",
    items: [
      {
        id: "trig_postgres",
        title: "Sincronización PostgreSQL",
        desc: "Monitoreo continuo de existencias físicas, stock de seguridad y punto de reorden (ROP).",
        icon: Database,
        type: "trigger",
      },
      {
        id: "trig_csv",
        title: "Ingesta de Archivo CSV / Excel",
        desc: "Carga masiva de catálogo de productos o listas de precios de nuevos proveedores.",
        icon: FileSpreadsheet,
        type: "trigger",
      },
      {
        id: "trig_webhook",
        title: "Webhook de Telemetría",
        desc: "Disparador activado por alertas viales, cierres de carretera o arribos a muelle.",
        icon: Zap,
        type: "trigger",
      },
    ],
  },
  {
    title: "Especialistas de Decisión Autónoma",
    badge: "AGENTES",
    items: [
      {
        id: "agent_mint",
        title: "Coordinador General Mint",
        desc: "Orquestador principal que balancea inventario, fletes y presupuestos.",
        icon: Bot,
        type: "agent",
      },
      {
        id: "agent_risk",
        title: "Auditor de Riesgo y Gobernanza",
        desc: "Verifica duplicados en 72h, solvencia de proveedores y límites de compra.",
        icon: Shield,
        type: "agent",
      },
      {
        id: "agent_transport",
        title: "Optimizador Logístico OSRM",
        desc: "Calcula distancias viales, tiempos de tránsito y fletes más económicos.",
        icon: Truck,
        type: "agent",
      },
      {
        id: "agent_demand",
        title: "Pronosticador de Demanda",
        desc: "Proyección de consumo de SKUs y cálculo de días de cobertura.",
        icon: TrendingUp,
        type: "agent",
      },
    ],
  },
  {
    title: "Acciones Operativas & Gatekeepers",
    badge: "ACCIONES",
    items: [
      {
        id: "act_po",
        title: "Generar Orden de Compra",
        desc: "Emisión de orden formal con firma criptográfica HMAC y conciliación de precio.",
        icon: CheckCircle2,
        type: "action",
      },
      {
        id: "act_hitl",
        title: "Retener en Bandeja de Aprobación",
        desc: "Pausa compras superiores a $5.000.000 COP para confirmación humana.",
        icon: Bell,
        type: "action",
      },
      {
        id: "act_stock",
        title: "Rebalanceo de Inventario",
        desc: "Transferencia de mercancía entre Bucaramanga, Bogotá y Medellín.",
        icon: Sliders,
        type: "action",
      },
    ],
  },
];

const ICON_BY_TYPE: Record<string, React.ComponentType<{ className?: string }>> = {
  agent: Bot,
  tool: Zap,
  database: Database,
  warehouse: Truck,
  supplier: Shield,
  sku: TrendingUp,
  purchase_order: CheckCircle2,
  execution: Sliders,
  decision: Bell,
};

const CATEGORY_META: Record<string, { title: string; badge: string }> = {
  agent: { title: "Especialistas de Decisión Autónoma", badge: "AGENTES" },
  tool: { title: "Herramientas & Acciones Operativas", badge: "HERRAMIENTAS" },
  database: { title: "Fuentes de Datos & Sensores", badge: "ENTRADAS" },
};

export const NodeLibraryView: React.FC<NodeLibraryViewProps> = ({ onAddNode }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [graphNodes, setGraphNodes] = useState<MintGraphNode[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.graph.data({ mode: "global" });
      const nodes = (res?.data?.nodes ?? []) as MintGraphNode[];
      setGraphNodes(nodes);
      setIsFallback(Boolean(res?.isFallback));
    } catch (err: any) {
      setError(err?.message ?? "No se pudo cargar la biblioteca de nodos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo<LibraryCategory[]>(() => {
    // Derivar categorías de los nodos reales del grafo (agentes, herramientas, BD).
    const relevant = graphNodes.filter((n) =>
      ["agent", "tool", "database"].includes(n.type),
    );

    if (relevant.length === 0) {
      return FALLBACK_CATEGORIES;
    }

    const grouped = new Map<string, LibraryItem[]>();
    for (const node of relevant) {
      const meta = CATEGORY_META[node.type] ?? {
        title: "Otros Nodos",
        badge: "OTROS",
      };
      const list = grouped.get(meta.title) ?? [];
      list.push({
        id: node.id,
        title: node.label,
        desc: node.sublabel || "Nodo registrado en el grafo de conocimiento.",
        icon: ICON_BY_TYPE[node.type] ?? Bot,
        type: node.type,
      });
      grouped.set(meta.title, list);
    }

    return Array.from(grouped.entries()).map(([title, items]) => ({
      title,
      badge:
        Object.values(CATEGORY_META).find((m) => m.title === title)?.badge ??
        "OTROS",
      items,
    }));
  }, [graphNodes]);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-primary font-sans flex flex-col p-group space-y-group">
      {/* Header */}
      <header className="pb-base border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-base">
        <div>
          <h1 className="text-page-title font-bold text-primary tracking-tight">
            Biblioteca de Nodos Operacionales
          </h1>
          <p className="text-body text-secondary mt-hairline">
            Selecciona o añade módulos al lienzo de trabajo para enriquecer el comportamiento autónomo
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-compact py-hairline rounded-control bg-raised border border-border text-secondary hover:text-primary text-caption font-medium flex items-center gap-hairline transition-colors disabled:opacity-50 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Actualizar</span>
        </button>
      </header>

      {isFallback && (
        <div className="rounded-control border border-state-attention/40 bg-state-attention-surface px-compact py-hairline text-caption text-state-attention">
          Backend no disponible: mostrando catálogo de referencia local.
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-group">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="p-group rounded-container bg-panel border border-border animate-pulse h-40"
            />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="No se pudo cargar la biblioteca"
          description={error}
          actionLabel="Reintentar"
          onAction={load}
        />
      ) : categories.length === 0 ? (
        <EmptyState
          title="Sin nodos disponibles"
          description="El grafo de conocimiento no reporta agentes, herramientas ni fuentes de datos registradas."
          actionLabel="Reintentar"
          onAction={load}
        />
      ) : (
        <div className="space-y-group">
          {categories.map((cat) => (
            <div key={cat.title} className="space-y-element">
              <div className="flex items-center gap-compact">
                <span className="text-caption font-mono font-bold text-brand px-compact py-hairline rounded bg-brand/10 border border-brand/20">
                  {cat.badge}
                </span>
                <span className="text-muted text-caption">•</span>
                <h3 className="text-label font-bold text-primary">{cat.title}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-group">
                {cat.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onAddNode(item.type, item.title)}
                      className="p-group rounded-container bg-panel border border-border hover:border-brand/40 transition-all group flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-element">
                          <div className="p-2.5 rounded-control bg-raised border border-border text-brand group-hover:scale-110 transition-transform">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="p-1 rounded-control text-secondary group-hover:text-primary group-hover:bg-raised transition-colors">
                            <Plus className="w-4 h-4" />
                          </span>
                        </div>

                        <h4 className="text-label font-bold text-primary group-hover:text-brand transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-body text-secondary mt-hairline leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      <div className="bg-raised rounded-control p-2.5 mt-base border border-border flex items-center justify-between text-caption font-mono text-muted">
                        <span>Click para añadir</span>
                        <span className="text-brand font-semibold">+ Agregar</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
