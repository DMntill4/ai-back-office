import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import fs from "node:fs";

import { authRoutes } from "./routes/auth";
import { decisionsRoutes } from "./routes/decisions";
import { chatRoutes } from "./routes/chat";
import { eventsRoutes } from "./routes/events";
import { briefingRoutes } from "./routes/briefing";
import { productsRoutes } from "./routes/products";
import { ordersRoutes } from "./routes/orders";
import { channelsRoutes } from "./routes/channels";
import { daemonRoutes } from "./routes/daemon";
import { healthRoutes } from "./routes/health";
import { telemetryRoutes } from "./routes/telemetry";
import { logisticsRoutes } from "./routes/logistics";
import { inventoryRoutes } from "./routes/inventory";
import { suppliersRoutes } from "./routes/suppliers";
import { vaultRoutes } from "./routes/vault";
import { graphRoutes } from "./routes/graph";
import { ingestRoutes } from "./routes/ingest";
import { analyticsRoutes } from "./routes/analytics";
import { reportsRoutes } from "./routes/reports";
import { dataHealthRoutes } from "./routes/dataHealth";
import { preflightRoutes } from "./routes/preflight";
import { shadowRoutes } from "./routes/shadow";
import { questionsRoutes } from "./routes/questions";
import { configRoutes } from "./routes/config";
import { profileRoutes } from "./routes/profile";
import { teamRoutes } from "./routes/team";
import fastifyWebsocket from "@fastify/websocket";
import fastifyMultipart from "@fastify/multipart";
import { startTelemetryBridge, stopTelemetryBridge } from "./events/telemetryBridge";

export interface BuildAppOptions {
  staticPath?: string;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const server = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 10 * 1024 * 1024, // 10MB
  });

  // Enable CORS for all origins in development and local network
  server.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  });

  // Codificación UTF-8 explícita en toda respuesta JSON.
  // Sin `charset=utf-8` algunos navegadores/proxies interpretan el cuerpo como
  // Latin-1 y las tildes/eñes se muestran como mojibake (ej. "polÃ­ticas").
  server.addHook("onSend", async (request, reply, payload) => {
    const contentType = reply.getHeader("content-type");
    if (typeof contentType === "string" && contentType.includes("application/json")) {
      if (!/charset=/i.test(contentType)) {
        reply.header("content-type", "application/json; charset=utf-8");
      }
    } else if (contentType === undefined && typeof payload === "string") {
      // Respuestas serializadas por Fastify sin content-type explícito.
      reply.header("content-type", "application/json; charset=utf-8");
    }
    return payload;
  });

  // Enable native WebSocket support for real-time telemetry streaming
  server.register(fastifyWebsocket);

  // Enable multipart/form-data for CSV/Excel ingestion uploads
  server.register(fastifyMultipart, {
    limits: { fileSize: 25 * 1024 * 1024 },
  });

  // Bridge Core telemetry + proactive alerts into the SSE hub
  startTelemetryBridge();
  server.addHook("onClose", async () => {
    stopTelemetryBridge();
  });

  // Red de seguridad global: ninguna excepción no controlada debe escapar como
  // un 500 opaco. Siempre se responde JSON con `success: false` y el detalle,
  // de modo que la consola web pueda degradar a su estado de respaldo.
  server.setErrorHandler((error: any, request, reply) => {
    const statusCode =
      typeof error?.statusCode === "number" && error.statusCode >= 400
        ? error.statusCode
        : 500;

    const message = error?.message || "Error interno no controlado en el servidor.";
    const isServerError = statusCode >= 500;

    if (isServerError) {
      console.error(
        `[MINT API] ${request.method} ${request.url} -> ${statusCode}: ${message}`,
        error?.stack ? `\n${error.stack}` : "",
      );
    }

    if (reply.sent) return;

    reply.status(statusCode).send({
      success: false,
      data: null,
      error: message,
      message: isServerError
        ? `Error interno del servidor: ${message}`
        : message,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });
  });

  // Register modular API routes
  server.register(authRoutes);
  server.register(decisionsRoutes);
  server.register(chatRoutes);
  server.register(eventsRoutes);
  server.register(briefingRoutes);
  server.register(productsRoutes);
  server.register(ordersRoutes);
  server.register(channelsRoutes);
  server.register(daemonRoutes);
  server.register(healthRoutes);
  server.register(telemetryRoutes);
  server.register(logisticsRoutes);
  server.register(inventoryRoutes);
  server.register(suppliersRoutes);
  server.register(vaultRoutes);
  server.register(graphRoutes);
  server.register(ingestRoutes);
  server.register(analyticsRoutes);
  server.register(reportsRoutes);
  server.register(dataHealthRoutes);
  server.register(preflightRoutes);
  server.register(shadowRoutes);
  server.register(questionsRoutes);
  server.register(configRoutes);
  server.register(profileRoutes);
  server.register(teamRoutes);

  // Static web console serving
  const candidateStaticPaths = [
    options.staticPath,
    path.resolve(__dirname, "../../web/dist"),
    path.resolve(__dirname, "../../web/public"),
    path.resolve(process.cwd(), "packages/web/dist"),
    path.resolve(process.cwd(), "packages/web/public"),
  ].filter(Boolean) as string[];

  let resolvedStaticPath: string | null = null;
  for (const candidate of candidateStaticPaths) {
    if (fs.existsSync(candidate)) {
      resolvedStaticPath = candidate;
      break;
    }
  }

  if (resolvedStaticPath) {
    server.register(fastifyStatic, {
      root: resolvedStaticPath,
      prefix: "/",
      wildcard: false,
    });

    // SPA fallback: Any non-API route serves index.html
    server.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/")) {
        return reply.status(404).send({
          success: false,
          error: `Ruta de API no encontrada: ${request.method} ${request.url}`,
        });
      }
      const indexPath = path.join(resolvedStaticPath!, "index.html");
      if (fs.existsSync(indexPath)) {
        return reply.type("text/html; charset=utf-8").sendFile("index.html");
      }
      return reply.status(404).send("Web UI not found");
    });
  } else {
    server.get("/", async (request, reply) => {
      return reply.type("application/json; charset=utf-8").send({
        name: "MINT Autonomous Back Office API",
        version: "2.5.0",
        status: "ONLINE",
        docs: "/api/briefing/today",
        events: "/api/events/stream",
      });
    });
  }

  return server;
}
