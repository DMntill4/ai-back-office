import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
    getCompanyConfig,
    setCompanyConfig,
    getCompanyTimezone,
    updateProductMinStock,
    listProductThresholds,
    COMMON_TIMEZONES,
} from "@mint/core";
import { currentSession } from "./auth";

/**
 * Rutas de Configuración de Empresa.
 *
 * Conecta `packages/core/src/services/configService.ts`:
 *  - `getCompanyConfig`        → configuración completa del tenant
 *  - `setCompanyConfig`        → actualiza un parámetro validado
 *  - `getCompanyTimezone`      → zona horaria IANA
 *  - `listProductThresholds`   → umbrales de stock por producto
 *  - `updateProductMinStock`   → actualiza el stock mínimo de un producto
 *
 * Endpoints:
 *  - GET   /api/config
 *  - PATCH /api/config
 *  - GET   /api/config/timezones
 *  - GET   /api/config/thresholds
 *  - PATCH /api/config/thresholds/:productId
 */

export async function configRoutes(fastify: FastifyInstance) {
    // 1. Configuración actual
    fastify.get("/api/config", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const [config, timezone] = await Promise.all([
                getCompanyConfig(companyId),
                getCompanyTimezone(companyId),
            ]);
            return { success: true, data: { ...config, timezone } };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                message: `Error al leer la configuración: ${err.message}`,
            };
        }
    });

    // 2. Actualizar un parámetro
    fastify.patch("/api/config", async (request: FastifyRequest, reply: FastifyReply) => {
        const body = (request.body as any) || {};
        const companyId = body.companyId || currentSession.companyId;
        const key = body.key;
        const value = body.value;

        if (!key || value === undefined || value === null) {
            reply.code(400);
            return { success: false, message: "Se requieren 'key' y 'value'." };
        }

        try {
            const result = await setCompanyConfig(companyId, String(key), String(value), body.currency);
            return { success: true, data: result };
        } catch (err: any) {
            reply.code(422);
            return { success: false, message: err.message };
        }
    });

    // 3. Zonas horarias IANA disponibles
    fastify.get("/api/config/timezones", async () => {
        return { success: true, count: COMMON_TIMEZONES.length, data: COMMON_TIMEZONES };
    });

    // 4. Umbrales de stock por producto
    fastify.get("/api/config/thresholds", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await listProductThresholds(companyId);
            return { success: true, count: data.length, data };
        } catch (err: any) {
            return {
                success: false,
                count: 0,
                data: [],
                message: `Error al listar umbrales: ${err.message}`,
            };
        }
    });

    // 5. Actualizar stock mínimo de un producto
    fastify.patch(
        "/api/config/thresholds/:productId",
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { productId } = request.params as { productId: string };
            const body = (request.body as any) || {};
            const companyId = body.companyId || currentSession.companyId;
            const minStock = Number(body.minStock);

            if (!Number.isFinite(minStock) || minStock < 0) {
                reply.code(400);
                return { success: false, message: "El stock mínimo debe ser un número >= 0." };
            }

            try {
                const result = await updateProductMinStock(companyId, productId, minStock);
                return { success: true, data: result };
            } catch (err: any) {
                reply.code(422);
                return { success: false, message: err.message };
            }
        },
    );
}
