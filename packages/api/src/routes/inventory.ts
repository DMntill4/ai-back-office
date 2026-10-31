import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
    db,
    products,
    inventory,
    warehouses,
    analyzeDynamicCatalogHealth,
    getCompanyCurrency,
    getInventoryIntelligence,
    executeAjustarStock,
    ajustarStockSchema,
    type DynamicInventoryHealth,
} from "@mint/core";
import { eq, count } from "drizzle-orm";
import { currentSession } from "./auth";
import { sseHub } from "../events/sseHub";

/**
 * Rutas de Inventario.
 *
 * Conecta:
 *  - `logisticsCoordinatorService.analyzeDynamicCatalogHealth` (ROP dinámico)
 *  - `inventoryService` / tablas `products` + `inventory` (valoración)
 *  - `tools/ajustarStock.executeAjustarStock` (ajuste auditado)
 *
 * Endpoints:
 *  - GET  /api/inventory/summary    → salud del catálogo y valoración
 *  - GET  /api/inventory/rop-alerts → SKUs bajo punto de reorden
 *  - POST /api/inventory/adjust     → ajuste de stock con auditoría
 */

interface InventorySummary {
    totalSkus: number;
    totalUnits: number;
    totalValuation: number;
    currency: string;
    skusBelowRop: number;
    skusOutOfStock: number;
    skusAtRisk: number;
    healthPct: number;
    byStatus: Record<string, number>;
    generatedAt: string;
}

interface RopAlert {
    productId: string;
    sku: string;
    name: string;
    category: string;
    totalStock: number;
    minStock: number;
    reorderPoint: number;
    dailyBurnRate: number;
    daysOfCoverage: number | null;
    suggestedOrderQty: number;
    unitCostEstimate: number;
    status: DynamicInventoryHealth["status"];
    preferredSupplierName?: string;
    warehouseBreakdown: DynamicInventoryHealth["warehouseBreakdown"];
}

/** Número finito o 0: evita `NaN`/`undefined` llegando al cliente. */
function safeNumber(value: unknown): number {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
}

/**
 * Normaliza una fila de salud de inventario al contrato `RopAlert`.
 * Tolerante a nulos: `daysOfCoverage` puede ser `null` (SKU sin historial de
 * ventas) y `warehouseBreakdown` puede venir vacío si el producto no tiene
 * existencias registradas en ningún almacén.
 */
function toRopAlert(h: DynamicInventoryHealth): RopAlert {
    const breakdown = Array.isArray(h.warehouseBreakdown) ? h.warehouseBreakdown : [];
    return {
        productId: h.productId,
        sku: h.sku,
        name: h.name,
        category: h.category || "General",
        totalStock: safeNumber(h.totalStock),
        minStock: safeNumber(h.minStockStatic),
        reorderPoint: safeNumber(h.reorderPointDynamic),
        dailyBurnRate: safeNumber(h.dailyBurnRate),
        daysOfCoverage:
            h.daysOfCoverage === null || h.daysOfCoverage === undefined
                ? null
                : safeNumber(h.daysOfCoverage),
        suggestedOrderQty: safeNumber(h.suggestedOrderQty),
        unitCostEstimate: safeNumber(h.unitCostEstimate),
        status: h.status,
        preferredSupplierName: h.preferredSupplierName,
        warehouseBreakdown: breakdown.map((w) => ({
            warehouseId: w.warehouseId,
            warehouseName: w.warehouseName || w.warehouseId,
            city: w.city ?? null,
            stock: safeNumber(w.stock),
        })),
    };
}

/** Mensaje legible de cualquier excepción (incluye `AggregateError` de pg). */
function describeError(err: unknown): string {
    if (err instanceof Error) {
        const code = (err as any).code ? ` [${(err as any).code}]` : "";
        return `${err.message}${code}`;
    }
    return String(err);
}

