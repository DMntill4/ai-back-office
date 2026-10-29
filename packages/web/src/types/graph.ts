/**
 * Mint Operational Knowledge Graph Types for Web
 * Define contratos de entidades, relaciones, filtros y simulación de fuerzas 2D.
 */

export type MintNodeType =
  | "agent"
  | "tool"
  | "database"
  | "warehouse"
  | "sku"
  | "supplier"
  | "purchase_order"
  | "execution"
  | "decision";

export type MintRelationType =
  | "uses"
  | "queries"
  | "belongs_to"
  | "generates"
  | "depends_on"
  | "modifies"
  | "approved_by";

export interface MintGraphNode {
  id: string;
  type: MintNodeType;
  label: string;
  sublabel?: string;
  degree?: number;
  status?: "active" | "idle" | "running" | "warning";
  metadata?: Record<string, any>;
}

export interface MintGraphEdge {
  id: string;
  source: string;
  target: string;
  relation: MintRelationType;
  label?: string;
  weight?: number;
}

export interface MintGraphData {
  nodes: MintGraphNode[];
  edges: MintGraphEdge[];
  metadata?: {
    totalNodes: number;
    totalEdges: number;
    mode: "global" | "local" | "workflow" | "execution";
    focusNodeId?: string;
    generatedAt: string;
  };
}

export interface GraphFilters {
  nodeTypes?: MintNodeType[];
  relationTypes?: MintRelationType[];
  searchQuery?: string;
  focusNodeId?: string;
  mode?: "global" | "local" | "workflow" | "execution";
  companyId?: string;
}

export interface GraphPhysicsSettings {
  repulsion: number;       // Repulsión entre nodos (default: 450)
  springLength: number;    // Longitud base de enlace (default: 110)
  gravity: number;         // Gravedad central (default: 0.04)
  damping: number;         // Fricción/amortiguación (default: 0.88)
  showAllLabels: boolean;  // Mostrar etiquetas en todos los nodos o solo relevantes
  showGrid: boolean;       // Cuadrícula sutil de fondo
}

// Estructura interna para el motor de simulación Canvas 2D
export interface SimNode extends MintGraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isDragging?: boolean;
}

export interface SimEdge {
  id: string;
  source: SimNode;
  target: SimNode;
  relation: MintRelationType;
  label?: string;
  weight?: number;
}
