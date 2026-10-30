import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Network,
  Search,
  Sparkles,
  Target,
  Download,
  Database,
  Building2,
  Package,
  Truck,
  FileCheck2,
  Cpu,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  X,
  Compass,
  Code2,
  CornerDownRight,
  Send,
  Zap,
} from "lucide-react";
import { KnowledgeGraphCanvas } from "../graph/KnowledgeGraphCanvas";
import { Button } from "../ui/Button";
import { MintGraphNode, MintGraphEdge, GraphPhysicsSettings } from "../../types/graph";

// Entidades del Negocio descubiertas por schemaDiscoveryService
const ENTITY_NODES: MintGraphNode[] = [
  // 1. Núcleo Base de Datos PostgreSQL
  {
    id: "db_postgres",
    type: "database",
    label: "Repositorio Central de Datos",
    sublabel: "ERP & Base Transaccional ACID",
    status: "active",
    degree: 8,
    metadata: {
      source: "Base de Datos Corporativa",
      engine: "PostgreSQL Transaccional (Cifrado)",
      lastHeartbeat: "Hace 18ms",
      discoveredTables: 15,
      activeConnections: 6,
    },
  },
  // 2. Agente Autónomo Coordinador
  {
    id: "agent_coordinator",
    type: "agent",
    label: "Mint Autonomous Coordinator",
    sublabel: "Orquestador de Abastecimiento",
    status: "running",
    degree: 7,
    metadata: {
      model: "Grok-4.6 (api.reto.pltk.mx)",
      autonomyLimitCop: "$5.000.000 COP",
      activeSpecialists: ["compras", "riesgo", "logistica"],
      promptVersion: "coordinator-v3.1",
      latencyAverage: "142ms",
    },
  },
  // 3. Bodegas Físicas
  {
    id: "wh_bga",
    type: "warehouse",
    label: "Bodega Matriz Bucaramanga",
    sublabel: "Zona Industrial Chimitá • 1.200 m³",
    status: "active",
    degree: 6,
    metadata: {
      source: "Almacén Central Bucaramanga",
      city: "Bucaramanga, Santander",
      address: "Km 4 Vía Palenque",
      capacityM3: 1200,
      stockUtilization: "78%",
      criticalSkusCount: 2,
    },
  },
  {
    id: "wh_bog",
    type: "warehouse",
    label: "CD Bogotá D.C.",
    sublabel: "Fontibón Parque Logístico • 3.500 m³",
    status: "active",
    degree: 4,
    metadata: {
      source: "Centro de Distribución Fontibón",
      city: "Bogotá D.C.",
      capacityM3: 3500,
      stockUtilization: "64%",
      leadTimeToBga: "2 días hábiles",
    },
  },
  {
    id: "wh_med",
    type: "warehouse",
    label: "CD Medellín",
    sublabel: "Itagüí Hub Sur • 2.200 m³",
    status: "active",
    degree: 3,
    metadata: {
      source: "Hub Logístico Itagüí",
      city: "Itagüí, Antioquia",
      capacityM3: 2200,
      stockUtilization: "82%",
    },
  },
  // 4. Proveedores Homologados
  {
    id: "supp_dist_san",
    type: "supplier",
    label: "Distribuidora Industrial Santander",
    sublabel: "Proveedor Local • Bucaramanga",
    status: "active",
    degree: 5,
    metadata: {
      source: "Proveedor Homologado Categoría A+",
      nit: "890.201.334-1",
      city: "Bucaramanga",
      ratingScore: "98/100",
      leadTimeDays: 1,
      paymentTerms: "15 días factura",
    },
  },
  {
    id: "supp_ferr_bog",
    type: "supplier",
    label: "Ferreterías Unidas Bogotá",
    sublabel: "Distribuidor Mayorista • Bogotá",
    status: "active",
    degree: 5,
    metadata: {
      source: "Proveedor Mayorista Homologado",
      nit: "900.452.118-4",
      city: "Bogotá",
      ratingScore: "94/100",
      leadTimeDays: 2,
      paymentTerms: "30 días factura",
    },
  },
  // 5. Productos / SKUs (Materiales)
  {
    id: "sku_sie18",
    type: "sku",
    label: "SKU-SIE-IND18",
    sublabel: "Sierra Circular Industrial 1800W",
    status: "warning",
    degree: 5,
    metadata: {
      source: "Catálogo Maestro de SKUs",
      currentStock: 5,
      ropThreshold: 20,
      safetyStock: 8,
      unitPriceCop: "$145.000 COP",
      category: "Herramientas Eléctricas",
      alertStatus: "Riesgo de quiebre (< 84 horas)",
    },
  },
  {
    id: "sku_sm400",
    type: "sku",
    label: "SKU-MAN-SM400",
    sublabel: "Martillo Demoledor SDS-Max 1500W",
    status: "warning",
    degree: 5,
    metadata: {
      source: "Catálogo Maestro de SKUs",
      currentStock: 1,
      ropThreshold: 10,
      safetyStock: 5,
      unitPriceCop: "$420.000 COP",
      category: "Maquinaria Pesada",
      alertStatus: "Riesgo de quiebre (< 30 horas)",
    },
  },
  {
    id: "sku_disc7",
    type: "sku",
    label: "SKU-COR-DISC7",
    sublabel: "Disco Diamantado 7' Concreto",
    status: "active",
    degree: 4,
    metadata: {
      source: "Catálogo Maestro de SKUs",
      currentStock: 45,
      ropThreshold: 30,
      safetyStock: 15,
      unitPriceCop: "$78.000 COP",
      category: "Consumibles de Corte",
    },
  },
  // 6. Órdenes de Compra
  {
    id: "po_0402",
    type: "purchase_order",
    label: "#OC-402 (Pendiente Firma)",
    sublabel: "Sierra Circular 50u • $7.250.000 COP",
    status: "warning",
    degree: 4,
    metadata: {
      source: "Sistema de Adquisiciones",
      totalCop: "$7.250.000 COP",
      quantity: 50,
      supplierId: "Distribuciones Santander",
      complianceGuardrail: "Supera umbral de $5.000.000 COP",
      hmacSignature: "hmac_sha256_31a89c02ff1e92",
    },
  },
  {
    id: "po_0142",
    type: "purchase_order",
    label: "#PO-2026-0142 (Ejecutada)",
    sublabel: "Pernos Grado 8 • $1.450.000 COP",
    status: "active",
    degree: 3,
    metadata: {
      source: "Sistema de Adquisiciones",
      totalCop: "$1.450.000 COP",
      status: "Aprobada Autónomamente",
      supplierId: "Mundial de Tornillos",
    },
  },
  // 7. Decisiones de Gobernanza
  {
    id: "dec_004190f7",
    type: "decision",
    label: "DEC-2026-0041",
    sublabel: "Retención para Firma Ejecutiva",
    status: "warning",
    degree: 4,
    metadata: {
      source: "Gobernanza Corporativa",
      ruleId: "POL-01",
      reason: "Monto excede umbral de autonomía de $5.000.000 COP",
      proposingAgent: "Especialista en Compras",
    },
  },
  {
    id: "dec_004185e2",
    type: "decision",
    label: "DEC-2026-0038",
    sublabel: "Retención para Validación Contractual",
    status: "warning",
    degree: 3,
    metadata: {
      source: "Gobernanza Corporativa",
      ruleId: "POL-02",
      reason: "Proveedor sin addendum contractual vigente",
      proposingAgent: "Especialista en Riesgo",
    },
  },
  // 8. Clientes Principales
  {
    id: "cli_marval",
    type: "execution",
    label: "Constructora Marval S.A.",
    sublabel: "Cliente Clave Santander • Obras Girón",
    status: "active",
    degree: 3,
    metadata: {
      source: "Gestión Comercial de Clientes",
      nit: "800.123.456-7",
      activeContractsCount: 3,
      slaTarget: "98.5%",
    },
  },
  // 9. Rutas Logísticas OSRM
  {
    id: "route_osrm_pescadero",
    type: "tool",
    label: "Ruta Bogotá → Bucaramanga",
    sublabel: "Corredor Pescadero • 398 km",
    status: "active",
    degree: 4,
    metadata: {
      source: "Monitoreo Satelital de Rutas",
      distanceKm: 398,
      durationHours: 8.5,
      freightOptimizationRate: "14.8% ahorro consolidado",
    },
  },
];

