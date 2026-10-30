import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
    db,
    shipments,
    warehouses,
    purchaseOrders,
    suppliers,
    trackShipments,
    calculateRealRoute,
    getCompanyCurrency,
    trackShipmentOrOrder,
    calculateMultiProviderRoute,
    proposeAlternativeRoute,
    approveAlternativeRoute,
    listCompanyFleet,
    type GeoPoint,
} from "@mint/core";
import { eq, and } from "drizzle-orm";
import { currentSession } from "./auth";
import { sseHub } from "../events/sseHub";

/**
 * Rutas de Logística y Transporte.
 *
 * Conecta:
 *  - `shipmentService.trackShipments` (envíos reales en PostgreSQL)
 *  - `routeCalculator.calculateRealRoute` (OSRM + fallback Haversine)
 *  - `logisticsCoordinatorService.getCompanyCurrency` (moneda del tenant)
 *
 * Endpoints:
 *  - GET  /api/shipments              → listado de envíos activos
 *  - GET  /api/shipments/:id          → expediente completo del envío
 *  - POST /api/shipments/:id/reroute  → re-enrutamiento asistido por IA
 */

interface ShipmentListItem {
    id: string;
    shipmentCode: string;
    trackingNumber: string;
    orderId: string | null;
    carrier: string;
    status: "en_preparacion" | "en_transito" | "retrasado" | "entregado" | "cancelado";
    origin: string | null;
    destination: string | null;
    currentLocation: string | null;
    eta: string;
    actualDelivery: string | null;
    progressPct: number;
    notes: string | null;
}

interface TimelineEvent {
    id: string;
    timestamp: string;
    title: string;
    description: string;
    type: "info" | "success" | "warning" | "critical";
}

const STATUS_PROGRESS: Record<string, number> = {
    en_preparacion: 10,
    en_transito: 55,
    retrasado: 45,
    entregado: 100,
    cancelado: 0,
};

function toListItem(row: any): ShipmentListItem {
    return {
        id: row.id,
        shipmentCode: row.trackingNumber || row.id,
        trackingNumber: row.trackingNumber,
        orderId: row.purchaseOrderId ?? null,
        carrier: row.carrier,
        status: row.status,
        origin: row.originLocation ?? null,
        destination: row.destinationLocation ?? null,
        currentLocation: row.currentLocation ?? null,
        eta: row.estimatedDelivery ? new Date(row.estimatedDelivery).toISOString() : new Date().toISOString(),
        actualDelivery: row.actualDelivery ? new Date(row.actualDelivery).toISOString() : null,
        progressPct: STATUS_PROGRESS[row.status] ?? 0,
        notes: row.notes ?? null,
    };
}

