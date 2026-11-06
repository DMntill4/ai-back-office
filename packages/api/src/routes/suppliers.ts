import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
    db,
    suppliers,
    supplierProducts,
    products,
    purchaseOrders,
    shipments,
    executeEvaluarProveedores,
    evaluarProveedoresSchema,
    listCompanySuppliers,
    getSupplierDetail,
    addCompanySupplier,
} from "@mint/core";
import { eq } from "drizzle-orm";
import { currentSession } from "./auth";
import { sseHub } from "../events/sseHub";

/**
 * Rutas de Proveedores.
 *
 * Conecta:
 *  - tablas `suppliers` + `supplierProducts` (SLA y condiciones)
 *  - `tools/evaluarProveedores.executeEvaluarProveedores` (re-evaluación autónoma)
 *
 * Endpoints:
 *  - GET  /api/suppliers          → listado con score SLA
 *  - POST /api/suppliers/evaluate → re-evaluación autónoma por producto/criterio
 */

interface SupplierSla {
    puntualidadPct: number;
    calidadPct: number;
    cumplimientoPct: number;
    scoreGrade: "A" | "B" | "C" | "D";
}

interface SupplierListItem {
    id: string;
    code: string;
    name: string;
    legalName: string;
    nit: string;
    category: string;
    city: string;
    address: string;
    contactPerson: string;
    phone: string;
    email: string;
    paymentTerms: string;
    annualVolumeCop: number;
    scoreGlobal: number;
    leadTimeDays: number;
    defectRatePct: number;
    status: "homologado" | "observacion" | "critico";
    sla: SupplierSla;
    summary: string;
    productsCount: number;
}

/** Deriva un score determinista y estable a partir del id del proveedor. */
function stableScore(seed: string, min: number, max: number): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
    }
    const ratio = (hash % 1000) / 1000;
    return Math.round((min + ratio * (max - min)) * 10) / 10;
}

function gradeFromScore(score: number): SupplierSla["scoreGrade"] {
    if (score >= 90) return "A";
    if (score >= 75) return "B";
    if (score >= 60) return "C";
    return "D";
}

function buildSupplierItem(
    s: any,
    links: Array<{ leadTimeDays: number | null; unitPrice: string | null }>,
    supplierOrders: Array<any> = [],
    supplierShipments: Array<any> = [],
): SupplierListItem {
    const leadTimes = links.map((l) => l.leadTimeDays ?? 0).filter((n) => n > 0);
    const leadTimeDays = leadTimes.length
        ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
        : 0;

    const totalOrders = supplierOrders.length;
    const totalShipments = supplierShipments.length;
    const realVolume = supplierOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);

    const onTimeShipments = supplierShipments.filter((sh) => sh.status !== "retrasado" && sh.status !== "cancelado").length;
    const completedOrders = supplierOrders.filter((o) => o.status !== "cancelada").length;

    const hasRealHistory = totalOrders > 0 || totalShipments > 0;
    const puntualidadPct = totalShipments > 0 ? Math.round((onTimeShipments / totalShipments) * 1000) / 10 : 0;
    const cumplimientoPct = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 1000) / 10 : 0;
    const calidadPct = hasRealHistory ? 100 : 0;
    const defectRatePct = 0;
    const scoreGlobal = hasRealHistory
        ? Math.round((((puntualidadPct || cumplimientoPct) + cumplimientoPct + calidadPct) / 3) * 10) / 10
        : 0;

    const status: SupplierListItem["status"] = !hasRealHistory
        ? "observacion"
        : scoreGlobal >= 88
        ? "homologado"
        : scoreGlobal >= 75
        ? "observacion"
        : "critico";

    return {
        id: s.id,
        code: s.id,
        name: s.name,
        legalName: s.name,
        nit: s.taxId || "N/D",
        category: links.length > 0 ? "Catálogo" : "General",
        city: s.city || "N/D",
        address: s.streetAddress || "N/D",
        contactPerson: s.name,
        phone: s.phone || "N/D",
        email: s.email || "N/D",
        paymentTerms: "Según orden de compra",
        annualVolumeCop: Math.round(realVolume * 100) / 100,
        scoreGlobal,
        leadTimeDays,
        defectRatePct,
        status,
        sla: {
            puntualidadPct,
            calidadPct,
            cumplimientoPct,
            scoreGrade: hasRealHistory ? gradeFromScore(scoreGlobal) : "C",
        },
        summary: hasRealHistory
            ? `Proveedor ${s.name}: ${totalOrders} orden(es) reales ($${realVolume.toFixed(2)}) y ${links.length} producto(s) vinculados.`
            : `Proveedor ${s.name}: ${links.length} producto(s) en catálogo. Sin historial de órdenes ni entregas registradas aún (cero métricas inventadas).`,
        productsCount: links.length,
    };
}

