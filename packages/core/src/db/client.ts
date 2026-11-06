import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import * as cp from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import * as schema from "./schema";
import "../config/loadEnv";

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

function checkLocalPostgresPortSync(host: string, port: number): boolean {
  try {
    cp.execFileSync(
      process.execPath,
      [
        "-e",
        `const net=require("net");const s=net.createConnection({port:${port},host:${JSON.stringify(host)}},()=>{s.destroy();process.exit(0)});s.on("error",()=>process.exit(1));setTimeout(()=>process.exit(1),300);`,
      ],
      { timeout: 600, stdio: "ignore" },
    );
    return true;
  } catch {
    return false;
  }
}

function resolveStorageEngineMode(): "postgres" | "embedded" {
  const forced = (process.env.MINT_STORAGE_ENGINE || "").toLowerCase().trim();
  if (forced === "embedded" || forced === "pglite") return "embedded";
  if (forced === "postgres" || forced === "docker") return "postgres";

  if (isCloudDb) return "postgres";

  try {
    const parsed = new URL(connectionString);
    const host = parsed.hostname || "localhost";
    const port = parseInt(parsed.port || "5432", 10);
    const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
    if (!isLocalHost) {
      return "postgres";
    }
    const reachable = checkLocalPostgresPortSync(host, port);
    return reachable ? "postgres" : "embedded";
  } catch {
    const reachable = checkLocalPostgresPortSync("127.0.0.1", 5432);
    return reachable ? "postgres" : "embedded";
  }
}

const activeMode = resolveStorageEngineMode();
export const isEmbeddedDb = activeMode === "embedded";

export function getStorageMode(): "postgres" | "embedded" {
  return activeMode;
}

