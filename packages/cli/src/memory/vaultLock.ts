import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Bloqueo Concurrente Seguro para el Vault de MINT
 * Utiliza bloqueo atómico a nivel de sistema operativo para prevenir escrituras cruzadas o corrupción.
 * Incluye resolución automática de bloqueos huérfanos (stale locks).
 */

const LOCK_TIMEOUT_MS = 5000; // 5 segundos máximo esperando el lock
const STALE_LOCK_AGE_MS = 15000; // 15 segundos antes de considerar un lock abandonado
const RETRY_INTERVAL_MS = 60;

export async function acquireVaultLock(vaultRoot: string): Promise<() => void> {
  const lockDir = path.join(vaultRoot, ".vault.lock");
  const startTime = Date.now();

  while (true) {
    try {
      // mkdir es atómico en Windows, Linux y macOS
      fs.mkdirSync(lockDir);
      // Escribir PID y timestamp del proceso dueño
      const meta = JSON.stringify({ pid: process.pid, acquiredAt: Date.now() });
      fs.writeFileSync(path.join(lockDir, "owner.json"), meta, "utf8");

      // Función de liberación segura
      return () => {
        try {
          fs.rmSync(lockDir, { recursive: true, force: true });
        } catch {
          // Ignorar si ya fue removido
        }
      };
    } catch (err: any) {
      if (err.code === "EEXIST") {
        // Verificar si el lock está huérfano (proceso previo crasheó)
        try {
          const ownerFile = path.join(lockDir, "owner.json");
          if (fs.existsSync(ownerFile)) {
            const raw = fs.readFileSync(ownerFile, "utf8");
            const data = JSON.parse(raw);
            if (Date.now() - data.acquiredAt > STALE_LOCK_AGE_MS) {
              // Romper lock huérfano
              fs.rmSync(lockDir, { recursive: true, force: true });
              continue;
            }
          } else {
            // Lock vacío sin metadatos
            const stat = fs.statSync(lockDir);
            if (Date.now() - stat.mtimeMs > STALE_LOCK_AGE_MS) {
              fs.rmSync(lockDir, { recursive: true, force: true });
              continue;
            }
          }
        } catch {
          // Continuar al retry
        }

        if (Date.now() - startTime > LOCK_TIMEOUT_MS) {
          throw new Error(`Timeout esperando el bloqueo del vault en '${vaultRoot}'. Otro proceso de MINT está escribiendo.`);
        }

        await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Ejecuta una operación de escritura de forma segura dentro del bloqueo del vault
 */
export async function withVaultLock<T>(vaultRoot: string, fn: () => Promise<T>): Promise<T> {
  const release = await acquireVaultLock(vaultRoot);
  try {
    return await fn();
  } finally {
    release();
  }
}
