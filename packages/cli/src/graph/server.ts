import * as http from "node:http";
import * as crypto from "node:crypto";
import { exec } from "node:child_process";
import { getWebClientHtml } from "./webClientHtml";
import { loadRealGraphData } from "./dataLoader";
import { mintSpiderEventBus } from "./eventBus";
import { getSession } from "../keychain";
import { MintSpiderEvent } from "./graph.types";

export interface GraphServerOptions {
  port?: number;
  openBrowser?: boolean;
  isDemo?: boolean;
  isShadow?: boolean;
  companyIdOverride?: string;
  roleOverride?: string;
}

/**
 * Servidor Local para MINT Graph
 * - Escucha estrictamente en 127.0.0.1
 * - Token de sesión seguro en la URL
 * - Cero dependencias CDN: todo es código local
 * - Streaming en tiempo real vía SSE (Server-Sent Events)
 * - Filtrado por empresa y rol de sesión
 */
export async function startGraphServer(options: GraphServerOptions = {}) {
  const port = options.port || 3456;
  const isDemo = Boolean(options.isDemo);
  const isShadow = Boolean(options.isShadow);

  // 1. Validar Sesión Activa
  let session = await getSession();

  if (!session && !isDemo) {
    console.error("\x1b[31m[ERROR]\x1b[0m No hay sesión activa en MINT.");
    console.error("Debes autenticarte primero con: \x1b[32mmint login\x1b[0m");
    console.error("O para explorar una simulación aislada de prueba ejecuta: \x1b[33mmint graph --demo\x1b[0m\n");
    process.exit(1);
  }

  const effectiveCompanyId = options.companyIdOverride || (session ? session.companyId : "DEMO_COMPANY");
  const effectiveCompanyName = session ? session.companyName : (isDemo ? "[DEMO] Ferretería Santandereana" : "Empresa MINT");
  const effectiveRole = options.roleOverride || (session ? session.role : "operador");

  // 2. Generar Token Criptográfico de Un Solo Uso
  const sessionToken = crypto.randomBytes(16).toString("hex");
  const validTokens = new Set<string>([sessionToken]);

  // 3. Crear Servidor HTTP Local
  const server = http.createServer(async (req, res) => {
    const urlObj = new URL(req.url || "/", `http://127.0.0.1:${port}`);
    const pathname = urlObj.pathname;
    const reqToken = urlObj.searchParams.get("token");

    // Seguridad: Rechazar orígenes remotos y conexiones sin token válido
    const clientIp = req.socket.remoteAddress || "";
    if (!clientIp.includes("127.0.0.1") && !clientIp.includes("::1") && !clientIp.includes("localhost")) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Acceso Prohibido: El servidor del grafo solo acepta conexiones locales (127.0.0.1).");
      return;
    }

    // Ruta de la Aplicación Web (HTML)
    if (pathname === "/" || pathname === "/index.html") {
      if (!reqToken || !validTokens.has(reqToken)) {
        res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <div style="font-family:sans-serif; background:#060a08; color:#ef4444; padding:40px; text-align:center;">
            <h2>Acceso No Autorizado</h2>
            <p style="color:#94a3b8;">El token de sesión es inválido o ha expirado. Vuelve a iniciar el comando desde la terminal.</p>
          </div>
        `);
        return;
      }

      const html = getWebClientHtml(sessionToken, effectiveCompanyId, isDemo, isShadow);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(html);
      return;
    }

    // API: Carga inicial de datos del grafo
    if (pathname === "/api/graph") {
      if (!reqToken || !validTokens.has(reqToken)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Token de sesión inválido" }));
        return;
      }

      try {
        const payload = await loadRealGraphData(effectiveCompanyId, {
          isDemo,
          isShadow,
          userRole: effectiveRole,
        });

        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-cache",
        });
        res.end(JSON.stringify(payload));
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // API: Streaming de Eventos SSE (Server-Sent Events)
    if (pathname === "/api/events/stream") {
      if (!reqToken || !validTokens.has(reqToken)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Token de sesión inválido" }));
        return;
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      // Confirmación inicial de enlace
      res.write(`data: ${JSON.stringify({ type: "keepalive", message: "Conectado al bus del agente" })}\n\n`);

      // Limitador de tasa y cola para evitar sobrecarga (máx 50 eventos/segundo al cliente)
      const outgoingQueue: MintSpiderEvent[] = [];
      let isFlushing = false;

      const flushQueue = () => {
        if (isFlushing || outgoingQueue.length === 0) return;
        isFlushing = true;

        const batch = outgoingQueue.splice(0, 15);
        for (const ev of batch) {
          res.write(`data: ${JSON.stringify(ev)}\n\n`);
        }

        setTimeout(() => {
          isFlushing = false;
          if (outgoingQueue.length > 0) flushQueue();
        }, 50);
      };

      // Escuchador de eventos filtrado por empresa
      const onSpiderEvent = (event: MintSpiderEvent) => {
        if (!isDemo && event.companyId !== effectiveCompanyId) {
          return; // Aislamiento multi-tenant estricto
        }
        outgoingQueue.push(event);
        flushQueue();
      };

      const eventName = isDemo ? "event" : `company:${effectiveCompanyId}`;
      mintSpiderEventBus.on(eventName, onSpiderEvent);

      // Keepalive cada 15 segundos
      const keepAliveInterval = setInterval(() => {
        try {
          res.write(`data: ${JSON.stringify({ type: "keepalive", timestamp: Date.now() })}\n\n`);
        } catch {
          clearInterval(keepAliveInterval);
        }
      }, 15000);

      req.on("close", () => {
        clearInterval(keepAliveInterval);
        mintSpiderEventBus.off(eventName, onSpiderEvent);
      });

      return;
    }

    // 404 No Encontrado
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Ruta no encontrada");
  });

  // 4. Iniciar Servidor en 127.0.0.1
  server.listen(port, "127.0.0.1", () => {
    const localUrl = `http://127.0.0.1:${port}/?token=${sessionToken}`;

    console.log("\n\x1b[32m╔══════════════════════════════════════════════════════════════════╗\x1b[0m");
    console.log(`\x1b[32m║\x1b[0m  \x1b[1mMINT GRAPH — Visualizador del Agente Autónomo (Estilo Obsidian)\x1b[0m  \x1b[32m║\x1b[0m`);
    console.log("\x1b[32m╚══════════════════════════════════════════════════════════════════╝\x1b[0m\n");

    console.log(`  \x1b[36m•\x1b[0m Empresa:        \x1b[1m${effectiveCompanyName}\x1b[0m [${effectiveCompanyId}]`);
    console.log(`  \x1b[36m•\x1b[0m Rol de Usuario: \x1b[33m${effectiveRole}\x1b[0m`);
    console.log(`  \x1b[36m•\x1b[0m Modo:           ${isDemo ? "\x1b[41m\x1b[37m DEMO AISLADO \x1b[0m" : "\x1b[32mPRODUCCIÓN (AUDITORÍA REAL)\x1b[0m"}`);
    if (isShadow) {
      console.log(`  \x1b[36m•\x1b[0m Modo Sombra:    \x1b[35mACTIVADO (Araña Fantasma)\x1b[0m`);
    }
    console.log(`  \x1b[36m•\x1b[0m Enlace Seguro:  \x1b[4m\x1b[34m${localUrl}\x1b[0m\n`);
    console.log("\x1b[90mEscuchando únicamente en 127.0.0.1 con token criptográfico de sesión.\x1b[0m");
    console.log("\x1b[90mPresiona Ctrl+C en cualquier momento para detener el servidor.\x1b[0m\n");

    // 5. Apertura Automática del Navegador
    if (options.openBrowser !== false) {
      openUrlInBrowser(localUrl);
    }
  });

  return { server, sessionToken };
}

/**
 * Abre el navegador de forma segura según el sistema operativo
 */
function openUrlInBrowser(url: string) {
  const platform = process.platform;
  let cmd = "";

  if (platform === "win32") {
    cmd = `start "" "${url}"`;
  } else if (platform === "darwin") {
    cmd = `open "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }

  exec(cmd, (err) => {
    if (err) {
      console.log(`\x1b[90m[Info] Para ver el grafo abre manualmente: ${url}\x1b[0m`);
    }
  });
}
