import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
    auditDataHealth,
    listQuarantinedRecords,
    updateQuarantineStatus,
    updateAllQuarantineStatus,
} from "@mint/core";
import { currentSession } from "./auth";

/**
 * Rutas de Salud de Datos y Cuarentena.
 *
 * Conecta `packages/core/src/services/dataHealthService.ts`:
 *  - `auditDataHealth`            → auditoría de calidad por módulo
 *  - `listQuarantinedRecords`     → registros en cuarentena
 *  - `updateQuarantineStatus`     → revisión individual
 *  - `updateAllQuarantineStatus`  → revisión masiva
 *
 * Endpoints:
 *  - GET   /api/data-health/audit
 *  - GET   /api/data-health/quarantine
 *  - PATCH /api/data-health/quarantine/:id
 *  - POST  /api/data-health/quarantine/resolve-all
 */

const VALID_STATUSES = ["reviewed", "ignored", "resolved"] as const;
type QuarantineStatus = (typeof VALID_STATUSES)[number];

export async function dataHealthRoutes(fastify: FastifyInstance) {
    // 1. Auditoría de salud de datos
    fastify.get("/api/data-health/audit", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await auditDataHealth(companyId);
            return { success: true, data };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                message: `Error al auditar la salud de los datos: ${err.message}`,
            };
        }
    });

    // 2. Listado de registros en cuarentena
    fastify.get("/api/data-health/quarantine", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;
        const limit = Number(query.limit) || 50;

        try {
            const rows = await listQuarantinedRecords(companyId, limit);
            return { success: true, count: rows.length, data: rows };
        } catch (err: any) {
            return {
                success: false,
                count: 0,
                data: [],
                message: `Error al listar registros en cuarentena: ${err.message}`,
            };
        }
    });

    // 3. Revisión individual de un registro en cuarentena
    fastify.patch(
        "/api/data-health/quarantine/:id",
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { id } = request.params as { id: string };
            const body = (request.body as any) || {};
            const status = String(body.status || "reviewed") as QuarantineStatus;
            const reviewer = body.reviewer || currentSession.userName || "Operador Consola";

            if (!VALID_STATUSES.includes(status)) {
                reply.code(400);
                return {
                    success: false,
                    message: `Estado inválido. Opciones: ${VALID_STATUSES.join(", ")}.`,
                };
            }

            try {
                await updateQuarantineStatus(id, status, reviewer);
                return { success: true, id, status, reviewer };
            } catch (err: any) {
                reply.code(500);
                return { success: false, message: `Error al actualizar la cuarentena: ${err.message}` };
            }
        },
    );

    // 4. Resolución masiva de la cuarentena pendiente
    fastify.post("/api/data-health/quarantine/resolve-all", async (request: FastifyRequest, reply: FastifyReply) => {
        const body = (request.body as any) || {};
        const companyId = body.companyId || currentSession.companyId;
        const status = String(body.status || "resolved") as QuarantineStatus;
        const reviewer = body.reviewer || currentSession.userName || "Operador Consola";

        if (!VALID_STATUSES.includes(status)) {
            reply.code(400);
            return {
                success: false,
                message: `Estado inválido. Opciones: ${VALID_STATUSES.join(", ")}.`,
            };
        }

        try {
            await updateAllQuarantineStatus(companyId, status, reviewer);
            return { success: true, companyId, status, reviewer };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error al resolver la cuarentena: ${err.message}` };
        }
    });
}
