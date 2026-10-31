import { useCallback, useEffect, useRef, useState } from "react";
import {
    api,
    type InventoryItemRecord,
    type InventorySummary,
    type RopAlert,
} from "../services/apiClient";

export interface UseInventoryDataOptions {
    enabled?: boolean;
    refreshIntervalMs?: number;
}

export interface UseInventoryDataResult {
    summary: InventorySummary | null;
    ropAlerts: RopAlert[];
    items: InventoryItemRecord[];
    loading: boolean;
    error: string | null;
    isFallback: boolean;
    refresh: () => Promise<void>;
    adjustStock: (payload: {
        producto_id: string;
        cantidad_delta: number;
        motivo?: string;
    }) => Promise<boolean>;
}

/**
 * Hook de inventario: resumen de catálogo + alertas ROP.
 * Consume `GET /api/inventory/summary` y `GET /api/inventory/rop-alerts`.
 */
export function useInventoryData(
    options: UseInventoryDataOptions = {},
): UseInventoryDataResult {
    const { enabled = true, refreshIntervalMs = 0 } = options;

    const [summary, setSummary] = useState<InventorySummary | null>(null);
    const [ropAlerts, setRopAlerts] = useState<RopAlert[]>([]);
    const [items, setItems] = useState<InventoryItemRecord[]>([]);
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
            const [summaryRes, alertsRes, itemsRes] = await Promise.all([
                api.inventory.summary(),
                api.inventory.ropAlerts(),
                api.inventory.items(),
            ]);
            if (!mountedRef.current) return;
            setSummary(summaryRes.data ?? null);
            setRopAlerts(alertsRes.data ?? []);
            setItems(itemsRes.data ?? []);
            setIsFallback(
                summaryRes.isFallback || alertsRes.isFallback || itemsRes.isFallback,
            );
            const msg = summaryRes.message || alertsRes.message || itemsRes.message;
            if (msg) setError(msg);
        } catch (err) {
            if (!mountedRef.current) return;
            setError(err instanceof Error ? err.message : "Error desconocido al cargar inventario");
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        void refresh();
    }, [enabled, refresh]);

    useEffect(() => {
        if (!enabled || !refreshIntervalMs || refreshIntervalMs <= 0) return;
        const timer = setInterval(() => void refresh(), refreshIntervalMs);
        return () => clearInterval(timer);
    }, [enabled, refreshIntervalMs, refresh]);

    const adjustStock = useCallback(
        async (payload: { producto_id: string; cantidad_delta: number; motivo?: string }) => {
            try {
                await api.inventory.adjust(payload);
                await refresh();
                return true;
            } catch (err) {
                if (mountedRef.current) {
                    setError(err instanceof Error ? err.message : "No se pudo ajustar el stock");
                }
                return false;
            }
        },
        [refresh],
    );

    return { summary, ropAlerts, items, loading, error, isFallback, refresh, adjustStock };
}

export default useInventoryData;
