import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL, api } from "../services/apiClient";
import type { MintGraphData } from "../types/graph";
import { sanitizeGraphData } from "../lib/graphSanitizer";

export interface UseLiveGraphOptions {
    enabled?: boolean;
    mode?: string;
    searchQuery?: string;
    refreshIntervalMs?: number;
}

export interface UseLiveGraphResult {
    graphData: MintGraphData | null;
    loading: boolean;
    error: string | null;
    isFallback: boolean;
    refresh: () => Promise<void>;
}

/**
 * Hook del grafo de conocimiento vivo.
 * Consume el contrato canónico `GET /api/graph`; no usa datos simulados como respaldo.
 */
export function useLiveGraph(options: UseLiveGraphOptions = {}): UseLiveGraphResult {
    const { enabled = true, mode, searchQuery, refreshIntervalMs = 0 } = options;

    const [graphData, setGraphData] = useState<MintGraphData | null>(null);
    const [loading, setLoading] = useState<boolean>(enabled);
    const [error, setError] = useState<string | null>(null);
    const [isFallback, setIsFallback] = useState<boolean>(false);

    const mountedRef = useRef(true);
    const hasLoadedRef = useRef(false);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const refresh = useCallback(async () => {
        setLoading(!hasLoadedRef.current);
        setError(null);
        try {
            const res = await api.graph.live({ mode, searchQuery });
            if (!mountedRef.current) return;

            const canonical = {
                nodes: res.nodes.map((node) => ({
                    id: node.id,
                    label: node.label,
                    type: node.type === "product" ? "sku" as const : node.type,
                    status: node.status === "critical" ? "warning" as const : node.status,
                    metadata: node.metrics,
                })),
                edges: res.links.map((link, index) => ({
                    id: `link_${index}_${link.source}_${link.target}`,
                    source: link.source,
                    target: link.target,
                    relation: link.relation as import("../types/graph").MintRelationType,
                    weight: link.weight,
                    label: link.relation,
                })),
            };
            const sanitized = sanitizeGraphData(canonical);
            setGraphData({
                nodes: sanitized.nodes,
                edges: sanitized.edges,
                metadata: {
                    totalNodes: sanitized.nodes.length,
                    totalEdges: sanitized.edges.length,
                    mode: (mode === "local" || mode === "workflow" || mode === "execution" ? mode : "global"),
                    generatedAt: new Date().toISOString(),
                },
            });
            setIsFallback(false);
        } catch (err) {
            if (!mountedRef.current) return;
            // Nunca dejamos el grafo en un estado indefinido: se degrada a vacío.
            setGraphData({ nodes: [], edges: [] });
            setIsFallback(false);
            setError(err instanceof Error ? err.message : "Error desconocido al cargar el grafo");
        } finally {
            if (mountedRef.current) {
                hasLoadedRef.current = true;
                setLoading(false);
            }
        }
    }, [mode, searchQuery]);

    useEffect(() => {
        if (!enabled) return;
        void refresh();
    }, [enabled, refresh]);

    useEffect(() => {
        if (!enabled || !refreshIntervalMs || refreshIntervalMs <= 0) return;
        const timer = setInterval(() => void refresh(), refreshIntervalMs);
        return () => clearInterval(timer);
    }, [enabled, refreshIntervalMs, refresh]);

    useEffect(() => {
        if (!enabled || typeof EventSource === "undefined") return;
        const source = new EventSource(`${API_BASE_URL}/events/stream`);
        const refreshOnChange = () => void refresh();
        const eventTypes = [
            "inventory_adjustment",
            "inventory_alert",
            "purchase_order_transition",
            "decision_resolved",
            "proactive_stock_alert",
            "proactive_reorder_alert",
            "shipment_updated",
            "scan_completed",
        ];
        for (const eventType of eventTypes) {
            source.addEventListener(eventType, refreshOnChange);
        }
        return () => {
            for (const eventType of eventTypes) {
                source.removeEventListener(eventType, refreshOnChange);
            }
            source.close();
        };
    }, [enabled, refresh]);

    return { graphData, loading, error, isFallback, refresh };
}

export default useLiveGraph;