function resolveMigrationsFolder(): string {
  const candidates = [
    path.resolve(process.cwd(), "packages/core/src/db/migrations"),
    path.resolve(process.cwd(), "src/db/migrations"),
    ...(typeof __dirname !== "undefined" ? [path.resolve(__dirname, "migrations")] : []),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.resolve(process.cwd(), "packages/core/src/db/migrations");
}

let pgliteInstance: PGlite | null = null;
let migrationDone = false;
let migrationPromise: Promise<void> | null = null;

function createEmbeddedPGliteWithAutoMigration(): {
  pglite: PGlite;
  drizzleDb: any;
  poolAdapter: any;
} {
  const customDir = process.env.MINT_EMBEDDED_DB_PATH;
  let dbDir = customDir
    ? path.resolve(customDir)
    : path.resolve(process.cwd(), "data", "mint_embedded_pg");

  if (
    fs.existsSync(dbDir) &&
    fs.readdirSync(dbDir).length > 0 &&
    !fs.existsSync(path.join(dbDir, "PG_VERSION"))
  ) {
    try {
      fs.rmSync(dbDir, { recursive: true, force: true });
    } catch {
      dbDir = path.resolve(process.cwd(), "data", `mint_embedded_pg_recovered`);
    }
  }

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  let activePglite = new PGlite(dbDir);
  activePglite.waitReady.catch(() => {});

  const ensureMigrated = async () => {
    if (migrationDone) return;
    if (!migrationPromise) {
      migrationPromise = (async () => {
        try {
          try {
            await activePglite.waitReady;
          } catch {
            // Auto-recuperación ante bloqueo de archivos (ej. OneDrive sobre pg_wal o carpeta corrupta)
            activePglite = new PGlite();
            await activePglite.waitReady;
          }
          const migrationsFolder = resolveMigrationsFolder();
          if (fs.existsSync(migrationsFolder)) {
            const migratorDb = drizzlePglite(activePglite);
            await migratePglite(migratorDb, { migrationsFolder });
          }
          // Asegurar columnas de auditoría y moneda MXN por defecto en México
          await activePglite
            .exec(`
              ALTER TABLE decisions ADD COLUMN IF NOT EXISTS requester_user_id VARCHAR(100);
              ALTER TABLE decisions ADD COLUMN IF NOT EXISTS supervisor_notified BOOLEAN DEFAULT FALSE;
              ALTER TABLE decisions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
              UPDATE companies SET currency = 'MXN', country = COALESCE(country, 'MX')
              WHERE id = 'comp_default' AND (currency IS NULL OR currency = 'USD');
            `)
            .catch(() => {});
          migrationDone = true;
        } catch (err: any) {
          migrationPromise = null;
          throw new Error(
            `[PGLITE AUTO-MIGRATE FAILED in ${resolveMigrationsFolder()}]: ${err?.message || err}`,
          );
        }
      })();
    }
    await migrationPromise;
  };

  // Proxy que envuelve a activePglite para garantizar que las migraciones terminen antes de cualquier consulta de Drizzle
  const wrappedClient = new Proxy(activePglite, {
    get(_target, prop, _receiver) {
      if (prop === "query") {
        return async (query: string, params?: any[], options?: any) => {
          await ensureMigrated();
          return activePglite.query(query, params, options);
        };
      }
      if (prop === "exec") {
        return async (query: string, options?: any) => {
          await ensureMigrated();
          return activePglite.exec(query, options);
        };
      }
      if (prop === "transaction") {
        return async (callback: any) => {
          await ensureMigrated();
          return activePglite.transaction(callback);
        };
      }
      const value = Reflect.get(activePglite, prop, activePglite);
      return typeof value === "function" ? value.bind(activePglite) : value;
    },
  });

  const drizzleDb = drizzlePglite(wrappedClient as unknown as PGlite, { schema });

  const poolAdapter = {
    isEmbedded: true,
    async query(textOrConfig: any, values?: any[]) {
      await ensureMigrated();
      const sqlText = typeof textOrConfig === "string" ? textOrConfig : textOrConfig?.text;
      const sqlParams = typeof textOrConfig === "string" ? values : textOrConfig?.values;
      return activePglite.query(sqlText, sqlParams);
    },
    async connect() {
      await ensureMigrated();
      return {
        query: (textOrConfig: any, values?: any[]) => poolAdapter.query(textOrConfig, values),
        release: () => {},
      };
    },
    async end() {
      // No cerrar la instancia compartida durante operaciones en curso
    },
    on() {
      return this;
    },
  };

  return {
    pglite: activePglite,
    drizzleDb,
    poolAdapter,
  };
}

let pgPool: Pool | null = null;
let activeDbInstance: any = null;
let activePoolInstance: any = null;

if (isEmbeddedDb) {
  const embedded = createEmbeddedPGliteWithAutoMigration();
  pgliteInstance = embedded.pglite;
  activeDbInstance = embedded.drizzleDb;
  activePoolInstance = embedded.poolAdapter;
} else {
  pgPool = new Pool({
    connectionString,
    ssl: isCloudDb ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  // Evitar que un error inesperado en un cliente inactivo del pool tumbe el proceso CLI
  pgPool.on("error", () => {});
  activeDbInstance = drizzleNodePg(pgPool, { schema });
  activePoolInstance = pgPool;
}

export const pool: Pool = activePoolInstance as unknown as Pool;
export const db: ReturnType<typeof drizzleNodePg<typeof schema>> = activeDbInstance;

/**
 * Diagnóstico de salud y metadatos de la conexión a la base de datos (PostgreSQL / Supabase / PGlite Embebido)
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

    const tablesInfo: Array<{ name: string; count: number }> = [];
    for (const tbl of tableNames) {
      try {
        const countRes = await pool.query(`SELECT COUNT(*)::int as c FROM "${tbl}"`);
        tablesInfo.push({ name: tbl, count: countRes.rows[0]?.c || 0 });
      } catch {
        tablesInfo.push({ name: tbl, count: 0 });
      }
    }

    const host = isEmbeddedDb
      ? "local-embedded (./data/mint_embedded_pg)"
      : connectionString.split("@")[1]?.split(":")[0] || "localhost";

    return {
      connected: true,
      isEmbedded: isEmbeddedDb,
      provider: isEmbeddedDb
        ? "PostgreSQL Embebido (PGlite Zero-Config)"
        : isSupabaseConnection
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
      isEmbedded: isEmbeddedDb,
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
 * Prueba una cadena de conexión arbitraria y diagnostica causas reales de fallo sin tumbar la aplicación
 */
export async function testCustomConnection(testUrl: string) {
  const start = Date.now();
  if (!testUrl || (!testUrl.startsWith("postgres://") && !testUrl.startsWith("postgresql://"))) {
    return {
      success: false,
      error: "Formato de URI inválido. Se esperaba postgresql://usuario:password@host:puerto/base_de_datos",
      failureCategory: "INVALID_URI_FORMAT",
      recoverable: true,
      suggestedRecovery: "Proporcionar una cadena PostgreSQL válida o continuar con el motor local activo de MINT.",
      latencyMs: Date.now() - start,
    };
  }

  const isCloud =
    testUrl.includes("supabase.co") ||
    testUrl.includes("pooler.supabase.com") ||
    testUrl.includes("neon.tech") ||
    testUrl.includes("sslmode=require");

  const testPool = new Pool({
    connectionString: testUrl,
    ssl: isCloud ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 3500,
  });
  testPool.on("error", () => {});

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
    const msg = String(err?.message || err || "Error desconocido");
    const code = String(err?.code || "");

    let failureCategory = "CONNECTION_ERROR";
    let rootCause = msg;
    let suggestedRecovery = "Se mantiene activa la base de datos operativa de respaldo de MINT para no interrumpir la tarea.";

    if (code === "ECONNREFUSED" || msg.includes("ECONNREFUSED")) {
      failureCategory = "SERVICE_UNREACHABLE";
      rootCause = "El servidor PostgreSQL de destino rechazó la conexión (el servicio está apagado o el puerto está cerrado).";
      suggestedRecovery = "Verificar que el servidor de destino esté encendido o utilizar el motor PostgreSQL embebido de MINT.";
    } else if (code === "28P01" || msg.includes("password authentication failed")) {
      failureCategory = "AUTHENTICATION_FAILED";
      rootCause = "Credenciales rechazadas por el servidor (usuario o contraseña incorrectos).";
      suggestedRecovery = "Verificar el usuario y contraseña de la base de datos o usar una fuente de datos local alternativa.";
    } else if (code === "3D000" || msg.includes("does not exist")) {
      failureCategory = "DATABASE_NOT_FOUND";
      rootCause = "El servidor responde pero el nombre de la base de datos solicitada no existe.";
      suggestedRecovery = "Verificar el nombre de la base de datos en la URI o crearla antes de sincronizar.";
    } else if (code === "ENOTFOUND" || msg.includes("ENOTFOUND")) {
      failureCategory = "DNS_HOST_NOT_FOUND";
      rootCause = "No se pudo resolver el nombre del host especificado en la cadena de conexión.";
      suggestedRecovery = "Revisar el dominio del host o la conexión de red.";
    } else if (msg.includes("timeout") || code === "ETIMEDOUT") {
      failureCategory = "NETWORK_TIMEOUT";
      rootCause = "Tiempo de espera agotado al intentar conectar (posible bloqueo de firewall o red inalcanzable).";
      suggestedRecovery = "Revisar reglas de firewall/red o continuar operando en la base local de MINT.";
    }

    return {
      success: false,
      error: msg,
      errorCode: code,
      failureCategory,
      rootCause,
      recoverable: true,
      fallbackActive: true,
      activeFallbackEngine: isEmbeddedDb ? "PGlite Embedded PostgreSQL" : "Active Local PostgreSQL",
      suggestedRecovery,
      latencyMs: Date.now() - start,
    };
  }
}
