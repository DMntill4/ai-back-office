import { type NotifierAdapter, type NotificationPayload, type SendResult } from "../types";

export class GmailAdapter implements NotifierAdapter {
  type = "gmail" as const;

  async send(payload: NotificationPayload, config: Record<string, any>): Promise<SendResult> {
    const recipientEmail = config.email || process.env.NOTIFICATION_EMAIL || "operaciones@mint.io";
    const currency = payload.currency || "USD";
    const formattedAmount = `$${payload.costMxn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
    const isPayment = payload.kind === "PAYMENT_DISPERSION" || Boolean(payload.paymentDetails);
    const pd = payload.paymentDetails;
    const baseUrl = process.env.PUBLIC_SERVER_URL || `http://localhost:${process.env.PORT || "3000"}`;

    const htmlBody =
      isPayment && pd
        ? `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #10b981; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #065f46; margin-top: 0;">[TESORERÍA Y PAGOS] Orden de Compra Autorizada para Dispersión</h2>
        <p style="font-size: 16px; color: #334155;">Folio OC: <strong>${pd.orderId}</strong> ${pd.trackingNumber ? `• Guía: <strong>${pd.trackingNumber}</strong>` : ""}</p>
        <div style="background-color: #ecfdf5; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #10b981;">
          <p style="margin: 4px 0;"><strong>Monto a Dispersar:</strong> ${formattedAmount}</p>
          <p style="margin: 4px 0;"><strong>Proveedor Beneficiario:</strong> ${pd.supplierName} (${pd.supplierId})</p>
          ${pd.supplierTaxId ? `<p style="margin: 4px 0;"><strong>RFC / Tax ID:</strong> ${pd.supplierTaxId}</p>` : ""}
          ${pd.supplierEmail ? `<p style="margin: 4px 0;"><strong>Correo Proveedor:</strong> ${pd.supplierEmail}</p>` : ""}
          <p style="margin: 4px 0;"><strong>Concepto:</strong> ${pd.quantity}u × ${pd.productName} ${pd.sku ? `(${pd.sku})` : ""} @ $${Number(pd.unitPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}/u</p>
          <p style="margin: 4px 0;"><strong>Autorizado por:</strong> ${pd.approvedBy}</p>
        </div>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">${payload.evidenceSummary}</p>
        <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">Notificación automática de Control de Pagos emitida por Mint Autonomous Logistics Coordinator.</p>
      </div>
    `.trim()
        : `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">[CRITICO] Mint Logistics — Solicitud de Aprobación</h2>
        <p style="font-size: 16px; color: #334155;"><strong>${payload.title}</strong></p>
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Monto Total:</strong> ${formattedAmount}</p>
          <p style="margin: 4px 0;"><strong>Agente Origen:</strong> ${payload.proposingAgent}</p>
          <p style="margin: 4px 0;"><strong>Severidad:</strong> ${payload.severity}</p>
        </div>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">${payload.evidenceSummary}</p>
        ${
          payload.approveToken && payload.rejectToken
            ? `<div style="margin-top: 24px; display: flex; gap: 12px;">
          <a href="${baseUrl}/approve?token=${encodeURIComponent(payload.approveToken)}" style="background-color: #16a34a; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            [OK] Aprobar Orden (${formattedAmount})
          </a>
          &nbsp;&nbsp;
          <a href="${baseUrl}/reject?token=${encodeURIComponent(payload.rejectToken)}" style="background-color: #dc2626; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            [ERROR] Rechazar
          </a>
        </div>`
            : ""
        }
        <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">Este mensaje contiene un token firmado de un solo uso. Expira en 60 minutos.</p>
      </div>
    `.trim();

    const resendApiKey = process.env.RESEND_API_KEY || config.resendApiKey;
    const extraRecipients: string[] = Array.isArray(config.extraEmails) ? config.extraEmails : [];
    const allRecipients = Array.from(new Set([recipientEmail, ...extraRecipients].filter(Boolean)));

    if (resendApiKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM || "Mint Back-Office <notifications@resend.dev>",
            to: allRecipients,
            subject: isPayment && pd ? `[MINT PAGOS] Dispersar Orden ${pd.orderId} (${formattedAmount})` : `[Mint ${payload.severity}] ${payload.title}`,
            html: htmlBody,
          }),
        });

        if (response.ok) {
          const resendData: any = await response.json();
          return {
            success: true,
            channelType: this.type,
            messageId: resendData.id || `resend_${Date.now()}`,
            deliveredAt: new Date().toISOString(),
            details: {
              to: allRecipients,
              provider: "Resend",
              resendId: resendData.id,
            },
          };
        } else {
          const errText = await response.text();
          return {
            success: false,
            channelType: this.type,
            error: `Error al enviar correo por Resend API (HTTP ${response.status}): ${errText}`,
          };
        }
      } catch (err: any) {
        return {
          success: false,
          channelType: this.type,
          error: `Fallo de red al conectar con Resend API: ${err.message}`,
        };
      }
    }

    return {
      success: false,
      channelType: this.type,
      error: `No hay RESEND_API_KEY configurada en .env ni credenciales SMTP activas para enviar correos a ${allRecipients.join(", ")}. Configura RESEND_API_KEY o utiliza webhooks de Discord/Slack con '/channels add discord <url>'.`,
      details: {
        to: allRecipients,
      },
    };
  }
}
