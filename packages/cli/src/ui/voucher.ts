import { theme } from "./theme";
import type { PurchaseOrderVoucher } from "@mint/core";

/**
 * Renderiza la ficha técnica de impacto y auditoría de producción
 * tras ejecutar o autorizar una orden en PostgreSQL.
 * Cero facturas falsas simuladas: comparativa real de estado de base de datos.
 */
export function renderProductionAuditCard(v: PurchaseOrderVoucher): string {
  const currency = v.financials.currency || "COP";
  const fmt = (n: number) =>
    `$${Number(n || 0).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;

  const w = 78;
  const line = (char = "─") => char.repeat(w);
  const out: string[] = [];

  out.push(theme.charcoal("┌─" + line("─") + "┐"));
  out.push(
    theme.charcoal("│") +
      `  ${theme.mintBold("REGISTRO DE PRODUCCIÓN")} ${theme.dim("│")} ${theme.bold("ORDEN DE COMPRA ADJUDICADA [PostgreSQL]")}`.padEnd(
        w + 14,
      ) +
      theme.charcoal("│"),
  );
  out.push(
    theme.charcoal("│") +
      `  Folio: ${theme.smokeBold(v.folioNumber)}  ${theme.dim("│")}  Fecha: ${theme.dim(v.issuedAt.slice(0, 16).replace("T", " "))}  ${theme.dim("│")}  Divisa: ${theme.mintBold(currency)}`.padEnd(
        w + 19,
      ) +
      theme.charcoal("│"),
  );
  out.push(theme.charcoal("├─" + line("─") + "┤"));

  // Comprador y Proveedor
  out.push(
    theme.charcoal("│") +
      `  ${theme.bold("EMPRESA EMISORA")}                          ${theme.bold("PROVEEDOR ADJUDICADO")}`.padEnd(w + 16) +
      theme.charcoal("│"),
  );
  out.push(
    theme.charcoal("│") +
      `  Empresa: ${theme.smoke(v.company.name.slice(0, 24))}       Proveedor: ${theme.smoke(v.supplier.name.slice(0, 25))}`.padEnd(
        w + 16,
      ) +
      theme.charcoal("│"),
  );
  out.push(
    theme.charcoal("│") +
      `  Ubicación: ${v.company.city.slice(0, 22)}            Contacto:  ${v.supplier.email.slice(0, 26)}`.padEnd(w) +
      theme.charcoal("│"),
  );
  out.push(theme.charcoal("├─" + line("─") + "┤"));

  // Artículos adjudicados
  out.push(
    theme.charcoal("│") +
      `  ${theme.dim("SKU")}            ${theme.dim("DESCRIPCIÓN")}                  ${theme.dim("CANT")}    ${theme.dim("P.UNIT")}         ${theme.dim("SUBTOTAL")}`.padEnd(
        w + 44,
      ) +
      theme.charcoal("│"),
  );

  for (const item of v.items) {
    const skuStr = item.sku.slice(0, 13).padEnd(14);
    const nameStr = item.name.slice(0, 26).padEnd(28);
    const qtyStr = String(item.quantity).padStart(5);
    const unitStr = fmt(item.unitPrice).padStart(12);
    const subStr = fmt(item.subtotal).padStart(14);
    out.push(
      theme.charcoal("│") +
        `  ${skuStr} ${nameStr} ${qtyStr}  ${unitStr} ${subStr}`.padEnd(w) +
        theme.charcoal("│"),
    );
  }

  out.push(theme.charcoal("├─" + line("─") + "┤"));

  // Desglose de Impacto Financiero
  const subtotalStr = fmt(v.financials.subtotal).padStart(18);
  const freightStr = fmt(v.financials.freightCost).padStart(18);
  const totalStr = fmt(v.financials.totalAmount).padStart(18);

  out.push(theme.charcoal("│") + `  Subtotal compras directas:                 ${subtotalStr}`.padEnd(w) + theme.charcoal("│"));
  if (v.financials.freightCost > 0) {
    out.push(theme.charcoal("│") + `  Flete terrestre (OSRM):                     ${freightStr}`.padEnd(w) + theme.charcoal("│"));
  }
  out.push(
    theme.charcoal("│") +
      `  ${theme.bold("TOTAL DESEMBOLSO OPERATIVO:")}               ${theme.mintBold(totalStr)}`.padEnd(w + 17) +
      theme.charcoal("│"),
  );

  out.push(theme.charcoal("├─" + line("─") + "┤"));

  // Logística y Rastreo Real
  out.push(
    theme.charcoal("│") +
      `  ${theme.bold("DESPACHO LOGÍSTICO ASOCIADO [PostgreSQL Shipments]")}`.padEnd(w + 8) +
      theme.charcoal("│"),
  );
  out.push(
    theme.charcoal("│") +
      `  Transportista: ${theme.smoke(v.logistics.carrier)}   Guía: ${theme.smokeBold(v.logistics.trackingNumber)}`.padEnd(
        w + 17,
      ) +
      theme.charcoal("│"),
  );
  out.push(
    theme.charcoal("│") +
      `  Ruta: ${v.logistics.origin} -> ${v.logistics.destination}  ${theme.dim("│")}  ETA: ${theme.mint(v.logistics.etaDate)} (${v.logistics.leadDays}d)`.padEnd(
        w + 9,
      ) +
      theme.charcoal("│"),
  );

  out.push(theme.charcoal("├─" + line("─") + "┤"));

  // Trazabilidad de Auditoría
  out.push(
    theme.charcoal("│") +
      `  ${theme.bold("AUDITORÍA DE GOBERNANZA [case_events]")}`.padEnd(w + 8) +
      theme.charcoal("│"),
  );
  out.push(
    theme.charcoal("│") +
      `  Aprobador:      ${theme.smoke(v.governance.approvedBy)} (Autorización HITL registrada)`.padEnd(
        w + 8,
      ) +
      theme.charcoal("│"),
  );
  out.push(
    theme.charcoal("│") +
      `  Idempotencia:   ${theme.dim(v.governance.idempotencyKey)}`.padEnd(w + 8) +
      theme.charcoal("│"),
  );
  out.push(theme.charcoal("└─" + line("─") + "┘"));

  return out.join("\n");
}

export const renderInvoiceVoucher = renderProductionAuditCard;
