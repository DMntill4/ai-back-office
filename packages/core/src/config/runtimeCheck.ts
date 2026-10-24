/**
 * Verificador de entorno de ejecución y arquitectura de almacenamiento de Mint.
 *
 * Arquitectura de Datos:
 * 1. Estado Interno (Lectura/Escritura): Requiere PostgreSQL (local o Supabase).
 *    Almacena: configuración de empresas, catálogo maestro, inventario sincronizado,
 *    árbol de decisiones, logs de auditoría inmutable, políticas y tokens.
 * 2. Fuentes Externas (Estrictamente Solo Lectura):
 *    - SQLite (vía `node:sqlite` nativo, requiere Node >= 22.5.0)
 *    - Archivos CSV / TSV (con detección de encoding y normalización)
 *    - Hojas de cálculo Excel (.xlsx / .xls)
 *    - Bases de datos PostgreSQL externas
 */

import { checkDatabaseHealth } from "../db/client";

export interface NodeVersionCheck {
  current: string;
  major: number;
  minor: number;
  patch: number;
  meetsMinimum: boolean;
  nativeSqliteSupported: boolean;
  recommendation?: string;
}

export interface PostgresCheck {
  connected: boolean;
  provider?: string;
  database?: string;
  host?: string;
  error?: string;
  recommendation?: string;
}

export interface RuntimeEnvironmentReport {
  compatible: boolean;
  node: NodeVersionCheck;
  postgres: PostgresCheck;
  architecture: {
    internalStateStore: "PostgreSQL";
    externalReadOnlySources: string[];
  };
  diagnostics: string[];
}

/**
 * Evalúa si la versión actual de Node.js soporta las características nativas requeridas (Node >= 22.5.0 para node:sqlite).
 */
export function checkNodeEnvironment(): NodeVersionCheck {
  const current = process.versions.node;
  const parts = current.split(".").map((p) => parseInt(p, 10));
  const major = parts[0] || 0;
  const minor = parts[1] || 0;
  const patch = parts[2] || 0;

  // Requisito: Node >= 22.5.0 para `node:sqlite` nativo
  const meetsMinimum = major > 22 || (major === 22 && minor >= 5);

  let nativeSqliteSupported = false;
  try {
    // Verificación dinámica de disponibilidad de node:sqlite
    const sqliteMod = require("node:sqlite");
    if (typeof sqliteMod.DatabaseSync === "function") {
      nativeSqliteSupported = true;
    }
  } catch {
    nativeSqliteSupported = false;
  }

  let recommendation: string | undefined;
  if (!meetsMinimum || !nativeSqliteSupported) {
    recommendation = `Mint requiere Node.js >= 22.5.0 para el motor SQLite nativo de solo lectura (versión actual: v${current}). Por favor actualiza Node.js: https://nodejs.org/`;
  }

  return {
    current,
    major,
    minor,
    patch,
    meetsMinimum,
    nativeSqliteSupported,
    recommendation,
  };
}

/**
 * Realiza un diagnóstico completo del entorno de ejecución (Node y PostgreSQL).
 */
export async function verifyRuntimeEnvironment(): Promise<RuntimeEnvironmentReport> {
  const node = checkNodeEnvironment();
  const dbHealth = await checkDatabaseHealth();

  const postgres: PostgresCheck = {
    connected: dbHealth.connected,
    provider: dbHealth.provider,
    database: dbHealth.database,
    host: dbHealth.host,
    error: dbHealth.error,
    recommendation: !dbHealth.connected
      ? `No se pudo conectar a PostgreSQL en ${process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ai_back_office"}. Verifica que el contenedor de PostgreSQL o el servicio de base de datos estén activos.`
      : undefined,
  };

  const diagnostics: string[] = [];

  if (!node.meetsMinimum) {
    diagnostics.push(`[ERROR] Versión de Node.js insuficiente (v${node.current}). Se requiere Node.js >= 22.5.0.`);
  } else if (!node.nativeSqliteSupported) {
    diagnostics.push(`[WARN] 'node:sqlite' no está disponible en este entorno. Las fuentes SQLite externas estarán deshabilitadas.`);
  }

  if (!postgres.connected) {
    diagnostics.push(`[ERROR] Base de datos interna desconectada: ${postgres.error}`);
  }

  const compatible = node.meetsMinimum && postgres.connected;

  return {
    compatible,
    node,
    postgres,
    architecture: {
      internalStateStore: "PostgreSQL",
      externalReadOnlySources: ["SQLite (node:sqlite)", "CSV / TSV", "Excel (.xlsx, .xls)", "PostgreSQL Externo"],
    },
    diagnostics,
  };
}