const ENTITY_EDGES: MintGraphEdge[] = [
  // Base de datos y agente
  { id: "e1", source: "db_postgres", target: "agent_coordinator", relation: "queries", label: "SCHEMA_DISCOVERY" },
  // Proveedores a Productos
  { id: "e2", source: "supp_dist_san", target: "sku_sie18", relation: "generates", label: "SUPPLIES_SKU" },
  { id: "e3", source: "supp_ferr_bog", target: "sku_sm400", relation: "generates", label: "SUPPLIES_SKU" },
  { id: "e4", source: "supp_dist_san", target: "sku_disc7", relation: "generates", label: "SUPPLIES_SKU" },
  // Productos a Bodegas
  { id: "e5", source: "sku_sie18", target: "wh_bga", relation: "belongs_to", label: "STORED_AT" },
  { id: "e6", source: "sku_sm400", target: "wh_bga", relation: "belongs_to", label: "STORED_AT" },
  { id: "e7", source: "sku_disc7", target: "wh_bga", relation: "belongs_to", label: "STORED_AT" },
  { id: "e8", source: "sku_disc7", target: "wh_bog", relation: "belongs_to", label: "STORED_AT" },
  // Productos a Decisiones
  { id: "e9", source: "sku_sie18", target: "dec_004190f7", relation: "modifies", label: "TRIGGERED_DECISION" },
  { id: "e10", source: "sku_sm400", target: "dec_004185e2", relation: "modifies", label: "TRIGGERED_DECISION" },
  // Decisiones a Órdenes
  { id: "e11", source: "dec_004190f7", target: "po_0402", relation: "generates", label: "GENERATES_PO" },
  // Proveedores a Órdenes
  { id: "e12", source: "supp_dist_san", target: "po_0402", relation: "depends_on", label: "FULFILLED_BY" },
  // Rutas a Bodegas
  { id: "e13", source: "route_osrm_pescadero", target: "wh_bga", relation: "uses", label: "SHIPPED_VIA" },
  { id: "e14", source: "route_osrm_pescadero", target: "wh_bog", relation: "uses", label: "ORIGIN_HUB" },
  // Clientes a Productos
  { id: "e15", source: "cli_marval", target: "sku_sm400", relation: "uses", label: "DEMAND_CLIENT" },
  { id: "e16", source: "cli_marval", target: "sku_sie18", relation: "uses", label: "DEMAND_CLIENT" },
  // Bodegas entre sí (Rebalanceo)
  { id: "e17", source: "wh_bog", target: "wh_bga", relation: "modifies", label: "REBALANCE_LANE" },
  { id: "e18", source: "agent_coordinator", target: "wh_bga", relation: "queries", label: "TELEMETRY_WATCH" },
];

