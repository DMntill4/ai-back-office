import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
    generateDailyOperationalReport,
    generateInventoryReportData,
    generateSalesReportData,
    generateOrdersReportData,
    generateProfitAndMarginReportData,
    generateDataHealthReportData,
    exportReportToPdf,
    exportReportToCsv,
} from "@mint/core";
import { currentSession } from "./auth";

/**
 * Rutas de Reportes Operativos.
 *
 * Conecta `packages/core/src/services/reportService.ts`:
 *  - `generateDailyOperationalReport`     → resumen ejecutivo diario
 *  - `generateInventoryReportData`        → dataset de inventario
 *  - `generateSalesReportData`            → dataset de ventas
 *  - `generateOrdersReportData`           → dataset de órdenes
 *  - `generateProfitAndMarginReportData`  → dataset de rentabilidad
 *  - `generateDataHealthReportData`       → dataset de salud de datos
 *  - `exportReportToPdf` / `exportReportToCsv` → exportadores sin dependencias nativas
 *
 * Endpoints:
 *  - GET  /api/reports/daily
 *  - GET  /api/reports/:kind            (inventory|sales|orders|profit|data-health)
 *  - POST /api/reports/:kind/export     (format: csv|pdf)
 */

type ReportKind = "inventory" | "sales" | "orders" | "profit" | "data-health";

const REPORT_KINDS: ReportKind[] = ["inventory", "sales", "orders", "profit", "data-health"];

async function buildReportDataset(kind: ReportKind, companyId: string) {
    switch (kind) {
        case "inventory":
            return generateInventoryReportData(companyId);
        case "sales":
            return generateSalesReportData(companyId);
        case "orders":
            return generateOrdersReportData(companyId);
        case "profit":
            return generateProfitAndMarginReportData(companyId);
        case "data-health":
            return generateDataHealthReportData(companyId);
        default:
            throw new Error(`Tipo de reporte no soportado: ${kind}`);
    }
}

export async function reportsRoutes(fastify: FastifyInstance) {
    // 1. Resumen ejecutivo diario
    fastify.get("/api/reports/daily", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await generateDailyOperationalReport(companyId);
            return { success: true, data };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                message: `Error al generar el reporte diario: ${err.message}`,
            };
        }
    });

    // 2. Dataset de cualquier reporte
    fastify.get("/api/reports/:kind", async (request: FastifyRequest, reply: FastifyReply) => {
        const { kind } = request.params as { kind: string };
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        if (!REPORT_KINDS.includes(kind as ReportKind)) {
            reply.code(404);
            return {
                success: false,
                message: `Reporte '${kind}' no existe. Opciones: ${REPORT_KINDS.join(", ")}.`,
            };
        }

        try {
            const data = await buildReportDataset(kind as ReportKind, companyId);
            return { success: true, kind, data };
        } catch (err: any) {
            reply.code(500);
            return { success: false, data: null, message: `Error al generar el reporte: ${err.message}` };
        }
    });

    // 3. Exportación a CSV o PDF
    fastify.post("/api/reports/:kind/export", async (request: FastifyRequest, reply: FastifyReply) => {
        const { kind } = request.params as { kind: string };
        const body = (request.body as any) || {};
        const companyId = body.companyId || currentSession.companyId;
        const format = String(body.format || "csv").toLowerCase();

        if (!REPORT_KINDS.includes(kind as ReportKind)) {
            reply.code(404);
            return {
                success: false,
                message: `Reporte '${kind}' no existe. Opciones: ${REPORT_KINDS.join(", ")}.`,
            };
        }

        if (format !== "csv" && format !== "pdf") {
            reply.code(400);
            return { success: false, message: "Formato no soportado. Usa 'csv' o 'pdf'." };
        }

        try {
            const dataset = await buildReportDataset(kind as ReportKind, companyId);
            const headers = (dataset as any).headers as string[];
            const rows = (dataset as any).rows as (string | number)[][];
            const title = `Reporte ${kind} — ${companyId}`;

            const exported =
                format === "pdf"
                    ? await exportReportToPdf(`mint_${kind}`, title, headers, rows)
                    : await exportReportToCsv(`mint_${kind}`, headers, rows);

            return { success: true, kind, format, data: exported };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error al exportar el reporte: ${err.message}` };
        }
    });
}
