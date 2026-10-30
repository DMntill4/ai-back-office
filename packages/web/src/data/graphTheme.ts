import { MintNodeType, MintRelationType } from "../types/graph";

/**
 * Paleta temática de nodos del grafo, alineada con los tokens semánticos de
 * Mint-DESIGN.md. Los valores `stroke`/`fill`/`glow` se usan en canvas y SVG
 * (donde no aplican clases de Tailwind); `text`/`bg` son clases utilitarias.
 */
export const NODE_TYPE_COLORS: Record<
    MintNodeType,
    { stroke: string; fill: string; glow: string; text: string; bg: string }
> = {
    agent: {
        stroke: "var(--color-brand)",
        fill: "var(--color-brand-surface)",
        glow: "color-mix(in srgb, var(--color-brand) 40%, transparent)",
        text: "text-brand",
        bg: "bg-brand-surface border-brand/40",
    },
    tool: {
        stroke: "var(--color-state-pending)",
        fill: "var(--color-state-pending-surface)",
        glow: "color-mix(in srgb, var(--color-state-pending) 35%, transparent)",
        text: "text-state-pending",
        bg: "bg-state-pending-surface border-state-pending/40",
    },
    database: {
        stroke: "var(--color-state-pending)",
        fill: "var(--color-state-pending-surface)",
        glow: "color-mix(in srgb, var(--color-state-pending) 35%, transparent)",
        text: "text-state-pending",
        bg: "bg-state-pending-surface border-state-pending/40",
    },
    warehouse: {
        stroke: "var(--color-state-attention)",
        fill: "var(--color-state-attention-surface)",
        glow: "color-mix(in srgb, var(--color-state-attention) 35%, transparent)",
        text: "text-state-attention",
        bg: "bg-state-attention-surface border-state-attention/40",
    },
    sku: {
        stroke: "var(--color-state-error)",
        fill: "var(--color-state-error-surface)",
        glow: "color-mix(in srgb, var(--color-state-error) 35%, transparent)",
        text: "text-state-error",
        bg: "bg-state-error-surface border-state-error/40",
    },
    supplier: {
        stroke: "var(--color-state-ok)",
        fill: "var(--color-state-ok-surface)",
        glow: "color-mix(in srgb, var(--color-state-ok) 35%, transparent)",
        text: "text-state-ok",
        bg: "bg-state-ok-surface border-state-ok/40",
    },
    purchase_order: {
        stroke: "var(--color-state-pending)",
        fill: "var(--color-state-pending-surface)",
        glow: "color-mix(in srgb, var(--color-state-pending) 35%, transparent)",
        text: "text-state-pending",
        bg: "bg-state-pending-surface border-state-pending/40",
    },
    decision: {
        stroke: "var(--color-state-attention)",
        fill: "var(--color-state-attention-surface)",
        glow: "color-mix(in srgb, var(--color-state-attention) 35%, transparent)",
        text: "text-state-attention",
        bg: "bg-state-attention-surface border-state-attention/40",
    },
    execution: {
        stroke: "var(--color-state-attention)",
        fill: "var(--color-state-attention-surface)",
        glow: "color-mix(in srgb, var(--color-state-attention) 35%, transparent)",
        text: "text-state-attention",
        bg: "bg-state-attention-surface border-state-attention/40",
    },
};

export const RELATION_LABELS: Record<MintRelationType, string> = {
    uses: "Utiliza",
    queries: "Consulta",
    belongs_to: "Pertenece a",
    generates: "Genera",
    depends_on: "Depende de",
    modifies: "Modifica",
    approved_by: "Aprobado por",
};
