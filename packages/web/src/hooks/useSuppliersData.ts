import { useCallback, useEffect, useRef, useState } from "react";
import { api, type SupplierListItem } from "../services/apiClient";

export interface UseSuppliersDataOptions {
    enabled?: boolean;
    refreshIntervalMs?: number;
}

export interface UseSuppliersDataResult {
    suppliers: SupplierListItem[];
    loading: boolean;
    error: string | null;
    isFallback: boolean;
    refresh: () => Promise<void>;
    evaluate: (payload: {
        producto_id: string;
        criterio?: "costo" | "velocidad" | "balanceado";
    }) => Promise<boolean>;
}

/**
 * Hook de proveedores con scoring SLA.
 * Consume `GET /api/suppliers` y `POST /api/suppliers/evaluate`.
 */
export function useSuppliersData(
    options: UseSuppliersDataOptions = {},
): UseSuppliersDataResult {
    const { enabled = true, refreshIntervalMs = 0 } = options;

    const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
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
            const res = await api.suppliers.list();
            if (!mountedRef.current) return;
            setSuppliers(res.data ?? []);
            setIsFallback(res.isFallback);
            if (res.isFallback && res.message) setError(res.message);
        } catch (err) {
            if (!mountedRef.current) return;
            setError(err instanceof Error ? err.message : "Error desconocido al cargar proveedores");
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

    const evaluate = useCallback(
        async (payload: { producto_id: string; criterio?: "costo" | "velocidad" | "balanceado" }) => {
            try {
                await api.suppliers.evaluate(payload);
                await refresh();
                return true;
            } catch (err) {
                if (mountedRef.current) {
                    setError(err instanceof Error ? err.message : "No se pudo evaluar el proveedor");
                }
                return false;
            }
        },
        [refresh],
    );

    return { suppliers, loading, error, isFallback, refresh, evaluate };
}

export default useSuppliersData;