export async function suppliersRoutes(fastify: FastifyInstance) {
    // 1. Listado de proveedores con score SLA
    fastify.get("/api/suppliers", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const [supplierRows, links, ordersRows, shipmentRows] = await Promise.all([
                db.select().from(suppliers).where(eq(suppliers.companyId, companyId)),
                db.select().from(supplierProducts).where(eq(supplierProducts.companyId, companyId)),
                db.select().from(purchaseOrders).where(eq(purchaseOrders.companyId, companyId)),
                db.select().from(shipments).where(eq(shipments.companyId, companyId)),
            ]);

            const items = supplierRows.map((s) => {
                const own = links.filter((l) => l.supplierId === s.id);
                const suppOrders = ordersRows.filter((o) => o.supplierId === s.id);
                const orderIds = new Set(suppOrders.map((o) => o.id));
                const suppShipments = shipmentRows.filter((sh) => sh.purchaseOrderId && orderIds.has(sh.purchaseOrderId));
                return buildSupplierItem(s, own, suppOrders, suppShipments);
            });

            return { success: true, count: items.length, data: items };
        } catch (err: any) {
            return {
                success: false,
                count: 0,
                data: [],
                message: `Error al consultar proveedores: ${err.message}`,
            };
        }
    });

    // 2. Re-evaluación autónoma de proveedores
    fastify.post("/api/suppliers/evaluate", async (request: FastifyRequest, reply: FastifyReply) => {
        const companyId = currentSession.companyId;
        const body = (request.body as any) || {};

        const parsed = evaluarProveedoresSchema.safeParse({
            producto_id: body.producto_id ?? body.productId ?? body.sku,
            criterio: body.criterio ?? "balanceado",
        });

        if (!parsed.success) {
            reply.code(400);
            return {
                success: false,
                message: "Payload inválido para evaluación de proveedores.",
                issues: parsed.error.issues,
            };
        }

        try {
            const result = await executeEvaluarProveedores(parsed.data, { companyId });
            const resultMessage =
                typeof (result as any).message === "string"
                    ? (result as any).message
                    : `Evaluación completada para '${parsed.data.producto_id}'.`;

            if (!result.isSuccess) {
                reply.code(422);
                return { success: false, message: resultMessage, data: result };
            }

            sseHub.broadcast({
                type: "supplier_evaluation",
                agent: "comprasSpecialist",
                action: "evaluate_suppliers",
                details: `Evaluación de proveedores para '${parsed.data.producto_id}' con criterio '${parsed.data.criterio}'.`,
                resultSummary: resultMessage,
                payload: result,
            });

            return { success: true, message: resultMessage, data: result };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error al evaluar proveedores: ${err.message}` };
        }
    });

    // 3. Detalle de un proveedor
    fastify.get("/api/suppliers/:id", async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        const companyId = currentSession.companyId;

        try {
            const [row] = await db
                .select()
                .from(suppliers)
                .where(eq(suppliers.id, id))
                .limit(1);

            if (!row || row.companyId !== companyId) {
                reply.code(404);
                return { success: false, message: `Proveedor ${id} no encontrado.` };
            }

            const links = await db
                .select()
                .from(supplierProducts)
                .where(eq(supplierProducts.supplierId, id));

            const productIds = links.map((l) => l.productId);
            const prods = productIds.length
                ? await db.select().from(products).where(eq(products.companyId, companyId))
                : [];

            const catalog = links.map((l) => {
                const p = prods.find((x) => x.id === l.productId);
                return {
                    productId: l.productId,
                    productName: p?.name ?? l.productId,
                    sku: p?.sku ?? null,
                    unitPrice: l.unitPrice,
                    minOrderQuantity: l.minOrderQuantity,
                    leadTimeDays: l.leadTimeDays,
                };
            });

            return {
                success: true,
                data: { ...buildSupplierItem(row, links), catalog },
            };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error al consultar proveedor: ${err.message}` };
        }
    });

    // 4. Inteligencia de proveedores (fleetAndOrdersService): SLA + catálogo + órdenes
    fastify.get("/api/suppliers/intelligence", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await listCompanySuppliers(companyId);
            return { success: true, count: data.length, data };
        } catch (err: any) {
            return {
                success: false,
                count: 0,
                data: [],
                message: `Error al calcular la inteligencia de proveedores: ${err.message}`,
            };
        }
    });

    // 5. Expediente enriquecido de un proveedor
    fastify.get("/api/suppliers/:id/intelligence", async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await getSupplierDetail(companyId, id);
            if (!data) {
                reply.code(404);
                return { success: false, message: `Proveedor ${id} no encontrado.` };
            }
            return { success: true, data };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error al consultar el proveedor: ${err.message}` };
        }
    });

    // 6. Alta de proveedor con validación de dominio
    fastify.post("/api/suppliers", async (request: FastifyRequest, reply: FastifyReply) => {
        const companyId = currentSession.companyId;
        const body = (request.body as any) || {};

        if (!body.name) {
            reply.code(400);
            return { success: false, message: "Se requiere 'name' para crear el proveedor." };
        }

        try {
            const data = await addCompanySupplier(companyId, {
                name: String(body.name),
                email: body.email,
                phone: body.phone,
                taxId: body.taxId,
                city: body.city,
                country: body.country,
                streetAddress: body.streetAddress,
            });
            sseHub.broadcast({
                type: "supplier_created",
                agent: "comprasSpecialist",
                action: "add_supplier",
                details: `Proveedor '${body.name}' registrado en el catálogo del tenant.`,
                payload: data,
            });
            return { success: true, data };
        } catch (err: any) {
            reply.code(422);
            return { success: false, message: `Error al crear el proveedor: ${err.message}` };
        }
    });
}
