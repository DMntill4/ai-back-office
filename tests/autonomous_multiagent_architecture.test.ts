import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  db,
  companies,
  products,
  inventory,
  warehouses,
  cases,
  decisions,
  suppliers,
  supplierProducts,
  operationalEvents,
  businessConfig,
  mintPendingQuestions,
  mintOrchestrator,
  agentRegistry,
  inventarioAgent,
  comprasAgent,
  logisticaAgent,
  notificacionesAgent,
  datosIntegracionesAgent,
  auditoriaAgent,
  FakeGrokClient,
} from "@mint/core";
import { tickOnce, startContinuousDaemon, stopDaemonLoop } from "@mint/daemon";
import { eq, and, sql } from "drizzle-orm";

describe("MINT — Arquitectura de Agentes y Subagentes Autónomos 24/7 (Pruebas Obligatorias A-F)", () => {
  const companyAId = `comp_auto_a_${Date.now()}`;
  const companyBId = `comp_auto_b_${Date.now()}`;
  const productAId = `prod_auto_a_${Date.now()}`;
  const supplierAId = `supp_auto_a_${Date.now()}`;
  const warehouseAId = `wh_auto_a_${Date.now()}`;

  beforeAll(async () => {
    // 1. Crear empresas aisladas
    await db.insert(companies).values([
      { id: companyAId, name: "Empresa Autónoma A", currency: "USD" },
      { id: companyBId, name: "Empresa Aislada B", currency: "USD" },
    ]);

    // 2. Almacén para Empresa A
    await db.insert(warehouses).values({
      id: warehouseAId,
      companyId: companyAId,
      name: "Bodega Principal A",
      location: "Medellín",
    });

    // 3. Producto con inventario bajo en Empresa A
    await db.insert(products).values({
      id: productAId,
      companyId: companyAId,
      sku: "SKU-AUTO-100",
      name: "Compresor Industrial 5HP",
      minStock: 10,
      price: "1200.00",
      origin: "real",
    });

    await db.insert(inventory).values({
      id: `inv_auto_${Date.now()}`,
      companyId: companyAId,
      productId: productAId,
      warehouseId: warehouseAId,
      stock: 2, // Déficit de 8 unidades respecto al mínimo de 10
      updatedAt: new Date(),
    });

    // 4. Proveedor homologado para Empresa A
    await db.insert(suppliers).values({
      id: supplierAId,
      companyId: companyAId,
      name: "Suministros Industriales del Norte",
      email: "contacto@suministrosnorte.com",
    });

    await db.insert(supplierProducts).values({
      id: `sp_auto_${Date.now()}`,
      companyId: companyAId,
      supplierId: supplierAId,
      productId: productAId,
      unitPrice: "980.00",
      minOrderQuantity: 5,
      leadTimeDays: 4,
    });
  });

  // =========================================================================
  // PRUEBA A: AUTONOMÍA SIN CHATBOT
  // =========================================================================
  it("Prueba A: Vigilancia autónoma detecta déficit y genera propuesta sin interacción en el chatbot", async () => {
    // 1. Ejecutar un ciclo del daemon (proceso de vigilancia en segundo plano)
    const tickResult = await tickOnce(companyAId);

    expect(tickResult.isPaused).toBe(false);
    expect(tickResult.stockDeficitsTriggered).toBeGreaterThanOrEqual(1);

    // 2. Verificar que se abrió un caso en la base de datos
    const savedCases = await db
      .select()
      .from(cases)
      .where(and(eq(cases.companyId, companyAId), eq(cases.status, "en_proceso")));

    expect(savedCases.length).toBeGreaterThanOrEqual(1);
    const targetCase = savedCases[0];
    expect(targetCase.title).toContain("Desabasto detectado");

    // 3. Verificar que se generó una propuesta formal en la tabla decisions
    const savedDecisions = await db
      .select()
      .from(decisions)
      .where(eq(decisions.companyId, companyAId));

    expect(savedDecisions.length).toBeGreaterThanOrEqual(1);
    const targetDecision = savedDecisions[0];
    expect(targetDecision.actionType).toBe("crear_orden_compra");
    expect(targetDecision.policyDecision).toBe("pending_approval"); // HITL
    expect((targetDecision.evidencePayload as any).correlationId).toBeDefined();
  });

  // =========================================================================
  // PRUEBA B: DELEGACIÓN Y COORDINACIÓN MULTI-AGENTE
  // =========================================================================
  it("Prueba B: Delegación coordinada entre Inventario, Compras, Logística, Auditoría y Notificaciones", async () => {
    const result = await mintOrchestrator.orchestrateEvent({
      eventType: "STOCK_CRITICAL",
      companyId: companyAId,
      productId: productAId,
      title: "Prueba de Orquestación Multi-Agente",
      description: "Verificando descomposición y deliberación",
      force: true, // Forzar para evaluar deliberación
    });

    expect(result.success).toBe(true);
    expect(result.correlationId).toMatch(/^corr_/);
    expect(result.proposal).toBeDefined();
    expect(result.proposal?.actionType).toBe("crear_orden_compra");

    // Verificar que los agentes especializados entregaron sus resultados
    expect(result.agentResults.inventario).toBeDefined();
    expect(result.agentResults.inventario.success).toBe(true);
    expect(result.agentResults.inventario.data.currentStock).toBe(2);

    expect(result.agentResults.compras).toBeDefined();
    expect(result.agentResults.compras.success).toBe(true);
    expect(result.agentResults.compras.data.recommendedOption.supplierId).toBe(supplierAId);

    expect(result.agentResults.auditoria).toBeDefined();
    expect(result.agentResults.auditoria.success).toBe(true);
    expect(result.agentResults.auditoria.data.supplierVerified).toBe(true);

    expect(result.agentResults.notificaciones).toBeDefined();
    expect(result.agentResults.notificaciones.success).toBe(true);

    // Cero compras unilaterales: debe quedar en pending_approval
    expect(result.policyResult?.policyDecision).toBe("pending_approval");
  });

  // =========================================================================
  // PRUEBA C: FALTA DE DATOS (RESILIENCIA Y CERO ALUCINACIONES)
  // =========================================================================
  it("Prueba C: Manejo fáctico ante falta de datos: no inventa proveedores y registra pregunta pendiente", async () => {
    // Crear un producto sin ningún proveedor registrado en la BD
    const orphanProductId = `prod_orphan_${Date.now()}`;
    await db.insert(products).values({
      id: orphanProductId,
      companyId: companyAId,
      sku: "SKU-ORPHAN-999",
      name: "Repuesto Especial Sin Proveedor",
      minStock: 20,
      origin: "real",
    });

    const result = await mintOrchestrator.orchestrateEvent({
      eventType: "STOCK_CRITICAL",
      companyId: companyAId,
      productId: orphanProductId,
      title: "Prueba de Producto Huérfano",
      force: true,
    });

    expect(result.success).toBe(false);
    expect(result.summary).toContain("No existen opciones de abastecimiento");

    // Verificar que MINT registró la duda en el banco de preguntas pendientes
    const questions = await db
      .select()
      .from(mintPendingQuestions)
      .where(and(eq(mintPendingQuestions.companyId, companyAId), eq(mintPendingQuestions.topic, "supplier_missing")));

    expect(questions.length).toBeGreaterThanOrEqual(1);
    expect(questions.some((q) => q.question.includes(orphanProductId))).toBe(true);
  });

  // =========================================================================
  // PRUEBA D: RECUPERACIÓN DE TAREAS PENDIENTES TRAS REINICIO
  // =========================================================================
  it("Prueba D: Recuperación de eventos operativos en cola tras reinicio del proceso", async () => {
    // 1. Simular un evento en estado 'PENDING' que quedó atascado antes de un reinicio
    const eventId = `ev_pending_${Date.now()}`;
    await db.insert(operationalEvents).values({
      id: eventId,
      companyId: companyAId,
      eventType: "STOCK_CRITICAL",
      severity: "CRITICAL",
      status: "PENDING",
      title: "Evento pendiente simulado de recuperación",
      description: "Este evento quedó en cola antes del reinicio",
      payload: { productId: productAId, force: true },
    });

    // 2. Ejecutar el recuperador de cola del orquestador
    const recoveredCount = await mintOrchestrator.processPendingOperationalEvents(companyAId);
    expect(recoveredCount).toBeGreaterThanOrEqual(1);

    // 3. Verificar que el evento cambió de estado y fue vinculado a un caso
    const [updatedEvent] = await db
      .select()
      .from(operationalEvents)
      .where(eq(operationalEvents.id, eventId));

    expect(updatedEvent.status).toBe("PROCESSING");
    expect(updatedEvent.caseId).toBeDefined();
  });

  // =========================================================================
  // PRUEBA E: IA EN SEGUNDO PLANO (DELIBERACIÓN Y CONSUMO DE TOKENS)
  // =========================================================================
  it("Prueba E: Ejecución de IA en segundo plano registra tokens y costo con atribución de agente", async () => {
    const fakeClient = new FakeGrokClient();
    fakeClient.setResponse("MINT Orchestrator", {
      content: "Veredicto del Orquestador: Autorizar compra de 10 unidades debido a criticidad de línea de ensamblaje.",
      usage: {
        promptTokens: 120,
        completionTokens: 35,
        cachedTokens: 0,
        totalTokens: 155,
      },
      cost: "0.000590",
      model: "grok-4.6",
    });

    const result = await mintOrchestrator.orchestrateEvent({
      eventType: "ANOMALY_DELIBERATION",
      companyId: companyAId,
      productId: productAId,
      title: "Deliberación con IA en Segundo Plano",
      requireAiReasoning: true,
      llmClient: fakeClient,
      force: true,
    });

    expect(result.success).toBe(true);
    expect(result.usedAi).toBe(true);
    expect(result.totalTokensConsumed).toBeGreaterThan(0);
    expect(parseFloat(result.totalCostUsd)).toBeGreaterThan(0);
    expect(result.summary).toContain("DELIBERACIÓN IA");
    expect((result.proposal?.evidence as any).orchestratorAiNote).toContain("Veredicto del Orquestador");
  });

  // =========================================================================
  // PRUEBA F: CONTROLES DE SEGURIDAD Y AISLAMIENTO MULTI-TENANT
  // =========================================================================
  it("Prueba F: Aislamiento estricto: Empresa B no puede orquestar sobre catálogo de Empresa A", async () => {
    // Intentar orquestar evento sobre el producto de Empresa A pero haciéndose pasar por Empresa B
    const result = await mintOrchestrator.orchestrateEvent({
      eventType: "STOCK_CRITICAL",
      companyId: companyBId, // Invasor
      productId: productAId, // Producto propiedad de Empresa A
      title: "Intento de Operación Cruzada No Autorizada",
      force: true,
    });

    expect(result.success).toBe(false);
    expect(result.summary).toContain("no encontrado en catálogo");
  });

  it("Prueba F.2: Modalidad 'Solo Tienda' desactiva logística y compras externas", async () => {
    const tiendaCompanyId = `comp_tienda_${Date.now()}`;
    await db.insert(companies).values({
      id: tiendaCompanyId,
      name: "Tienda de Barrio Don Pepe",
      currency: "COP",
    });

    // Configurar perfil como 'tienda'
    await db.insert(businessConfig).values({
      companyId: tiendaCompanyId,
      key: "business_profile",
      value: "tienda",
      description: "Perfil tienda de barrio",
    });

    const whTiendaId = `wh_tienda_${Date.now()}`;
    await db.insert(warehouses).values({
      id: whTiendaId,
      companyId: tiendaCompanyId,
      name: "Bodega Tienda Don Pepe",
      location: "Bogotá",
    });

    const prodTiendaId = `prod_tienda_${Date.now()}`;
    await db.insert(products).values({
      id: prodTiendaId,
      companyId: tiendaCompanyId,
      sku: "SKU-TIENDA-01",
      name: "Bolsa de Arroz 1kg",
      minStock: 15,
      origin: "real",
    });

    await db.insert(inventory).values({
      id: `inv_tienda_${Date.now()}`,
      companyId: tiendaCompanyId,
      productId: prodTiendaId,
      warehouseId: whTiendaId,
      stock: 3,
      updatedAt: new Date(),
    });

    const result = await mintOrchestrator.orchestrateEvent({
      eventType: "STOCK_CRITICAL",
      companyId: tiendaCompanyId,
      productId: prodTiendaId,
      title: "Desabasto en Tienda",
    });

    expect(result.success).toBe(true);
    expect(result.summary).toContain("compras externas silenciado");

    // Limpieza
    await db.delete(businessConfig).where(eq(businessConfig.companyId, tiendaCompanyId)).catch(() => { });
    await db.delete(inventory).where(eq(inventory.companyId, tiendaCompanyId)).catch(() => { });
    await db.delete(products).where(eq(products.companyId, tiendaCompanyId)).catch(() => { });
    await db.delete(warehouses).where(eq(warehouses.companyId, tiendaCompanyId)).catch(() => { });
    await db.delete(companies).where(eq(companies.id, tiendaCompanyId)).catch(() => { });
  });

  afterAll(async () => {
    // Limpieza de datos de prueba. Se ejecuta dentro de una transacción con
    // `lock_timeout` para que un lock residual (p. ej. del daemon) no deje el
    // hook colgado hasta el timeout global. El orden respeta las FKs.
    //
    // `session_replication_role = replica` desactiva los triggers de usuario
    // durante la transacción: `case_events` es inmutable por diseño (trigger
    // `trg_prevent_case_events_delete`) y bloquearía el CASCADE desde `cases`.
    // Es seguro aquí porque la transacción solo borra datos de prueba aislados
    // por `company_id` y se revierte por completo si algo falla.
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
        await tx.execute(sql`SET LOCAL session_replication_role = replica`);
        await tx.delete(decisions).where(eq(decisions.companyId, companyAId));
        await tx.delete(operationalEvents).where(eq(operationalEvents.companyId, companyAId));
        await tx.delete(mintPendingQuestions).where(eq(mintPendingQuestions.companyId, companyAId));
        await tx.delete(cases).where(eq(cases.companyId, companyAId));
        await tx.delete(inventory).where(eq(inventory.companyId, companyAId));
        await tx.delete(supplierProducts).where(eq(supplierProducts.companyId, companyAId));
        await tx.delete(suppliers).where(eq(suppliers.companyId, companyAId));
        await tx.delete(products).where(eq(products.companyId, companyAId));
        await tx.delete(warehouses).where(eq(warehouses.companyId, companyAId));
        await tx.delete(companies).where(eq(companies.id, companyAId));
        await tx.delete(companies).where(eq(companies.id, companyBId));
      });
    } catch (err) {
      // La limpieza es best-effort: no debe hacer fallar la suite.
      console.warn("[afterAll] Limpieza parcial de datos de prueba:", (err as Error).message);
    }
  });
});
