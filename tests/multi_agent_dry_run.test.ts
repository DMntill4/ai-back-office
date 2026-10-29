import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  products,
  inventory,
  suppliers,
  supplierProducts,
  purchaseOrders,
  shipments,
  decisions,
  cases,
  coordinateOperationalEvent,
} from "@mint/core";
import { eq } from "drizzle-orm";

describe("Fase F3: Multi-Agente + Motor de Políticas en modo dry-run", () => {
  const companyId = "comp_default";
  const productId = "prod_f3_sensor_temp";
  const sku = "SKU-F3-TEMP";
  const supplierId = "prov_acme_mx";
  const orderId = "po_f3_prior_order";
  const trackingNumber = "MX-ESTAFETA-998877";

  beforeAll(async () => {
    // 1. Asegurar proveedor homologado
    await db
      .insert(suppliers)
      .values({
        id: supplierId,
        companyId,
        name: "Acme Industrial Mexicana S.A.",
        email: "ventas@acmemx.com",
        phone: "+52 55 1234 5678",
      })
      .onConflictDoNothing();

    // 2. Asegurar producto con stock bajo mínimo
    await db
      .insert(products)
      .values({
        id: productId,
        companyId,
        sku,
        name: "Sensor de Temperatura Blindado PT-100",
        category: "Sensores",
        minStock: 20,
        origin: "real",
      })
      .onConflictDoUpdate({
        target: [products.companyId, products.sku],
        set: { minStock: 20 },
      });

    // 3. Asociar proveedor con producto en catálogo de compras
    await db
      .insert(supplierProducts)
      .values({
        id: `sp_f3_${Date.now()}`,
        companyId,
        supplierId,
        productId,
        unitPrice: "180.00",
        minOrderQuantity: 5,
        leadTimeDays: 2,
      })
      .onConflictDoNothing();

    // 4. Inventario actual: solo 3 unidades (déficit de 17)
    await db
      .insert(inventory)
      .values({
        id: "inv_f3_sensor_temp",
        companyId,
        productId,
        warehouseId: "alm_central",
        stock: 3,
      })
      .onConflictDoUpdate({
        target: [inventory.id],
        set: { stock: 3 },
      });

    // 5. Orden previa asociada emitida hace 4 días (fuera de la ventana de duplicados de 72h)
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await db
      .insert(purchaseOrders)
      .values({
        id: orderId,
        companyId,
        supplierId,
        productId,
        quantity: 25,
        unitPrice: "180.00",
        totalAmount: "4500.00",
        status: "abierta",
        idempotencyKey: "idemp_f3_prior_order",
        createdAt: fourDaysAgo,
      })
      .onConflictDoUpdate({
        target: [purchaseOrders.id],
        set: { status: "abierta", createdAt: fourDaysAgo },
      });

    // 6. Envío RETRASADO (ETA en el pasado)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db
      .insert(shipments)
      .values({
        id: "shp_f3_delayed_01",
        companyId,
        purchaseOrderId: orderId,
        trackingNumber,
        carrier: "Estafeta Express",
        status: "retrasado",
        originLocation: "Monterrey Hub",
        destinationLocation: "Planta Querétaro",
        estimatedDelivery: yesterday,
        currentLocation: "Detenido en San Luis Potosí por retén",
      })
      .onConflictDoUpdate({
        target: [shipments.id],
        set: {
          purchaseOrderId: orderId,
          status: "retrasado",
          estimatedDelivery: yesterday,
        },
      });
  });

  it("Escenario 'envío retrasado -> riesgo de desabasto' produce propuesta completa con evidencia y política dry-run", async () => {
    // Disparar coordinación del evento operativo
    const result = await coordinateOperationalEvent({
      eventType: "TRANSIT_DELAY_DEFICIT",
      companyId,
      productId,
      trackingNumber,
      title: "Riesgo de desabasto: Envío retrasado de Sensores PT-100",
      description: `La guía ${trackingNumber} presenta demora crítica y el inventario actual (3u) está bajo el mínimo (20u).`,
      autonomyLevel: "dry-run",
      force: true,
    });

    expect(result.success).toBe(true);
    expect(result.decisionId).toBeDefined();
    expect(result.caseId).toBeDefined();
    expect(result.proposal).toBeDefined();

    const proposal = result.proposal!;

    // 1. Verificación de la Propuesta Estructurada Multi-Agente
    expect(proposal.proposingAgent).toBe("compras_agent");
    expect(proposal.actionType).toBe("crear_orden_compra");
    expect(proposal.costMxn).toBeGreaterThan(0);
    expect(proposal.confidence).toBeGreaterThan(0.7);

    // 2. Verificación de la Evidencia Recolectada por Especialistas
    expect(proposal.evidence.productId).toBe(productId);
    expect(proposal.evidence.currentStock).toBe(3);
    expect(proposal.evidence.minStock).toBe(20);
    expect(proposal.evidence.deficit).toBe(17);
    expect(proposal.evidence.delayedShipmentNotice).toBeDefined();
    expect(proposal.evidence.delayedShipmentNotice).toContain(trackingNumber);

    // 3. Verificación de Auditoría Adversarial de Riesgo
    expect(proposal.riskAssessment).toBeDefined();
    expect(proposal.riskAssessment.supplierVerified).toBe(true);
    expect(proposal.riskAssessment.riskScore).toBeLessThan(0.4);

    // 4. Verificación de Política Determinista en modo dry-run
    expect(result.policyResult).toBeDefined();
    expect(result.policyResult!.requiresHitl).toBe(true);
    expect(result.policyResult!.canExecuteNow).toBe(false);
    expect(result.policyResult!.policyDecision).toBe("pending_approval");
    expect([
      "RULE_DRY_RUN_GUARDRAIL",
      "RULE_HUMAN_IN_THE_LOOP_REQUIRED",
      "RULE_EXCEEDS_AUTONOMOUS_BUDGET",
      "RULE_STALE_DATA_REFUSAL",
    ]).toContain(result.policyResult!.matchedRule);

    // 5. Verificación de Persistencia en tabla decisions
    const savedDecision = await db
      .select()
      .from(decisions)
      .where(eq(decisions.id, result.decisionId!))
      .limit(1);

    expect(savedDecision).toHaveLength(1);
    expect(savedDecision[0].actionType).toBe("crear_orden_compra");
    expect(savedDecision[0].companyId).toBe(companyId);
    expect(savedDecision[0].policyDecision).toBe("pending_approval");
    expect(savedDecision[0].evidencePayload).toHaveProperty("delayedShipmentNotice");

    // 6. En modo dry-run, el caso queda registrado en la bitácora
    const savedCase = await db
      .select()
      .from(cases)
      .where(eq(cases.id, result.caseId))
      .limit(1);

    expect(savedCase).toHaveLength(1);
    expect(savedCase[0].status).toBe("en_proceso");
  }, 25000);
});
