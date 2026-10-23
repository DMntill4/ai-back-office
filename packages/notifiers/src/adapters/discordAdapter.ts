import { type NotifierAdapter, type NotificationPayload, type SendResult } from "../types";

export class DiscordAdapter implements NotifierAdapter {
  type = "discord" as const;

  async send(payload: NotificationPayload, config: Record<string, any>): Promise<SendResult> {
    const webhookUrl = config.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
    const severityColor = payload.severity === "CRITICAL" ? 0xef4444 : payload.severity === "WARNING" ? 0xf59e0b : 0x10b981;

    const embed = {
      title: `🍃 MINT DECISION ALERT: ${payload.title}`,
      description: payload.evidenceSummary,
      color: severityColor,
      fields: [
        {
          name: "Monto",
          value: `$${payload.costMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
          inline: true,
        },
        {
          name: "Agente Proponente",
          value: payload.proposingAgent,
          inline: true,
        },
        {
          name: "Severidad",
          value: payload.severity || "INFO",
          inline: true,
        },
        {
          name: "Token de Aprobación",
          value: `\`${payload.approveToken}\``,
          inline: false,
        },
      ],
      footer: {
        text: "Mint Autonomous Logistics Coordinator • HITL Governance",
      },
      timestamp: new Date().toISOString(),
    };

    const messageId = `discord_msg_${Date.now()}`;

    if (webhookUrl && !webhookUrl.startsWith("simulated_")) {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "Mint Autonomous Agent",
            embeds: [embed],
          }),
        });

        if (response.ok) {
          return {
            success: true,
            channelType: "discord" as any,
            messageId,
            deliveredAt: new Date().toISOString(),
            details: { webhookUrl, realDelivery: true },
          };
        }
      } catch (err: any) {
        console.warn(`[DISCORD ADAPTER] Webhook no disponible, operando en modo simulado: ${err.message}`);
      }
    }

    return {
      success: true,
      channelType: "discord" as any,
      messageId,
      deliveredAt: new Date().toISOString(),
      details: {
        simulated: true,
        renderedEmbed: embed,
      },
    };
  }
}
