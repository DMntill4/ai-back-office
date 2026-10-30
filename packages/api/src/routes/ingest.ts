import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import "@fastify/multipart";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import {
    parseCsvContent,
    parseExcelFile,
    listExcelSheets,
    syncDataSource,
    sanitizeRow,
} from "@mint/ingest";
import {
    validateOutboundUrl,
    discoverCustomerSchema,
    saveConfirmedTableMapping,
    estimateTableSize,
    safePaginatedQuery,
    detectSchemaDrift,
} from "@mint/core";
import { currentSession } from "./auth";
import { sseHub } from "../events/sseHub";

/**
 * Rutas de Ingesta de Datos.
 *
 * Conecta `packages/ingest`:
 *  - `csvParser.parseCsvContent` / `excelParser.parseExcelFile`
 *  - `sanitizer.sanitizeRow` (saneamiento de celdas)
 *  - `syncEngine.syncDataSource` (importación con drift y cuarentena)
 *
 * Endpoints:
 *  - POST /api/ingest/upload          → recibe CSV/Excel y ejecuta el pipeline de sync
 *  - POST /api/ingest/remote          → importa desde una URL externa (protegida por ssrfGuard)
 *  - GET  /api/ingest/schema          → descubrimiento de esquema en modo solo lectura
 *  - POST /api/ingest/schema/mapping  → confirma un mapeo de tabla propuesto
 *  - GET  /api/ingest/table-size      → estimación de tamaño de tabla
 *  - GET  /api/ingest/paginated       → consulta paginada acotada (statement_timeout)
 *  - GET  /api/ingest/drift           → detección de deriva de esquema
 */

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

function isExcel(filename: string): boolean {
    return /\.(xlsx|xls)$/i.test(filename);
}

function isCsv(filename: string): boolean {
    return /\.csv$/i.test(filename);
}

