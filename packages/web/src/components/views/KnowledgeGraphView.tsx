import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Target,
  Building2,
  Package,
  Truck,
  FileCheck2,
  Sparkles,
  ArrowRight,
  X,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { KnowledgeGraphCanvas } from "../graph/KnowledgeGraphCanvas";
import { PageHeader } from "../ui/PageHeader";
import { SegmentedTabs, TabItem } from "../ui/SegmentedTabs";
import { StatusIndicator, OperationalStatus } from "../ui/StatusIndicator";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { EmptyState } from "../ui/EmptyState";
import {
  MintGraphNode,
  MintGraphEdge,
  GraphPhysicsSettings,
} from "../../types/graph";
import { useLiveGraph } from "../../hooks/useLiveGraph";

interface KnowledgeGraphViewProps {
  onNavigateTo?: (tabId: string) => void;
}

// Diccionario de etiquetas legibles de negocio (cero camelCase o jerga de base de datos)
const BUSINESS_FIELD_LABELS: Record<string, string> = {
  rolOperativo: "FunciÃ³n principal",
  limiteAutonomo: "LÃ­mite de compra autÃ³noma",
  sedesMonitoreadas: "Sedes supervisadas",
  frecuenciaRevision: "Frecuencia de revisiÃ³n",
  ciudad: "Ciudad / UbicaciÃ³n",
  direccion: "DirecciÃ³n física",
  capacidadTotal: "Capacidad instalada",
  ocupacionActual: "OcupaciÃ³n actual",
  referenciasBajoMinimo: "Referencias bajo mÃ­nimo",
  tiempoTraslado: "Tiempo de traslado a matriz",
  existenciaActual: "Existencias actuales",
  puntoReorden: "Punto de reorden",
  minimoSeguridad: "MÃ­nimo de seguridad",
  costoUnitario: "Costo unitario",
  categoria: "CategorÃ­a de producto",
  coberturaEstimada: "Cobertura proyectada",
  tiempoEntrega: "Tiempo de entrega",
  cumplimientoHistorico: "Cumplimiento histÃ³rico",
  descuentoVolumen: "Descuento por volumen",
  montoTotal: "Monto total de la orden",
  cantidadSolicitada: "Cantidad solicitada",
  proveedorAsignado: "Proveedor asignado",
  motivoRetencion: "Motivo de revisiÃ³n",
  reglaAplicada: "PolÃ­tica de negocio",
  responsableFirma: "Responsable de Aprobación",
};

const CATEGORY_LABELS: Record<string, string> = {
  agent: "Agente autónomo",
  warehouse: "Bodega física",
  sku: "Producto en catálogo",
  supplier: "Proveedor homologado",
  purchase_order: "Orden de compra",
  decision: "Aprobación ejecutiva",
};


