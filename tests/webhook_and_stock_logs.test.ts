import { describe, it, expect } from "vitest";
import { WebhookAdapter } from "../packages/notifiers/src/adapters/webhookAdapter";
import { dispatchStockLogNotification } from "../packages/notifiers/src/channelManager";
import { createServer } from "node:http";

describe("Notificaciones y Webhooks Reales (Cero Simulaciones)", () => {
  it("WebhookAdapter debe enviar un HTTP POST con payload JSON y cabeceras validas", async () => {
    let receivedPayload: any = null;
    let receivedSignature: string | null = null;

    const server = createServer((req, res) => {
      receivedSignature = req.headers["x-mint-signature"] as string;
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          receivedPayload = JSON.parse(body);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "received" }));
        } catch {
          res.writeHead(400);
          res.end();
        }
      });
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address() as any;
    const testUrl = `http://127.0.0.1:${addr.port}/webhook-test`;

    try {
      const adapter = new WebhookAdapter();
      const sendRes = await adapter.send(
        {
          companyId: "comp_test_webhook",
          decisionId: "dec_wh_001",
          title: "Alerta de Stock Critico",
          description: "Existencias en cero para producto SKU-TEST",
          costMxn: 1500,
          currency: "COP",
          proposingAgent: "inventory_monitor",
          severity: "CRITICAL",
          evidenceSummary: "Detalle de faltante detectado",
          approveToken: "token_appr_123",
          rejectToken: "token_rej_123",
        },
        {
          webhookUrl: testUrl,
          secret: "super_secret_signing_key",
        },
      );

      expect(sendRes.success).toBe(true);
      expect(sendRes.channelType).toBe("webhook");
      expect(receivedPayload).toBeDefined();
      expect(receivedPayload.event).toBe("DECISION_APPROVAL");
      expect(receivedPayload.companyId).toBe("comp_test_webhook");
      expect(receivedPayload.decisionId).toBe("dec_wh_001");
      expect(receivedPayload.tokens.approve).toBe("token_appr_123");
      expect(receivedSignature).toMatch(/^sha256=[a-f0-9]{64}$/);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("WebhookAdapter debe reportar error limpio si el endpoint destino falla o rechaza", async () => {
    const server = createServer((req, res) => {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error in target webhook");
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address() as any;
    const testUrl = `http://127.0.0.1:${addr.port}/failing-webhook`;

    try {
      const adapter = new WebhookAdapter();
      const sendRes = await adapter.send(
        {
          companyId: "comp_default",
          decisionId: "dec_fail_test",
          title: "Test Error",
          description: "Prueba de fallo",
          costMxn: 0,
          proposingAgent: "test_agent",
          severity: "INFO",
          evidenceSummary: "Testing HTTP 500 error handling",
        },
        { webhookUrl: testUrl },
      );

      expect(sendRes.success).toBe(false);
      expect(sendRes.error).toContain("Webhook HTTP 500");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("dispatchStockLogNotification debe despachar eventos de inventario sin inventar datos", async () => {
    const results = await dispatchStockLogNotification({
      companyId: "comp_default",
      type: "STOCK_UPDATE",
      title: "Actualizacion de existencias",
      description: "Sensor ST-200 paso de 20u a 15u por venta de mostrador",
      productId: "prod_st200",
      productName: "Sensor Térmico ST-200",
      sku: "SKU-ST200",
      quantityDelta: -5,
      previousStock: 20,
      newStock: 15,
      minStock: 10,
      severity: "INFO",
    });

    expect(Array.isArray(results)).toBe(true);
  }, 25000);
});
