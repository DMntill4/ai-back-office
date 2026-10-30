import { type NotifierAdapter, type NotificationPayload, type SendResult } from "../types";

export class SlackAdapter implements NotifierAdapter {
  type = "slack" as const;

  async send(payload: NotificationPayload, config: Record<string, any>): Promise<SendResult> {
    const webhookUrl = config.webhookUrl || process.env.SLACK_WEBHOOK_URL;
    const channel = config.channel || "#mint-approvals";
    const currency = payload.currency || "USD";
    const formattedAmount = `$${payload.costMxn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
    const isPayment = payload.kind === "PAYMENT_DISPERSION" || Boolean(payload.paymentDetails);
    const pd = payload.paymentDetails;

    const assigneesText =
      pd?.financeAssignees && pd.financeAssignees.length > 0
        ? pd.financeAssignees.map((a) => `• ${a.name} (${a.email}) [${a.role.toUpperCase()}]`).join("\n")
        : "• Tesorería / Control de Pagos";

    const blocks: any[] =
      isPayment && pd
        ? [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `[PAGOS / TESORERIA] Orden Aprobada: ${pd.orderId}`,
                emoji: true,
              },
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*Monto a Pagar:*\n*${formattedAmount}*`,
                },
                {
                  type: "mrkdwn",
                  text: `*Autorizó:*\n${pd.approvedBy}`,
                },
                {
                  type: "mrkdwn",
                  text: `*Proveedor:*\n${pd.supplierName} (\`${pd.supplierId}\`)`,
                },
                {
                  type: "mrkdwn",
                  text: `*Guía / Folio:*\n\`${pd.orderId}\` ${pd.trackingNumber ? `/ \`${pd.trackingNumber}\`` : ""}`,
                },
              ],
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Detalle de Compra:*\n${pd.quantity}u × ${pd.productName} ${pd.sku ? `(\`${pd.sku}\`)` : ""}\n*Personal de Pagos asignado:*\n${assigneesText}`,
              },
            },
          ]
        : [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `[CRITICO] Mint Decision: ${payload.title}`,
                emoji: true,
              },
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*Monto:*\n${formattedAmount}`,
                },
                {
                  type: "mrkdwn",
                  text: `*Agente:*\n${payload.proposingAgent}`,
                },
                {
                  type: "mrkdwn",
                  text: `*Severidad:*\n${payload.severity}`,
                },
                {
                  type: "mrkdwn",
                  text: `*Caso ID:*\n${payload.decisionId}`,
                },
              ],
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Evidencia:*\n${payload.evidenceSummary}`,
              },
            },
            ...(payload.approveToken && payload.rejectToken
              ? [
                  {
                    type: "actions",
                    elements: [
                      {
                        type: "button",
                        text: {
                          type: "plain_text",
                          text: `Aprobar (${formattedAmount})`,
                          emoji: true,
                        },
                        style: "primary",
                        value: `approve:${payload.approveToken}`,
                        action_id: "mint_approve_action",
                      },
                      {
                        type: "button",
                        text: {
                          type: "plain_text",
                          text: "Rechazar",
                          emoji: true,
                        },
                        style: "danger",
                        value: `reject:${payload.rejectToken}`,
                        action_id: "mint_reject_action",
                      },
                    ],
                  },
                ]
              : []),
          ];

    const messageId = `slack_msg_${Date.now()}`;

    if (!webhookUrl) {
      return {
        success: false,
        channelType: this.type,
        messageId,
        error: "No se encontró Webhook URL de Slack configurada.",
        details: { realDelivery: false },
      };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, blocks }),
      });

      if (response.ok) {
        return {
          success: true,
          channelType: this.type,
          messageId,
          deliveredAt: new Date().toISOString(),
          details: { channel, realDelivery: true },
        };
      }

      const errText = await response.text();
      return {
        success: false,
        channelType: this.type,
        messageId,
        error: `Slack HTTP ${response.status}: ${errText || "Error en webhook"}`,
        details: { realDelivery: false },
      };
    } catch (err: any) {
      return {
        success: false,
        channelType: this.type,
        messageId,
        error: `Error de red al contactar Slack: ${err.message}`,
        details: { realDelivery: false },
      };
    }
  }
}
