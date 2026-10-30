import { FastifyInstance, FastifyRequest } from "fastify";
import { runPreflightCheck } from "@mint/core";
import { currentSession } from "./auth";

/**
 * Rutas de Preflight de Arranque.
 *
 * Conecta `packages/core/src/services/preflightService.ts`:
 *  - `runPreflightCheck` → verificación de BD, esquema, configuración,
 *    integraciones y módulos activos antes de operar.
 *
 * Endpoints:
 *  - GET /api/preflight
 */

export async function preflightRoutes(fastify: FastifyInstance) {
    fastify.get("/api/preflight", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await runPreflightCheck(companyId);
            return { success: true, data };
        } catch (err: any) {
            // `runPreflightCheck` no debería lanzar, pero se protege el endpoint.
            return {
                success: false,
                data: null,
                message: `Error al ejecutar el preflight: ${err.message}`,
            };
        }
    });
}
