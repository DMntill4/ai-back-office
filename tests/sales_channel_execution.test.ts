import { describe, it, expect, beforeAll } from "vitest";
import { processIncomingSale, DiscordAdapter } from "@mint/notifiers";
import { db, products, inventory } from "@mint/core";
import { eq, and } from "drizzle-orm";

describe("Ejecución Autónoma de Ventas desde Canales Externos (@mint/notifiers)", () => {
  const companyId = "comp_default";
  const testSku = "MINT-SALES-CHAN-001";
  const testProductId = "prod_sales_chan_001";
  const authorizedOperatorId = "op_discord_999";

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

  it("2. processIncomingSale descuenta stock, detecta desabasto y emite comprobante", async () => {
    const quantityToSell = 5;

    // Ejecutar venta entrante desde Discord
    const saleResult = await processIncomingSale({
      channel: "discord",
      senderId: authorizedOperatorId,
      senderName: "Carlos Operador Discord",
      sku: testSku,
      quantity: quantityToSell,
      customerName: "Taller Mecánico Central",
      companyId,
      authorizedSenders: [authorizedOperatorId],
    });

    expect(saleResult.success).toBe(true);
    expect(saleResult.isDuplicate).toBe(false);
    expect(saleResult.quantitySold).toBe(quantityToSell);
    expect(saleResult.previousStock).toBe(50);
    expect(saleResult.remainingStock).toBe(45);
    expect(saleResult.channelReceipt).toContain("VENTA REGISTRADA [Canal: DISCORD]");
    expect(saleResult.channelReceipt).toContain(testSku);

    // Verificar persistencia directa en base de datos PostgreSQL
    const invAfter = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.productId, testProductId), eq(inventory.companyId, companyId)))
      .limit(1);

    expect(invAfter[0].stock).toBe(45);
  });

  it("3. Idempotencia estricta: reintento de mensaje procesado no descuenta inventario dos veces", async () => {
    const messageId = `msg_discord_repeat_${Date.now()}`;

    // Primera llamada con messageId
    const firstSale = await processIncomingSale({
      channel: "discord",
      senderId: authorizedOperatorId,
      messageId,
      sku: testSku,
      quantity: 2,
      companyId,
      authorizedSenders: [authorizedOperatorId],
    });

    expect(firstSale.success).toBe(true);
    expect(firstSale.isDuplicate).toBe(false);
    expect(firstSale.remainingStock).toBe(43);

    // Segundo intento idéntico (simulando reintento por timeout de red del webhook)
    const duplicateSale = await processIncomingSale({
      channel: "discord",
      senderId: authorizedOperatorId,
      messageId,
      sku: testSku,
      quantity: 2,
      companyId,
      authorizedSenders: [authorizedOperatorId],
    });

    // Retorna comprobante en caché y NO vuelve a restar existencias
    expect(duplicateSale.isDuplicate).toBe(true);
    expect(duplicateSale.remainingStock).toBe(43);

    const invCheck = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.productId, testProductId), eq(inventory.companyId, companyId)))
      .limit(1);

    expect(invCheck[0].stock).toBe(43); // Sigue en 43, no en 41
  });

  it("4. Control de acceso: emisor no autorizado es rechazado sin mutar inventario", async () => {
    const attackerId = "rogue_user_777";

    await expect(
      processIncomingSale({
        channel: "telegram",
        senderId: attackerId,
        senderName: "Usuario Desconocido",
        sku: testSku,
        quantity: 10,
        companyId,
        authorizedSenders: [authorizedOperatorId], // Solo authorizedOperatorId tiene permiso
      })
    ).rejects.toThrow(/ACCESO DENEGADO/);

    // Confirmar que el stock en BD permanece intacto
    const invCheck = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.productId, testProductId), eq(inventory.companyId, companyId)))
      .limit(1);

    expect(invCheck[0].stock).toBe(43);
  });
});
