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
import fastifyWebsocket from "@fastify/websocket";

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

  // Enable native WebSocket support for real-time telemetry streaming
  server.register(fastifyWebsocket);

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
        return reply.type("text/html").sendFile("index.html");
      }
      return reply.status(404).send("Web UI not found");
    });
  } else {
    server.get("/", async (request, reply) => {
      return reply.type("application/json").send({
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
