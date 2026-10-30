import { FastifyInstance, FastifyRequest } from "fastify";
import {
    getKnowledgeGraph,
    type GraphFilters,
    type MintNodeType,
    type MintRelationType,
} from "@mint/core";
import { currentSession } from "./auth";

/**
 * Rutas del Grafo de Conocimiento Operativo.
 *
 * Consume `graph.service.getKnowledgeGraph` (que a su vez lee PostgreSQL vía
 * `graph.queries.fetchRawGraphEntities`), reemplazando `graphData.ts` estático.
 *
 * Endpoints:
 *  - GET /api/graph/data → nodos (entities) + aristas (relationships)
 */

export async function graphRoutes(fastify: FastifyInstance) {
    fastify.get("/api/graph/data", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        const filters: GraphFilters = {
            mode: query.mode,
            nodeTypes: query.nodeTypes
                ? (String(query.nodeTypes).split(",").filter(Boolean) as MintNodeType[])
                : undefined,
            relationTypes: query.relationTypes
                ? (String(query.relationTypes).split(",").filter(Boolean) as MintRelationType[])
                : undefined,
            searchQuery: query.searchQuery || query.q || undefined,
        };

        try {
            const graph = await getKnowledgeGraph(filters);
            return {
                success: true,
                data: {
                    nodes: graph.nodes,
                    edges: graph.edges,
                    metadata: graph.metadata,
                    companyId,
                },
            };
        } catch (err: any) {
            return {
                success: false,
                data: { nodes: [], edges: [], metadata: null },
                message: `Error al construir el grafo de conocimiento: ${err.message}`,
            };
        }
    });
}
