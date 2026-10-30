import { FastifyInstance, FastifyRequest } from "fastify";
import { getCompanyDataProfile } from "@mint/core";
import { currentSession } from "./auth";

/**
 * Rutas del Perfil de Datos de la Empresa.
 *
 * Conecta `packages/core/src/services/companyProfileService.ts`:
 *  - `getCompanyDataProfile` → capacidades disponibles, métricas de datos,
 *    salud del tenant y preguntas pendientes sugeridas.
 *
 * Endpoints:
 *  - GET /api/profile
 */

export async function profileRoutes(fastify: FastifyInstance) {
    fastify.get("/api/profile", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await getCompanyDataProfile(companyId);
            return { success: true, data };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                message: `Error al construir el perfil de datos: ${err.message}`,
            };
        }
    });
}
