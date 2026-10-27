import { sanitizeCell } from "./sanitizer";

export interface RestApiSourceConfig {
  endpointUrl: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  apiKey?: string;
  bearerToken?: string;
  dataJsonPath?: string; // Ruta anidada en el JSON, ej: 'data.items'
  timeoutMs?: number;
}

export interface RestApiDiscoveryResult {
  success: boolean;
  statusCode?: number;
  headers: string[];
  rows: Array<Record<string, string>>;
  totalRows: number;
  error?: string;
  latencyMs: number;
}

/**
 * Prueba la conexión en vivo y extrae datos tabulares de una API REST externa
 */
export async function fetchAndDiscoverRestApiSource(
  config: RestApiSourceConfig,
): Promise<RestApiDiscoveryResult> {
  const start = Date.now();
  const timeoutMs = config.timeoutMs || 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(config.headers || {}),
  };

  if (config.bearerToken) {
    reqHeaders.Authorization = `Bearer ${config.bearerToken}`;
  } else if (config.apiKey) {
    reqHeaders["x-api-key"] = config.apiKey;
  }

  try {
    const res = await fetch(config.endpointUrl, {
      method: config.method || "GET",
      headers: reqHeaders,
      signal: controller.signal,
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return {
        success: false,
        statusCode: res.status,
        headers: [],
        rows: [],
        totalRows: 0,
        error: `HTTP ${res.status}: ${res.statusText}`,
        latencyMs,
      };
    }

    const data: any = await res.json();
    let records: any[] = [];

    if (Array.isArray(data)) {
      records = data;
    } else if (typeof data === "object" && data !== null) {
      if (config.dataJsonPath) {
        const parts = config.dataJsonPath.split(".");
        let current = data;
        for (const p of parts) {
          current = current ? current[p] : undefined;
        }
        if (Array.isArray(current)) records = current;
      }

      if (records.length === 0) {
        // Encontrar primer array en el objeto de respuesta
        const arrayKey = Object.keys(data).find((k) => Array.isArray(data[k]));
        if (arrayKey) {
          records = data[arrayKey];
        } else {
          records = [data];
        }
      }
    }

    const headerSet = new Set<string>();
    for (const item of records) {
      if (typeof item === "object" && item !== null) {
        Object.keys(item).forEach((k) => headerSet.add(k));
      }
    }
    const headers = Array.from(headerSet);

    const rows: Array<Record<string, string>> = [];
    for (const item of records) {
      const row: Record<string, string> = {};
      for (const h of headers) {
        const val = item[h];
        row[h] = sanitizeCell(typeof val === "object" && val !== null ? JSON.stringify(val) : String(val ?? ""));
      }
      rows.push(row);
    }

    return {
      success: true,
      statusCode: res.status,
      headers,
      rows,
      totalRows: rows.length,
      latencyMs,
    };
  } catch (err: any) {
    return {
      success: false,
      headers: [],
      rows: [],
      totalRows: 0,
      error: err.name === "AbortError" ? `Timeout tras ${timeoutMs}ms` : err.message,
      latencyMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timer);
  }
}
