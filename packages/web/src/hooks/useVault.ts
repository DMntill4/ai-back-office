import { useCallback, useEffect, useRef, useState } from "react";
import {
    api,
    type VaultDocument,
    type VaultDocumentSummary,
    type VaultMetrics,
    type VaultTree,
} from "../services/apiClient";

export interface UseVaultOptions {
    enabled?: boolean;
    /** Carga automática de métricas junto con el árbol. */
    withMetrics?: boolean;
}

export interface UseVaultResult {
    tree: VaultTree | null;
    metrics: VaultMetrics | null;
    /** Lista plana de documentos (todas las categorías). */
    documents: VaultDocumentSummary[];
    selectedDocument: VaultDocument | null;
    loading: boolean;
    loadingDocument: boolean;
    error: string | null;
    isFallback: boolean;
    refresh: () => Promise<void>;
    selectDocument: (id: string) => Promise<void>;
    clearSelection: () => void;
}

/**
 * Hook de la bóveda de memoria (Obsidian vault).
 * Consume `GET /api/vault/tree`, `/api/vault/metrics` y `/api/vault/docs/:id`.
 */
export function useVault(options: UseVaultOptions = {}): UseVaultResult {
    const { enabled = true, withMetrics = true } = options;

    const [tree, setTree] = useState<VaultTree | null>(null);
    const [metrics, setMetrics] = useState<VaultMetrics | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<VaultDocument | null>(null);
    const [loading, setLoading] = useState<boolean>(enabled);
    const [loadingDocument, setLoadingDocument] = useState<boolean>(false);
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
            const [treeRes, metricsRes] = await Promise.all([
                api.vault.tree(),
                withMetrics ? api.vault.metrics() : Promise.resolve(null),
            ]);
            if (!mountedRef.current) return;
            setTree(treeRes.data ?? null);
            if (metricsRes) setMetrics(metricsRes.data ?? null);
            setIsFallback(treeRes.isFallback || Boolean(metricsRes?.isFallback));
            const msg = treeRes.message || metricsRes?.message;
            if (msg) setError(msg);
        } catch (err) {
            if (!mountedRef.current) return;
            setError(err instanceof Error ? err.message : "Error desconocido al cargar la bóveda");
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [withMetrics]);

    useEffect(() => {
        if (!enabled) return;
        void refresh();
    }, [enabled, refresh]);

    const selectDocument = useCallback(async (id: string) => {
        setLoadingDocument(true);
        setError(null);
        try {
            const res = await api.vault.document(id);
            if (!mountedRef.current) return;
            setSelectedDocument(res.data ?? null);
            if (res.isFallback && res.message) setError(res.message);
        } catch (err) {
            if (!mountedRef.current) return;
            setError(err instanceof Error ? err.message : "No se pudo abrir el documento");
        } finally {
            if (mountedRef.current) setLoadingDocument(false);
        }
    }, []);

    const clearSelection = useCallback(() => setSelectedDocument(null), []);

    const documents: VaultDocumentSummary[] = tree
        ? tree.categories.flatMap((c) => c.documents)
        : [];

    return {
        tree,
        metrics,
        documents,
        selectedDocument,
        loading,
        loadingDocument,
        error,
        isFallback,
        refresh,
        selectDocument,
        clearSelection,
    };
}

export default useVault;
