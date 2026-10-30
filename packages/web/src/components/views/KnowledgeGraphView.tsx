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
  responsableFirma: "Responsable de aprobación",
};

const CATEGORY_LABELS: Record<string, string> = {
  agent: "Agente autónomo",
  warehouse: "Bodega física",
  sku: "Producto en catálogo",
  supplier: "Proveedor homologado",
  purchase_order: "Orden de compra",
  decision: "Aprobación ejecutiva",
};

const ENTITY_NODES: MintGraphNode[] = [
  {
    id: "agent_coordinator",
    type: "agent",
    label: "Agente Autónomo Mint",
    sublabel: "Coordinador de inventario y abastecimiento",
    status: "running",
    degree: 8,
    metadata: {
      rolOperativo: "Vigilancia de existencias y compras",
      limiteAutonomo: "Hasta $5.000.000 COP",
      sedesMonitoreadas: "Bucaramanga, Bogotá y Medellín",
      frecuenciaRevision: "Cada 30 minutos",
    },
  },
  {
    id: "wh_bga",
    type: "warehouse",
    label: "Bodega Matriz Bucaramanga",
    sublabel: "Zona Industrial Chimitá · 1.200 m³",
    status: "active",
    degree: 6,
    metadata: {
      ciudad: "Bucaramanga, Santander",
      direccion: "Km 4 Vía Palenque",
      capacidadTotal: "1.200 m³",
      ocupacionActual: "78% de capacidad",
      referenciasBajoMinimo: "8 productos bajo punto de reorden",
    },
  },
  {
    id: "wh_bog",
    type: "warehouse",
    label: "CD Fontibón (Bogotá)",
    sublabel: "Parque Logístico Fontibón · 3.500 m³",
    status: "active",
    degree: 4,
    metadata: {
      ciudad: "Bogotá D.C.",
      capacidadTotal: "3.500 m³",
      ocupacionActual: "64% de capacidad",
      tiempoTraslado: "2 días hábiles hacia Bucaramanga",
    },
  },
  {
    id: "wh_med",
    type: "warehouse",
    label: "Hub Logístico Itagüí (Medellín)",
    sublabel: "Centro Mayorista Antioquia · 1.800 m³",
    status: "active",
    degree: 4,
    metadata: {
      ciudad: "Itagüí, Antioquia",
      capacidadTotal: "1.800 m³",
      ocupacionActual: "82% de capacidad",
      tiempoTraslado: "2 días hábiles hacia Bucaramanga",
    },
  },
  {
    id: "sku_rot001",
    type: "sku",
    label: "Rotomartillo Bosch SDS Plus",
    sublabel: "SKU-ROT-001 · Herramienta eléctrica",
    status: "warning",
    degree: 5,
    metadata: {
      existenciaActual: "4 unidades",
      puntoReorden: "15 unidades",
      minimoSeguridad: "10 unidades",
      costoUnitario: "$145.000 COP",
      categoria: "Maquinaria de perforación",
      coberturaEstimada: "Menos de 2 días en obra",
    },
  },
  {
    id: "sku_dw714",
    type: "sku",
    label: "Sierra Circular DeWalt 7-1/4'",
    sublabel: "SKU-DW-714 · Corte pesado 1800W",
    status: "warning",
    degree: 5,
    metadata: {
      existenciaActual: "6 unidades",
      puntoReorden: "18 unidades",
      minimoSeguridad: "12 unidades",
      costoUnitario: "$145.000 COP",
      categoria: "Equipos de corte",
      coberturaEstimada: "3 días al ritmo actual",
    },
  },
  {
    id: "sku_disc7",
    type: "sku",
    label: "Disco Diamantado 7' Concreto",
    sublabel: "SKU-COR-DISC7 · Consumibles de obra",
    status: "active",
    degree: 3,
    metadata: {
      existenciaActual: "45 unidades",
      puntoReorden: "30 unidades",
      minimoSeguridad: "15 unidades",
      costoUnitario: "$78.000 COP",
      categoria: "Abrasivos y discos",
      coberturaEstimada: "24 días disponibles",
    },
  },
  {
    id: "supp_dist_san",
    type: "supplier",
    label: "Distribuciones Santander",
    sublabel: "Mayorista ferretero regional",
    status: "active",
    degree: 4,
    metadata: {
      ciudad: "Bucaramanga, Santander",
      tiempoEntrega: "24 horas en área metropolitana",
      cumplimientoHistorico: "98.5% entregas a tiempo",
      descuentoVolumen: "8% en pedidos sobre 40 unidades",
    },
  },
  {
    id: "supp_dewalt",
    type: "supplier",
    label: "DeWalt Colombia",
    sublabel: "Fabricante y distribuidor directo",
    status: "active",
    degree: 4,
    metadata: {
      ciudad: "Bogotá D.C.",
      tiempoEntrega: "2 días hábiles",
      cumplimientoHistorico: "99.1% entregas a tiempo",
      descuentoVolumen: "8% por consolidación nacional",
    },
  },
  {
    id: "supp_tornillos",
    type: "supplier",
    label: "Mundial de Tornillos S.A.S.",
    sublabel: "Fijaciones estructurales y anclajes",
    status: "active",
    degree: 3,
    metadata: {
      ciudad: "Bogotá y Medellín",
      tiempoEntrega: "3 días hábiles",
      cumplimientoHistorico: "96.8% entregas a tiempo",
    },
  },
  {
    id: "po_24a190",
    type: "purchase_order",
    label: "Orden PO-24A190",
    sublabel: "50× Sierra Circular · $7.250.000 COP",
    status: "warning",
    degree: 4,
    metadata: {
      montoTotal: "$7.250.000 COP",
      cantidadSolicitada: "50 unidades",
      proveedorAsignado: "Distribuciones Santander",
      motivoRetencion: "Supera el límite autónomo de $5.000.000 COP",
    },
  },
  {
    id: "po_0142",
    type: "purchase_order",
    label: "Orden PO-2026-0142",
    sublabel: "Fijaciones grado 8 · $1.450.000 COP",
    status: "active",
    degree: 3,
    metadata: {
      montoTotal: "$1.450.000 COP",
      cantidadSolicitada: "1.200 unidades",
      proveedorAsignado: "Mundial de Tornillos S.A.S.",
      motivoRetencion: "Autorizada automáticamente (bajo $5M COP)",
    },
  },
  {
    id: "dec_0041",
    type: "decision",
    label: "Aprobación DEC-2026-0041",
    sublabel: "Pendiente de firma en Aprobaciones",
    status: "warning",
    degree: 4,
    metadata: {
      reglaAplicada: "POL-COMP-01 · Límite de compra autónoma",
      montoTotal: "$7.250.000 COP",
      responsableFirma: "Fernando S. · Director de Operaciones",
    },
  },
];

