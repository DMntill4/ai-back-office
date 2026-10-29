import { createHmac } from "node:crypto";
import { type NotifierAdapter, type NotificationPayload, type SendResult } from "../types";

export class WebhookAdapter implements NotifierAdapter {
  type = "webhook" as const;

  async send(payload: NotificationPayload, config: Record<string, any>): Promise<SendResult> {
    const webhookUrl = config.webhookUrl || config.url || process.env.GENERIC_WEBHOOK_URL;
    const messageId = `webhook_msg_${Date.now()}`;

    if (!webhookUrl) {
      return {
        success: false,
        channelType: this.type,
        messageId,
        error: "No se encontro Webhook URL configurada para el canal.",
        details: { realDelivery: false },
      };
    }

    const isPayment = payload.kind === "PAYMENT_DISPERSION" || Boolean(payload.paymentDetails);
    const currency = payload.currency || "USD";

    const webhookBody = {
      event: isPayment ? "PAYMENT_DISPERSION" : (payload.kind || "DECISION_APPROVAL"),
      messageId,
      companyId: payload.companyId,
      decisionId: payload.decisionId,
      title: payload.title,
      description: payload.description,
      severity: payload.severity || "INFO",
      amount: payload.costMxn,
      currency,
      proposingAgent: payload.proposingAgent,
      evidenceSummary: payload.evidenceSummary,
      tokens: {
        approve: payload.approveToken || null,
        reject: payload.rejectToken || null,
      },
      paymentDetails: payload.paymentDetails || null,
      metadata: (payload as any).metadata || {},
      timestamp: new Date().toISOString(),
    };

    const rawPayload = JSON.stringify(webhookBody);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "MINT-Autonomous-Back-Office/1.0",
    };

    const secret = config.secret || process.env.WEBHOOK_SECRET;
    if (secret) {
      const hmac = createHmac("sha256", secret);
      headers["X-Mint-Signature"] = `sha256=${hmac.update(rawPayload).digest("hex")}`;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: rawPayload,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok || response.status === 204) {
        return {
          success: true,
          channelType: this.type,
          messageId,
          deliveredAt: new Date().toISOString(),
          details: { webhookUrl: webhookUrl.slice(0, 40) + "...", status: response.status, realDelivery: true },
        };
      }

      const errText = await response.text().catch(() => "");
      return {
        success: false,
        channelType: this.type,
        messageId,
        error: `Webhook HTTP ${response.status}: ${errText.slice(0, 150) || "Error en destino"}`,
        details: { status: response.status, realDelivery: false },
      };
    } catch (err: any) {
      return {
        success: false,
        channelType: this.type,
        messageId,
        error: `Fallo de conexion al Webhook: ${err.message}`,
        details: { realDelivery: false },
      };
    }
  }
}
