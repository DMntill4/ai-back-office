import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import * as net from "node:net";
import { theme } from "../ui/theme";

const execAsync = promisify(exec);

export async function checkPortReachable(host: string, port: number, timeoutMs = 1200): Promise<boolean> {
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
 * Asegura que la infraestructura de base de datos PostgreSQL esté activa y lista.
 * Si no está corriendo, intenta iniciar automáticamente el contenedor 'ai_back_office_db'.
 */
export async function ensureEnterpriseDatabaseActive(): Promise<{ success: boolean; message: string }> {
  const host = process.env.POSTGRES_HOST || "localhost";
  const port = parseInt(process.env.POSTGRES_PORT || "5432", 10);

  // 1. Comprobación rápida: si ya responde en el puerto, continuar de inmediato sin demora
  const alreadyRunning = await checkPortReachable(host, port);
  if (alreadyRunning) {
    return { success: true, message: `PostgreSQL activo en ${host}:${port}` };
  }

  console.log(theme.dim("\n  [INFRAESTRUCTURA DE DATOS] PostgreSQL no detectado en el puerto " + port + "."));
  console.log(theme.mintBold("  [AUTO-START] Iniciando contenedor PostgreSQL (ai_back_office_db) vía Docker..."));

  // 2. Intentar lanzar Docker Desktop en Windows si la aplicación está cerrada
  try {
    if (process.platform === "win32") {
      const dockerDesktopExe = "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";
      const fs = await import("node:fs");
      if (fs.existsSync(dockerDesktopExe)) {
        spawn(dockerDesktopExe, [], { detached: true, stdio: "ignore" }).unref();
      }
    }
  } catch {}

  // 3. Ejecutar 'docker compose up -d postgres'
  try {
    await execAsync("docker compose up -d postgres", { timeout: 15000 });
  } catch (dockerErr: any) {
    const isDaemonDown =
      dockerErr.message.includes("pipe") ||
      dockerErr.message.includes("daemon") ||
      dockerErr.message.includes("connect");

    if (isDaemonDown) {
      console.error(theme.redBold("\n  [ERROR OBLIGATORIO] Docker Desktop no está iniciado en tu sistema operativo."));
      console.error(theme.amber("  Para operar MINT en producción, la base de datos persistente PostgreSQL es OBLIGATORIA."));
      console.error(theme.dim("  Por favor abre Docker Desktop en Windows. Una vez abierto, MINT conectará automáticamente.\n"));
      return {
        success: false,
        message: "Docker Desktop no iniciado. Base de datos PostgreSQL obligatoria.",
      };
    }
  }

  // 4. Polling de disponibilidad (esperar a que PostgreSQL esté listo)
  process.stdout.write(theme.dim("  Esperando disponibilidad de PostgreSQL"));
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    process.stdout.write(theme.dim("."));
    const ready = await checkPortReachable(host, port);
    if (ready) {
      process.stdout.write("\n");
      console.log(theme.mintBold(`  [OK] Base de datos PostgreSQL iniciada y lista en ${host}:${port}\n`));
      return { success: true, message: "PostgreSQL iniciado automáticamente." };
    }
  }
  process.stdout.write("\n");

  return {
    success: false,
    message: "Tiempo de espera agotado al conectar a PostgreSQL.",
  };
}

