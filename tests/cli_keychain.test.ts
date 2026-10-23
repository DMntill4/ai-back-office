import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { saveSession, getSession, deleteSession, type StoredSession } from "../packages/cli/src/keychain";

describe("Mint CLI Keychain Seguro (AES-256-GCM)", () => {
  const sampleSession: StoredSession = {
    token: "jwt_token_secure_xyz987",
    userId: "user_test_123",
    email: "test.admin@mint.local",
    name: "Admin Tester",
    role: "owner",
    companyId: "comp_test_enterprise",
    companyName: "Empresa de Pruebas",
    savedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    await deleteSession();
  });

  afterEach(async () => {
    await deleteSession();
  });

  it("debe retornar null cuando no existe sesión almacenada", async () => {
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("debe guardar y descifrar la sesión de forma íntegra en el keychain", async () => {
    await saveSession(sampleSession);

    const loaded = await getSession();
    expect(loaded).not.toBeNull();
    expect(loaded?.token).toBe(sampleSession.token);
    expect(loaded?.email).toBe(sampleSession.email);
    expect(loaded?.companyId).toBe(sampleSession.companyId);
    expect(loaded?.role).toBe(sampleSession.role);
  });

  it("debe eliminar la sesión al ejecutar deleteSession", async () => {
    await saveSession(sampleSession);
    const deleted = await deleteSession();
    expect(deleted).toBe(true);

    const reloaded = await getSession();
    expect(reloaded).toBeNull();
  });
});
