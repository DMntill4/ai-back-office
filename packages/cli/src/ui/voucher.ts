import { theme } from "./theme";
import type { PurchaseOrderVoucher } from "@mint/core";

export function renderInvoiceVoucher(v: PurchaseOrderVoucher): string {
  const currency = v.financials.currency || "USD";
  const fmt = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

  const w = 78;
  const line = (char = "─") => char.repeat(w);

  const out: string[] = [];

  out.push(theme.mint("╭" + line("─") + "╮"));
  out.push(
    theme.mint("│") +
      `  ${theme.mintBold("MINT ENTERPRISE")} ${theme.dim("//")} ${theme.bold("ORDEN DE COMPRA & COMPROBANTE FISCAL")}`.padEnd(
        w + 14,
      ) +
      theme.mint("│"),
  );
  out.push(
    theme.mint("│") +
      `  Folio: ${theme.cyanBold(v.folioNumber)}  │  Fecha: ${theme.dim(v.issuedAt.slice(0, 16).replace("T", " "))}  │  Divisa: ${theme.bold(currency)}`.padEnd(
        w + 19,
      ) +
      theme.mint("│"),
  );
  out.push(theme.mint("├" + line("─") + "┤"));

  // Buyer & Supplier
  out.push(
    theme.mint("│") +
      `  ${theme.bold("EMISOR (COMPRADOR)")}                       ${theme.bold("PROVEEDOR ADJUDICADO")}`.padEnd(w + 16) +
      theme.mint("│"),
  );
  out.push(
    theme.mint("│") +
      `  Empresa: ${theme.bold(v.company.name.slice(0, 24))}       Proveedor: ${theme.bold(v.supplier.name.slice(0, 25))}`.padEnd(
        w + 16,
      ) +
      theme.mint("│"),
  );
  out.push(
    theme.mint("│") +
      `  Ubicación: ${v.company.city.slice(0, 22)}            Contacto:  ${v.supplier.email.slice(0, 26)}`.padEnd(w) +
      theme.mint("│"),
  );
  out.push(theme.mint("├" + line("─") + "┤"));

  // Line items table
  out.push(
    theme.mint("│") +
      `  ${theme.dim("SKU")}            ${theme.dim("DESCRIPCIÓN")}                  ${theme.dim("CANT")}    ${theme.dim("P.UNIT")}         ${theme.dim("SUBTOTAL")}`.padEnd(
        w + 44,
      ) +
      theme.mint("│"),
  );

  for (const item of v.items) {
    const skuStr = item.sku.slice(0, 13).padEnd(14);
    const nameStr = item.name.slice(0, 26).padEnd(28);
    const qtyStr = String(item.quantity).padStart(5);
    const unitStr = fmt(item.unitPrice).padStart(12);
    const subStr = fmt(item.subtotal).padStart(14);
    out.push(
      theme.mint("│") +
        `  ${skuStr} ${nameStr} ${qtyStr}  ${unitStr} ${subStr}`.padEnd(w) +
        theme.mint("│"),
    );
  }

  out.push(theme.mint("├" + line("─") + "┤"));

  // Financials breakdown
  const subtotalStr = fmt(v.financials.subtotal).padStart(18);
  const taxStr = fmt(v.financials.taxAmount).padStart(18);
  const freightStr = fmt(v.financials.freightCost).padStart(18);
  const totalStr = fmt(v.financials.totalAmount).padStart(18);

  out.push(theme.mint("│") + `  Subtotal neto:                             ${subtotalStr}`.padEnd(w) + theme.mint("│"));
  out.push(theme.mint("│") + `  Impuestos / IVA (16%):                      ${taxStr}`.padEnd(w) + theme.mint("│"));
  if (v.financials.freightCost > 0) {
    out.push(theme.mint("│") + `  Flete terrestre (OSRM):                     ${freightStr}`.padEnd(w) + theme.mint("│"));
  }
  out.push(
    theme.mint("│") +
      `  ${theme.bold("TOTAL ORDEN DE COMPRA:")}                    ${theme.mintBold(totalStr)}`.padEnd(w + 17) +
      theme.mint("│"),
  );

  out.push(theme.mint("├" + line("─") + "┤"));

  // Logistics tracking
  out.push(
    theme.mint("│") +
      `  ${theme.bold("DESPACHO LOGÍSTICO Y SEGUIMIENTO")}`.padEnd(w + 8) +
      theme.mint("│"),
  );
  out.push(
    theme.mint("│") +
      `  Transportista: ${theme.bold(v.logistics.carrier)}   Guía: ${theme.cyanBold(v.logistics.trackingNumber)}`.padEnd(
        w + 17,
      ) +
      theme.mint("│"),
  );
  out.push(
    theme.mint("│") +
      `  Ruta: ${v.logistics.origin} -> ${v.logistics.destination}  │  ETA: ${theme.mintBold(v.logistics.etaDate)} (${v.logistics.leadDays}d)`.padEnd(
        w + 9,
      ) +
      theme.mint("│"),
  );

  out.push(theme.mint("├" + line("─") + "┤"));

  // Digital audit trail
  out.push(
    theme.mint("│") +
      `  ${theme.bold("AUDITORÍA DE GOBERNANZA (HUMAN-IN-THE-LOOP)")}`.padEnd(w + 8) +
      theme.mint("│"),
  );
  out.push(
    theme.mint("│") +
      `  Aprobado por:   ${theme.bold(v.governance.approvedBy)} [Firma digital validada en PostgreSQL]`.padEnd(
        w + 8,
      ) +
      theme.mint("│"),
  );
  out.push(
    theme.mint("│") +
      `  Hash Auditoría: ${theme.dim(v.governance.sha256AuditHash)}`.padEnd(w + 8) +
      theme.mint("│"),
  );
  out.push(
    theme.mint("│") +
      `  Idempotencia:   ${theme.dim(v.governance.idempotencyKey)}`.padEnd(w + 8) +
      theme.mint("│"),
  );
  out.push(theme.mint("╰" + line("─") + "╯"));

  return out.join("\n");
}
