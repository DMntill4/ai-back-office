import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
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
  return {
    isConfigured: Boolean(supabaseUrl && supabaseKey),
    url: supabaseUrl ? supabaseUrl.replace(/https?:\/\//, "").split(".")[0] : null,
    hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
  };
}
