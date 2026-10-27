import { buildApp } from "./app";
import { apiDaemonRunner } from "./daemon/daemonRunner";

const PORT = Number(process.env.PORT || process.env.MINT_API_PORT || 3001);
const HOST = process.env.HOST || "0.0.0.0";

export async function startServer() {
  const app = buildApp({ logger: false });

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`\n[MINT API] Servidor activo en http://localhost:${PORT}`);
    console.log(`[MINT API] SSE Event Stream: http://localhost:${PORT}/api/events/stream`);
    console.log(`[MINT API] WebSocket Telemetry Stream: ws://localhost:${PORT}/ws/telemetry`);

    // Iniciar el daemon autónomo en el mismo proceso de la API (ciclo de 30s)
    await apiDaemonRunner.start("comp_default");
    console.log(`[MINT API] Daemon autónomo enlazado en segundo plano (vigilancia de stock y logística).\n`);

    // Manejo de señales de terminación limpia
    const signals = ["SIGINT", "SIGTERM"];
    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`\n[MINT API] Recibida señal ${signal}. Deteniendo servicios...`);
        await apiDaemonRunner.stop().catch(() => null);
        await app.close();
        process.exit(0);
      });
    }

    return app;
  } catch (err: any) {
    if (err.code === "EADDRINUSE") {
      console.log(`[MINT API] Puerto ${PORT} ya en uso. Reutilizando instancia existente.`);
      return app;
    }
    console.error("[MINT API] Error al iniciar servidor:", err);
    throw err;
  }
}

// Iniciar servidor automáticamente cuando se ejecuta con tsx packages/api/src/index.ts
startServer().catch((err) => {
  console.error(err);
});
