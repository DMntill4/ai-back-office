import React, { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { api, type TelemetryCostsResponse } from "../../services/apiClient";

/**
 * Formatea un monto en USD con precisión adaptativa.
 * Los costos por tarea suelen ser fracciones de centavo, por eso se usan
 * hasta 4 decimales cuando el valor es pequeño.
 */
export function formatUsd(value: number): string {
    const safe = Number.isFinite(value) ? value : 0;
    if (safe === 0) return "$0.0000";
    if (safe < 0.01) return `$${safe.toFixed(4)}`;
    if (safe < 1) return `$${safe.toFixed(3)}`;
    return `$${safe.toFixed(2)}`;
}

/** Formatea un conteo de tokens de forma compacta (1.2k, 3.4M). */
export function formatTokens(value: number): string {
    const safe = Number.isFinite(value) ? value : 0;
    if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(1)}M`;
    if (safe >= 1_000) return `${(safe / 1_000).toFixed(1)}k`;
    return String(safe);
}

export interface CostBadgeProps {
    /** Costo de la tarea actual en USD (si se conoce). */
    taskCostUsd?: number;
    /** Tokens consumidos por la tarea actual. */
    taskTokens?: number;
    /** Identificador de la tarea para el tooltip. */
    taskId?: string;
    /** Si es `true`, consulta el total acumulado de la sesión al backend. */
    showSessionTotal?: boolean;
    /** Intervalo de refresco del total de sesión, en ms. 0 desactiva el polling. */
    refreshMs?: number;
    className?: string;
}

/**
 * Insignia de costo (Agent FinOps).
 *
 * Muestra el costo en USD de la tarea en curso y, opcionalmente, el total
 * acumulado de la sesión obtenido de `GET /api/telemetry/costs`.
 */
export const CostBadge: React.FC<CostBadgeProps> = ({
    taskCostUsd,
    taskTokens,
    taskId,
    showSessionTotal = true,
    refreshMs = 15000,
    className = "",
}) => {
    const [session, setSession] = useState<TelemetryCostsResponse["session"] | null>(null);

    useEffect(() => {
        if (!showSessionTotal) return;
        let cancelled = false;

        const load = async () => {
            const res = await api.telemetry.costs();
            if (!cancelled && res.success) setSession(res.data.session);
        };

        load();
        if (refreshMs > 0) {
            const timer = setInterval(load, refreshMs);
            return () => {
                cancelled = true;
                clearInterval(timer);
            };
        }
        return () => {
            cancelled = true;
        };
    }, [showSessionTotal, refreshMs]);

    const hasTask = typeof taskCostUsd === "number" && taskCostUsd > 0;
    const sessionCost = session?.totalCostUsd ?? 0;
    const sessionTokens = session?.totalTokens ?? 0;

    const tooltipParts: string[] = [];
    if (taskId) tooltipParts.push(`Tarea: ${taskId}`);
    if (hasTask) tooltipParts.push(`Costo tarea: ${formatUsd(taskCostUsd!)}`);
    if (typeof taskTokens === "number") tooltipParts.push(`Tokens tarea: ${taskTokens}`);
    if (showSessionTotal) {
        tooltipParts.push(`Sesión: ${formatUsd(sessionCost)} · ${formatTokens(sessionTokens)} tokens`);
        tooltipParts.push(`${session?.taskCount ?? 0} tareas medidas`);
    }

    return (
        <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-raised border border-border text-caption font-mono whitespace-nowrap ${className}`}
            title={tooltipParts.join("\n")}
        >
            <Coins className="w-3.5 h-3.5 text-brand flex-shrink-0" />
            {hasTask ? (
                <span className="text-primary font-semibold">{formatUsd(taskCostUsd!)}</span>
            ) : (
                <span className="text-muted">—</span>
            )}
            {showSessionTotal && (
                <>
                    <span className="text-muted">/</span>
                    <span className="text-secondary">{formatUsd(sessionCost)}</span>
                    <span className="text-muted hidden xl:inline">sesión</span>
                </>
            )}
        </div>
    );
};

export default CostBadge;
