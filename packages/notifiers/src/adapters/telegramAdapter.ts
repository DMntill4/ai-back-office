import { type NotifierAdapter, type NotificationPayload, type SendResult } from "../types";

export class TelegramAdapter implements NotifierAdapter {
  type = "telegram" as const;

  async send(payload: NotificationPayload, config: Record<string, any>): Promise<SendResult> {
    const botToken = config.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = config.chatId || process.env.TELEGRAM_CHAT_ID || "123456789";

    const severityIcon = payload.severity === "CRITICAL" ? "🔴 [CRÍTICO]" : payload.severity === "WARNING" ? "🟡 [ATENCIÓN]" : "ℹ️ [INFO]";
    const currency = payload.currency || "USD";
    const formattedAmount = `$${payload.costMxn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

    const messageText = `
*${severityIcon} MINT DECISION ALERT*
*Título:* ${payload.title}
*Monto:* ${formattedAmount}
*Agente:* ${payload.proposingAgent}

*Evidencia y Razonamiento:*
${payload.evidenceSummary}

_Por favor confirme o rechace esta operación antes de que expire el token._
`.trim();

    const inlineKeyboard = [
      [
        {
          text: `✅ Aprobar (${formattedAmount})`,
          callback_data: `mint:approve:${payload.approveToken}`,
        },
        {
          text: `❌ Rechazar`,
          callback_data: `mint:reject:${payload.rejectToken}`,
        },
      ],
    ];

    const messageId = `tg_msg_${Date.now()}`;

    if (!botToken || !chatId) {
      return {
        success: process.env.NODE_ENV === "test" || config.dryRun === true,
        channelType: this.type,
        messageId,
        error: "Se requiere Bot Token y Chat ID de Telegram configurados.",
        details: {
          realDelivery: false,
          buttons: inlineKeyboard[0],
          renderedText: messageText,
        },
      };
    }

    if (botToken.startsWith("simulated_") || (process.env.NODE_ENV === "test" && botToken.includes("simulated"))) {
      return {
        success: true,
        channelType: this.type,
        messageId,
        deliveredAt: new Date().toISOString(),
        details: {
          chatId,
          realDelivery: false,
          buttons: inlineKeyboard[0],
          renderedText: messageText,
        },
      };
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
        }),
      });

      const data: any = await response.json();
      if (data.ok) {
        return {
          success: true,
          channelType: this.type,
          messageId: String(data.result?.message_id || messageId),
          deliveredAt: new Date().toISOString(),
          details: { chatId, realDelivery: true },
        };
      }

      return {
        success: false,
        channelType: this.type,
        messageId,
        error: `Telegram Bot API Error ${data.error_code}: ${data.description}`,
        details: { realDelivery: false },
      };
    } catch (err: any) {
      return {
        success: false,
        channelType: this.type,
        messageId,
        error: `Error de red al contactar Telegram: ${err.message}`,
        details: { realDelivery: false },
      };
    }
  }
}