export async function inventoryRoutes(fastify: FastifyInstance) {
    // 1. Resumen de salud del catálogo
    fastify.get("/api/inventory/summary", async (request: FastifyRequest, reply: FastifyReply) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const [health, currency] = await Promise.all([
                analyzeDynamicCatalogHealth(companyId),
                getCompanyCurrency(companyId),
            ]);

            const byStatus: Record<string, number> = {};
            let totalUnits = 0;
            let totalValuation = 0;
            let belowRop = 0;
            let outOfStock = 0;
            let atRisk = 0;

            for (const h of health) {
                byStatus[h.status] = (byStatus[h.status] ?? 0) + 1;
                totalUnits += h.totalStock;
                totalValuation += h.totalStock * (h.unitCostEstimate || 0);
                if (h.status === "AGOTADO") outOfStock += 1;
                else if (h.status === "BAJO") belowRop += 1;
                else if (h.status === "ATENCION_ROP") atRisk += 1;
            }

            const totalSkus = health.length;
            const healthy = byStatus["OPTIMO"] ?? 0;
            const summary: InventorySummary = {
                totalSkus,
                totalUnits,
                totalValuation: Math.round(totalValuation * 100) / 100,
                currency,
                skusBelowRop: belowRop,
                skusOutOfStock: outOfStock,
                skusAtRisk: atRisk,
                healthPct: totalSkus === 0 ? 100 : Math.round((healthy / totalSkus) * 100),
                byStatus,
                generatedAt: new Date().toISOString(),
            };

            return { success: true, data: summary };
        } catch (err: unknown) {
            // 503: la causa típica es la base de datos inaccesible, no un bug de la ruta.
            reply.code(503);
            return {
                success: false,
                data: null,
                error: describeError(err),
                message: `Error al calcular el resumen de inventario: ${describeError(err)}`,
            };
        }
    });

    // 2. Alertas de punto de reorden
    fastify.get("/api/inventory/rop-alerts", async (request: FastifyRequest, reply: FastifyReply) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const health = await analyzeDynamicCatalogHealth(companyId);
            const alerts = (Array.isArray(health) ? health : [])
                .filter((h) => h && h.status !== "OPTIMO")
                .map(toRopAlert)
                .sort((a, b) => (a.daysOfCoverage ?? Infinity) - (b.daysOfCoverage ?? Infinity));

            return {
                success: true,
                count: alerts.length,
                data: alerts,
            };
        } catch (err: unknown) {
            reply.code(503);
            return {
                success: false,
                count: 0,
                data: [],
                error: describeError(err),
                message: `Error al consultar alertas de reorden: ${describeError(err)}`,
            };
        }
    });

    // 3. Ajuste de stock con auditoría
    fastify.post("/api/inventory/adjust", async (request: FastifyRequest, reply: FastifyReply) => {
        const companyId = currentSession.companyId;
        const body = (request.body as any) || {};

        const parsed = ajustarStockSchema.safeParse({
            producto_id: body.producto_id ?? body.productId ?? body.sku,
            cantidad_delta: body.cantidad_delta ?? body.delta,
            motivo: body.motivo ?? body.reason,
        });

        if (!parsed.success) {
            reply.code(400);
            return {
                success: false,
                message: "Payload inválido para ajuste de stock.",
                issues: parsed.error.issues,
            };
        }

        try {
            const result = await executeAjustarStock(parsed.data, { companyId });

            if (!result.isSuccess) {
                reply.code(422);
                return { success: false, message: result.message, data: result };
            }

            sseHub.broadcast({
                type: "inventory_adjustment",
                agent: "inventarioSpecialist",
                action: "adjust_stock",
                details: `Ajuste de stock (${parsed.data.cantidad_delta > 0 ? "+" : ""}${parsed.data.cantidad_delta}) sobre ${parsed.data.producto_id}.`,
                resultSummary: result.message,
                payload: { input: parsed.data, result },
            });

            return { success: true, message: result.message, data: result };
        } catch (err: unknown) {
            reply.code(500);
            return {
                success: false,
                data: null,
                error: describeError(err),
                message: `Error al ajustar stock: ${describeError(err)}`,
            };
        }
    });

    // 4. Detalle de stock por producto (compatibilidad con vistas de inventario)
    fastify.get("/api/inventory/items", async (request: FastifyRequest, reply: FastifyReply) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const [prods, invs, whs] = await Promise.all([
                db.select().from(products).where(eq(products.companyId, companyId)),
                db.select().from(inventory).where(eq(inventory.companyId, companyId)),
                db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
            ]);

            const items = prods.map((p) => {
                const itemInvs = invs.filter((i) => i.productId === p.id);
                const totalStock = itemInvs.reduce((sum, i) => sum + safeNumber(i.stock), 0);
                const primary = itemInvs[0];
                const wh = primary ? whs.find((w) => w.id === primary.warehouseId) : undefined;
                const minStock = safeNumber(p.minStock);
                return {
                    id: p.id,
                    sku: p.sku,
                    name: p.name,
                    category: p.category || "General",
                    warehouseId: wh?.id ?? null,
                    warehouseName: wh?.name ?? "Sin almacén",
                    currentStock: totalStock,
                    minStock,
                    unitPriceCop:
                        p.costPrice == null && p.price == null
                            ? null
                            : safeNumber(p.costPrice ?? p.price),
                    status:
                        totalStock === 0 ? "quiebre" : totalStock < minStock ? "alerta" : "optimo",
                };
            });

            const totalRows = await db
                .select({ value: count() })
                .from(products)
                .where(eq(products.companyId, companyId));
            return {
                success: true,
                count: Number(totalRows[0]?.value ?? items.length),
                data: items,
            };
        } catch (err: unknown) {
            reply.code(503);
            return {
                success: false,
                count: 0,
                data: [],
                error: describeError(err),
                message: `Error al consultar existencias: ${describeError(err)}`,
            };
        }
    });

    // 5. Inteligencia de inventario (quiebre predictivo, ABC/Pareto, sobrestock)
    fastify.get("/api/inventory/intelligence", async (request: FastifyRequest, reply: FastifyReply) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await getInventoryIntelligence(companyId);
            return { success: true, data };
        } catch (err: unknown) {
            reply.code(503);
            return {
                success: false,
                data: null,
                error: describeError(err),
                message: `Error al calcular la inteligencia de inventario: ${describeError(err)}`,
            };
        }
    });
}
