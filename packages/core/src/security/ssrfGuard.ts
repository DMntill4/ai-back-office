/**
 * Guardia de Seguridad Anti-SSRF (Server-Side Request Forgery) para Webhooks y Canales
 *
 * Protege contra:
 * 1. Acceso a metadatos de proveedores Cloud (AWS IMDS 169.254.169.254, GCP, Azure).
 * 2. Acceso a servicios internos de red privada (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).
 * 3. Acceso a loopback local (127.0.0.1, localhost, 0.0.0.0, ::1).
 * 4. Ataques de contrabando de protocolo (file://, gopher://, ftp://).
 */

export interface SsrfValidationResult {
  isSafe: boolean;
  reason?: string;
  normalizedUrl?: string;
}

export function validateOutboundUrl(
  rawUrl: string,
  options: { allowLocalInTest?: boolean } = {}
): SsrfValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isSafe: false, reason: "La URL de destino no puede estar vacía." };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { isSafe: false, reason: "Formato de URL inválido." };
  }

  // 1. Validar protocolo permitido (únicamente http y https)
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      isSafe: false,
      reason: `Protocolo no permitido: '${parsed.protocol}'. Solo se permiten endpoints HTTP y HTTPS.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  // 2. Detección de Metadatos Cloud (AWS IMDS, GCP metadata, Azure) - INVIOLABLE (nunca permitido, ni en tests)
  if (
    hostname === "169.254.169.254" ||
    hostname === "metadata.google.internal" ||
    hostname.startsWith("169.254.")
  ) {
    return {
      isSafe: false,
      reason: "Destino restringido: intento de acceso bloqueado a servicios de metadatos de infraestructura.",
    };
  }

  // Si estamos en entorno de testing controlado y se autoriza local explícitamente para mock servers
  const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
  if (isTestEnv && options.allowLocalInTest) {
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1"
    ) {
      return { isSafe: true, normalizedUrl: parsed.toString() };
    }
  }

  // 3. Detección de Loopback y nombres locales
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return {
      isSafe: false,
      reason: `Destino restringido: no se permite invocar direcciones loopback o locales ('${hostname}').`,
    };
  }

  // 4. Detección de rangos IPv4 privados (RFC 1918)
  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  if (isIp) {
    const parts = hostname.split(".").map(Number);
    const [p0, p1] = parts;

    // 10.0.0.0/8
    if (p0 === 10) {
      return { isSafe: false, reason: "Destino restringido: no se permiten direcciones de red privada (10.x.x.x)." };
    }
    // 172.16.0.0/12 (172.16 - 172.31)
    if (p0 === 172 && p1 >= 16 && p1 <= 31) {
      return { isSafe: false, reason: "Destino restringido: no se permiten direcciones de red privada (172.16-31.x.x)." };
    }
    // 192.168.0.0/16
    if (p0 === 192 && p1 === 168) {
      return { isSafe: false, reason: "Destino restringido: no se permiten direcciones de red privada (192.168.x.x)." };
    }
    // 127.0.0.0/8
    if (p0 === 127) {
      return { isSafe: false, reason: "Destino restringido: no se permiten direcciones de loopback (127.x.x.x)." };
    }
  }

  return { isSafe: true, normalizedUrl: parsed.toString() };
}
