/**
 * Mint CLI Operational Graph Types
 * Definición estricta de eventos, nodos, aristas y estados de la araña (MINT).
 */

export type MintSpiderEventType =
  | "observa"
  | "analiza"
  | "decide"
  | "propone"
  | "espera_aprobacion"
  | "ejecuta"
  | "bloqueado"
  | "error"
  | "descanso";

export type MintModuleType =
  | "inventario"
  | "ventas"
  | "finanzas"
  | "logistica"
  | "proveedores"
  | "aprobaciones";

export type GraphNodeHealth = "confiable" | "dudoso" | "no_confiable";
export type GraphNodeStatus = "normal" | "alerta" | "pendiente_aprobacion";

export interface MintSpiderEvent {
  id: string;
  companyId: string;
  timestamp: number;
  type: MintSpiderEventType;
  sourceNodeId: string;
  targetNodeId: string;
  module: MintModuleType;
  summary: string;
  auditRef: string; // Referencia verificable en la BD (ej. evt_9942, dec_7f93a1c8, case_0041)
  metadata?: Record<string, any>;
  isDemo?: boolean;
}

export interface MintCliGraphNode {
  id: string;
  label: string;
  sublabel?: string;
  module: MintModuleType;
  entityType:
    | "modulo"
    | "producto"
    | "proveedor"
    | "almacen"
    | "orden_compra"
    | "envio"
    | "caso"
    | "decision"
    | "cliente";
  health: GraphNodeHealth;
  status: GraphNodeStatus;
  importance: number; // Grado de conexión o volumen
  metadata?: Record<string, any>;
  isCluster?: boolean;
  clusterCount?: number;
  x?: number;
  y?: number;
}

export interface MintCliGraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  frequency: number; // Grosor y frecuencia de la arista
  module: MintModuleType;
}

export interface MintCliGraphPayload {
  companyId: string;
  companyName: string;
  userRole: string;
  generatedAt: string;
  isDemo: boolean;
  isShadowMode: boolean;
  nodes: MintCliGraphNode[];
  edges: MintCliGraphEdge[];
  historyEvents: MintSpiderEvent[];
}
