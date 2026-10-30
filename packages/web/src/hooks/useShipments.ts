import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ShipmentListItem } from "../services/apiClient";

export interface UseShipmentsOptions {
    /** Filtro opcional por estado (en_transito, retrasado, entregado, ...). */
    status?: string;
    /** Desactiva la carga automática al montar. */
    enabled?: boolean;
    /** Intervalo de refresco en ms. 0 = sin polling. */
    refreshIntervalMs?: number;
}

export interface UseShipmentsResult {
    shipments: ShipmentListItem[];
    loading: boolean;
    error: string | null;
    /** true cuando los datos provienen del fallback local (backend no disponible). */
    isFallback: boolean;
    refresh: () => Promise<void>;
    reroute: (id: string, body?: Record<string, unknown>) => Promise<boolean>;
}

/**
 * Hook de envíos logísticos.
 * Consume `GET /api/shipments` con degradación segura a datos locales.
 */
export function useShipments(options: UseShipmentsOptions = {}): UseShipmentsResult {
    const { status, enabled = true, refreshIntervalMs = 0 } = options;

    const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
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
            const res = await api.shipments.list(status);
            if (!mountedRef.current) return;
            setShipments(res.data ?? []);
            setIsFallback(res.isFallback);
            if (res.isFallback && res.message) setError(res.message);
        } catch (err) {
            if (!mountedRef.current) return;
            setError(err instanceof Error ? err.message : "Error desconocido al cargar envíos");
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        if (!enabled) return;
        void refresh();
    }, [enabled, refresh]);

    useEffect(() => {
        if (!enabled || !refreshIntervalMs || refreshIntervalMs <= 0) return;
        const timer = setInterval(() => void refresh(), refreshIntervalMs);
        return () => clearInterval(timer);
    }, [enabled, refreshIntervalMs, refresh]);

    const reroute = useCallback(
        async (id: string, body: Record<string, unknown> = {}) => {
            try {
                await api.shipments.reroute(id, body);
                await refresh();
                return true;
            } catch (err) {
                if (mountedRef.current) {
                    setError(err instanceof Error ? err.message : "No se pudo re-enrutar el envío");
                }
                return false;
            }
        },
        [refresh],
    );

    return { shipments, loading, error, isFallback, refresh, reroute };
}

export default useShipments;