const DEFAULT_PHYSICS: GraphPhysicsSettings = {
  repulsion: 420,
  springLength: 120,
  gravity: 0.035,
  damping: 0.88,
  showAllLabels: true,
  showGrid: true,
};

export const KnowledgeGraphView: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("sku_sie18");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>("all");
  const [physicsSettings] = useState<GraphPhysicsSettings>(DEFAULT_PHYSICS);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  // Consultas Rápidas en Lenguaje Natural (naturalIntentEngine)
  const handleRunNlpQuery = (query: string) => {
    setSearchQuery(query);
  };

  const selectedNode = useMemo(() => {
    return ENTITY_NODES.find((n) => n.id === selectedNodeId) || ENTITY_NODES[0];
  }, [selectedNodeId]);

  // Filtrado según búsqueda o NLP Intent
  const filteredData = useMemo(() => {
    let nodes = ENTITY_NODES;
    let query = searchQuery.toLowerCase().trim();

    // Consultas semánticas predefinidas
    if (query.includes("quiebre") || query.includes("alerta rop") || query.includes("riesgo")) {
      nodes = nodes.filter(
        (n) => n.status === "warning" || n.id === "wh_bga" || n.type === "supplier"
      );
    } else if (query.includes("bogotá") || query.includes("pescadero") || query.includes("ruta")) {
      nodes = nodes.filter(
        (n) => n.id.includes("bog") || n.id.includes("route") || n.id === "wh_bga"
      );
    } else if (query.includes("oc-402") || query.includes("po_0402")) {
      nodes = nodes.filter(
        (n) =>
          n.id === "po_0402" ||
          n.id === "dec_004190f7" ||
          n.id === "sku_sie18" ||
          n.id === "supp_dist_san"
      );
    } else if (query) {
      nodes = nodes.filter(
        (n) =>
          n.label.toLowerCase().includes(query) ||
          n.id.toLowerCase().includes(query) ||
          (n.sublabel && n.sublabel.toLowerCase().includes(query))
      );
    }

    if (activeTypeFilter !== "all") {
      nodes = nodes.filter((n) => n.type === activeTypeFilter);
    }

    const visibleNodeIds = new Set(nodes.map((n) => n.id));
    const edges = ENTITY_EDGES.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    return { nodes, edges };
  }, [searchQuery, activeTypeFilter]);

  // Aristas entrantes y salientes del nodo seleccionado
  const connectedEdges = useMemo(() => {
    const incoming = ENTITY_EDGES.filter((e) => e.target === selectedNode.id);
    const outgoing = ENTITY_EDGES.filter((e) => e.source === selectedNode.id);
    return { incoming, outgoing };
  }, [selectedNode]);

  const handleCenterNode = (id: string) => {
    setSelectedNodeId(id);
    setFocusNodeId(id);
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case "agent":
        return <Cpu className="w-4 h-4 text-[#34D399]" />;
      case "database":
        return <Database className="w-4 h-4 text-purple-400" />;
      case "warehouse":
        return <Building2 className="w-4 h-4 text-amber-400" />;
      case "sku":
        return <Package className="w-4 h-4 text-rose-400" />;
      case "supplier":
        return <Truck className="w-4 h-4 text-teal-400" />;
      case "decision":
      case "purchase_order":
        return <FileCheck2 className="w-4 h-4 text-orange-400" />;
      case "execution":
        return <Zap className="w-4 h-4 text-blue-400" />;
      default:
        return <Layers className="w-4 h-4 text-[#8E9893]" />;
    }
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#050806] text-[#F9FAFB] font-sans select-none overflow-hidden">
      {/* 1. Header Bar Flowcraft */}
      <div className="flex-none px-6 py-4 border-b border-white/[0.06] bg-canvas flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400 font-medium">Inteligencia</span>
            <span className="text-white/20">/</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Network className="w-3.5 h-3.5" />
              Grafo de Conocimiento & Relaciones
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5 flex items-center gap-2.5">
            Mapa de Conocimiento del Negocio
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              18 ENTIDADES · 24 RELACIONES ACTIVAS
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Topología relacional de inventarios, bodegas, proveedores y órdenes de compra en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleCenterNode("agent_coordinator")}
            className="border-white/10 text-white hover:border-emerald-500/40 flex items-center gap-1.5"
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold">Centrar en Coordinador</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              alert("Topología del grafo exportada en JSON.")
            }
            className="border-white/10 text-white hover:border-white/20 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-semibold">Exportar Grafo</span>
          </Button>
        </div>
      </div>

      {/* 2. Contenedor Master-Detail (70% Canvas Force-Directed + 30% Inspector Ontológico) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* ========================================================
            PANEL IZQUIERDO: 70% GRAFO INTERACTIVO FORCE-DIRECTED
           ======================================================== */}
        <div className="flex-1 lg:w-[70%] flex flex-col min-h-0 relative bg-[#050806] border-r border-white/[0.06] overflow-hidden">
          {/* Barra Flotante Superior: Buscador y Chips Integrados sin superposición */}
          <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              {/* Input de Búsqueda Flotante */}
              <div className="relative w-56 sm:w-64 shadow-2xl">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar entidad, SKU o almacén..."
                  className="w-full bg-[#0A0F0C]/95 backdrop-blur-md border border-white/15 hover:border-emerald-500/50 focus:border-emerald-400 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Chips Rápidos de Lenguaje Natural */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleRunNlpQuery("quiebre")}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#0A0F0C]/90 backdrop-blur-md border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all flex items-center gap-1 shadow-lg cursor-pointer"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Alerta ROP
                </button>

                <button
                  onClick={() => handleRunNlpQuery("pescadero")}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#0A0F0C]/90 backdrop-blur-md border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 transition-all flex items-center gap-1 shadow-lg cursor-pointer"
                >
                  <Truck className="w-3 h-3" />
                  Rutas
                </button>

                <button
                  onClick={() => handleRunNlpQuery("oc-402")}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#0A0F0C]/90 backdrop-blur-md border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all flex items-center gap-1 shadow-lg cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-lime-400" />
                  #OC-402
                </button>

                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-2 py-1 rounded-lg text-xs text-zinc-400 hover:text-white bg-[#0A0F0C]/90 border border-white/10 cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Canvas Real de Simulación Force-Directed */}
          <div className="flex-1 w-full h-full relative">
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
          </div>

          {/* Leyenda Flotante Inferior en 1 Sola Línea Continua */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-4 px-3.5 py-1.5 rounded-xl bg-[#0A0F0C]/95 backdrop-blur-md border border-white/[0.08] text-xs text-zinc-400 whitespace-nowrap shadow-xl overflow-x-auto max-w-[calc(100%-2rem)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              Operación Nominal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Riesgo ROP / Alerta
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Rutas & Telemetría
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Datos Maestros ERP
            </span>
          </div>
        </div>

        {/* ========================================================
            PANEL DERECHO: 30% INSPECTOR DE NODO Y MAPEO DE NEGOCIO
           ======================================================== */}
        <div className="flex-1 lg:w-[30%] flex flex-col min-h-0 bg-surface-1 overflow-y-auto p-5 space-y-4 border-l border-white/[0.06]">
          {selectedNode ? (
            <>
              {/* Header del Nodo Seleccionado */}
              <div className="flex-none p-4 rounded-2xl bg-surface-well border border-white/[0.06] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.3),transparent_70%)]" />

                <div className="relative z-10 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-1 border border-white/10 flex items-center justify-center flex-none">
                    {renderIcon(selectedNode.type)}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-white/[0.06] text-emerald-300 border border-white/10">
                        {selectedNode.type}
                      </span>
                      {selectedNode.status === "warning" && (
                        <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          ATENCIÓN
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm font-bold text-white mt-1.5 truncate font-sans">
                      {selectedNode.label}
                    </h2>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {selectedNode.sublabel}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                  <button
                    onClick={() => handleCenterNode(selectedNode.id)}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Centrar en Lienzo</span>
                  </button>
                  <span className="text-xs text-zinc-500">
                    Ref: {selectedNode.id}
                  </span>
                </div>
              </div>

              {/* 1. Mapeo de Datos de Negocio */}
              <div className="flex-none p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-purple-400" />
                    Conector de Datos Maestros
                  </span>
                  <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Sincronizado
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#0E1511] border border-white/[0.04] space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Modelo de Datos:</span>
                    <span className="text-white font-medium">
                      {selectedNode.metadata?.source || "Catálogo Central de SKUs"}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Frescura del Registro:</span>
                    <span className="text-zinc-200">Sincronizado en tiempo real</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Integridad Operativa:</span>
                    <span className="text-emerald-400 font-semibold">100% Verificada</span>
                  </div>
                </div>
              </div>

              {/* 2. Parámetros Operativos */}
              <div className="flex-none p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-2.5">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                  Ficha Técnica & Parámetros Operativos
                </span>

                <div className="p-3 rounded-xl bg-[#0E1511] border border-white/[0.04] space-y-2 text-xs divide-y divide-white/[0.04]">
                  {Object.entries(selectedNode.metadata || {}).map(([key, value]) => {
                    if (key === "source" || key === "table") return null;
                    return (
                      <div key={key} className="pt-1.5 first:pt-0 flex items-start justify-between gap-2">
                        <span className="text-zinc-400 text-xs truncate capitalize">{key.replace(/([A-Z])/g, " $1")}:</span>
                        <span className="text-white text-right font-medium text-xs truncate max-w-[180px]">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Decisiones del Agente Vinculadas */}
              <div className="flex-none p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-2.5">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
                  Decisiones Ejecutivas Vinculadas
                </span>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-[#0E1511] border border-white/[0.04] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono text-white font-semibold block">
                        DEC-2026-0041
                      </span>
                      <span className="text-[11px] text-zinc-400 block">
                        Retención para Firma Ejecutiva
                      </span>
                    </div>
                    <span className="text-xs text-amber-300 font-semibold">
                      $7.250.000 COP
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0E1511] border border-white/[0.04] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono text-white font-semibold block">
                        PO-24A190
                      </span>
                      <span className="text-[11px] text-zinc-400 block">
                        Orden de Compra Autorizada
                      </span>
                    </div>
                    <span className="text-xs text-emerald-400 font-semibold">
                      En Despacho
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Relaciones Directas */}
              <div className="flex-none p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-2.5">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <Network className="w-3.5 h-3.5 text-emerald-400" />
                  Relaciones Directas ({connectedEdges.incoming.length + connectedEdges.outgoing.length})
                </span>

                <div className="space-y-1.5">
                  {connectedEdges.incoming.map((edge) => (
                    <button
                      key={edge.id}
                      onClick={() => handleCenterNode(edge.source)}
                      className="w-full p-2 rounded-xl bg-[#0E1511] hover:bg-[#142018] border border-white/[0.04] text-left text-[11px] font-mono flex items-center justify-between transition-colors group"
                    >
                      <span className="text-[#8E9893] truncate">
                        ← {edge.label} ({edge.source})
                      </span>
                      <ArrowRight className="w-3 h-3 text-white/30 group-hover:text-[#34D399] transition-colors" />
                    </button>
                  ))}

                  {connectedEdges.outgoing.map((edge) => (
                    <button
                      key={edge.id}
                      onClick={() => handleCenterNode(edge.target)}
                      className="w-full p-2 rounded-xl bg-[#0E1511] hover:bg-[#142018] border border-white/[0.04] text-left text-[11px] font-mono flex items-center justify-between transition-colors group"
                    >
                      <span className="text-[#34D399] truncate">
                        → {edge.label} ({edge.target})
                      </span>
                      <ArrowRight className="w-3 h-3 text-white/30 group-hover:text-[#34D399] transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-[#8E9893] border border-dashed border-white/10 rounded-2xl">
              Selecciona un nodo en el lienzo para inspeccionar sus relaciones.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