const ENTITY_EDGES: MintGraphEdge[] = [
  {
    id: "e1",
    source: "agent_coordinator",
    target: "wh_bga",
    relation: "queries",
    label: "Supervisa existencias",
  },
  {
    id: "e2",
    source: "agent_coordinator",
    target: "wh_bog",
    relation: "queries",
    label: "Supervisa existencias",
  },
  {
    id: "e3",
    source: "agent_coordinator",
    target: "wh_med",
    relation: "queries",
    label: "Supervisa existencias",
  },
  {
    id: "e4",
    source: "wh_bga",
    target: "sku_rot001",
    relation: "belongs_to",
    label: "Almacena (4 uds)",
  },
  {
    id: "e5",
    source: "wh_bga",
    target: "sku_dw714",
    relation: "belongs_to",
    label: "Almacena (6 uds)",
  },
  {
    id: "e6",
    source: "wh_bog",
    target: "sku_disc7",
    relation: "belongs_to",
    label: "Almacena (45 uds)",
  },
  {
    id: "e7",
    source: "supp_dist_san",
    target: "sku_rot001",
    relation: "depends_on",
    label: "Abastece en 24h",
  },
  {
    id: "e8",
    source: "supp_dewalt",
    target: "sku_dw714",
    relation: "depends_on",
    label: "Abastece con 8% dto.",
  },
  {
    id: "e9",
    source: "agent_coordinator",
    target: "po_24a190",
    relation: "generates",
    label: "Propone compra",
  },
  {
    id: "e10",
    source: "po_24a190",
    target: "supp_dist_san",
    relation: "depends_on",
    label: "Asignada a proveedor",
  },
  {
    id: "e11",
    source: "po_24a190",
    target: "dec_0041",
    relation: "approved_by",
    label: "Requiere tu firma",
  },
  {
    id: "e12",
    source: "agent_coordinator",
    target: "po_0142",
    relation: "generates",
    label: "Compra autónoma",
  },
  {
    id: "e13",
    source: "po_0142",
    target: "supp_tornillos",
    relation: "depends_on",
    label: "Despacho en curso",
  },
];

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  onNavigateTo,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("agent_coordinator");
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  // Grafo en vivo desde PostgreSQL (/api/graph/data) con fallback a los datos semilla.
  const { graphData: liveGraph, loading: graphLoading, isFallback: graphIsFallback } =
    useLiveGraph({ mode: activeFilter, searchQuery });

  const [graphNodes, setGraphNodes] = useState<MintGraphNode[]>(ENTITY_NODES);
  const [graphEdges, setGraphEdges] = useState<MintGraphEdge[]>(ENTITY_EDGES);

  // Sincroniza el grafo real (o el fallback del cliente) con el estado local de la vista.
  useEffect(() => {
    if (liveGraph && liveGraph.nodes.length > 0) {
      setGraphNodes(liveGraph.nodes);
      setGraphEdges(liveGraph.edges);
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

  // Subpestañas del destino Agente según Mint-DESIGN.md
  const agentSubTabs: TabItem[] = [
    { id: "flujo_agente", label: "Flujo del agente" },
    { id: "mapa_conocimiento", label: "Mapa de conocimiento" },
    { id: "memoria_agente", label: "Memoria del agente" },
    { id: "auditoria_eventos", label: "Historial de decisiones" },
    { id: "reglas_politicas", label: "Reglas y políticas" },
  ];

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
      {/* 1. Cabecera con Subpestañas del Destino Agente */}
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

      {/* 2. Un Solo Control de Filtros Unificado (Cero Superposición) */}
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
                title="Limpiar búsqueda"
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

              {/* Ficha Operativa de Negocio (Sin camelCase ni términos de BD) */}
              <div className="space-y-compact">
                <h3 className="text-label font-semibold text-secondary">
                  Información operativa
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
