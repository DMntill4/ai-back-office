import { describe, it, expect, beforeAll } from "vitest";
import {
  listTeamMembers,
  inviteTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  runBackOfficeHarness,
  db,
  companies,
  users,
  products,
  suppliers,
  supplierProducts,
  inventory,
} from "@mint/core";

describe("Autonomous AI Back Office Harness y Gestión Multi-Usuario SaaS (@mint/core & CLI)", () => {
  const companyId = `comp_harness_test_${Date.now()}`;
  const ownerId = `usr_owner_${Date.now()}`;
  const prodId = `prod_harn_${Date.now()}`;
  const suppId = `supp_harn_${Date.now()}`;

  beforeAll(async () => {
    // 1. Crear empresa de prueba
    await db.insert(companies).values({
      id: companyId,
      name: "Global Logistics Enterprise Corp",
    }).onConflictDoNothing();

    // 2. Crear owner principal
    await db.insert(users).values({
      id: ownerId,
      companyId,
      email: `owner_${Date.now()}@globallogistics.com`,
      passwordHash: "hash_secure_123",
      name: "Chief Operations Officer",
      role: "owner",
      setupCompleted: true,
    }).onConflictDoNothing();

    // 3. Crear catálogo e inventario para el harness
    await db.insert(suppliers).values({
      id: suppId,
      companyId,
      name: "Fast Logistics Supplier SA",
      origin: "real",
    }).onConflictDoNothing();

    await db.insert(products).values({
      id: prodId,
      companyId,
      name: "Controlador Hidráulico Industrial",
      sku: `SKU-HARN-${Date.now()}`,
      minStock: 25,
      origin: "real",
    }).onConflictDoNothing();

    await db.insert(supplierProducts).values({
      id: `sp_harn_${Date.now()}`,
      companyId,
      supplierId: suppId,
      productId: prodId,
      unitPrice: "180.00",
      minOrderQuantity: 10,
      leadTimeDays: 2,
    }).onConflictDoNothing();

    await db.insert(inventory).values({
      id: `inv_harn_${Date.now()}`,
      companyId,
      productId: prodId,
      warehouseId: "alm_central",
      stock: 4, // Stock crítico (4u vs 25u mínimo)
    }).onConflictDoNothing();
  });

  it("1. inviteTeamMember agrega miembros con roles RBAC (operator, auditor) aislados por tenant", async () => {
    const inviteEmail = `operator_${Date.now()}@globallogistics.com`;
    const res = await inviteTeamMember({
      companyId,
      email: inviteEmail,
      name: "Laura Operadora",
      role: "operator",
    });

    expect(res.success).toBe(true);
    expect(res.member).toBeDefined();
    expect(res.member?.role).toBe("operator");
    expect(res.member?.companyId).toBe(companyId);

    // Listar miembros
    const members = await listTeamMembers(companyId);
    expect(members.length).toBeGreaterThanOrEqual(2);
    expect(members.some((m) => m.email === inviteEmail)).toBe(true);
  });

  it("2. updateTeamMemberRole actualiza permisos y removeTeamMember previene eliminar al único owner", async () => {
    const auditorEmail = `auditor_${Date.now()}@globallogistics.com`;
    const inviteRes = await inviteTeamMember({
      companyId,
      email: auditorEmail,
      name: "Mateo Auditor",
      role: "viewer",
    });
    expect(inviteRes.success).toBe(true);
    const userId = inviteRes.member!.id;

    // Actualizar rol a auditor
    const updateRes = await updateTeamMemberRole({
      companyId,
      userId,
      newRole: "auditor",
    });
    expect(updateRes.success).toBe(true);

    const membersAfterUpdate = await listTeamMembers(companyId);
    const mateo = membersAfterUpdate.find((m) => m.id === userId);
    expect(mateo?.role).toBe("auditor");

    // Intentar eliminar al owner principal (debe fallar para evitar orfandad)
    const removeOwnerRes = await removeTeamMember({
      companyId,
      userId: ownerId,
    });
    expect(removeOwnerRes.success).toBe(false);
    expect(removeOwnerRes.message).toContain("único propietario");

    // Eliminar al miembro temporal
    const removeRes = await removeTeamMember({ companyId, userId });
    expect(removeRes.success).toBe(true);
  });

  it("3. runBackOfficeHarness ejecuta especialistas en paralelo y genera árbol de razonamiento ASCII", async () => {
    const harnessResult = await runBackOfficeHarness({
      companyId,
      productId: prodId,
      eventType: "STOCK_CRITICAL",
      severity: "CRITICAL",
      customNotes: "Déficit severo de stock detectado por sensor IoT",
      forceAutonomyLevel: "dry-run",
    });

    expect(harnessResult.harnessId).toBeDefined();
    expect(harnessResult.caseId).toBeDefined();
    expect(harnessResult.companyId).toBe(companyId);
    expect(harnessResult.specialists.inventario).toBeDefined();
    expect(harnessResult.specialists.compras).toBeDefined();
    expect(harnessResult.specialists.riesgo).toBeDefined();

    // Comprobar árbol ASCII y trazabilidad
    expect(harnessResult.asciiReasoningTree).toContain("[HARNESS CONTROLLER:");
    expect(harnessResult.asciiReasoningTree).toContain("[1. INVENTARIO]");
    expect(harnessResult.asciiReasoningTree).toContain("[2. COMPRAS]");
    expect(harnessResult.asciiReasoningTree).toContain("[POLÍTICA DETERMINISTA]");

    // Comprobar propuesta estructurada
    expect(harnessResult.recommendedScenario).not.toBeNull();
    expect(harnessResult.recommendedScenario?.policyDecision).toBe("pending_approval");
    expect(harnessResult.auditSignature).toContain("SIG-HMAC-");
  });
});
