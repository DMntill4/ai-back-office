/**
 * Saneamiento defensivo del grafo de conocimiento.
 *
 * El endpoint `/api/graph` puede devolver nodos/aristas con identificadores
 * vacíos, con espacios, duplicados o con secuencias mojibake (p. ej. "polÃ­ticas").
 * Pasar esos valores a un motor de fuerzas (D3 / canvas) provoca bucles
 * infinitos, aristas huérfanas y colapsos de render.
 *
 * Este módulo normaliza todo antes de tocar la capa visual:
 *  - `id`, `source`, `target` → `.trim()` + NFC + eliminación de caracteres de
 *    control y de la secuencia de reemplazo U+FFFD.
 *  - Nodos sin id válido o duplicados → descartados.
 *  - Aristas sin extremos existentes o con `source === target` → descartadas.
 *  - Etiquetas con mojibake conocido → reparadas a UTF-8 legible.
 */

import type { MintGraphData, MintGraphEdge, MintGraphNode } from "../types/graph";

/** Secuencias mojibake frecuentes (UTF-8 leído como Latin-1/Windows-1252). */
const MOJIBAKE_MAP: Array<[RegExp, string]> = [
    [/Ã¡/g, "á"],
    [/Ã©/g, "é"],
    [/Ã­/g, "í"],
    [/Ã³/g, "ó"],
    [/Ãº/g, "ú"],
    [/Ã±/g, "ñ"],
    [/Ã‘/g, "Ñ"],
    [/ÃÁ/g, "Á"],
    [/Ã‰/g, "É"],
    [/Ã\x8d/g, "Í"],
    [/Ã“/g, "Ó"],
    [/Ãš/g, "Ú"],
    [/Ã¼/g, "ü"],
    [/Â¿/g, "¿"],
    [/Â¡/g, "¡"],
    [/Â·/g, "·"],
    [/â€“/g, "–"],
    [/â€”/g, "—"],
    [/â€œ/g, "“"],
    [/â€\x9d/g, "”"],
    [/â€™/g, "’"],
    [/â€¦/g, "…"],
    [/Â /g, " "],
];

/** Repara texto con mojibake y normaliza a NFC. */
export function repairText(value: unknown): string {
    if (value === null || value === undefined) return "";
    let text = String(value);
    for (const [pattern, replacement] of MOJIBAKE_MAP) {
        text = text.replace(pattern, replacement);
    }
    // Elimina caracteres de control y el carácter de reemplazo U+FFFD.
    // eslint-disable-next-line no-control-regex
    text = text.replace(/[\u0000-\u001F\u007F\uFFFD]/g, "");
    return text.normalize("NFC").trim();
}

/**
 * Normaliza un identificador para usarlo como clave del grafo.
 * Devuelve `""` cuando el valor no es utilizable.
 */
export function normalizeGraphId(value: unknown): string {
    const raw = repairText(value);
    if (!raw) return "";
    // Colapsa espacios internos y elimina separadores problemáticos.
    return raw.replace(/\s+/g, "_").replace(/[#?]/g, "");
}

export interface SanitizedGraph {
    nodes: MintGraphNode[];
    edges: MintGraphEdge[];
    /** `true` cuando se descartó al menos una entrada corrupta. */
    hadInvalidEntries: boolean;
}

/**
 * Sanea un `MintGraphData` completo.
 *
 * Es idempotente y nunca lanza: ante una entrada inesperada devuelve un grafo
 * vacío en lugar de propagar la excepción al motor de render.
 */
export function sanitizeGraphData(input: unknown): SanitizedGraph {
    const empty: SanitizedGraph = { nodes: [], edges: [], hadInvalidEntries: false };

    if (!input || typeof input !== "object") return empty;

    const rawNodes = Array.isArray((input as MintGraphData).nodes)
        ? (input as MintGraphData).nodes
        : [];
    const rawEdges = Array.isArray((input as MintGraphData).edges)
        ? (input as MintGraphData).edges
        : [];

    let hadInvalidEntries = false;
    const nodes: MintGraphNode[] = [];
    const seenIds = new Set<string>();

    for (const candidate of rawNodes) {
        if (!candidate || typeof candidate !== "object") {
            hadInvalidEntries = true;
            continue;
        }

        const id = normalizeGraphId((candidate as MintGraphNode).id);
        if (!id || seenIds.has(id)) {
            hadInvalidEntries = true;
            continue;
        }

        const label = repairText((candidate as MintGraphNode).label) || id;
        const sublabel = repairText((candidate as MintGraphNode).sublabel);

        seenIds.add(id);
        nodes.push({
            ...(candidate as MintGraphNode),
            id,
            label,
            ...(sublabel ? { sublabel } : {}),
            degree:
                typeof (candidate as MintGraphNode).degree === "number" &&
                    Number.isFinite((candidate as MintGraphNode).degree)
                    ? Math.max(0, (candidate as MintGraphNode).degree as number)
                    : 0,
        });
    }

    const edges: MintGraphEdge[] = [];
    const seenEdgeIds = new Set<string>();

    for (const candidate of rawEdges) {
        if (!candidate || typeof candidate !== "object") {
            hadInvalidEntries = true;
            continue;
        }

        const source = normalizeGraphId((candidate as MintGraphEdge).source);
        const target = normalizeGraphId((candidate as MintGraphEdge).target);

        // Aristas huérfanas o auto-referencias rompen la simulación de fuerzas.
        if (!source || !target || source === target) {
            hadInvalidEntries = true;
            continue;
        }
        if (!seenIds.has(source) || !seenIds.has(target)) {
            hadInvalidEntries = true;
            continue;
        }

        const baseId =
            normalizeGraphId((candidate as MintGraphEdge).id) || `${source}__${target}`;
        let edgeId = baseId;
        let suffix = 2;
        while (seenEdgeIds.has(edgeId)) {
            edgeId = `${baseId}__${suffix++}`;
        }
        seenEdgeIds.add(edgeId);

        edges.push({
            ...(candidate as MintGraphEdge),
            id: edgeId,
            source,
            target,
            label: repairText((candidate as MintGraphEdge).label) || undefined,
        });
    }

    return { nodes, edges, hadInvalidEntries };
}

/** `true` si el grafo no tiene nodos utilizables. */
export function isEmptyGraph(graph: { nodes?: unknown[] } | null | undefined): boolean {
    return !graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0;
}
