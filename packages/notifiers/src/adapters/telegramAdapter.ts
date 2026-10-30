import { type NotifierAdapter, type NotificationPayload, type SendResult } from "../types";

export class TelegramAdapter implements NotifierAdapter {
  type = "telegram" as const;

  async send(payload: NotificationPayload, config: Record<string, any>): Promise<SendResult> {
    const botToken = config.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = config.chatId || process.env.TELEGRAM_CHAT_ID || "123456789";

    const isPayment = payload.kind === "PAYMENT_DISPERSION" || Boolean(payload.paymentDetails);
    const pd = payload.paymentDetails;
    const severityIcon =
      payload.severity === "CRITICAL"
        ? "[CRITICO]"
        : payload.severity === "WARNING"
          ? "[ADVERTENCIA]"
          : "[INFO]";
    const currency = payload.currency || "USD";
    const formattedAmount = `$${payload.costMxn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

    const assigneesText =
      pd?.financeAssignees && pd.financeAssignees.length > 0
        ? pd.financeAssignees.map((a) => `• ${a.name} (${a.email})`).join("\n")
        : "• Personal de Tesorería / Pagos";

    const messageText =
      isPayment && pd
        ? `
*[TESORERÍA Y PAGOS] ORDEN DE COMPRA AUTORIZADA*
*Folio OC:* \`${pd.orderId}\` ${pd.trackingNumber ? `| *Guía:* \`${pd.trackingNumber}\`` : ""}
*Monto a Dispersar:* *${formattedAmount}*
*Autorizó:* ${pd.approvedBy}

*Proveedor Beneficiario:*
• Nombre: ${pd.supplierName} (\`${pd.supplierId}\`)
${pd.supplierTaxId ? `• RFC/Tax ID: \`${pd.supplierTaxId}\`\n` : ""}${pd.supplierEmail ? `• Email: ${pd.supplierEmail}\n` : ""}*Concepto:* ${pd.quantity}u × ${pd.productName} ${pd.sku ? `(\`${pd.sku}\`)` : ""}

*Personal de Pagos Notificado:*
${assigneesText}
`.trim()
        : `
*${severityIcon} MINT DECISION ALERT*
*Título:* ${payload.title}
*Monto:* ${formattedAmount}
*Agente:* ${payload.proposingAgent}

*Evidencia y Razonamiento:*
${payload.evidenceSummary}

_Por favor confirme o rechace esta operación antes de que expire el token._
`.trim();

    const inlineKeyboard =
      !isPayment && payload.approveToken && payload.rejectToken
        ? [
            [
              {
                text: `[OK] Aprobar (${formattedAmount})`,
                callback_data: `mint:approve:${payload.approveToken}`,
              },
              {
                text: `[ERROR] Rechazar`,
                callback_data: `mint:reject:${payload.rejectToken}`,
              },
            ],
          ]
        : undefined;

    const messageId = `tg_msg_${Date.now()}`;

    if (!botToken || !chatId) {
      return {
        success: process.env.NODE_ENV === "test" || config.dryRun === true,
        channelType: this.type,
        messageId,
        error: "Se requiere Bot Token y Chat ID de Telegram configurados.",
        details: {
          realDelivery: false,
          buttons: inlineKeyboard?.[0],
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
          buttons: inlineKeyboard?.[0],
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
          ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {}),
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