export async function ingestRoutes(fastify: FastifyInstance) {
    fastify.post("/api/ingest/upload", async (request: FastifyRequest, reply: FastifyReply) => {
        const companyId = currentSession.companyId;

        if (!request.isMultipart()) {
            reply.code(415);
            return {
                success: false,
                message: "Se requiere multipart/form-data con un campo 'file' (CSV o Excel).",
            };
        }

        let tmpPath: string | null = null;

        try {
            const data = await request.file({ limits: { fileSize: MAX_UPLOAD_BYTES } });
            if (!data) {
                reply.code(400);
                return { success: false, message: "No se recibió ningún archivo." };
            }

            const filename = data.filename || "upload.csv";
            if (!isCsv(filename) && !isExcel(filename)) {
                reply.code(415);
                return {
                    success: false,
                    message: `Formato no soportado: '${filename}'. Usa .csv, .xlsx o .xls.`,
                };
            }

            // Persistir el stream a un archivo temporal para los parsers basados en disco.
            const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "mint-ingest-"));
            tmpPath = path.join(tmpDir, filename);
            await pipeline(data.file, fs.createWriteStream(tmpPath));

            if (data.file.truncated) {
                reply.code(413);
                return {
                    success: false,
                    message: `El archivo excede el límite de ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`,
                };
            }

            // 1. Parsear según formato
            let headers: string[] = [];
            let rows: Array<Record<string, any>> = [];
            let sheetName: string | undefined;

            if (isExcel(filename)) {
                const sheets = listExcelSheets(tmpPath);
                sheetName = sheets[0];
                const parsed = parseExcelFile(tmpPath, sheetName);
                headers = parsed.headers;
                rows = parsed.rows;
            } else {
                const content = await fs.promises.readFile(tmpPath, "utf8");
                const parsed = parseCsvContent(content);
                headers = parsed.headers;
                rows = parsed.rows;
            }

            if (headers.length === 0) {
                reply.code(422);
                return {
                    success: false,
                    message: "El archivo no contiene encabezados válidos.",
                };
            }

            // 2. Sanear filas antes de la importación
            const sanitizedRows = rows.map((row) => sanitizeRow(row));

            // 3. Ejecutar el motor de sincronización
            const result = await syncDataSource({
                companyId,
                sourceName: filename,
                sourceType: isExcel(filename) ? "excel" : "csv",
                uriOrPath: tmpPath,
                currentHeaders: headers,
                rows: sanitizedRows,
                originMtime: new Date(),
            });

            sseHub.broadcast({
                type: "ingest_completed",
                agent: "dataIngest",
                action: "upload_sync",
                details: `Ingesta de '${filename}' (${result.totalRows} filas) finalizada con estado ${result.status}.`,
                resultSummary: `${result.importedRows} importadas · ${result.failedRows} fallidas · ${result.deletedRows} eliminadas`,
                payload: {
                    filename,
                    sheetName,
                    status: result.status,
                    totalRows: result.totalRows,
                    importedRows: result.importedRows,
                    failedRows: result.failedRows,
                    deletedRows: result.deletedRows,
                    drift: result.drift,
                    massDeletionAnomaly: result.massDeletionAnomaly,
                },
            });

            return {
                success: result.success,
                message: result.success
                    ? `Ingesta completada: ${result.importedRows} de ${result.totalRows} filas importadas.`
                    : `Ingesta finalizada con incidencias (estado: ${result.status}).`,
                data: {
                    filename,
                    sheetName,
                    headers,
                    ...result,
                },
            };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error durante la ingesta: ${err.message}` };
        } finally {
            if (tmpPath) {
                try {
                    await fs.promises.unlink(tmpPath);
                    await fs.promises.rmdir(path.dirname(tmpPath));
                } catch {
                    // Limpieza best-effort del archivo temporal.
                }
            }
        }
    });

    // 2. Ingesta remota desde URL externa (protegida contra SSRF)
    fastify.post("/api/ingest/remote", async (request: FastifyRequest, reply: FastifyReply) => {
        const companyId = currentSession.companyId;
        const body = (request.body as any) || {};
        const rawUrl = body.url;

        if (!rawUrl) {
            reply.code(400);
            return { success: false, message: "Se requiere 'url' para la ingesta remota." };
        }

        // Bloquea metadatos cloud, loopback, redes privadas y protocolos peligrosos.
        const ssrf = validateOutboundUrl(String(rawUrl));
        if (!ssrf.isSafe) {
            reply.code(422);
            return {
                success: false,
                blocked: true,
                message: `URL rechazada por el guardia anti-SSRF: ${ssrf.reason}`,
            };
        }

        try {
            const res = await fetch(ssrf.normalizedUrl || String(rawUrl), {
                signal: AbortSignal.timeout(15000),
            });
            if (!res.ok) {
                reply.code(502);
                return {
                    success: false,
                    message: `El origen remoto respondió ${res.status} ${res.statusText}.`,
                };
            }

            const content = await res.text();
            const parsed = parseCsvContent(content);

            if (parsed.headers.length === 0) {
                reply.code(422);
                return { success: false, message: "El recurso remoto no contiene encabezados CSV válidos." };
            }

            const sanitizedRows = parsed.rows.map((row) => sanitizeRow(row));
            const result = await syncDataSource({
                companyId,
                sourceName: String(body.sourceName || ssrf.normalizedUrl || rawUrl),
                sourceType: "csv",
                uriOrPath: ssrf.normalizedUrl || String(rawUrl),
                currentHeaders: parsed.headers,
                rows: sanitizedRows,
                originMtime: new Date(),
            });

            sseHub.broadcast({
                type: "ingest_completed",
                agent: "dataIngest",
                action: "remote_sync",
                details: `Ingesta remota desde '${ssrf.normalizedUrl}' (${result.totalRows} filas) con estado ${result.status}.`,
                resultSummary: `${result.importedRows} importadas · ${result.failedRows} fallidas`,
                payload: { url: ssrf.normalizedUrl, ...result },
            });

            return { success: result.success, data: { url: ssrf.normalizedUrl, ...result } };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error en la ingesta remota: ${err.message}` };
        }
    });

    // 2.1 Sincronización activa bajo demanda (conectores reales configurados en .env)
    // Ejecuta el motor de sync contra una fuente real (PostgreSQL read-only o CSV remoto)
    // y actualiza productos, inventario y envíos reflejando datos vivos.
    fastify.post("/api/ingest/sync", async (request: FastifyRequest, reply: FastifyReply) => {
        const companyId = currentSession.companyId;
        const body = (request.body as any) || {};
        const sourceType = String(body.sourceType || "postgres_readonly");

        try {
            if (sourceType === "postgres_readonly") {
                const connectionString =
                    body.connectionString ||
                    process.env.INGEST_POSTGRES_URL ||
                    process.env.DATABASE_URL;
                if (!connectionString) {
                    reply.code(400);
                    return {
                        success: false,
                        message:
                            "Falta 'connectionString' o la variable INGEST_POSTGRES_URL/DATABASE_URL para sincronizar PostgreSQL.",
                    };
                }

                const { listPostgresTables, queryReadOnlyPostgres } = await import("@mint/ingest");
                const table = String(body.table || "");
                if (!table) {
                    const tables = await listPostgresTables(connectionString);
                    reply.code(400);
                    return {
                        success: false,
                        message: "Se requiere 'table' para sincronizar desde PostgreSQL.",
                        availableTables: tables,
                    };
                }

                const { rows, headers } = await queryReadOnlyPostgres({
                    connectionString,
                    tableName: table,
                    limit: Number(body.limit) || 5000,
                });

                const sanitizedRows = rows.map((row) => sanitizeRow(row));
                const result = await syncDataSource({
                    companyId,
                    sourceName: String(body.sourceName || `postgres:${table}`),
                    sourceType: "postgres_readonly",
                    uriOrPath: String(body.uriOrPath || `postgres://${table}`),
                    currentHeaders: headers,
                    rows: sanitizedRows,
                    originMtime: new Date(),
                });

                sseHub.broadcast({
                    type: "ingest_completed",
                    agent: "dataIngest",
                    action: "active_sync",
                    details: `Sincronización activa de '${table}' (${result.totalRows} filas) con estado ${result.status}.`,
                    resultSummary: `${result.importedRows} importadas · ${result.failedRows} fallidas`,
                    payload: { table, ...result },
                });

                return { success: result.success, data: { table, ...result } };
            }

            if (sourceType === "csv") {
                const rawUrl = body.url;
                if (!rawUrl) {
                    reply.code(400);
                    return { success: false, message: "Se requiere 'url' para sincronizar CSV remoto." };
                }
                const ssrf = validateOutboundUrl(String(rawUrl));
                if (!ssrf.isSafe) {
                    reply.code(422);
                    return {
                        success: false,
                        blocked: true,
                        message: `URL rechazada por el guardia anti-SSRF: ${ssrf.reason}`,
                    };
                }
                const res = await fetch(ssrf.normalizedUrl || String(rawUrl), {
                    signal: AbortSignal.timeout(15000),
                });
                if (!res.ok) {
                    reply.code(502);
                    return {
                        success: false,
                        message: `El origen remoto respondió ${res.status} ${res.statusText}.`,
                    };
                }
                const content = await res.text();
                const parsed = parseCsvContent(content);
                if (parsed.headers.length === 0) {
                    reply.code(422);
                    return { success: false, message: "El recurso remoto no contiene encabezados CSV válidos." };
                }
                const sanitizedRows = parsed.rows.map((row) => sanitizeRow(row));
                const result = await syncDataSource({
                    companyId,
                    sourceName: String(body.sourceName || ssrf.normalizedUrl || rawUrl),
                    sourceType: "csv",
                    uriOrPath: ssrf.normalizedUrl || String(rawUrl),
                    currentHeaders: parsed.headers,
                    rows: sanitizedRows,
                    originMtime: new Date(),
                });

                sseHub.broadcast({
                    type: "ingest_completed",
                    agent: "dataIngest",
                    action: "active_sync",
                    details: `Sincronización activa CSV desde '${ssrf.normalizedUrl}' (${result.totalRows} filas) con estado ${result.status}.`,
                    resultSummary: `${result.importedRows} importadas · ${result.failedRows} fallidas`,
                    payload: { url: ssrf.normalizedUrl, ...result },
                });

                return { success: result.success, data: { url: ssrf.normalizedUrl, ...result } };
            }

            reply.code(400);
            return {
                success: false,
                message: `sourceType '${sourceType}' no soportado. Usa 'postgres_readonly' o 'csv'.`,
            };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error en la sincronización activa: ${err.message}` };
        }
    });

    // 3. Descubrimiento de esquema (solo lectura, nunca altera tablas del cliente)
    fastify.get("/api/ingest/schema", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await discoverCustomerSchema(companyId);
            return { success: true, data };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                message: `Error al descubrir el esquema: ${err.message}`,
            };
        }
    });

    // 4. Confirmar un mapeo de tabla propuesto
    fastify.post("/api/ingest/schema/mapping", async (request: FastifyRequest, reply: FastifyReply) => {
        const body = (request.body as any) || {};
        const companyId = body.companyId || currentSession.companyId;

        // Acepta tanto el vocabulario del servicio (`sourceTable`/`targetEntity`)
        // como los alias históricos de la consola (`tableName`/`mintEntity`).
        const sourceTable = body.sourceTable || body.tableName;
        const targetEntity = body.targetEntity || body.mintEntity;

        if (!sourceTable || !targetEntity) {
            reply.code(400);
            return {
                success: false,
                message: "Se requieren 'sourceTable' (o 'tableName') y 'targetEntity' (o 'mintEntity').",
            };
        }

        try {
            await saveConfirmedTableMapping({
                companyId,
                sourceTable: String(sourceTable),
                targetEntity: String(targetEntity),
                columnMappings: body.columnMappings || body.columnMapping || {},
                isConfirmed: body.isConfirmed ?? true,
                isReadOnly: body.isReadOnly ?? true,
                writeRoles: Array.isArray(body.writeRoles) ? body.writeRoles.map(String) : [],
            });
            return {
                success: true,
                data: {
                    companyId,
                    sourceTable: String(sourceTable),
                    targetEntity: String(targetEntity),
                    confirmedBy: body.confirmedBy || currentSession.userName,
                },
            };
        } catch (err: any) {
            reply.code(422);
            return { success: false, message: `Error al guardar el mapeo: ${err.message}` };
        }
    });

    // 5. Estimación de tamaño de tabla
    fastify.get("/api/ingest/table-size", async (request: FastifyRequest, reply: FastifyReply) => {
        const query = (request.query as any) || {};
        const tableName = query.tableName || query.table;

        if (!tableName) {
            reply.code(400);
            return { success: false, message: "Se requiere 'tableName'." };
        }

        try {
            const data = await estimateTableSize(String(tableName));
            return { success: true, data };
        } catch (err: any) {
            reply.code(422);
            return { success: false, message: `Error al estimar el tamaño: ${err.message}` };
        }
    });

    // 6. Consulta paginada acotada
    fastify.get("/api/ingest/paginated", async (request: FastifyRequest, reply: FastifyReply) => {
        const query = (request.query as any) || {};
        const tableName = query.tableName || query.table;

        if (!tableName) {
            reply.code(400);
            return { success: false, message: "Se requiere 'tableName'." };
        }

        try {
            const data = await safePaginatedQuery({
                tableName: String(tableName),
                columns: query.columns ? String(query.columns).split(",").filter(Boolean) : undefined,
                cursorColumn: query.cursorColumn || undefined,
                lastCursorValue: query.cursor ?? undefined,
                limit: Number(query.limit) || 500,
            });
            return { success: true, data };
        } catch (err: any) {
            reply.code(422);
            return { success: false, message: `Error en la consulta paginada: ${err.message}` };
        }
    });

    // 7. Detección de deriva de esquema
    fastify.get("/api/ingest/drift", async (request: FastifyRequest) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;

        try {
            const data = await detectSchemaDrift(companyId);
            return { success: true, data };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                message: `Error al detectar deriva de esquema: ${err.message}`,
            };
        }
    });
}
