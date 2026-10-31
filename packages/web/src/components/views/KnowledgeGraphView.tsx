import { AGENT_SUB_TABS } from "../layout/AgentSubNav";
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
import { LoadingScreen } from "../ui/LoadingScreen";
import { CostBadge } from "../ui/CostBadge";
import {
  MintGraphNode,
  MintGraphEdge,
  GraphPhysicsSettings,
} from "../../types/graph";
import { useLiveGraph } from "../../hooks/useLiveGraph";
import { useAgentTelemetry } from "../../hooks/useAgentTelemetry";
import { api, type TelemetryCostTask } from "../../services/apiClient";

interface KnowledgeGraphViewProps {
  onNavigateTo?: (tabId: string) => void;
}

// Diccionario de etiquetas legibles de negocio (cero camelCase o jerga de base de datos)
const BUSINESS_FIELD_LABELS: Record<string, string> = {
  rolOperativo: "Función principal",
  limiteAutonomo: "Límite de compra autónoma",
  sedesMonitoreadas: "Sedes supervisadas",
  frecuenciaRevision: "Frecuencia de revisión",
  ciudad: "Ciudad / Ubicación",
  direccion: "Dirección física",
  capacidadTotal: "Capacidad instalada",
  ocupacionActual: "Ocupación actual",
  referenciasBajoMinimo: "Referencias bajo mínimo",
  tiempoTraslado: "Tiempo de traslado a matriz",
  existenciaActual: "Existencias actuales",
  puntoReorden: "Punto de reorden",
  minimoSeguridad: "Mínimo de seguridad",
  costoUnitario: "Costo unitario",
  categoria: "Categoría de producto",
  coberturaEstimada: "Cobertura proyectada",
  tiempoEntrega: "Tiempo de entrega",
  cumplimientoHistorico: "Cumplimiento histórico",
  descuentoVolumen: "Descuento por volumen",
  montoTotal: "Monto total de la orden",
  cantidadSolicitada: "Cantidad solicitada",
  proveedorAsignado: "Proveedor asignado",
  motivoRetencion: "Motivo de revisión",
  reglaAplicada: "Política de negocio",
  responsableFirma: "Responsable de Aprobación",
  productId: "Identificador de producto",
  sku: "Código SKU",
  currentStock: "Existencias actuales",
  minStock: "Punto de reorden",
  price: "Precio de venta",
  costPrice: "Costo unitario",
  origin: "Origen del registro",
  stockByWarehouse: "Existencias por bodega",
  averageDailyConsumption: "Consumo promedio diario",
  supplierId: "Identificador de proveedor",
  email: "Correo",
  phone: "Teléfono",
  activeOrders: "Órdenes activas",
  averageLeadTimeDays: "Entrega promedio (días)",
  reliabilityPct: "Fiabilidad observada",
  role: "Especialidad",
  toolsEnabled: "Herramientas habilitadas",
  acceptedTasks: "Tareas aceptadas",
  permissions: "Permisos efectivos",
  resolvedCasesToday: "Casos resueltos hoy",
  decisionId: "Identificador de decisión",
  caseId: "Caso relacionado",
  costCop: "Costo estimado (COP)",
  riskScore: "Riesgo evaluado",
  policyDecision: "Veredicto de política",
  policyReason: "Motivo del veredicto",
  proposingAgent: "Agente proponente",
  status: "Estado actual",
  caseCost: "Costo registrado del caso",
  caseTotalTokens: "Tokens utilizados",
  casePromptTokens: "Tokens de entrada",
  caseCompletionTokens: "Tokens de salida",
  priority: "Prioridad",
  createdAt: "Fecha de creación",
  shipmentId: "Identificador de envío",
  carrier: "Transportista",
  currentLocation: "Ubicación actual",
  destination: "Destino",
  relativePath: "Ruta de la nota",
  sizeBytes: "Tamaño del documento",
  company: "Empresa",
  latitude: "Latitud",
  longitude: "Longitud",
};

