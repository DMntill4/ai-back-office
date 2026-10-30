import { type NotifierAdapter, type NotificationPayload, type SendResult } from "../types";

export class DiscordAdapter implements NotifierAdapter {
  type = "discord" as const;

  async send(payload: NotificationPayload, config: Record<string, any>): Promise<SendResult> {
    const webhookUrl = config.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
    const isPayment = payload.kind === "PAYMENT_DISPERSION" || Boolean(payload.paymentDetails);
    const severityColor = isPayment
      ? 0x10b981
      : payload.severity === "CRITICAL"
        ? 0xef4444
        : payload.severity === "WARNING"
          ? 0xf59e0b
          : 0x10b981;

    const currency = payload.currency || "USD";
    const formattedAmount = `$${payload.costMxn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

    const pd = payload.paymentDetails;
    const assigneesText =
      pd?.financeAssignees && pd.financeAssignees.length > 0
        ? pd.financeAssignees.map((a) => `• ${a.name} (<${a.email}>) [${a.role.toUpperCase()}]`).join("\n")
        : "• Departamento de Tesorería / Cuentas por Pagar";

    const embed = isPayment && pd
      ? {
          title: `[TESORERÍA / PAGOS] ORDEN DE COMPRA APROBADA: ${pd.orderId}`,
          description: payload.evidenceSummary,
          color: severityColor,
          fields: [
            {
              name: "Monto a Dispersar",
              value: `**${formattedAmount}**`,
              inline: true,
            },
            {
              name: "Folio OC / Guía",
              value: `\`${pd.orderId}\` ${pd.trackingNumber ? `(\`${pd.trackingNumber}\`)` : ""}`,
              inline: true,
            },
            {
              name: "Autorizado por",
              value: pd.approvedBy,
              inline: true,
            },
            {
              name: "Proveedor Beneficiario",
              value: `${pd.supplierName} (\`${pd.supplierId}\`)${pd.supplierTaxId ? ` • RFC/TaxID: \`${pd.supplierTaxId}\`` : ""}${pd.supplierEmail ? `\nContacto: ${pd.supplierEmail}` : ""}`,
              inline: false,
            },
            {
              name: "Concepto",
              value: `${pd.quantity}u × ${pd.productName} ${pd.sku ? `(\`${pd.sku}\`)` : ""} @ $${Number(pd.unitPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}/u`,
              inline: false,
            },
            {
              name: "Personal Responsable de Pago Notificado",
              value: assigneesText,
              inline: false,
            },
          ],
          footer: {
            text: "Mint Autonomous Logistics • Control de Pagos y Tesorería",
          },
          timestamp: new Date().toISOString(),
        }
      : {
          title: `[MINT] MINT DECISION ALERT: ${payload.title}`,
          description: payload.evidenceSummary,
          color: severityColor,
          fields: [
            {
              name: "Monto",
              value: formattedAmount,
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
            ...(payload.approveToken
              ? [
                  {
                    name: "Token de Aprobación",
                    value: `\`${payload.approveToken}\``,
                    inline: false,
                  },
                ]
              : []),
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
