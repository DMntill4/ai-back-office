import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import {
  db,
  companies,
  users,
  products,
  inventory,
  suppliers,
  warehouses,
  decisions,
  cases,
  auditIncidents,
  registerUser,
  loginUser,
  inviteTeamMember,
  revokeTeamMemberAccess,
  transferOrganizationOwnership,
  removeTeamMember,
  executeAndVerifyDecision,
  generateReadinessReport,
  saveOperationalMemory,
  getActiveOperationalMemory,
  getOperationalMemoryWithEpistemicAudit,
  getActionProvenanceReport,
  sweepExpiredProposalsAndOverdueTasks,
  createVerifiedBusinessBackup,
  restoreVerifiedBusinessBackup,
  dispatchToolCall,
} from "../packages/core/src/index";

async function runPart2VerificationSuite() {
  console.log("================================================================================");
  console.log("MINT — PART 2: PRODUCT VISION, ENTERPRISE SECURITY, MEMORY & CONTINUITY SUITE");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // 1. ZERO-FAKE DEFAULT ORG & HONEST READINESS LIFECYCLE (Sections 4 & 11)
  // ---------------------------------------------------------------------------
  console.log("[Test 1] Verificando clasificación honesta de ciclo de vida y CERO salud falsa en organización vacía...");
  const emptyOrgId = `comp_empty_${randomUUID().slice(0, 6)}`;
  const unconfiguredReport = await generateReadinessReport(emptyOrgId);
  assert.equal(
    unconfiguredReport.environmentLifecycleState,
    "FIRST_TIME_INSTALLATION",
    "Una organización inexistente sin datos debe clasificarse como FIRST_TIME_INSTALLATION",
  );
  assert.equal(
    unconfiguredReport.scorePercent,
    0,
    "Una organización sin datos conectados jamás debe mostrar 100% de salud falsa",
  );
  assert.notEqual(
    unconfiguredReport.overallStatus,
    "OPTIMA",
    "El estado general no puede ser OPTIMA cuando hay 0 productos",
  );
  assert.ok(
    unconfiguredReport.findings.bloqueantes.length > 0,
    "Debe reportar un hallazgo bloqueante indicando que no hay datos de negocio conectados",
  );
  console.log(
    `  ✓ Estado sin datos: ${unconfiguredReport.environmentLifecycleState} (${unconfiguredReport.scorePercent}% - ${unconfiguredReport.overallStatus})\n`,
  );

  // ---------------------------------------------------------------------------
  // 2. IDENTITY, AUTHENTICATION, RBAC, REVOCATION & OWNERSHIP TRANSFER (Sections 1 & 10)
  // ---------------------------------------------------------------------------
  console.log("[Test 2] Verificando registro de organización, autenticación real, RBAC, revocación y transferencia de propiedad...");
  const ownerEmail = `owner_${randomUUID().slice(0, 6)}@distribuidora-norte.mx`;
  const regRes = await registerUser({
    name: "Elena Garza",
    email: ownerEmail,
    password: "StrongOwnerPass!2026",
    companyName: "Distribuidora Industrial del Norte S.A.",
    role: "owner",
  });
  assert.equal(regRes.success, true, "El registro de organización y propietario debe ser exitoso");
  const companyId = regRes.user!.companyId;
  const ownerId = regRes.user!.id;

  // Verificar que una organización recién registrada sin productos tiene estado NEW_ORGANIZATION (25%), no 100%
  const newOrgReport = await generateReadinessReport(companyId);
  assert.equal(newOrgReport.environmentLifecycleState, "NEW_ORGANIZATION");
  assert.equal(newOrgReport.scorePercent, 25);

  // Login con contraseña incorrecta DEBE fallar y registrar incidente INTENTO_ACCESO_FALLIDO
  const badLogin = await loginUser({ email: ownerEmail, password: "WrongPassword123" });
  assert.equal(badLogin.success, false, "Login con contraseña incorrecta debe ser rechazado");

  // Login sin contraseña en cuenta con passwordHash DEBE fallar
  const emptyPassLogin = await loginUser({ email: ownerEmail, password: "" });
  assert.equal(emptyPassLogin.success, false, "Login sin contraseña debe ser rechazado");

  // Login con contraseña correcta DEBE funcionar
  const goodLogin = await loginUser({ email: ownerEmail, password: "StrongOwnerPass!2026" });
  assert.equal(goodLogin.success, true, "Login con credenciales válidas debe ser exitoso");
  assert.equal(goodLogin.user?.role, "owner");

  // Invitar empleados con roles diferenciados: manager, cashier, inventory_operator, logistics_operator
  const cashierInvite = await inviteTeamMember({
    companyId,
    name: "Carlos Cajero",
    email: `cajero_${randomUUID().slice(0, 6)}@distribuidora-norte.mx`,
    password: "CashierPass!1",
    role: "cashier",
  });
  assert.equal(cashierInvite.success, true);
  const cashierId = cashierInvite.member!.id;

  const managerInvite = await inviteTeamMember({
    companyId,
    name: "Marta Gerente",
    email: `gerente_${randomUUID().slice(0, 6)}@distribuidora-norte.mx`,
    password: "ManagerPass!1",
    role: "manager",
  });
  assert.equal(managerInvite.success, true);
  const managerId = managerInvite.member!.id;

  // Sembrar producto e inventario real para probar límites de permisos sobre datos reales
  const prodId = `prod_${companyId}_coca`;
  const whId = `wh_${companyId}_central`;
  const suppId = `supp_${companyId}_bebidas`;

  await db.insert(warehouses).values({
    id: whId,
    companyId,
    name: "Bodega Central Monterrey",
    location: "Monterrey, NL",
    city: "Monterrey",
    country: "MX",
  });

  await db.insert(suppliers).values({
    id: suppId,
    companyId,
    name: "Embotelladora Regia S.A. (Supplier B)",
    email: "ventas@embotelladoraregia.mx",
  });

  await db.insert(products).values({
    id: prodId,
    companyId,
    name: "Coca-Cola 600ml Caja 24pzs",
    sku: "BEB-COCA-600",
    category: "Bebidas",
    minStock: 20,
    price: "360.00",
    costPrice: "250.00",
    origin: "real",
  });

  await db.insert(inventory).values({
    id: `inv_${companyId}_coca`,
    companyId,
    productId: prodId,
    warehouseId: whId,
    stock: 80,
  });

  // Cajero intenta poner el precio de todos los productos en 0 mediante la primitiva de mutación
  const cashierZeroPriceAttempt = await dispatchToolCall(
    "ejecutar_operacion_datos_autorizada",
    {
      targetTable: "products",
      operation: "update",
      recordId: prodId,
      updates: { price: "0.00" },
      reason: "Cambiar precio a cero",
    },
    { companyId, userRole: "cashier", agentRole: "inventario" },
  );
  assert.equal(cashierZeroPriceAttempt.result.isSuccess, false, "El cajero NO debe poder cambiar precios a cero");

  // Verificar que el precio en BD sigue siendo 360.00
  const [prodAfterCashier] = await db.select().from(products).where(eq(products.id, prodId));
  assert.equal(Number(prodAfterCashier.price), 360, "El precio del producto debe permanecer intacto en 360.00");

  // Cajero intenta revocar el acceso del gerente -> BLOQUEADO
  const unauthorizedRevoke = await revokeTeamMemberAccess({
    companyId,
    targetUserId: managerId,
    actorRole: "cashier",
  });
  assert.equal(unauthorizedRevoke.success, false, "Un cajero jamás puede revocar accesos");

  // Owner revoca el acceso del cajero -> ÉXITO y bloqueo inmediato de login
  const ownerRevoke = await revokeTeamMemberAccess({
    companyId,
    targetUserId: cashierId,
    actorRole: "owner",
    reason: "Intento no autorizado de alterar precios",
  });
  assert.equal(ownerRevoke.success, true, "El propietario debe poder revocar el acceso del cajero");

  const revokedLogin = await loginUser({
    email: cashierInvite.member!.email,
    password: "CashierPass!1",
  });
  assert.equal(revokedLogin.success, false, "Un empleado con acceso revocado NO puede iniciar sesión");
  assert.ok(revokedLogin.error?.includes("REVOCADO"), "El mensaje debe informar que el acceso fue revocado");

  // Protección del único propietario: no puede eliminarse sin transferir propiedad
  const removeSoleOwner = await removeTeamMember({ companyId, userId: ownerId });
  assert.equal(removeSoleOwner.success, false, "No se debe permitir eliminar al único owner");

  // Transferencia de propiedad a Marta Gerente y luego de regreso a Elena Garza
  const transfer1 = await transferOrganizationOwnership({
    companyId,
    currentOwnerUserId: ownerId,
    newOwnerUserId: managerId,
  });
  assert.equal(transfer1.success, true, "Transferencia de propiedad debe completarse exitosamente");
  const transferBack = await transferOrganizationOwnership({
    companyId,
    currentOwnerUserId: managerId,
    newOwnerUserId: ownerId,
  });
  assert.equal(transferBack.success, true, "Re-transferencia de propiedad al owner original debe completarse");
  console.log("  ✓ Identidad, login, bloqueo de cajero, revocación de acceso y transferencia de propiedad verificados.\n");

  // ---------------------------------------------------------------------------
  // 3. HUMAN APPROVAL, SEPARATION OF DUTIES, EXPIRED PROPOSALS & PROVENANCE (Section 2)
  // ---------------------------------------------------------------------------
  console.log("[Test 3] Verificando gobernanza HITL, expiración automática de propuestas y trazabilidad de 7 preguntas...");
  const caseId = `case_gov_${randomUUID().slice(0, 8)}`;
  await db.insert(cases).values({
    id: caseId,
    companyId,
    title: "Reabastecimiento crítico de Coca-Cola",
    description: "Caso de gobernanza HITL para evaluación de separación de funciones",
    status: "en_proceso",
  });

  const expiredDecisionId = `dec_exp_${randomUUID().slice(0, 8)}`;
  await db.insert(decisions).values({
    id: expiredDecisionId,
    companyId,
    caseId,
    title: "Propuesta de compra vencida (20 cajas Coca-Cola)",
    actionType: "crear_orden_compra",
    proposingAgent: "compras",
    requesterUserId: managerId,
    policyDecision: "pending_approval",
    policyReason: "Reabastecimiento preventivo",
    costMxn: "5000.00",
    expiresAt: new Date(Date.now() - 3600_000), // Vencida hace 1 hora
    evidencePayload: {
      productId: prodId,
      supplierId: suppId,
      quantity: 20,
      unitPrice: "250.00",
    },
  });

  // Barrido automático debe cancelar la propuesta vencida
  const sweepRes = await sweepExpiredProposalsAndOverdueTasks(companyId);
  assert.equal(sweepRes.expiredProposalsCancelledCount, 1, "El barrido debe cancelar automáticamente la propuesta vencida");

  // Crear propuesta vigente solicitada por managerId
  const activeDecisionId = `dec_act_${randomUUID().slice(0, 8)}`;
  await db.insert(decisions).values({
    id: activeDecisionId,
    companyId,
    caseId,
    title: "Propuesta de compra activa (20 cajas Coca-Cola)",
    actionType: "crear_orden_compra",
    proposingAgent: "compras",
    requesterUserId: managerId,
    policyDecision: "pending_approval",
    policyReason: "Stock bajo punto de reorden",
    costMxn: "5000.00",
    expiresAt: new Date(Date.now() + 86400_000),
    evidencePayload: {
      productId: prodId,
      supplierId: suppId,
      quantity: 20,
      unitPrice: "250.00",
    },
  });

  //Separación de funciones: managerId NO puede auto-aprobar su propia solicitud
  const selfApproval = await executeAndVerifyDecision(
    activeDecisionId,
    "Marta Gerente",
    "Auto-aprobación",
    managerId,
    "manager",
  );
  assert.equal(selfApproval.success, false, "Quien solicitó la operación NO puede auto-aprobarla");
  assert.ok(selfApproval.message.includes("AUTO-APROBACIÓN PROHIBIDA"));

  // Owner distinto (ownerId) aprueba la decisión -> ÉXITO y post-verificación en purchase_orders
  const ownerApproval = await executeAndVerifyDecision(
    activeDecisionId,
    "Elena Garza",
    "Aprobado por dirección",
    ownerId,
    "owner",
  );
  assert.equal(ownerApproval.success, true, "El propietario distinto al solicitante debe poder aprobar y ejecutar la orden");
  assert.equal(ownerApproval.verified, true);

  // Verificar reporte de procedencia de 7 preguntas (Section 2)
  const provenance = await getActionProvenanceReport(companyId, activeDecisionId);
  assert.equal(provenance.records.length, 1);
  const provRecord = provenance.records[0];
  assert.equal(provRecord.whoRequested, managerId);
  assert.equal(provRecord.whoAuthorized, "Elena Garza");
  assert.equal(provRecord.wasOperationSuccessful, true);
  assert.equal(provRecord.canItBeReversed, true);
  console.log("  ✓ Separación de funciones, expiración automática y reporte de procedencia verificados.\n");

  // ---------------------------------------------------------------------------
  // 4. MINT MEMORY — EVOLUTION, SUPERSEDING & CONTRADICTION DETECTION (Section 3)
  // ---------------------------------------------------------------------------
  console.log("[Test 4] Verificando evolución de memoria operativa (Supplier A -> Supplier B) y detección de contradicciones...");
  const mem1 = await saveOperationalMemory({
    companyId,
    category: "DIRECTIVA_PROVEEDOR",
    subjectKey: "COCA_COLA_SUPPLIER",
    content: "We normally order Coca-Cola 600ml Caja 24pzs from Supplier A. Their deliveries usually take two days. Our minimum acceptable stock is 20 units.",
    author: "Elena Garza",
    epistemicType: "CONFIRMED_FACT",
  });
  assert.equal(mem1.success, true);

  // El cliente actualiza el proveedor: "We changed suppliers. We now use Supplier B."
  // Incluso usando una clave ligeramente distinta (COCA_COLA_SUPPLIER_UPDATE), MINT debe reemplazar la regla de Supplier A
  const mem2 = await saveOperationalMemory({
    companyId,
    category: "DIRECTIVA_PROVEEDOR",
    subjectKey: "COCA_COLA_SUPPLIER_UPDATE",
    content: "We changed suppliers for Coca-Cola 600ml Caja 24pzs. We now use Supplier B (Embotelladora Regia). Minimum acceptable stock is 35 units.",
    author: "Elena Garza",
    epistemicType: "CONFIRMED_FACT",
  });
  assert.equal(mem2.success, true);
  assert.equal(mem2.supersedesId, mem1.memoryId, "La nueva directiva debe marcar la directiva de Supplier A como reemplazada");

  const activeMemories = await getActiveOperationalMemory(companyId);
  assert.equal(activeMemories.length, 1, "Solo debe existir 1 directiva activa de proveedor para Coca-Cola");
  assert.ok(activeMemories[0].content.includes("Supplier B"), "La memoria activa debe reflejar Supplier B");
  assert.ok(!activeMemories[0].content.includes("from Supplier A"), "No debe seguir recomendando Supplier A");

  // Verificar auditoría epistémica e identificación de contradicción con products.minStock (20 en BD vs 35 en memoria)
  const memoryAudit = await getOperationalMemoryWithEpistemicAudit(companyId);
  assert.equal(memoryAudit.supersededHistoryCount, 1, "Debe conservar la regla anterior como historial OUTDATED");
  assert.equal(memoryAudit.supersededRules[0].epistemicStatus, "OUTDATED");
  assert.ok(
    memoryAudit.contradictionsWithDatabase.length > 0,
    "Debe detectar la discrepancia entre el minStock=20 en la tabla 'products' y el minStock=35 mencionado en memoria",
  );
  console.log("  ✓ Evolución de memoria (Supplier A -> Supplier B), historial OUTDATED y detección de contradicción con BD verificados.\n");

  // ---------------------------------------------------------------------------
  // 5. VERIFIED BACKUPS, SHA-256 CHECKSUM & CONTINUITY RESTORATION (Section 14)
  // ---------------------------------------------------------------------------
  console.log("[Test 5] Verificando respaldo con hash SHA-256 en disco y restauración autorizada...");
  const backupRes = await createVerifiedBusinessBackup(companyId, "Respaldo antes de cierre mensual");
  assert.equal(backupRes.success, true);
  assert.equal(backupRes.verifiedOnDisk, true);
  assert.ok(backupRes.sha256.length === 64, "Debe generar y verificar checksum SHA-256 real");

  // Simular alteración de stock y restaurar desde el respaldo verificado
  await db
    .update(inventory)
    .set({ stock: 2 })
    .where(eq(inventory.id, `inv_${companyId}_coca`));

  // Cajero intenta restaurar el respaldo -> BLOQUEADO
  const cashierRestore = await restoreVerifiedBusinessBackup({
    backupFilePath: backupRes.backupFilePath,
    companyId,
    userRole: "cashier",
  });
  assert.equal(cashierRestore.success, false, "Un cajero no puede restaurar respaldos");

  // Propietario restaura el respaldo -> ÉXITO y stock vuelve a 80
  const ownerRestore = await restoreVerifiedBusinessBackup({
    backupFilePath: backupRes.backupFilePath,
    companyId,
    userRole: "owner",
  });
  assert.equal(ownerRestore.success, true);
  assert.equal(ownerRestore.verified, true);

  const [invAfterRestore] = await db
    .select()
    .from(inventory)
    .where(eq(inventory.id, `inv_${companyId}_coca`));
  assert.equal(invAfterRestore.stock, 80, "El stock debe haberse restaurado exactamente a 80 unidades");
  console.log("  ✓ Respaldo verificado con SHA-256 en disco y restauración comprobada en PostgreSQL/PGlite.\n");

  console.log("================================================================================");
  console.log("TODOS LOS ESCENARIOS DE MINT PARTE 2 PASARON CON ÉXITO (5/5 BLOQUES VERIFICADOS)");
  console.log("================================================================================");
  process.exit(0);
}

runPart2VerificationSuite().catch((err) => {
  console.error("FALLO EN SUITE DE VERIFICACIÓN PARTE 2:", err);
  process.exit(1);
});
