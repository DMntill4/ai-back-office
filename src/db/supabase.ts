import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseRestUrl =
  process.env.SUPABASE_REST_URL ||
  (supabaseUrl ? `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/` : "");
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

/**
 * Cliente nativo de Supabase para servicios como Storage, Auth y Realtime.
 * Para operaciones de base de datos relacionales, migraciones y consultas tipadas,
 * se utiliza preferentemente Drizzle ORM a través de `db` en `./client.ts`.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

export function getSupabaseStatus() {
  const isConfigured = Boolean(supabaseUrl && supabaseKey);
  const projectRef = supabaseUrl
    ? supabaseUrl.replace(/https?:\/\//, "").split(".")[0]
    : null;

  return {
    isConfigured,
    projectRef,
    url: projectRef,
    fullUrl: supabaseUrl || null,
    restUrl: supabaseRestUrl || null,
    hasClient: Boolean(supabase),
    hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
  };
}

/**
 * Helper para invocar directamente la API REST de Supabase (PostgREST)
 */
export async function fetchSupabaseRest(endpoint: string, options: RequestInit = {}) {
  if (!supabaseRestUrl) {
    throw new Error("Supabase REST no está configurado (SUPABASE_URL / SUPABASE_REST_URL no definidos).");
  }
  const base = supabaseRestUrl.replace(/\/+$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(key ? { apikey: key, Authorization: `Bearer ${key}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  return fetch(`${base}${cleanEndpoint}`, {
    ...options,
    headers,
  });
}
