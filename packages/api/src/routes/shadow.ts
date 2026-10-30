import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
    getShadowModeStatus,
    configureShadowMode,
    recordShadowDecision,
    evaluateShadowDecision,
    getShadowComparisonReport,
} from "@mint/core";
import { currentSession } from "./auth";

/**
 * Rutas de Modo Sombra (Shadow Mode).
 *
 * Conecta `packages/core/src/services/shadowModeService.ts`:
 *  - `getShadowModeStatus`         → estado y días restantes
 *  - `configureShadowMode`         → activar/desactivar con duración
 *  - `recordShadowDecision`        → registrar simulación sin ejecutar
 *  - `evaluateShadowDecision`      → comparar simulación vs. realidad
 *  - `getShadowComparisonReport`   → reporte agregado de desviaciones
 *
 * Endpoints:
 *  - GET  /api/shadow/status
 *  - POST /api/shadow/configure
 *  - POST /api/shadow/decisions
 *  - POST /api/shadow/decisions/:id/evaluate
 *  - GET  /api/shadow/report
 */

export async function shadowRoutes(fastify: FastifyInstance) {
    // 1. Estado del modo sombra
    fastify.get("/api/shadow/status", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await getShadowModeStatus(companyId);
            return { success: true, data };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                message: `Error al consultar el modo sombra: ${err.message}`,
            };
        }
    });

    // 2. Activar / desactivar modo sombra
    fastify.post("/api/shadow/configure", async (request: FastifyRequest, reply: FastifyReply) => {
        const body = (request.body as any) || {};
        const companyId = body.companyId || currentSession.companyId;
        const enabled = Boolean(body.enabled);
        const days = Number(body.days) || 14;

        if (days <= 0 || days > 365) {
            reply.code(400);
            return { success: false, message: "La duración debe estar entre 1 y 365 días." };
        }

        try {
            await configureShadowMode(companyId, enabled, days);
            const data = await getShadowModeStatus(companyId);
            return { success: true, data };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error al configurar el modo sombra: ${err.message}` };
        }
    });

    // 3. Registrar una decisión simulada
    fastify.post("/api/shadow/decisions", async (request: FastifyRequest, reply: FastifyReply) => {
        const body = (request.body as any) || {};
        const companyId = body.companyId || currentSession.companyId;

        if (!body.actionType || !body.title) {
            reply.code(400);
            return {
                success: false,
                message: "Se requieren 'actionType' y 'title' para registrar una decisión simulada.",
            };
        }

        try {
            const id = await recordShadowDecision({
                companyId,
                actionType: String(body.actionType),
                proposingAgent: String(body.proposingAgent || "Agente Coordinador Multi-Agente"),
                title: String(body.title),
                simulatedCost: body.simulatedCost != null ? Number(body.simulatedCost) : undefined,
                evidencePayload: body.evidencePayload,
                predictedOutcome: body.predictedOutcome,
            });
            return { success: true, id };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error al registrar la simulación: ${err.message}` };
        }
    });

    // 4. Evaluar una decisión simulada contra el resultado real
    fastify.post(
        "/api/shadow/decisions/:id/evaluate",
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { id } = request.params as { id: string };
            const body = (request.body as any) || {};

            if (!body.actualOutcome || typeof body.actualOutcome !== "object") {
                reply.code(400);
                return {
                    success: false,
                    message: "Se requiere 'actualOutcome' (objeto) para evaluar la simulación.",
                };
            }

            try {
                await evaluateShadowDecision({
                    id,
                    actualOutcome: body.actualOutcome,
                    matched: Boolean(body.matched),
                    notes: body.notes || body.deviationReason,
                });
                return { success: true, id, matched: Boolean(body.matched) };
            } catch (err: any) {
                reply.code(500);
                return { success: false, message: `Error al evaluar la simulación: ${err.message}` };
            }
        },
    );

    // 5. Reporte comparativo agregado
    fastify.get("/api/shadow/report", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await getShadowComparisonReport(companyId);
            return { success: true, data };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                message: `Error al generar el reporte comparativo: ${err.message}`,
            };
        }
    });
}
