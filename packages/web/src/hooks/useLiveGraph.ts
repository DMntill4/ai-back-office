import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/apiClient";
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
 * Consume `GET /api/graph/data` (nodos + aristas desde PostgreSQL)
 * con degradación segura a `graphData.ts`.
 */
export function useLiveGraph(options: UseLiveGraphOptions = {}): UseLiveGraphResult {
    const { enabled = true, mode, searchQuery, refreshIntervalMs = 0 } = options;

    const [graphData, setGraphData] = useState<MintGraphData | null>(null);
    const [loading, setLoading] = useState<boolean>(enabled);
    const [error, setError] = useState<string | null>(null);
    const [isFallback, setIsFallback] = useState<boolean>(false);

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.graph.data({ mode, searchQuery });
            if (!mountedRef.current) return;

            // Saneamiento defensivo: ids normalizados, aristas huérfanas
            // descartadas y textos mojibake reparados antes de llegar al canvas.
            const sanitized = sanitizeGraphData(res.data);
            setGraphData({
                nodes: sanitized.nodes,
                edges: sanitized.edges,
                metadata: res.data?.metadata,
            });
            setIsFallback(res.isFallback);
            if (res.isFallback && res.message) setError(res.message);
        } catch (err) {
            if (!mountedRef.current) return;
            // Nunca dejamos el grafo en un estado indefinido: se degrada a vacío.
            setGraphData({ nodes: [], edges: [] });
            setError(err instanceof Error ? err.message : "Error desconocido al cargar el grafo");
        } finally {
            if (mountedRef.current) setLoading(false);
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

    return { graphData, loading, error, isFallback, refresh };
}

export default useLiveGraph;
