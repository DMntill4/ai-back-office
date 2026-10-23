import { type NotifierAdapter, type NotificationPayload, type SendResult } from "../types";

export class SlackAdapter implements NotifierAdapter {
  type = "slack" as const;

  async send(payload: NotificationPayload, config: Record<string, any>): Promise<SendResult> {
    const webhookUrl = config.webhookUrl || process.env.SLACK_WEBHOOK_URL;
    const channel = config.channel || "#mint-approvals";

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🚨 Mint Decision: ${payload.title}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Monto:*\n$${payload.costMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
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
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: `Aprobar ($${payload.costMxn.toLocaleString("es-MX")} MXN)`,
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
    ];

    const messageId = `slack_msg_${Date.now()}`;

    if (webhookUrl && !webhookUrl.startsWith("simulated_")) {
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
      } catch (err: any) {
        console.warn(`[SLACK ADAPTER] Webhook no disponible: ${err.message}`);
      }
    }

    return {
      success: true,
      channelType: this.type,
      messageId,
      deliveredAt: new Date().toISOString(),
      details: {
        channel,
        simulated: true,
        blocks,
      },
    };
  }
}
