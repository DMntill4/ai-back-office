import { createClient, SupabaseClient } from "@supabase/supabase-js";
import "../config/loadEnv";

const supabaseUrl = process.env.SUPABASE_URL || "https://khzatuvmipdptcgyvxce.supabase.co";
const supabaseRestUrl =
  process.env.SUPABASE_REST_URL ||
  (supabaseUrl ? `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/` : "https://khzatuvmipdptcgyvxce.supabase.co/rest/v1/");
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

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
  const projectRef = supabaseUrl
    ? supabaseUrl.replace(/https?:\/\//, "").split(".")[0]
    : "khzatuvmipdptcgyvxce";

  return {
    isConfigured: Boolean(supabaseUrl),
    projectRef,
    url: projectRef,
    fullUrl: supabaseUrl,
    restUrl: supabaseRestUrl,
    hasClient: Boolean(supabase),
    hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
  };
}

/**
 * Helper para invocar directamente la API REST de Supabase (PostgREST)
 * Base: https://khzatuvmipdptcgyvxce.supabase.co/rest/v1/
 */
export async function fetchSupabaseRest(endpoint: string, options: RequestInit = {}) {
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
