import { type NotifierAdapter, type NotificationPayload, type SendResult } from "../types";

export class DiscordAdapter implements NotifierAdapter {
  type = "discord" as const;

  async send(payload: NotificationPayload, config: Record<string, any>): Promise<SendResult> {
    const webhookUrl = config.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
    const severityColor = payload.severity === "CRITICAL" ? 0xef4444 : payload.severity === "WARNING" ? 0xf59e0b : 0x10b981;

    const currency = payload.currency || "USD";

    const embed = {
      title: `🍃 MINT DECISION ALERT: ${payload.title}`,
      description: payload.evidenceSummary,
      color: severityColor,
      fields: [
        {
          name: "Monto",
          value: `$${payload.costMxn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`,
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

    if (!webhookUrl) {
      return {
        success: process.env.NODE_ENV === "test" || config.dryRun === true,
        channelType: "discord" as any,
        messageId,
        error: "No se encontró Webhook URL de Discord configurada.",
        details: { realDelivery: false, renderedEmbed: embed },
      };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Mint Autonomous Logistics",
          avatar_url: "https://raw.githubusercontent.com/DMntill4/ai-back-office/main/frontend/src/assets/mint-mascot.webp",
          embeds: [embed],
        }),
      });

      if (response.ok || response.status === 204) {
        return {
          success: true,
          channelType: "discord" as any,
          messageId,
          deliveredAt: new Date().toISOString(),
          details: { webhookUrl: webhookUrl.slice(0, 40) + "...", status: response.status, realDelivery: true },
        };
      }

      const errText = await response.text();
      return {
        success: false,
        channelType: "discord" as any,
        messageId,
        error: `Discord HTTP ${response.status}: ${errText || "Error en webhook"}`,
        details: { status: response.status, realDelivery: false },
      };
    } catch (err: any) {
      return {
        success: false,
        channelType: "discord" as any,
        messageId,
        error: `Error de red al contactar Discord: ${err.message}`,
        details: { realDelivery: false },
      };
    }
  }
}
