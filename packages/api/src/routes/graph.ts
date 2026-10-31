import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  getKnowledgeGraph,
  type GraphFilters,
  type MintNodeType,
  type MintRelationType,
} from "@mint/core";
import { currentSession } from "./auth";

type GraphNodeType = "agent" | "warehouse" | "product" | "supplier" | "decision" | "document";

interface GraphPayload {
  nodes: Array<{
    id: string;
    label: string;
    type: GraphNodeType;
    status?: "idle" | "active" | "warning" | "critical";
    metrics?: Record<string, unknown>;
  }>;
  links: Array<{
    source: string;
    target: string;
    relation: string;
    weight?: number;
    active?: boolean;
  }>;
}

function getFilters(request: FastifyRequest): GraphFilters {
  const query = (request.query as Record<string, unknown> | undefined) ?? {};
  const nodeTypes = query.nodeTypes
    ? String(query.nodeTypes).split(",").filter(Boolean) as MintNodeType[]
    : undefined;
  const relationTypes = query.relationTypes
    ? String(query.relationTypes).split(",").filter(Boolean) as MintRelationType[]
    : undefined;
  return {
    companyId: String(query.companyId || currentSession.companyId),
    mode: query.mode as GraphFilters["mode"],
    nodeTypes,
    relationTypes,
    searchQuery: String(query.searchQuery || query.q || "") || undefined,
    focusNodeId: String(query.focusNodeId || "") || undefined,
  };
}

function toCanonicalPayload(graph: Awaited<ReturnType<typeof getKnowledgeGraph>>): GraphPayload {
  const graphNodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const nodes = graph.nodes.map((node) => ({
    id: node.id,
    label: node.label,
    type: (
      node.type === "sku" ? "product" :
      node.type === "document" ? "document" :
      node.type === "warehouse" ? "warehouse" :
      node.type === "supplier" ? "supplier" :
      node.type === "agent" ? "agent" : "decision"
    ) as GraphNodeType,
    status: node.status === "running" ? "active" as const : node.status === "idle" ? "idle" as const : node.status === "warning" ? "warning" as const : "active" as const,
    metrics: node.type === "purchase_order" || node.type === "case" || node.type === "shipment"
      ? { ...node.metadata, entityKind: node.type }
      : node.metadata,
  }));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const validId = /^[a-zA-Z0-9._:-]+$/;
  if (nodes.some((node) => !validId.test(node.id)) || nodeIds.size !== nodes.length) {
    throw new Error("El grafo contiene identificadores inválidos o duplicados.");
  }
  if (graph.edges.some((edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target))) {
    throw new Error("El grafo contiene relaciones con nodos inexistentes.");
  }
  const links = graph.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      relation: edge.relation === "belongs_to"
        ? graphNodesById.get(edge.source)?.type === "warehouse" ? "almacena" : "pertenece_a"
        : edge.relation === "supplies" ? "suministra"
          : edge.relation === "queries" ? "monitorea"
            : edge.relation === "generates" ? "propone"
              : edge.relation === "modifies" ? "afecta"
                : edge.relation === "documents" ? "documenta"
                  : edge.relation === "depends_on" ? "depende_de"
                    : edge.relation === "uses" ? "utiliza"
                      : edge.relation === "approved_by" ? "aprobado_por"
                        : edge.relation,
      ...(edge.weight === undefined ? {} : { weight: edge.weight }),
    }));
  return { nodes, links };
}

export async function graphRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/api/graph", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const graph = await getKnowledgeGraph(getFilters(request));
      return toCanonicalPayload(graph);
    } catch (error) {
      request.log.error({ err: error }, "Failed to build knowledge graph from database");
      return reply.status(503).send({
        error: "No fue posible construir el grafo desde PostgreSQL y el vault.",
      });
    }
  });

  fastify.get("/api/graph/nodes/:nodeId", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const graph = await getKnowledgeGraph(getFilters(request));
      const { nodeId } = request.params as { nodeId: string };
      const node = graph.nodes.find((item) => item.id === nodeId);
      if (!node) return reply.status(404).send({ error: "La entidad ya no existe en el grafo." });
      return { node, relatedEdges: graph.edges.filter((edge) => edge.source === nodeId || edge.target === nodeId) };
    } catch (error) {
      request.log.error({ err: error }, "Failed to refresh knowledge graph node");
      return reply.status(503).send({ error: "No fue posible consultar la entidad en PostgreSQL." });
    }
  });

  fastify.get("/api/graph/data", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const graph = await getKnowledgeGraph(getFilters(request));
      const ids = new Set(graph.nodes.map((node) => node.id));
      return {
        success: true,
        data: {
          nodes: graph.nodes,
          edges: graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
          metadata: graph.metadata,
          companyId: getFilters(request).companyId,
        },
      };
    } catch (error) {
      request.log.error({ err: error }, "Failed to build legacy knowledge graph response");
      return reply.status(503).send({
        success: false,
        error: "No fue posible construir el grafo desde PostgreSQL y el vault.",
      });
    }
  });
}
