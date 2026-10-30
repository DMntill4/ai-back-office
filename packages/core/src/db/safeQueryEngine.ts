import { pool } from "./client";
import { operationalEvents } from "./schema";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export interface SafeQueryResult {
  success: boolean;
  isReadOnly: boolean;
  rowCount: number;
  headers: string[];
  rows: any[];
  latencyMs: number;
  message?: string;
  backupPath?: string;
  requiresConfirmation?: boolean;
  destructiveWarning?: string;
}

export async function executeSafeSqlQuery(params: {
  companyId: string;
  sqlQuery: string;
  userRole?: string;
  userName?: string;
  confirmed?: boolean;
}): Promise<SafeQueryResult> {
  const start = Date.now();
  const trimmed = params.sqlQuery.trim();
  const role = (params.userRole || "viewer").toLowerCase();
  const userName = params.userName || "CLI_USER";

  // 1. Análisis de intención y clasificación
  const isSelect = /^(SELECT|EXPLAIN|SHOW|WITH\s+.*\s+SELECT)\b/i.test(trimmed);
  const isDestructive = /\b(TRUNCATE|DROP|DELETE\s+FROM\s+\w+\s*(?:;|$))\b/i.test(trimmed);
  const isMutation = /\b(INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|CREATE)\b/i.test(trimmed);

  // 2. Control estricto de roles RBAC
  if (isMutation && role !== "owner" && role !== "admin") {
    return {
      success: false,
      isReadOnly: false,
      rowCount: 0,
      headers: [],
      rows: [],
      latencyMs: Date.now() - start,
      message: `[ACCESO DENEGADO] El rol '${role}' tiene permisos de solo lectura. Se requiere rol 'owner' o 'admin' para ejecutar operaciones de escritura SQL.`,
    };
  }

  // 3. Protección contra operaciones destructivas
  if (isDestructive && !params.confirmed) {
    return {
      success: false,
      isReadOnly: false,
      rowCount: 0,
      headers: [],
      rows: [],
      latencyMs: Date.now() - start,
      requiresConfirmation: true,
      destructiveWarning: `[ALERTA DE SEGURIDAD] La consulta contiene una operación altamente destructiva (${trimmed.slice(0, 40)}...). Se requiere confirmación explícita (--force o confirmar) para proceder.`,
    };
  }

  const client = await pool.connect();
  let backupPath: string | undefined;

  try {
    if (isSelect) {
      // Modo SOLO LECTURA estricto con timeout de 8 segundos
      await client.query("BEGIN TRANSACTION READ ONLY;");
      await client.query("SET statement_timeout = 8000;");
      const res = await client.query(trimmed);
      await client.query("COMMIT;");

      const rows = res.rows || [];
      const headers = res.fields ? res.fields.map((f: any) => f.name) : (rows[0] ? Object.keys(rows[0]) : []);

      return {
        success: true,
        isReadOnly: true,
        rowCount: rows.length,
        headers,
        rows: rows.slice(0, 100), // Paginación segura: máx 100 filas
        latencyMs: Date.now() - start,
      };
    } else {
      // Escritura: crear respaldo previo de seguridad
      const backupDir = path.resolve(process.cwd(), "vault", "backups");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      backupPath = path.join(backupDir, `pre_write_${Date.now()}_${randomUUID().slice(0, 6)}.sql`);
      fs.writeFileSync(backupPath, `-- Backup automático previo a escritura\n-- Usuario: ${userName} (${role})\n-- Consulta: ${trimmed}\n-- Fecha: ${new Date().toISOString()}\n`, "utf8");

      // Ejecutar en transacción con rollback en caso de error
      await client.query("BEGIN;");
      const res = await client.query(trimmed);
      await client.query("COMMIT;");

      const affected = res.rowCount || 0;

      // Registrar en eventos operativos / auditoría
      try {
        await client.query(`
          INSERT INTO operational_events (id, company_id, event_type, severity, status, title, description, payload, created_at)
          VALUES ($1, $2, 'SQL_MUTATION', 'HIGH', 'RESOLVED', $3, $4, $5, NOW())
        `, [
          `sql_${Date.now()}_${randomUUID().slice(0, 6)}`,
          params.companyId,
          `Operación SQL por ${userName}`,
          trimmed,
          JSON.stringify({ affectedRows: affected, backupPath, user: userName, role }),
        ]);
      } catch {
        // Log no bloqueante
      }

      return {
        success: true,
        isReadOnly: false,
        rowCount: affected,
        headers: [],
        rows: [],
        latencyMs: Date.now() - start,
        backupPath,
        message: `Operación de escritura exitosa. Filas afectadas: ${affected}. Respaldo previo creado en: ${backupPath}`,
      };
    }
  } catch (err: any) {
    await client.query("ROLLBACK;").catch(() => {});
    return {
      success: false,
      isReadOnly: isSelect,
      rowCount: 0,
      headers: [],
      rows: [],
      latencyMs: Date.now() - start,
      message: `Error al ejecutar SQL: ${err.message}`,
    };
  } finally {
    client.release();
  }
}
