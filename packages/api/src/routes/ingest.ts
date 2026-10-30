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
 *  - POST /api/ingest/upload → recibe CSV/Excel y ejecuta el pipeline de sync
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
}
