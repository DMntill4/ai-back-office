/**
 * Cliente HTTP de la consola web.
 *
 * - Base URL configurable vía `VITE_API_BASE_URL` (por defecto `/api`, que en
 *   desarrollo Vite proxya a `http://localhost:3001`).
 * - Patrón de *fallback seguro*: si el backend no responde, está caído o
 *   devuelve un error, el llamador recibe los datos estáticos de `mockData.ts`
 *   / `graphData.ts` para que la UI nunca se rompa en desarrollo.
 */

import { INITIAL_VAULT_NOTES } from "../data/mockData";
import type { MintGraphData } from "../types/graph";

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

const RAW_BASE = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;

/** Base normalizada, sin barra final. Por defecto `/api`. */
export const API_BASE_URL = (RAW_BASE || "/api").replace(/\/+$/, "");

const DEFAULT_TIMEOUT_MS = 8000;

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    /** `true` cuando los datos provienen del fallback estático. */
    isFallback: boolean;
    message?: string;
    count?: number;
}

export interface RequestOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    timeoutMs?: number;
    signal?: AbortSignal;
}

export interface CanonicalGraphPayload {
    nodes: Array<{
        id: string;
        label: string;
        type: "agent" | "warehouse" | "product" | "supplier" | "decision" | "document";
        status?: "idle" | "active" | "warning" | "critical";
        metrics?: Record<string, unknown>;
    }>;
    links: Array<{
        source: string;
        target: string;
        relation: string;
        weight?: number;
        active?: boolean;
    }>;
}

