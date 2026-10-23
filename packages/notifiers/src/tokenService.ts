import * as crypto from "node:crypto";
import { type SignedTokenPayload } from "./types";

const SECRET = process.env.AUTH_SECRET || "mint-autonomous-secret-token-sign-key-2026";

/**
 * Genera un token criptográficamente firmado con tiempo de vida (TTL)
 */
export function generateApprovalToken(params: {
  decisionId: string;
  action: "approve" | "reject";
  companyId: string;
  ttlMinutes?: number;
}): { token: string; expiresAt: Date } {
  const ttl = params.ttlMinutes || 60; // 60 minutos por defecto
  const expiresAtMs = Date.now() + ttl * 60 * 1000;
  const expiresAt = new Date(expiresAtMs);
  const nonce = crypto.randomBytes(8).toString("hex");

  const payload: SignedTokenPayload = {
    decisionId: params.decisionId,
    action: params.action,
    companyId: params.companyId,
    expiresAt: expiresAtMs,
    nonce,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(payloadB64).digest("hex");
  const token = `${payloadB64}.${signature}`;

  return { token, expiresAt };
}

/**
 * Valida la firma criptográfica y la expiración de un token
 */
export function verifyApprovalToken(token: string): SignedTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new Error("Formato de token de aprobación inválido.");
  }

  const [payloadB64, signature] = parts;
  const expectedSignature = crypto.createHmac("sha256", SECRET).update(payloadB64).digest("hex");

  // Comparación en tiempo constante para mitigar timing attacks
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new Error("Firma del token de aprobación inválida o manipulada.");
  }

  const rawJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
  const payload: SignedTokenPayload = JSON.parse(rawJson);

  if (Date.now() > payload.expiresAt) {
    throw new Error(
      `El token de aprobación ha expirado (Expiró: ${new Date(payload.expiresAt).toLocaleTimeString("es-MX")}).`,
    );
  }

  return payload;
}
