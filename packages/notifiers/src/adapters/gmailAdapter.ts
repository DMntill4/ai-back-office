import { type NotifierAdapter, type NotificationPayload, type SendResult } from "../types";

export class GmailAdapter implements NotifierAdapter {
  type = "gmail" as const;

  async send(payload: NotificationPayload, config: Record<string, any>): Promise<SendResult> {
    const recipientEmail = config.email || process.env.NOTIFICATION_EMAIL || "operaciones@mint.io";

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">[ALERTA] Mint Logistics — Solicitud de Aprobación</h2>
        <p style="font-size: 16px; color: #334155;"><strong>${payload.title}</strong></p>
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Monto Total:</strong> $${payload.costMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</p>
          <p style="margin: 4px 0;"><strong>Agente Origen:</strong> ${payload.proposingAgent}</p>
          <p style="margin: 4px 0;"><strong>Severidad:</strong> ${payload.severity}</p>
        </div>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">${payload.evidenceSummary}</p>
        <div style="margin-top: 24px; display: flex; gap: 12px;">
          <a href="https://mint.local/approve?token=${payload.approveToken}" style="background-color: #16a34a; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            [Aprobar Orden] ($${payload.costMxn.toLocaleString("es-MX")} MXN)
          </a>
          &nbsp;&nbsp;
          <a href="https://mint.local/reject?token=${payload.rejectToken}" style="background-color: #dc2626; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            [Rechazar]
          </a>
        </div>
        <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">Este mensaje contiene un token firmado de un solo uso. Expira en 60 minutos.</p>
      </div>
    `.trim();

    const resendApiKey = process.env.RESEND_API_KEY || config.resendApiKey;

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
            to: [recipientEmail],
            subject: `[Mint ${payload.severity}] ${payload.title}`,
            html: htmlBody,
          }),
        });

        if (response.ok) {
          const resendData = await response.json();
          return {
            success: true,
            channelType: this.type,
            messageId: resendData.id || `resend_${Date.now()}`,
            deliveredAt: new Date().toISOString(),
            details: {
              to: recipientEmail,
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

    // Si no hay API key configurada, reportar honestamente que no se pudo enviar a la bandeja
    return {
      success: false,
      channelType: this.type,
      error: `No hay RESEND_API_KEY configurada en .env ni credenciales SMTP activas para enviar correos a ${recipientEmail}. Configura RESEND_API_KEY o utiliza webhooks de Discord/Slack con '/channels add discord <url>'.`,
      details: {
        to: recipientEmail,
      },
    };
  }
}