export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  onNavigateTo,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  // Grafo en vivo desde PostgreSQL (/api/graph/data). Sin datos semilla locales.
  const { graphData: liveGraph, loading: graphLoading, isFallback: graphIsFallback } =
    useLiveGraph({ mode: activeFilter, searchQuery });

  const [graphNodes, setGraphNodes] = useState<MintGraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<MintGraphEdge[]>([]);

  // Sincroniza el grafo real con el estado local de la vista.
  useEffect(() => {
    if (liveGraph) {
      setGraphNodes(liveGraph.nodes ?? []);
      setGraphEdges(liveGraph.edges ?? []);
    }
  }, [liveGraph]);

  // Si el nodo seleccionado desaparece del grafo vivo, reencuadra al primer nodo disponible.
  useEffect(() => {
    if (graphNodes.length === 0) return;
    if (!graphNodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(graphNodes[0].id);
    }
  }, [graphNodes, selectedNodeId]);

  const physicsSettings: GraphPhysicsSettings = {
    repulsion: 3200,
    springLength: 215,
    gravity: 0.005,
    damping: 0.82,
    showGrid: true,
    showAllLabels: true,
  };

  // SubpestaÃ±as del destino Agente segÃºn Mint-DESIGN.md
  const agentSubTabs: TabItem[] = [
    { id: "flujo_agente", label: "Flujo del agente" },
    { id: "mapa_conocimiento", label: "Mapa de conocimiento" },
    { id: "memoria_agente", label: "Memoria del agente" },
    { id: "auditoria_eventos", label: "Historial de decisiones" },
    { id: "reglas_politicas", label: "Reglas y polÃ­ticas" },
  ];

  // Un solo control de filtros por categorÃ­a
  const filterTabs: TabItem[] = [
    { id: "all", label: "Todos", badge: graphNodes.length },
    { id: "warehouse", label: "Bodegas" },
    { id: "sku", label: "Productos" },
    { id: "supplier", label: "Proveedores" },
    { id: "purchase_order", label: "Compras y firmas" },
  ];

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let nodes = graphNodes;

    if (activeFilter !== "all") {
      if (activeFilter === "purchase_order") {
        nodes = nodes.filter(
          (n) =>
            n.type === "purchase_order" ||
            n.type === "decision" ||
            n.type === "agent"
        );
      } else {
        nodes = nodes.filter(
          (n) => n.type === activeFilter || n.type === "agent"
        );
      }
    }

    if (query) {
      nodes = nodes.filter(
        (n) =>
          n.label.toLowerCase().includes(query) ||
          (n.sublabel && n.sublabel.toLowerCase().includes(query)) ||
          n.id.toLowerCase().includes(query)
      );
    }

    const visibleIds = new Set(nodes.map((n) => n.id));
    const edges = graphEdges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
    );

    return { nodes, edges };
  }, [searchQuery, activeFilter, graphNodes, graphEdges]);

  const selectedNode =
    graphNodes.find((n) => n.id === selectedNodeId) || graphNodes[0];

  const connectedEdges = useMemo(() => {
    if (!selectedNode) return { incoming: [], outgoing: [] };
    const incoming = graphEdges.filter((e) => e.target === selectedNode.id);
    const outgoing = graphEdges.filter((e) => e.source === selectedNode.id);
    return { incoming, outgoing };
  }, [selectedNode, graphEdges]);

  const handleCenterNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setFocusNodeId(nodeId);
  };

  const getNodeStatusMeta = (
    node: MintGraphNode
  ): { status: OperationalStatus; label: string } => {
    if (node.type === "decision" || node.id === "po_24a190") {
      return { status: "pending", label: "Requiere firma" };
    }
    if (node.status === "warning") {
      return { status: "attention", label: "Bajo punto de reorden" };
    }
    return { status: "ok", label: "Operativo" };
  };

  const renderNodeIcon = (type: string) => {
    switch (type) {
      case "agent":
        return <Sparkles className="w-4 h-4 text-brand" />;
      case "warehouse":
        return <Building2 className="w-4 h-4 text-state-ok" />;
      case "sku":
        return <Package className="w-4 h-4 text-state-attention" />;
      case "supplier":
        return <Truck className="w-4 h-4 text-secondary" />;
      default:
        return <FileCheck2 className="w-4 h-4 text-state-pending" />;
    }
  };

  const findNodeLabel = (id: string) => {
    return graphNodes.find((n) => n.id === id)?.label || id;
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-canvas text-primary font-sans overflow-hidden">
      {/* 1. Cabecera con SubpestaÃ±as del Destino Agente */}
      <div className="p-group pb-0">
        <PageHeader
          title="Mapa de conocimiento"
          description="Relaciones operativas en vivo entre tus bodegas, productos, proveedores y decisiones del agente."
          filterControl={
            <SegmentedTabs
              tabs={agentSubTabs}
              activeTab="mapa_conocimiento"
              onChange={(tabId) => onNavigateTo && onNavigateTo(tabId)}
            />
          }
          actions={
            <div className="flex items-center gap-compact">
              <Button
                variant="secondary"
                size="md"
                icon={<Target className="w-3.5 h-3.5 text-brand" />}
                onClick={() => handleCenterNode("agent_coordinator")}
              >
                Centrar en el agente
              </Button>
            </div>
          }
        />
      </div>

      {/* 2. Un Solo Control de Filtros Unificado (Cero SuperposiciÃ³n) */}
      <div className="px-group pt-compact">
        <div className="p-compact rounded-container bg-panel border border-border flex flex-col md:flex-row md:items-center justify-between gap-compact">
          {/* Buscador a la izquierda */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto, bodega o proveedor..."
              className="w-full h-9 pl-8 pr-8 rounded-control bg-raised border border-border focus:border-brand text-caption text-primary placeholder:text-muted focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary cursor-pointer"
                title="Limpiar bÃºsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selector unificado de tipo de entidad a la derecha */}
          <div className="flex items-center gap-compact overflow-x-auto">
            <SegmentedTabs
              tabs={filterTabs}
              activeTab={activeFilter}
              onChange={setActiveFilter}
            />
          </div>
        </div>
      </div>

      {/* 3. Lienzo a Pantalla Completa + Inspector Flotante Derecho */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-compact p-group pt-compact overflow-hidden">
        {/* Lienzo Interactivo con Leyenda en 1 Sola Línea */}
        <div className="flex-1 h-full rounded-container border border-border overflow-hidden relative bg-canvas">
          {graphLoading && graphNodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-compact text-secondary">
              <div className="w-8 h-8 rounded-full border-2 border-border border-t-brand animate-spin" />
              <span className="text-caption">Cargando grafo de conocimiento...</span>
            </div>
          ) : filteredData.nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center p-group">
              <EmptyState
                title="Sin nodos en el grafo"
                description="El backend no reporta entidades para este filtro. Ajusta los filtros o verifica que el vault tenga documentos indexados."
                actionLabel="Limpiar filtros"
                onAction={() => {
                  setActiveFilter("all");
                  setSearchQuery("");
                }}
              />
            </div>
          ) : (
            <KnowledgeGraphCanvas
              data={filteredData}
              physicsSettings={physicsSettings}
              selectedNodeId={selectedNodeId}
              onSelectNode={(nodeId) => {
                if (nodeId) {
                  setSelectedNodeId(nodeId);
                  setFocusNodeId(nodeId);
                }
              }}
              focusNodeId={focusNodeId}
            />
          )}

          {/* Leyenda Inferior en 1 Sola Línea Continua (sin partirse) */}
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-base px-3 py-1.5 rounded-control bg-panel border border-border text-caption text-secondary whitespace-nowrap shadow-popover">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-pill bg-brand" />
              <span>Agente Mint</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-pill bg-state-ok" />
              <span>Operativo</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-pill bg-state-attention" />
              <span>Bajo punto de reorden</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-pill bg-state-pending" />
              <span>Requiere firma</span>
            </span>
          </div>
        </div>

        {/* Inspector Derecho en Lenguaje de Negocio (360px) */}
        <aside className="w-full lg:w-[360px] h-full rounded-container bg-panel border border-border overflow-y-auto p-base space-y-base shrink-0">
          {selectedNode && (
            <>
              {/* Cabecera de la Entidad Seleccionada */}
              <div className="pb-compact border-b border-border space-y-compact">
                <div className="flex items-center justify-between gap-compact">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-control bg-raised border border-border flex items-center justify-center shrink-0">
                      {renderNodeIcon(selectedNode.type)}
                    </div>
                    <span className="text-caption font-medium text-secondary">
                      {CATEGORY_LABELS[selectedNode.type] || "Entidad operativa"}
                    </span>
                  </div>
                  <StatusIndicator
                    status={getNodeStatusMeta(selectedNode).status}
                    label={getNodeStatusMeta(selectedNode).label}
                  />
                </div>

                <div>
                  <h2 className="text-section-title font-bold text-primary">
                    {selectedNode.label}
                  </h2>
                  {selectedNode.sublabel && (
                    <p className="text-caption text-secondary mt-hairline">
                      {selectedNode.sublabel}
                    </p>
                  )}
                </div>
              </div>

              {/* Ficha Operativa de Negocio (Sin camelCase ni tÃ©rminos de BD) */}
              <div className="space-y-compact">
                <h3 className="text-label font-semibold text-secondary">
                  InformaciÃ³n operativa
                </h3>
                <div className="p-compact rounded-control bg-raised border border-border divide-y divide-border">
                  {Object.entries(selectedNode.metadata || {}).map(
                    ([key, value]) => {
                      const humanLabel =
                        BUSINESS_FIELD_LABELS[key] || "Detalle operativo";
                      return (
                        <div
                          key={key}
                          className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-compact text-caption"
                        >
                          <span className="text-secondary">{humanLabel}</span>
                          <span className="text-primary font-medium text-right">
                            {String(value)}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* AcciÃ³n Contextual si es una Orden o Aprobación */}
              {(selectedNode.type === "purchase_order" ||
                selectedNode.type === "decision") &&
                onNavigateTo && (
                  <div className="pt-hairline">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => onNavigateTo("aprobaciones")}
                      showArrow={true}
                    >
                      Revisar en Aprobaciones
                    </Button>
                  </div>
                )}

              {/* Relaciones Directas en el Mapa */}
              <div className="space-y-compact">
                <div className="flex items-center justify-between">
                  <h3 className="text-label font-semibold text-secondary">
                    Conexiones directas
                  </h3>
                  <span className="text-caption text-muted tabular-nums">
                    {connectedEdges.incoming.length +
                      connectedEdges.outgoing.length}{" "}
                    vÃ­nculos
                  </span>
                </div>

                <div className="space-y-1.5">
                  {connectedEdges.incoming.map((edge) => (
                    <button
                      key={edge.id}
                      onClick={() => handleCenterNode(edge.source)}
                      className="w-full p-2.5 rounded-control bg-raised hover:bg-raised/70 border border-border hover:border-strong text-left text-caption flex items-center justify-between gap-compact transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-muted block">
                          {edge.label}
                        </span>
                        <span className="text-primary font-medium truncate block">
                          {findNodeLabel(edge.source)}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-secondary shrink-0" />
                    </button>
                  ))}

                  {connectedEdges.outgoing.map((edge) => (
                    <button
                      key={edge.id}
                      onClick={() => handleCenterNode(edge.target)}
                      className="w-full p-2.5 rounded-control bg-raised hover:bg-raised/70 border border-border hover:border-strong text-left text-caption flex items-center justify-between gap-compact transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-brand block">
                          {edge.label}
                        </span>
                        <span className="text-primary font-medium truncate block">
                          {findNodeLabel(edge.target)}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-secondary shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Detalle TÃ©cnico Oculto tras "Ver detalle tÃ©cnico" */}
              <div className="pt-compact border-t border-border">
                <button
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="flex items-center gap-compact text-caption font-medium text-muted hover:text-primary transition-colors cursor-pointer"
                >
                  {showTechnicalDetails ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  )}
                  <span>Ver detalle tÃ©cnico</span>
                </button>

                {showTechnicalDetails && (
                  <div className="mt-compact p-compact rounded-control bg-raised border border-border space-y-hairline text-caption font-mono text-secondary">
                    <div className="flex items-center gap-1.5 text-brand font-sans mb-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Identificador interno verificado</span>
                    </div>
                    <div>ID: {selectedNode.id}</div>
                    <div>Grado de conexiÃ³n: {selectedNode.degree || 1}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};
