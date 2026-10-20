import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/ai_back_office";

// Soporte automático para SSL en bases de datos en la nube (Supabase, Neon, AWS RDS)
export const isCloudDb =
  connectionString.includes("supabase.co") ||
  connectionString.includes("pooler.supabase.com") ||
  connectionString.includes("neon.tech") ||
  connectionString.includes("sslmode=require");

export const isSupabaseConnection =
  connectionString.includes("supabase.co") ||
  connectionString.includes("pooler.supabase.com");

export const pool = new Pool({
  connectionString,
  ssl: isCloudDb ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });

/**
 * Diagnóstico de salud y metadatos de la conexión a la base de datos (PostgreSQL / Supabase)
 */
export async function checkDatabaseHealth() {
  const start = Date.now();
  try {
    const res = await pool.query(`
      SELECT 
        current_database() as database,
        current_user as user,
        version() as version,
        NOW() as current_time
    `);
    const latencyMs = Date.now() - start;

    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tableNames: string[] = tablesRes.rows.map((r: any) => r.table_name);

    // Contar filas reales de cada tabla detectada
    const tablesInfo: Array<{ name: string; count: number }> = [];
    for (const tbl of tableNames) {
      try {
        const countRes = await pool.query(`SELECT COUNT(*)::int as c FROM "${tbl}"`);
        tablesInfo.push({ name: tbl, count: countRes.rows[0]?.c || 0 });
      } catch {
        tablesInfo.push({ name: tbl, count: 0 });
      }
    }

    const host = connectionString.split("@")[1]?.split(":")[0] || "localhost";

    return {
      connected: true,
      provider: isSupabaseConnection
        ? "Supabase (PostgreSQL Cloud)"
        : isCloudDb
        ? "PostgreSQL Cloud"
        : "PostgreSQL (Docker / Local)",
      isSupabase: isSupabaseConnection,
      host,
      database: res.rows[0]?.database || "ai_back_office",
      user: res.rows[0]?.user || "postgres",
      version: res.rows[0]?.version,
      timestamp: res.rows[0]?.current_time,
      latencyMs,
      tablesCount: tableNames.length,
      tables: tablesInfo,
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message,
      provider: isSupabaseConnection ? "Supabase (Desconectado)" : "PostgreSQL (Desconectado)",
      isSupabase: isSupabaseConnection,
      latencyMs: Date.now() - start,
      tablesCount: 0,
      tables: [],
    };
  }
}

/**
 * Prueba una cadena de conexión arbitraria (ej. para verificar URL de Supabase antes de guardarla)
 */
export async function testCustomConnection(testUrl: string) {
  const start = Date.now();
  const isCloud =
    testUrl.includes("supabase.co") ||
    testUrl.includes("pooler.supabase.com") ||
    testUrl.includes("neon.tech") ||
    testUrl.includes("sslmode=require");

  const testPool = new Pool({
    connectionString: testUrl,
    ssl: isCloud ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 6000,
  });

  try {
    const res = await testPool.query(`SELECT current_database() as db, current_user as u, NOW() as t`);
    const latencyMs = Date.now() - start;
    await testPool.end();
    return {
      success: true,
      database: res.rows[0]?.db,
      user: res.rows[0]?.u,
      latencyMs,
      isSupabase: testUrl.includes("supabase.co") || testUrl.includes("pooler.supabase.com"),
    };
  } catch (err: any) {
    await testPool.end().catch(() => {});
    return {
      success: false,
      error: err.message,
      latencyMs: Date.now() - start,
    };
  }
}