const CATEGORY_LABELS: Record<string, string> = {
  agent: "Agente autónomo",
  warehouse: "Bodega física",
  sku: "Producto en catálogo",
  supplier: "Proveedor homologado",
  purchase_order: "Orden de compra",
  decision: "Aprobación ejecutiva",
  case: "Caso operativo",
  shipment: "Envío",
  document: "Nota de memoria",
};


export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  onNavigateTo,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [freshNode, setFreshNode] = useState<MintGraphNode | null>(null);
  const [nodeLoading, setNodeLoading] = useState(false);
  const [nodeError, setNodeError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [stockDelta, setStockDelta] = useState(1);
  const [decisionCost, setDecisionCost] = useState<TelemetryCostTask | null>(null);

  // Grafo en vivo desde PostgreSQL (/api/graph). Sin datos semilla locales.
  const {
    graphData: liveGraph,
    loading: graphLoading,
    error,
    isFallback: graphIsFallback,
    refresh: refreshGraph,
  } = useLiveGraph({ searchQuery });
  const { status: telemetryStatus, traversals } = useAgentTelemetry();
  const currentTraversal = traversals[0];

  const [graphNodes, setGraphNodes] = useState<MintGraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<MintGraphEdge[]>([]);

  // Sincroniza el grafo real con el estado local de la vista.
  // Validación defensiva: nunca se propaga `undefined` ni arreglos corruptos
  // al motor de renderizado (evita el bucle infinito de la simulación).
  useEffect(() => {
    const safeNodes = Array.isArray(liveGraph?.nodes) ? liveGraph!.nodes : [];
    const safeEdges = Array.isArray(liveGraph?.edges) ? liveGraph!.edges : [];
    setGraphNodes(safeNodes);
    setGraphEdges(safeEdges);
  }, [liveGraph]);

  // Si el nodo seleccionado desaparece del grafo vivo, reencuadra al primer nodo disponible.
  useEffect(() => {
    if (graphNodes.length === 0) {
      if (selectedNodeId !== "") setSelectedNodeId("");
      return;
    }
    if (!graphNodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(graphNodes[0].id);
    }
  }, [graphNodes, selectedNodeId]);

  const physicsSettings: GraphPhysicsSettings = useMemo(() => ({
    repulsion: 3200,
    springLength: 215,
    gravity: 0.005,
    damping: 0.82,
    showGrid: true,
    showAllLabels: true,
  }), []);


  // Un solo control de filtros por categoría
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
      nodes = nodes.filter((n) => {
        const label = (n.label ?? "").toLowerCase();
        const sublabel = (n.sublabel ?? "").toLowerCase();
        const id = (n.id ?? "").toLowerCase();
        return (
          label.includes(query) ||
          sublabel.includes(query) ||
          id.includes(query)
        );
      });
    }

    // Solo se dibujan aristas cuyos dos extremos siguen visibles.
    const visibleIds = new Set(nodes.map((n) => n.id));
    const edges = graphEdges.filter(
      (e) =>
        e &&
        visibleIds.has(e.source) &&
        visibleIds.has(e.target) &&
        e.source !== e.target
    );

    return { nodes, edges };
  }, [searchQuery, activeFilter, graphNodes, graphEdges]);

  const selectedNode =
    (freshNode?.id === selectedNodeId ? freshNode : null) ||
    graphNodes.find((n) => n.id === selectedNodeId) ||
    graphNodes[0];

  useEffect(() => {
    if (!selectedNodeId) {
      setFreshNode(null);
      return;
    }
    let active = true;
    setNodeLoading(true);
    setNodeError(null);
    api.graph.node(selectedNodeId)
      .then(({ node }) => {
        if (active) setFreshNode(node);
      })
      .catch((error: unknown) => {
        if (active) {
          setFreshNode(null);
          setNodeError(error instanceof Error ? error.message : "No se pudo actualizar el detalle.");
        }
      })
      .finally(() => {
        if (active) setNodeLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedNodeId, liveGraph?.metadata?.generatedAt]);

  const selectedDecisionId = String(selectedNode?.metadata?.decisionId ?? "");
  const selectedDecisionCaseId = String(selectedNode?.metadata?.caseId ?? "");
  useEffect(() => {
    if (!selectedDecisionId || !selectedDecisionCaseId) {
      setDecisionCost(null);
      return;
    }

    let active = true;
    setDecisionCost(null);
    api.telemetry.costs().then((response) => {
      if (!active || response.isFallback) return;
      setDecisionCost(
        response.data.tasks.find((task) => task.taskId === selectedDecisionCaseId) ?? null,
      );
    });
    return () => {
      active = false;
    };
  }, [selectedDecisionId, selectedDecisionCaseId]);

  const refreshSelectedNode = async () => {
    if (!selectedNodeId) return;
    setActionMessage(null);
    try {
      const { node } = await api.graph.node(selectedNodeId);
      setFreshNode(node);
      await refreshGraph();
      setActionMessage("Información actualizada desde el servidor.");
    } catch (error) {
      setNodeError(error instanceof Error ? error.message : "No se pudo actualizar la información.");
    }
  };

  const adjustSelectedStock = async () => {
    const productId = String(selectedNode?.metadata?.productId ?? "");
    if (!productId || stockDelta === 0) return;
    setActionMessage(null);
    try {
      await api.inventory.adjust({
        producto_id: productId,
        cantidad_delta: stockDelta,
        motivo: "Ajuste desde el mapa de conocimiento",
      });
      await refreshGraph();
      setActionMessage("Ajuste de existencias registrado.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "No se pudo ajustar el inventario.");
    }
  };

  const resolveSelectedDecision = async (resolution: "approve" | "reject") => {
    const decisionId = String(selectedNode?.metadata?.decisionId ?? "");
    if (!decisionId) return;
    setActionMessage(null);
    try {
      if (resolution === "approve") await api.decisions.approve(decisionId);
      else await api.decisions.reject(decisionId);
      await refreshGraph();
      setActionMessage(resolution === "approve" ? "Decisión aprobada." : "Decisión rechazada.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "No se pudo resolver la decisión.");
    }
  };

  const connectedEdges = useMemo(() => {
    if (!selectedNode) return { incoming: [], outgoing: [] };
    const incoming = graphEdges.filter((e) => e.target === selectedNode.id);
    const outgoing = graphEdges.filter((e) => e.source === selectedNode.id);
    return { incoming, outgoing };
  }, [selectedNode, graphEdges]);

  const handleCenterNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setFocusNodeId(nodeId);
    setIsInspectorOpen(true);
  };

  const formatMetadataValue = (value: unknown) => {
    if (Array.isArray(value)) {
      return value.map((item) =>
        item && typeof item === "object" ? JSON.stringify(item) : String(item),
      ).join(", ");
    }
    if (value && typeof value === "object") return JSON.stringify(value);
    return String(value).replace(/,(?!\s)/g, ", ");
  };

  const getNodeStatusMeta = (
    node: MintGraphNode
  ): { status: OperationalStatus; label: string } => {
    const entityKind = String(node.metadata?.entityKind ?? node.type);
    if (entityKind === "decision") {
      if (node.metadata?.policyDecision === "pending_approval") {
        return { status: "pending", label: "Requiere firma" };
      }
      if (node.metadata?.policyDecision === "rejected" || node.metadata?.policyDecision === "blocked") {
        return { status: "error", label: "Rechazada o bloqueada" };
      }
    }
    if (entityKind === "shipment" && node.metadata?.status === "retrasado") {
      return { status: "attention", label: "Envío retrasado" };
    }
    if (entityKind === "purchase_order" && node.metadata?.status === "abierta") {
      return { status: "pending", label: "Orden abierta" };
    }
    if (entityKind === "case" && node.status === "warning") {
      return { status: "attention", label: "Caso escalado" };
    }
    if (node.status === "warning") {
      return { status: "attention", label: "Bajo punto de reorden" };
    }
    if (node.status === "running") {
      return { status: "progress", label: "En proceso" };
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
    <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-canvas text-primary font-sans overflow-hidden">
      {/* 1. Cabecera con Subpestañas del Destino Agente */}
      <div className="p-group pb-0">
        <PageHeader
          title="Mapa de conocimiento"
          description="Relaciones operativas en vivo entre tus bodegas, productos, proveedores y decisiones del agente."
          filterControl={
            <SegmentedTabs
              tabs={AGENT_SUB_TABS}
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
                onClick={() => {
                  const agent = graphNodes.find((node) => node.type === "agent");
                  if (agent) handleCenterNode(agent.id);
                }}
              >
                Centrar en el agente
              </Button>
            </div>
          }
        />
      </div>

      {/* 2. Un Solo Control de Filtros Unificado (Cero Superposición) */}
      <div className="px-group pt-compact">
        <div className="p-compact rounded-container bg-panel border border-border flex flex-col xl:flex-row xl:items-center justify-between gap-compact">
          {/* Buscador a la izquierda */}
          <div className="relative w-full xl:w-72 shrink-0">
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
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selector unificado de tipo de entidad a la derecha */}
          <div data-lenis-prevent className="min-w-0 max-w-full flex items-center gap-compact overflow-x-auto custom-scrollbar">
            <SegmentedTabs
              tabs={filterTabs}
              activeTab={activeFilter}
              onChange={setActiveFilter}
            />
          </div>
        </div>
      </div>

      {/* 3. Lienzo a Pantalla Completa + Inspector Flotante Derecho */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col xl:flex-row gap-compact p-group pt-compact overflow-hidden">
        {/* Lienzo Interactivo con Leyenda en 1 Sola Línea */}
        <div className="relative flex-1 min-h-[320px] min-w-0 w-full xl:min-h-0 xl:h-full rounded-container border border-border overflow-hidden bg-canvas">
          {!graphLoading && filteredData.nodes.length > 0 && (
            <div
              className="absolute left-3 top-3 z-20 inline-flex items-center gap-hairline rounded-control border border-border bg-panel px-compact py-1.5 text-caption text-secondary"
              role="status"
            >
              <span className={telemetryStatus === "connected" ? "text-state-ok" : "text-state-attention"}>
                ●
              </span>
              <span>{telemetryStatus === "connected" ? "Telemetría en vivo" : "Conectando telemetría"}</span>
              {currentTraversal?.status === "active" && (
                <span className="text-primary">{currentTraversal.action}</span>
              )}
            </div>
          )}
          {!graphLoading && filteredData.nodes.length > 0 && (
            <button
              type="button"
              onClick={() => setIsInspectorOpen(true)}
              className="absolute right-3 top-3 z-20 inline-flex items-center gap-compact rounded-control border border-border bg-panel px-compact py-1.5 text-caption font-medium text-primary shadow-popover hover:bg-raised xl:hidden"
              aria-label="Abrir detalles de la entidad seleccionada"
            >
              <FileCheck2 className="h-3.5 w-3.5 text-brand" />
              Detalles
            </button>
          )}
          {graphLoading ? (
            <div className="absolute inset-0 flex">
              <LoadingScreen
                title="Cargando grafo de conocimiento"
                subtitle="Consultando las relaciones entre bodegas, productos y decisiones."
                fullScreen={false}
              />
            </div>
          ) : filteredData.nodes.length === 0 || !filteredData.nodes.some((node) => node.type !== "agent") ? (
            <div className="absolute inset-0 flex items-center justify-center p-group">
              <EmptyState
                title="Sin nodos en el grafo"
                description={
                  graphLoading || graphIsFallback
                    ? error || "No fue posible conectar con el servicio del grafo. Reintenta la carga o revisa que la API esté en línea."
                    : error || "La base de datos y el vault no contienen entidades para visualizar todavía."
                }
                actionLabel={graphIsFallback || error ? "Volver a consultar" : "Actualizar mapa"}
                onAction={() => {
                  setActiveFilter("all");
                  setSearchQuery("");
                  void refreshGraph();
                }}
              />
            </div>
          ) : (
            <KnowledgeGraphCanvas
              data={filteredData}
              physicsSettings={physicsSettings}
              activeTraversals={traversals}
              selectedNodeId={selectedNodeId}
              onSelectNode={(nodeId) => {
                if (nodeId) {
                  setSelectedNodeId(nodeId);
                  setFocusNodeId(nodeId);
                  setIsInspectorOpen(true);
                }
              }}
              focusNodeId={focusNodeId}
            />
          )}

          {/* Leyenda Inferior en 1 Sola Línea Continua (sin partirse) */}
          <div data-lenis-prevent className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-10 flex max-w-[calc(100%-12rem)] items-center gap-base overflow-x-auto px-3 py-1.5 rounded-control bg-panel border border-border text-caption text-secondary whitespace-nowrap shadow-popover custom-scrollbar">
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
        {isInspectorOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 xl:hidden"
            onClick={() => setIsInspectorOpen(false)}
            aria-label="Cerrar detalles de la entidad"
          />
        )}
        <aside data-lenis-prevent className={`min-w-0 rounded-container bg-panel border border-border overflow-y-auto p-base space-y-base shrink-0 ${isInspectorOpen ? "fixed right-2 top-[15vh] bottom-[15vh] z-50 w-[min(360px,calc(100vw-5rem))] sm:top-[60px] sm:bottom-2 sm:w-[min(360px,calc(100vw-1rem))]" : "hidden"} xl:static xl:z-auto xl:block xl:w-96 xl:h-full`}>
          {!selectedNode && (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                title="Sin entidad seleccionada"
                description="Selecciona un nodo del mapa para inspeccionar su información operativa."
              />
            </div>
          )}
          {selectedNode && (
            <>
              {/* Cabecera de la Entidad Seleccionada */}
              <div className="pb-compact border-b border-border space-y-compact">
                <div className="flex items-center justify-between gap-compact">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-control bg-raised border border-border flex items-center justify-center shrink-0">
                      {renderNodeIcon(String(selectedNode.metadata?.entityKind ?? selectedNode.type))}
                    </div>
                    <span className="text-caption font-medium text-secondary">
                      {CATEGORY_LABELS[String(selectedNode.metadata?.entityKind ?? selectedNode.type)] || "Entidad operativa"}
                    </span>
                  </div>
                  <StatusIndicator
                    status={getNodeStatusMeta(selectedNode).status}
                    label={getNodeStatusMeta(selectedNode).label}
                  />
                  <button
                    type="button"
                    onClick={() => setIsInspectorOpen(false)}
                    className="xl:hidden p-1.5 rounded-control text-secondary hover:text-primary hover:bg-raised"
                    aria-label="Cerrar inspector"
                    title="Cerrar inspector"
                  >
                    <X className="h-4 w-4" />
                  </button>
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

              {/* Ficha Operativa de Negocio (Sin camelCase ni términos de BD) */}
              <div className="space-y-compact">
                <h3 className="text-label font-semibold text-secondary">
                  Información operativa
                </h3>
                <div className="p-compact rounded-control bg-raised border border-border divide-y divide-border">
                  {Object.entries(selectedNode.metadata || {}).filter(([key]) => key !== "entityKind").map(
                    ([key, value]) => {
                      const humanLabel =
                        BUSINESS_FIELD_LABELS[key] || "Detalle operativo";
                      return (
                        <div
                          key={key}
                          className="py-2 first:pt-0 last:pb-0 grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-compact text-caption"
                        >
                          <span className="min-w-0 text-secondary break-words">
                            {humanLabel}
                          </span>
                          <span className="min-w-0 text-primary font-medium text-right break-words">
                            {formatMetadataValue(value)}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {nodeLoading && (
                  <p className="text-caption text-secondary" role="status">
                    Actualizando detalles desde el servidor...
                  </p>
              )}
              {nodeError && (
                  <p className="text-caption text-state-error" role="alert">
                    {nodeError}
                  </p>
              )}
              {actionMessage && (
                  <p className="text-caption text-secondary" role="status">
                    {actionMessage}
                  </p>
              )}
              <Button variant="secondary" className="w-full" onClick={() => void refreshSelectedNode()}>
                  Actualizar información
              </Button>

              {selectedNode.type === "sku" && (
                  <div className="space-y-compact rounded-control border border-border bg-raised p-compact">
                    <h3 className="text-label font-semibold text-secondary">Ajustar existencias</h3>
                    <label className="block text-caption text-secondary" htmlFor="graph-stock-delta">
                      Cambio de unidades
                    </label>
                    <input
                      id="graph-stock-delta"
                      type="number"
                      value={stockDelta}
                      onChange={(event) => setStockDelta(Number(event.target.value))}
                      className="h-9 w-full rounded-control border border-border bg-panel px-compact text-caption text-primary"
                    />
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => void adjustSelectedStock()}
                      disabled={nodeLoading || !selectedNode.metadata?.productId || stockDelta === 0}
                    >
                      Ajustar stock
                    </Button>
                  </div>
              )}

              {selectedNode.type === "decision" && (
                  <div className="space-y-compact rounded-control border border-border bg-raised p-compact">
                    <h3 className="text-label font-semibold text-secondary">Gobernanza de la decisión</h3>
                    <div className="space-y-1 text-caption">
                      <p className="text-secondary">Costo de la tarea</p>
                      {decisionCost ? (
                        <>
                          <p className="font-semibold text-primary">
                            {decisionCost.costUsd.toLocaleString("en-US", {
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 6,
                            })}{" "}
                            · {decisionCost.tokens.toLocaleString()} tokens
                          </p>
                          <p className="text-secondary">
                            Entrada: {decisionCost.promptTokens?.toLocaleString() ?? "—"} · Salida:{" "}
                            {decisionCost.completionTokens?.toLocaleString() ?? "—"}
                          </p>
                        </>
                      ) : (
                        <p className="text-secondary">Desglose USD/tokens no disponible en esta sesión.</p>
                      )}
                    </div>
                    <CostBadge showSessionTotal refreshMs={0} />
                    <div className="flex flex-col gap-compact">
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={() => void resolveSelectedDecision("approve")}
                        disabled={nodeLoading || !selectedNode.metadata?.decisionId || selectedNode.metadata?.policyDecision !== "pending_approval"}
                      >
                        Aprobar
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => void resolveSelectedDecision("reject")}
                        disabled={nodeLoading || !selectedNode.metadata?.decisionId || selectedNode.metadata?.policyDecision !== "pending_approval"}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>
              )}

              {/* Acción Contextual si es una Orden o Aprobación */}
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
                    vínculos
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

              {/* Detalle Técnico Oculto tras "Ver detalle técnico" */}
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
                  <span>Ver detalle técnico</span>
                </button>

                {showTechnicalDetails && (
                  <div className="mt-compact p-compact rounded-control bg-raised border border-border space-y-hairline text-caption font-mono text-secondary">
                    <div className="flex items-center gap-1.5 text-brand font-sans mb-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Identificador interno verificado</span>
                    </div>
                    <div>ID: {selectedNode.id}</div>
                    <div>Grado de conexión: {selectedNode.degree || 1}</div>
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
