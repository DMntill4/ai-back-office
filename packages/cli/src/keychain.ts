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
  expiresAt?: string;
}

function getConfigDir(): string {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return os.tmpdir();
  }
  return path.join(os.homedir(), ".mint");
}

function getCredentialsFile(): string {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return path.join(os.tmpdir(), "mint_test_session.enc");
  }
  return path.join(os.homedir(), ".mint", "session.enc");
}

// Clave derivada del identificador de la máquina y usuario local
function getEncryptionKey(): Buffer {
  const salt = `mint_salt_${os.userInfo().username}_${os.hostname()}`;
  return crypto.scryptSync(salt, "mint_secret_pepper_2026", 32);
}

/**
 * Guarda la sesión de forma cifrada (AES-256-GCM) en el almacén seguro del sistema
 */
export async function saveSession(session: StoredSession): Promise<void> {
  const configDir = getConfigDir();
  const credentialsFile = getCredentialsFile();

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }

  // TTL por defecto: 8 horas si no se especificó expiración
  if (!session.expiresAt) {
    session.expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
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

  fs.writeFileSync(credentialsFile, payload, { encoding: "utf8", mode: 0o600 });
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
      expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    };
  }

  const credentialsFile = getCredentialsFile();
  if (!fs.existsSync(credentialsFile)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(credentialsFile, "utf8");
    const { iv, tag, data } = JSON.parse(raw);

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(tag, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(data, "hex")),
      decipher.final(),
    ]);

    const session = JSON.parse(decrypted.toString("utf8")) as StoredSession;

    // Control de expiración de sesión (8 horas TTL)
    if (session.expiresAt && Date.now() > new Date(session.expiresAt).getTime()) {
      await deleteSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Cambia la empresa/proyecto activo para la sesión actual
 */
export async function switchCompanySession(newCompanyId: string, newCompanyName?: string): Promise<boolean> {
  const current = await getSession();
  if (!current) return false;
  current.companyId = newCompanyId;
  current.companyName = newCompanyName || newCompanyId;
  await saveSession(current);
  return true;
}

/**
 * Elimina la sesión segura activa
 */
export async function deleteSession(): Promise<boolean> {
  const credentialsFile = getCredentialsFile();
  if (fs.existsSync(credentialsFile)) {
    try {
      fs.unlinkSync(credentialsFile);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