function buildTimeline(row: any): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const created = row.createdAt ? new Date(row.createdAt) : new Date(row.estimatedDelivery);
    events.push({
        id: `${row.id}-created`,
        timestamp: created.toISOString(),
        title: "Envío registrado",
        description: `Guía ${row.trackingNumber} creada con transportadora ${row.carrier}.`,
        type: "info",
    });

    if (row.originLocation) {
        events.push({
            id: `${row.id}-pickup`,
            timestamp: new Date(created.getTime() + 60 * 60 * 1000).toISOString(),
            title: "Recogido en origen",
            description: `Carga recogida en ${row.originLocation}.`,
            type: "success",
        });
    }

    if (row.currentLocation) {
        events.push({
            id: `${row.id}-transit`,
            timestamp: new Date(created.getTime() + 6 * 60 * 60 * 1000).toISOString(),
            title: "En tránsito",
            description: `Última posición conocida: ${row.currentLocation}.`,
            type: row.status === "retrasado" ? "warning" : "info",
        });
    }

    if (row.status === "retrasado") {
        events.push({
            id: `${row.id}-delay`,
            timestamp: new Date().toISOString(),
            title: "Retraso detectado",
            description: row.notes || "El transportista reportó una demora en la ruta.",
            type: "critical",
        });
    }

    if (row.status === "entregado" && row.actualDelivery) {
        events.push({
            id: `${row.id}-delivered`,
            timestamp: new Date(row.actualDelivery).toISOString(),
            title: "Entregado",
            description: `Entrega confirmada en ${row.destinationLocation ?? "destino"}.`,
            type: "success",
        });
    }

    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export async function logisticsRoutes(fastify: FastifyInstance) {
    // 1. Listado de envíos activos
    fastify.get("/api/shipments", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;
        const statusFilter = query.status as string | undefined;

        try {
            const result = await trackShipments({ companyId });
            let items = result.shipments.map((s) => toListItem(s));

            if (statusFilter) {
                items = items.filter((s) => s.status === statusFilter);
            }

            return {
                success: true,
                count: items.length,
                data: items,
                message: result.message,
            };
        } catch (err: any) {
            return {
                success: false,
                count: 0,
                data: [],
                message: `Error al consultar envíos: ${err.message}`,
            };
        }
    });

    // 2. Expediente completo de un envío
    fastify.get("/api/shipments/:id", async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        const companyId = currentSession.companyId;

        try {
            const [row] = await db
                .select()
                .from(shipments)
                .where(and(eq(shipments.companyId, companyId), eq(shipments.id, id)))
                .limit(1);

            if (!row) {
                reply.code(404);
                return { success: false, message: `Envío ${id} no encontrado.` };
            }

            const currency = await getCompanyCurrency(companyId);

            // Intentar resolver coordenadas de origen/destino desde almacenes
            let route: Awaited<ReturnType<typeof calculateRealRoute>> | null = null;
            try {
                const whs = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId));
                const originWh = whs.find(
                    (w) => w.name && row.originLocation && w.name.toLowerCase() === row.originLocation.toLowerCase()
                );
                const destWh = whs.find(
                    (w) => w.name && row.destinationLocation && w.name.toLowerCase() === row.destinationLocation.toLowerCase()
                );

                if (originWh?.latitude != null && originWh?.longitude != null && destWh?.latitude != null && destWh?.longitude != null) {
                    const origin: GeoPoint = {
                        latitude: Number(originWh.latitude),
                        longitude: Number(originWh.longitude),
                        name: originWh.name,
                        city: originWh.city ?? undefined,
                    };
                    const destination: GeoPoint = {
                        latitude: Number(destWh.latitude),
                        longitude: Number(destWh.longitude),
                        name: destWh.name,
                        city: destWh.city ?? undefined,
                    };
                    route = await calculateRealRoute(origin, destination, { currency });
                }
            } catch {
                route = null;
            }

            return {
                success: true,
                data: {
                    ...toListItem(row),
                    timeline: buildTimeline(row),
                    route: route
                        ? {
                            distanceKm: route.distanceKm,
                            durationMinutes: route.durationMinutes,
                            durationFormatted: route.durationFormatted,
                            costoFleteEstimado: route.costoFleteEstimado,
                            moneda: route.moneda,
                            desgloseCostos: route.desgloseCostos,
                            motorUtilizado: route.motorUtilizado,
                            origin: route.origin,
                            destination: route.destination,
                        }
                        : null,
                    alerts: row.status === "retrasado"
                        ? [
                            {
                                id: `${row.id}-alert`,
                                severity: "alta",
                                title: "Retraso en tránsito",
                                message: row.notes || "El envío presenta una demora respecto a la ETA planificada.",
                            },
                        ]
                        : [],
                },
            };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error al consultar el envío: ${err.message}` };
        }
    });

    // 3. Re-enrutamiento asistido por IA
    fastify.post("/api/shipments/:id/reroute", async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        const body = (request.body as any) || {};
        const companyId = currentSession.companyId;

        try {
            const [row] = await db
                .select()
                .from(shipments)
                .where(and(eq(shipments.companyId, companyId), eq(shipments.id, id)))
                .limit(1);

            if (!row) {
                reply.code(404);
                return { success: false, message: `Envío ${id} no encontrado.` };
            }

            const currency = await getCompanyCurrency(companyId);

            // Punto de origen: posición actual o almacén de origen
            let origin: GeoPoint | null = null;
            let destination: GeoPoint | null = null;

            const whs = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId));
            const originWh = whs.find(
                (w) => w.name && row.originLocation && w.name.toLowerCase() === row.originLocation.toLowerCase()
            );
            const destWh = whs.find(
                (w) => w.name && row.destinationLocation && w.name.toLowerCase() === row.destinationLocation.toLowerCase()
            );

            if (originWh?.latitude != null && originWh?.longitude != null) {
                origin = {
                    latitude: Number(originWh.latitude),
                    longitude: Number(originWh.longitude),
                    name: originWh.name,
                    city: originWh.city ?? undefined,
                };
            }
            if (destWh?.latitude != null && destWh?.longitude != null) {
                destination = {
                    latitude: Number(destWh.latitude),
                    longitude: Number(destWh.longitude),
                    name: destWh.name,
                    city: destWh.city ?? undefined,
                };
            }

            // Permitir override explícito desde el cliente
            if (body.origin && typeof body.origin.latitude === "number") origin = body.origin;
            if (body.destination && typeof body.destination.latitude === "number") destination = body.destination;

            if (!origin || !destination) {
                reply.code(422);
                return {
                    success: false,
                    message:
                        "No se pudieron resolver las coordenadas de origen/destino. Envía `origin` y `destination` en el cuerpo.",
                };
            }

            const route = await calculateRealRoute(origin, destination, {
                currency,
                ratePerKm: body.ratePerKm,
            });

            const recommendation = {
                shipmentId: id,
                reason: body.reason || "Optimización de ruta solicitada por el operador.",
                distanceKm: route.distanceKm,
                durationMinutes: route.durationMinutes,
                durationFormatted: route.durationFormatted,
                costoFleteEstimado: route.costoFleteEstimado,
                moneda: route.moneda,
                desgloseCostos: route.desgloseCostos,
                motorUtilizado: route.motorUtilizado,
                origin: route.origin,
                destination: route.destination,
                generatedAt: new Date().toISOString(),
            };

            sseHub.broadcast({
                type: "logistics_reroute",
                agent: "transporteSpecialist",
                action: "reroute_shipment",
                details: `Re-enrutamiento calculado para el envío ${row.trackingNumber} (${route.distanceKm} km).`,
                resultSummary: `Nueva ruta: ${route.durationFormatted} · ${route.costoFleteFormatted}`,
                payload: recommendation,
            });

            return { success: true, data: recommendation };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error al re-enrutar el envío: ${err.message}` };
        }
    });

    // 4. Flota y envíos activos (fleetAndOrdersService)
    fastify.get("/api/logistics/fleet", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await listCompanyFleet(companyId);
            return { success: true, data };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                message: `Error al consultar la flota: ${err.message}`,
            };
        }
    });

    // 5. Rastreo unificado de pedido / guía / camión / ruta (trackingService)
    fastify.get("/api/logistics/track", async (request: FastifyRequest, reply: FastifyReply) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;
        const q = query.q || query.trackingNumber || query.query;

        if (!q) {
            reply.code(400);
            return {
                success: false,
                message: "Se requiere 'q' (guía, pedido, camión o ruta) para rastrear.",
            };
        }

        try {
            const data = await trackShipmentOrOrder(String(q), companyId);
            if (!data.found) {
                reply.code(404);
                return { success: false, data, message: `No se encontró '${q}'.` };
            }
            return { success: true, data };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error al rastrear: ${err.message}` };
        }
    });

    // 6. Ruta multi-proveedor (Google → TomTom → Mapbox → HERE → OSRM)
    fastify.post("/api/logistics/route", async (request: FastifyRequest, reply: FastifyReply) => {
        const body = (request.body as any) || {};

        if (
            !body.origin ||
            typeof body.origin.latitude !== "number" ||
            !body.destination ||
            typeof body.destination.latitude !== "number"
        ) {
            reply.code(400);
            return {
                success: false,
                message: "Se requieren 'origin' y 'destination' con latitude/longitude numéricos.",
            };
        }

        try {
            const data = await calculateMultiProviderRoute(body.origin, body.destination);
            return { success: true, data };
        } catch (err: any) {
            reply.code(422);
            return { success: false, message: `Error al calcular la ruta: ${err.message}` };
        }
    });

    // 7. Proponer ruta alternativa ante una incidencia
    fastify.post("/api/logistics/incidents", async (request: FastifyRequest, reply: FastifyReply) => {
        const companyId = currentSession.companyId;
        const body = (request.body as any) || {};

        if (!body.trackingNumber || !body.reason) {
            reply.code(400);
            return {
                success: false,
                message: "Se requieren 'trackingNumber' y 'reason' para registrar la incidencia.",
            };
        }

        try {
            const data = await proposeAlternativeRoute({
                companyId,
                trackingNumber: String(body.trackingNumber),
                incidentType: body.incidentType || "delay",
                reason: String(body.reason),
                delayMinutes: Number(body.delayMinutes) || 0,
                currentLocation: String(body.currentLocation || "En ruta"),
                newRouteDetails: body.newRouteDetails || {},
            });
            sseHub.broadcast({
                type: "logistics_incident",
                agent: "transporteSpecialist",
                action: "propose_alternative_route",
                details: `Incidencia registrada para la guía ${body.trackingNumber}: ${body.reason}.`,
                payload: data,
            });
            return { success: true, data };
        } catch (err: any) {
            reply.code(422);
            return { success: false, message: `Error al registrar la incidencia: ${err.message}` };
        }
    });

    // 8. Aprobar ruta alternativa (HITL)
    fastify.post(
        "/api/logistics/incidents/:id/approve",
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { id } = request.params as { id: string };
            const body = (request.body as any) || {};
            const approvedBy = body.approvedBy || currentSession.userName || "Operador Consola";

            try {
                const result = await approveAlternativeRoute(id, approvedBy);
                if (!result.success) {
                    reply.code(404);
                    return { success: false, message: result.message };
                }
                sseHub.broadcast({
                    type: "logistics_reroute_approved",
                    agent: "transporteSpecialist",
                    action: "approve_alternative_route",
                    details: result.message,
                    payload: { incidentId: id, approvedBy },
                });
                return { success: true, message: result.message };
            } catch (err: any) {
                reply.code(500);
                return { success: false, message: `Error al aprobar la ruta: ${err.message}` };
            }
        },
    );
}
