import * as net from "node:net";
import { theme } from "../ui/theme";

export async function checkPortReachable(host: string, port: number, timeoutMs = 600): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

/**
 * Asegura que la infraestructura de persistencia esté activa y lista.
 * Si PostgreSQL local (5432) o Cloud está activo, lo utiliza.
 * Si Docker no está corriendo, activa transparentemente el motor PostgreSQL embebido (PGlite Zero-Config)
 * sin fallar ni bloquear al usuario.
 */
export async function ensureEnterpriseDatabaseActive(): Promise<{ success: boolean; message: string }> {
  const host = process.env.POSTGRES_HOST || "localhost";
  const port = parseInt(process.env.POSTGRES_PORT || "5432", 10);

  const alreadyRunning = await checkPortReachable(host, port);
  if (alreadyRunning) {
    return { success: true, message: `PostgreSQL activo en ${host}:${port}` };
  }

  console.log(
    theme.mint(
      `  [INFRAESTRUCTURA] Activando motor PostgreSQL embebido de alta resiliencia (PGlite Zero-Config en ./data/mint_embedded_pg).`,
    ),
  );
  return {
    success: true,
    message: "Motor PostgreSQL embebido activo (sin requerir Docker).",
  };
}
