import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
    getDailyExecutiveBriefing,
    getSmartAlerts,
    forecastDemandWithMargin,
    reconcileSalesPaymentsDeliveries,
    analyzeWeeklyProfitVariation,
    exportMintBackup,
} from "@mint/core";
import { currentSession } from "./auth";

/**
 * Rutas de Analítica de Negocio.
 *
 * Conecta `packages/core/src/services/businessAnalyticsService.ts`:
 *  - `getDailyExecutiveBriefing`      → briefing ejecutivo con KPIs reales
 *  - `getSmartAlerts`                 → alertas inteligentes priorizadas
 *  - `forecastDemandWithMargin`       → pronóstico de demanda con margen de error
 *  - `reconcileSalesPaymentsDeliveries` → conciliación a tres vías
 *  - `analyzeWeeklyProfitVariation`   → variación semanal de ganancia
 *  - `exportMintBackup`               → respaldo completo del tenant
 *
 * Endpoints:
 *  - GET /api/analytics/briefing
 *  - GET /api/analytics/alerts
 *  - GET /api/analytics/forecast?sku=...
 *  - GET /api/analytics/reconciliation
 *  - GET /api/analytics/profit-variation
 *  - GET /api/analytics/backup
 */

export async function analyticsRoutes(fastify: FastifyInstance) {
    // 1. Briefing ejecutivo diario
    fastify.get("/api/analytics/briefing", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await getDailyExecutiveBriefing(companyId);
            return { success: true, data };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                message: `Error al generar el briefing ejecutivo: ${err.message}`,
            };
        }
    });

    // 2. Alertas inteligentes
    fastify.get("/api/analytics/alerts", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const alerts = await getSmartAlerts(companyId);
            return { success: true, count: alerts.length, data: alerts };
        } catch (err: any) {
            return {
                success: false,
                count: 0,
                data: [],
                message: `Error al calcular alertas inteligentes: ${err.message}`,
            };
        }
    });

    // 3. Pronóstico de demanda con margen de error explícito
    fastify.get("/api/analytics/forecast", async (request: FastifyRequest, reply: FastifyReply) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;
        const sku = query.sku || query.productId;
        const days = Number(query.days) || 30;

        if (!sku) {
            reply.code(400);
            return {
                success: false,
                message: "Se requiere el parámetro 'sku' (o 'productId') para pronosticar la demanda.",
            };
        }

        try {
            const data = await forecastDemandWithMargin(companyId, String(sku), days);
            return { success: true, data };
        } catch (err: any) {
            reply.code(422);
            return { success: false, data: null, message: err.message };
        }
    });

    // 4. Conciliación ventas / pagos / entregas
    fastify.get("/api/analytics/reconciliation", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await reconcileSalesPaymentsDeliveries(companyId);
            return { success: true, data };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                message: `Error al conciliar ventas, pagos y entregas: ${err.message}`,
            };
        }
    });

    // 5. Variación semanal de ganancia
    fastify.get("/api/analytics/profit-variation", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await analyzeWeeklyProfitVariation(companyId);
            return { success: true, data };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                message: `Error al analizar la variación de ganancia: ${err.message}`,
            };
        }
    });

    // 6. Respaldo completo del tenant
    fastify.get("/api/analytics/backup", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await exportMintBackup(companyId);
            return { success: true, data };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                message: `Error al exportar el respaldo: ${err.message}`,
            };
        }
    });
}
