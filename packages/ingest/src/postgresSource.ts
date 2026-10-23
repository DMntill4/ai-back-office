import { Pool } from "pg";

export interface ReadOnlyQueryOptions {
  connectionString: string;
  tableName: string;
  limit?: number;
}

/**
 * Consulta de solo lectura para bases de datos PostgreSQL externas
 * Aplica transacciones de solo lectura y timeout estricto para seguridad
 */
export async function queryReadOnlyPostgres(options: ReadOnlyQueryOptions): Promise<{
  headers: string[];
  rows: Array<Record<string, any>>;
  totalReturned: number;
}> {
  const { connectionString, tableName, limit = 500 } = options;

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 5000,
  });

  const client = await pool.connect();
  try {
    // Configurar sesión en modo SOLO LECTURA estricto y timeout de 5 segundos
    await client.query("SET TRANSACTION READ ONLY;");
    await client.query("SET statement_timeout = 5000;");

    const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, "");
    const res = await client.query(`SELECT * FROM "${safeTable}" LIMIT $1`, [limit]);

    const headers = res.fields.map((f) => f.name);
    return {
      headers,
      rows: res.rows,
      totalReturned: res.rows.length,
    };
  } finally {
    client.release();
    await pool.end();
  }
}