// ---------------------------------------------------------------------------
// Núcleo de fetch con timeout
// ---------------------------------------------------------------------------

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = options;
    const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    // Encadenar señal externa si existe.
    if (signal) {
        if (signal.aborted) controller.abort();
        else signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    try {
        const res = await fetch(url, {
            method,
            headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
            body: body !== undefined ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        return (await res.json()) as T;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Ejecuta una petición y, ante cualquier fallo, devuelve el fallback indicado.
 */
export async function requestWithFallback<T>(
    path: string,
    fallback: T,
    options: RequestOptions = {},
): Promise<ApiResponse<T>> {
    try {
        const json = await rawRequest<any>(path, options);
        // Los endpoints devuelven `{ success, data, ... }`; si no, se usa el JSON crudo.
        const data = json && typeof json === "object" && "data" in json ? json.data : json;
        return {
            success: json?.success !== false,
            data: (data ?? fallback) as T,
            isFallback: false,
            message: json?.message,
            count: typeof json?.count === "number" ? json.count : undefined,
        };
    } catch (err: any) {
        return {
            success: false,
            data: fallback,
            isFallback: true,
            message: err?.message ?? "No fue posible consultar el backend.",
        };
    }
}

/** Petición sin fallback (para acciones que deben fallar explícitamente). */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return rawRequest<T>(path, options);
}

// ---------------------------------------------------------------------------
// Contratos de respuesta (espejo de las rutas Fastify)
// ---------------------------------------------------------------------------

export interface ShipmentListItem {
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

export interface InventorySummary {
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

export interface RopAlert {
    productId: string;
    sku: string;
    name: string;
    category: string;
    totalStock: number;
    minStock: number;
    reorderPoint: number;
    dailyBurnRate: number;
    /** `null` cuando el SKU no tiene historial de ventas (cobertura desconocida). */
    daysOfCoverage: number | null;
    suggestedOrderQty: number;
    unitCostEstimate: number;
    status: "OPTIMO" | "ATENCION_ROP" | "BAJO" | "AGOTADO";
    preferredSupplierName?: string;
    warehouseBreakdown: Array<{
        warehouseId: string;
        warehouseName: string;
        city?: string | null;
        stock: number;
    }>;
}

export interface InventoryItemRecord {
    id: string;
    sku: string;
    name: string;
    category: string;
    warehouseId: string | null;
    warehouseName: string;
    currentStock: number;
    minStock: number;
    unitPriceCop: number | null;
    status: "optimo" | "alerta" | "quiebre";
}

export interface PendingDecisionRecord {
    id: string;
    caseId: string;
    title: string;
    actionType: string;
    proposingAgent: string | null;
    costMxn: number | null;
    riskScore: number;
    policyReason: string | null;
    evidence: Record<string, unknown>;
    costBreakdown?: {
        tokens: number;
        costUsd: number;
        model: string | null;
    };
    evaluation?: Record<string, unknown> | null;
    createdAt: string;
}

export interface SupplierSla {
    puntualidadPct: number;
    calidadPct: number;
    cumplimientoPct: number;
    scoreGrade: "A" | "B" | "C" | "D";
}

export interface SupplierListItem {
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

export type VaultCategory = "decisions" | "quarantine" | "audit" | "questions" | "entities" | "other";

export interface VaultDocumentSummary {
    id: string;
    relativePath: string;
    title: string;
    category: VaultCategory;
    folder: string;
    estado: string;
    confianza: string;
    modulo: string;
    tipo: string;
    tags: string[];
    wikilinks: string[];
    updatedAt: string;
    sizeBytes: number;
}

export interface VaultTreeCategory {
    key: VaultCategory;
    label: string;
    count: number;
    documents: VaultDocumentSummary[];
}

export interface VaultTree {
    companyId: string;
    vaultPath: string;
    exists: boolean;
    totalDocuments: number;
    categories: VaultTreeCategory[];
    generatedAt: string;
}

export interface VaultDocument {
    id: string;
    relativePath: string;
    title: string;
    category: VaultCategory;
    folder: string;
    metadata: Record<string, unknown>;
    content: string;
    tags: string[];
    wikilinks: string[];
    updatedAt: string;
    sizeBytes: number;
}

export interface TelemetryCostTask {
    taskId: string;
    tokens: number;
    costUsd: number;
    model: string | null;
    promptTokens?: number;
    completionTokens?: number;
    events: number;
    lastAt?: number;
}

export interface TelemetryCostsResponse {
    session: {
        totalTokens: number;
        totalCostUsd: number;
        promptTokens: number;
        completionTokens: number;
        taskCount: number;
    };
    tasks: TelemetryCostTask[];
}

export interface VaultMetrics {
    companyId: string;
    vaultPath: string;
    exists: boolean;
    totalDocuments: number;
    dataHealthPct: number;
    pendingDocuments: number;
    contradictedDocuments: number;
    expiredDocuments: number;
    hypothesesPending: number;
    totalSizeBytes: number;
    lastUpdated: string | null;
    distribution: Record<VaultCategory, number>;
    byStatus: Record<string, number>;
    byConfidence: Record<string, number>;
    generatedAt: string;
}

// ---------------------------------------------------------------------------
// Fallbacks estáticos
// ---------------------------------------------------------------------------

export const FALLBACK_SHIPMENTS: ShipmentListItem[] = [
    {
        id: "ship_01",
        shipmentCode: "MINT-ENV-8842",
        trackingNumber: "MINT-ENV-8842",
        orderId: "po_1024",
        carrier: "Transportes del Norte",
        status: "en_transito",
        origin: "Bodega Central Bogotá",
        destination: "Sucursal Bucaramanga",
        currentLocation: "Autopista Norte Km 42",
        eta: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
        actualDelivery: null,
        progressPct: 55,
        notes: "Carga consolidada de ferretería industrial.",
    },
    {
        id: "ship_02",
        shipmentCode: "MINT-ENV-8843",
        trackingNumber: "MINT-ENV-8843",
        orderId: "po_1025",
        carrier: "Logística Andina",
        status: "retrasado",
        origin: "Bodega Central Bogotá",
        destination: "Sucursal Medellín",
        currentLocation: "Peaje Honda",
        eta: new Date(Date.now() + 11 * 3600 * 1000).toISOString(),
        actualDelivery: null,
        progressPct: 45,
        notes: "Retraso por cierre vial en la ruta principal.",
    },
    {
        id: "ship_03",
        shipmentCode: "MINT-ENV-8844",
        trackingNumber: "MINT-ENV-8844",
        orderId: "po_1026",
        carrier: "Envíos Express SAS",
        status: "entregado",
        origin: "Bodega Central Bogotá",
        destination: "Sucursal Cali",
        currentLocation: "Sucursal Cali",
        eta: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        actualDelivery: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        progressPct: 100,
        notes: "Entrega confirmada con firma digital.",
    },
];

export const FALLBACK_SUPPLIERS: SupplierListItem[] = [
    {
        id: "supp_01",
        code: "PRV-001",
        name: "Ferreterías Unidas Bogotá",
        legalName: "Ferreterías Unidas Bogotá S.A.S.",
        nit: "900.123.456-7",
        category: "Herramientas",
        city: "Bogotá D.C.",
        address: "Calle 13 # 45-67",
        contactPerson: "Carlos Ramírez",
        phone: "+57 601 555 0101",
        email: "ventas@ferreteriasunidas.co",
        paymentTerms: "30 días",
        annualVolumeCop: 480_000_000,
        scoreGlobal: 94.2,
        leadTimeDays: 2,
        defectRatePct: 1.2,
        status: "homologado",
        sla: { puntualidadPct: 96.5, calidadPct: 98.8, cumplimientoPct: 95.1, scoreGrade: "A" },
        summary: "Proveedor estratégico con entregas puntuales y catálogo amplio de herramientas.",
        productsCount: 42,
    },
    {
        id: "supp_02",
        code: "PRV-002",
        name: "Distribuciones Industriales de Santander",
        legalName: "Distribuciones Industriales de Santander Ltda.",
        nit: "890.456.123-4",
        category: "Equipos",
        city: "Bucaramanga",
        address: "Carrera 27 # 12-34",
        contactPerson: "María Gómez",
        phone: "+57 607 555 0202",
        email: "compras@disantander.co",
        paymentTerms: "45 días",
        annualVolumeCop: 320_000_000,
        scoreGlobal: 81.5,
        leadTimeDays: 1,
        defectRatePct: 3.4,
        status: "observacion",
        sla: { puntualidadPct: 84.2, calidadPct: 88.1, cumplimientoPct: 79.9, scoreGrade: "B" },
        summary: "Buen lead time pero con incidencias puntuales de calidad en lotes recientes.",
        productsCount: 28,
    },
    {
        id: "supp_03",
        code: "PRV-003",
        name: "Suministros del Pacífico",
        legalName: "Suministros del Pacífico S.A.",
        nit: "860.789.321-0",
        category: "Insumos",
        city: "Cali",
        address: "Avenida 6N # 23-45",
        contactPerson: "Jorge Valencia",
        phone: "+57 602 555 0303",
        email: "contacto@suministrospacifico.co",
        paymentTerms: "60 días",
        annualVolumeCop: 210_000_000,
        scoreGlobal: 68.4,
        leadTimeDays: 5,
        defectRatePct: 7.8,
        status: "critico",
        sla: { puntualidadPct: 71.3, calidadPct: 74.2, cumplimientoPct: 65.8, scoreGrade: "C" },
        summary: "Requiere plan de mejora: tasa de defectos y cumplimiento por debajo del umbral.",
        productsCount: 15,
    },
];

/** Construye un árbol de vault de fallback a partir de `INITIAL_VAULT_NOTES`. */
export function buildFallbackVaultTree(): VaultTree {
    const buckets: Record<VaultCategory, VaultDocumentSummary[]> = {
        decisions: [],
        quarantine: [],
        audit: [],
        questions: [],
        entities: [],
        other: [],
    };

    for (const note of INITIAL_VAULT_NOTES) {
        const folder = note.folder || "Decisiones";
        const category: VaultCategory = folder.toLowerCase().includes("cuarentena")
            ? "quarantine"
            : folder.toLowerCase().includes("polít") || folder.toLowerCase().includes("polit")
                ? "audit"
                : folder.toLowerCase().includes("consenso")
                    ? "questions"
                    : "decisions";

        buckets[category].push({
            id: note.id,
            relativePath: `${folder}/${note.filename}`,
            title: note.title,
            category,
            folder,
            estado: note.estado,
            confianza: String(note.confianza),
            modulo: "general",
            tipo: "nota",
            tags: note.tags ?? [],
            wikilinks: note.wikilinks ?? [],
            updatedAt: note.updatedAt,
            sizeBytes: (note.content ?? "").length,
        });
    }

    const labels: Record<VaultCategory, string> = {
        decisions: "Decisiones",
        quarantine: "Cuarentena",
        audit: "Auditoría",
        questions: "Preguntas",
        entities: "Entidades",
        other: "Otros",
    };

    const order: VaultCategory[] = ["decisions", "quarantine", "audit", "questions", "entities", "other"];

    return {
        companyId: "comp_default",
        vaultPath: "~/.mint/vaults/comp_default",
        exists: false,
        totalDocuments: INITIAL_VAULT_NOTES.length,
        categories: order.map((key) => ({
            key,
            label: labels[key],
            count: buckets[key].length,
            documents: buckets[key],
        })),
        generatedAt: new Date().toISOString(),
    };
}

export const FALLBACK_VAULT_METRICS: VaultMetrics = {
    companyId: "comp_default",
    vaultPath: "~/.mint/vaults/comp_default",
    exists: false,
    totalDocuments: INITIAL_VAULT_NOTES.length,
    dataHealthPct: 92,
    pendingDocuments: INITIAL_VAULT_NOTES.filter((n) => n.estado === "hipotesis").length,
    contradictedDocuments: INITIAL_VAULT_NOTES.filter((n) => n.estado === "contradicha").length,
    expiredDocuments: 0,
    hypothesesPending: INITIAL_VAULT_NOTES.filter((n) => n.estado === "hipotesis").length,
    totalSizeBytes: INITIAL_VAULT_NOTES.reduce((sum, n) => sum + (n.content ?? "").length, 0),
    lastUpdated: new Date().toISOString(),
    distribution: {
        decisions: INITIAL_VAULT_NOTES.length,
        quarantine: 0,
        audit: 0,
        questions: 0,
        entities: 0,
        other: 0,
    },
    byStatus: INITIAL_VAULT_NOTES.reduce<Record<string, number>>((acc, n) => {
        acc[n.estado] = (acc[n.estado] ?? 0) + 1;
        return acc;
    }, {}),
    byConfidence: INITIAL_VAULT_NOTES.reduce<Record<string, number>>((acc, n) => {
        acc[n.confianza] = (acc[n.confianza] ?? 0) + 1;
        return acc;
    }, {}),
    generatedAt: new Date().toISOString(),
};

/**
 * Grafo vacío de degradación segura.
 * Ya NO se usan nodos semilla de `graphData.ts`: si el backend no responde,
 * la vista muestra su `EmptyState` en lugar de datos ficticios.
 */
export const FALLBACK_GRAPH: MintGraphData = {
    nodes: [],
    edges: [],
    metadata: {
        totalNodes: 0,
        totalEdges: 0,
        generatedAt: new Date().toISOString(),
    } as any,
};

// ---------------------------------------------------------------------------
// Endpoints tipados
// ---------------------------------------------------------------------------

export const api = {
    shipments: {
        list: (status?: string) =>
            requestWithFallback<ShipmentListItem[]>(
                `/shipments${status ? `?status=${encodeURIComponent(status)}` : ""}`,
                FALLBACK_SHIPMENTS,
            ),
        detail: (id: string) =>
            requestWithFallback<any>(`/shipments/${encodeURIComponent(id)}`, null),
        reroute: (id: string, body: Record<string, unknown>) =>
            request<any>(`/shipments/${encodeURIComponent(id)}/reroute`, { method: "POST", body }),
    },

    inventory: {
        summary: () =>
            requestWithFallback<InventorySummary | null>("/inventory/summary", null),
        ropAlerts: () =>
            requestWithFallback<RopAlert[]>("/inventory/rop-alerts", []),
        items: () => requestWithFallback<InventoryItemRecord[]>("/inventory/items", []),
        adjust: (body: { producto_id: string; cantidad_delta: number; motivo?: string }) =>
            request<any>("/inventory/adjust", { method: "POST", body }),
    },

    suppliers: {
        list: () => requestWithFallback<SupplierListItem[]>("/suppliers", FALLBACK_SUPPLIERS),
        detail: (id: string) => requestWithFallback<any>(`/suppliers/${encodeURIComponent(id)}`, null),
        evaluate: (body: { producto_id: string; criterio?: "costo" | "velocidad" | "balanceado" }) =>
            request<any>("/suppliers/evaluate", { method: "POST", body }),
    },

    vault: {
        tree: () => requestWithFallback<VaultTree>("/vault/tree", buildFallbackVaultTree()),
        document: (id: string) =>
            requestWithFallback<VaultDocument | null>(`/vault/docs/${encodeURIComponent(id)}`, null),
        metrics: () => requestWithFallback<VaultMetrics>("/vault/metrics", FALLBACK_VAULT_METRICS),
    },

    graph: {
        live: (params?: { mode?: string; searchQuery?: string }) => {
            const qs = new URLSearchParams();
            if (params?.mode) qs.set("mode", params.mode);
            if (params?.searchQuery) qs.set("searchQuery", params.searchQuery);
            const suffix = qs.toString() ? `?${qs.toString()}` : "";
            return request<CanonicalGraphPayload>(`/graph${suffix}`);
        },
        node: (id: string) =>
            request<{ node: import("../types/graph").MintGraphNode; relatedEdges: import("../types/graph").MintGraphEdge[] }>(
                `/graph/nodes/${encodeURIComponent(id)}`,
            ),
        data: (params?: { mode?: string; searchQuery?: string }) => {
            const qs = new URLSearchParams();
            if (params?.mode) qs.set("mode", params.mode);
            if (params?.searchQuery) qs.set("searchQuery", params.searchQuery);
            const suffix = qs.toString() ? `?${qs.toString()}` : "";
            return requestWithFallback<MintGraphData>(`/graph/data${suffix}`, FALLBACK_GRAPH);
        },
    },

    ingest: {
        upload: async (file: File) => {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch(`${API_BASE_URL}/ingest/upload`, { method: "POST", body: form });
            if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
            return (await res.json()) as any;
        },
        /** Sincronización activa contra una fuente real (PostgreSQL read-only o CSV remoto). */
        sync: (body: {
            sourceType?: "postgres_readonly" | "csv";
            connectionString?: string;
            table?: string;
            url?: string;
            limit?: number;
            sourceName?: string;
        }) => request<any>("/ingest/sync", { method: "POST", body }),
    },

    telemetry: {
        /** Desglose de costo/tokens acumulado por tarea y total de la sesión. */
        costs: () =>
            requestWithFallback<TelemetryCostsResponse>("/telemetry/costs", {
                session: { totalTokens: 0, totalCostUsd: 0, promptTokens: 0, completionTokens: 0, taskCount: 0 },
                tasks: [],
            }),
        /** Historial de eventos de telemetría (para paneles de logs). */
        history: (limit = 100) =>
            requestWithFallback<any[]>(`/telemetry/history?limit=${limit}`, []),
    },

    decisions: {
        /** Decisiones pendientes de aprobación humana (HITL). */
        pending: () => requestWithFallback<PendingDecisionRecord[]>("/decisions/pending", []),
        /** Historial de decisiones resueltas (aprobadas / rechazadas). */
        history: (params?: { status?: string; limit?: number; offset?: number }) => {
            const qs = new URLSearchParams();
            if (params?.status) qs.set("status", params.status);
            if (params?.limit) qs.set("limit", String(params.limit));
            if (params?.offset) qs.set("offset", String(params.offset));
            const suffix = qs.toString() ? `?${qs.toString()}` : "";
            return requestWithFallback<any[]>(`/decisions/history${suffix}`, []);
        },
        detail: (id: string) =>
            requestWithFallback<any>(`/decisions/${encodeURIComponent(id)}`, null),
        approve: (id: string, body?: Record<string, unknown>) =>
            request<any>(`/decisions/${encodeURIComponent(id)}/approve`, {
                method: "POST",
                body: body ?? {},
            }),
        reject: (id: string, body?: Record<string, unknown>) =>
            request<any>(`/decisions/${encodeURIComponent(id)}/reject`, {
                method: "POST",
                body: body ?? {},
            }),
        resolve: (id: string, body: { action: "approve" | "reject"; reason?: string }) =>
            request<any>(`/decisions/${encodeURIComponent(id)}/resolve`, {
                method: "POST",
                body,
            }),
    },

    config: {
        /** Configuración de la empresa (modelos, umbrales, zona horaria). */
        get: () => requestWithFallback<any>("/config", null),
        update: (body: Record<string, unknown>) =>
            request<any>("/config", { method: "PATCH", body }),
        timezones: () => requestWithFallback<any[]>("/config/timezones", []),
        thresholds: () => requestWithFallback<any[]>("/config/thresholds", []),
        updateThreshold: (productId: string, body: Record<string, unknown>) =>
            request<any>(`/config/thresholds/${encodeURIComponent(productId)}`, {
                method: "PATCH",
                body,
            }),
    },

    reports: {
        /**
         * Listado de reportes disponibles.
         *
         * El backend NO expone `GET /api/reports` (colección): solo
         * `/api/reports/daily` y `/api/reports/:kind`. Pedir la colección
         * devolvía 404 y activaba el banner de "datos de respaldo".
         *
         * Se consulta `/reports/daily` y se normaliza a un array para que la
         * vista pueda seguir usando `Array.isArray(...)` sin cambios.
         */
        list: (params?: { type?: string; limit?: number }) => {
            const qs = new URLSearchParams();
            if (params?.type) qs.set("type", params.type);
            if (params?.limit) qs.set("limit", String(params.limit));
            const suffix = qs.toString() ? `?${qs.toString()}` : "";
            return requestWithFallback<any[]>(`/reports/daily${suffix}`, []).then((res) => {
                if (!res.success || res.isFallback) return res;
                const payload = res.data as any;
                // `/reports/daily` devuelve un objeto; lo envolvemos en un array
                // de una entrada para mantener el contrato de `list()`.
                const rows = Array.isArray(payload)
                    ? payload
                    : payload && typeof payload === "object"
                        ? [{ kind: "daily", data: payload }]
                        : [];
                return { ...res, data: rows };
            });
        },
        detail: (id: string) =>
            requestWithFallback<any>(`/reports/${encodeURIComponent(id)}`, null),
    },

    products: {
        list: () => requestWithFallback<any[]>("/products", []),
        detail: (id: string) =>
            requestWithFallback<any>(`/products/${encodeURIComponent(id)}`, null),
    },

    team: {
        /** Operadores con acceso a la empresa (RBAC). */
        list: () => requestWithFallback<any[]>("/team", []),
        create: (body: { name: string; email: string; password: string; role: string }) =>
          request<any>("/team", { method: "POST", body }),
        updateRole: (id: string, role: string) =>
          request<any>(`/team/${encodeURIComponent(id)}/role`, { method: "PATCH", body: { role } }),
        remove: (id: string) =>
          request<any>(`/team/${encodeURIComponent(id)}`, { method: "DELETE" }),
    },

    channels: {
        /** Canales de notificación efectivos, sin devolver credenciales del servidor. */
        list: () => requestWithFallback<any[]>("/channels", []),
        update: (id: string, enabled: boolean) =>
            request<any>(`/channels/${encodeURIComponent(id)}`, {
                method: "PATCH",
                body: { enabled },
            }),
        create: (body: Record<string, unknown>) =>
            request<any>("/channels", { method: "POST", body }),
        test: (channelId: string) =>
            request<any>("/channels/test", {
                method: "POST",
                body: { channelId },
            }),
    },

    orders: {
        /** Órdenes de compra consolidadas con inteligencia de flota. */
        list: () => requestWithFallback<any[]>("/orders", []),
        summary: () => requestWithFallback<any>("/orders/summary", null),
    },

    analytics: {
        /** Briefing ejecutivo diario. */
        briefing: () => requestWithFallback<any>("/analytics/briefing", null),
        /** Alertas inteligentes del motor analítico. */
        alerts: () => requestWithFallback<any[]>("/analytics/alerts", []),
        /** Pronóstico de demanda con margen de error explícito. */
        forecast: () => requestWithFallback<any>("/analytics/forecast", null),
        /** Conciliación ventas / pagos / entregas. */
        reconciliation: () => requestWithFallback<any>("/analytics/reconciliation", null),
        /** Variación semanal de ganancia (serie temporal para gráficos). */
        profitVariation: () => requestWithFallback<any>("/analytics/profit-variation", null),
    },
};
