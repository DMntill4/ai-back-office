import { describe, it, expect, beforeAll } from "vitest";
import { processIncomingSale, DiscordAdapter } from "@mint/notifiers";
import { db, products, inventory } from "@mint/core";
import { eq, and } from "drizzle-orm";

describe("Ejecución Autónoma de Ventas desde Canales Externos (@mint/notifiers)", () => {
  const companyId = "comp_default";
  const testSku = "MINT-SALES-CHAN-001";
  const testProductId = "prod_sales_chan_001";

  beforeAll(async () => {
    // Aislar producto e inventario para evitar colisiones con tests concurrentes
    await db
      .insert(products)
      .values({
        id: testProductId,
        companyId,
        sku: testSku,
        name: "Terminal Sensor Venta Discord",
        category: "sensores",
        minStock: 10,
        origin: "real",
      })
      .onConflictDoUpdate({
        target: [products.companyId, products.sku],
        set: { name: "Terminal Sensor Venta Discord", minStock: 10 },
      });

    const existingInv = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.productId, testProductId), eq(inventory.companyId, companyId)))
      .limit(1);

    if (existingInv.length > 0) {
      await db.update(inventory).set({ stock: 50 }).where(eq(inventory.id, existingInv[0].id));
    } else {
      await db.insert(inventory).values({
        id: `inv_sales_chan_001`,
        companyId,
        productId: testProductId,
        warehouseId: "alm_central",
        stock: 50,
      });
    }
  });

  it("1. DiscordAdapter envía notificación con embed formateado", async () => {
    const adapter = new DiscordAdapter();
    const result = await adapter.send(
      {
        companyId,
        decisionId: "dec_test_discord",
        title: "Reabastecimiento preventivo por venta alta",
        description: "Stock cayó debajo de 10 unidades",
        costMxn: 7500,
        proposingAgent: "compras_agent",
        severity: "WARNING",
        evidenceSummary: "Consumo acelerado de válvulas en Discord POS",
        approveToken: "token_approve_123",
        rejectToken: "token_reject_123",
      },
      {}
    );

    expect(result.success).toBe(true);
    expect(result.channelType).toBe("discord");
    expect(result.details?.renderedEmbed?.title).toContain("MINT DECISION ALERT");
    expect(result.details?.renderedEmbed?.fields).toBeDefined();
  });

  it("2. processIncomingSale descuenta stock, detecta desabasto y activa respuesta autónoma", async () => {
    const quantityToSell = 5;

    // Ejecutar venta entrante desde Discord
    const saleResult = await processIncomingSale({
      channel: "discord",
      sku: testSku,
      quantity: quantityToSell,
      customerName: "Taller Mecánico Central",
      companyId,
    });

    expect(saleResult.success).toBe(true);
    expect(saleResult.quantitySold).toBe(quantityToSell);
    expect(saleResult.previousStock).toBe(50);
    expect(saleResult.remainingStock).toBe(45);
    expect(saleResult.channelReceipt).toContain("VENTA EJECUTADA EN SISTEMA [Canal: DISCORD]");
    expect(saleResult.channelReceipt).toContain(testSku);

    // Verificar persistencia directa en base de datos PostgreSQL
    const invAfter = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.productId, testProductId), eq(inventory.companyId, companyId)))
      .limit(1);

    expect(invAfter[0].stock).toBe(45);
  });
});
