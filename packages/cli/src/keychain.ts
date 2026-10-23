import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";

export interface StoredSession {
  token: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  companyName: string;
  savedAt: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".mint");
const CREDENTIALS_FILE = path.join(CONFIG_DIR, "session.enc");

// Clave derivada del identificador de la máquina y usuario local
function getEncryptionKey(): Buffer {
  const salt = `mint_salt_${os.userInfo().username}_${os.hostname()}`;
  return crypto.scryptSync(salt, "mint_secret_pepper_2026", 32);
}

/**
 * Guarda la sesión de forma cifrada (AES-256-GCM) en el almacén seguro del sistema
 */
export async function saveSession(session: StoredSession): Promise<void> {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const plainText = JSON.stringify(session);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload = JSON.stringify({
    iv: iv.toString("hex"),
    tag: authTag.toString("hex"),
    data: encrypted.toString("hex"),
  });

  fs.writeFileSync(CREDENTIALS_FILE, payload, { encoding: "utf8", mode: 0o600 });
}

/**
 * Recupera la sesión descifrada desde el almacén seguro del sistema
 */
export async function getSession(): Promise<StoredSession | null> {
  // 1. Fallback a variables de entorno si están presentes (ej: en CI/CD)
  if (process.env.MINT_TOKEN && process.env.MINT_COMPANY_ID) {
    return {
      token: process.env.MINT_TOKEN,
      userId: "env_user",
      email: "env_user@mint.local",
      name: "Environment User",
      role: "owner",
      companyId: process.env.MINT_COMPANY_ID,
      companyName: "Default Company",
      savedAt: new Date().toISOString(),
    };
  }

  if (!fs.existsSync(CREDENTIALS_FILE)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(CREDENTIALS_FILE, "utf8");
    const { iv, tag, data } = JSON.parse(raw);

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(tag, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(data, "hex")),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8")) as StoredSession;
  } catch {
    return null;
  }
}

/**
 * Elimina la sesión segura activa
 */
export async function deleteSession(): Promise<boolean> {
  if (fs.existsSync(CREDENTIALS_FILE)) {
    try {
      fs.unlinkSync(CREDENTIALS_FILE);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
