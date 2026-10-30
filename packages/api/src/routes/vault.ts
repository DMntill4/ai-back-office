import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getVaultTree, getVaultDocument, getVaultMetrics } from "@mint/core";
import { currentSession } from "./auth";

/**
 * Rutas del Vault de Memoria (Obsidian).
 *
 * Consume `packages/core/src/services/vaultService.ts`.
 *
 * Endpoints:
 *  - GET /api/vault/tree      → árbol de documentos por categoría
 *  - GET /api/vault/docs/:id  → documento con frontmatter + cuerpo
 *  - GET /api/vault/metrics   → salud de datos y distribución
 */

export async function vaultRoutes(fastify: FastifyInstance) {
    // 1. Árbol del vault
    fastify.get("/api/vault/tree", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const tree = await getVaultTree(companyId);
            return { success: true, data: tree };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                message: `Error al leer el árbol del vault: ${err.message}`,
            };
        }
    });

    // 2. Documento individual
    fastify.get("/api/vault/docs/:id", async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const doc = await getVaultDocument(decodeURIComponent(id), companyId);
            if (!doc) {
                reply.code(404);
                return { success: false, message: `Documento '${id}' no encontrado en el vault.` };
            }
            return { success: true, data: doc };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error al leer el documento: ${err.message}` };
        }
    });

    // 3. Métricas del vault
    fastify.get("/api/vault/metrics", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const metrics = await getVaultMetrics(companyId);
            return { success: true, data: metrics };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                message: `Error al calcular métricas del vault: ${err.message}`,
            };
        }
    });
}
