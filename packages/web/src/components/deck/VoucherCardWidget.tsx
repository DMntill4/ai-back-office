import React from "react";
import { FileCheck, Building2, Truck, ShieldCheck, DollarSign, Calendar, MapPin, Hash, ExternalLink } from "lucide-react";
import { Button } from "../ui/Button";

export interface VoucherCardWidgetProps {
  command?: string;
  args?: Record<string, string>;
  voucherData?: any;
  onNavigateTo?: (tab: string) => void;
}

const formatCurrency = (val: number, cur = "COP") =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: cur,
    maximumFractionDigits: 0,
  }).format(val);

export const VoucherCardWidget: React.FC<VoucherCardWidgetProps> = ({
  command,
  args = {},
  voucherData,
  onNavigateTo,
}) => {
  // Datos reales o representativos con la estructura de PurchaseOrderVoucher de @mint/core
  const v = voucherData || {
    orderId: "po_9f42d1",
    folioNumber: "PO-2026-0891",
    issuedAt: new Date().toISOString(),
    company: {
      id: "comp_default",
      name: "Distribuidora San Jerónimo S.A.S.",
      city: "Bogotá D.C.",
      country: "Colombia",
      currency: "COP",
    },
    supplier: {
      id: "prov_741",
      name: "Agrícola Santa Elena del Valle",
      email: "pedidos@santaelena.com.co",
      city: "Ibagué",
      address: "Parque Industrial Calle 145 # 22-80",
    },
    items: [
      {
        productId: "prod_1004",
        sku: "PROD-1004",
        name: "Pulpa de Guanábana Congelada 1kg",
        quantity: 24,
        unitPrice: 18500,
        subtotal: 444000,
      },
      {
        productId: "prod_2031",
        sku: "PROD-2031",
        name: "Concentrado de Maracuyá Pasteurizado",
        quantity: 12,
        unitPrice: 22000,
        subtotal: 264000,
      },
    ],
    financials: {
      subtotal: 708000,
      taxRate: 0.19,
      taxAmount: 134520,
      freightCost: 45000,
      totalAmount: 887520,
      currency: "COP",
    },
    logistics: {
      carrier: "Coordinadora Mercantil",
      trackingNumber: "GUIA-CO-99827361",
      origin: "Ibagué, Tolima",
      destination: "Bodega Principal Bogotá",
      etaDate: "En 48 horas hábiles",
      leadDays: 2,
      transitStatus: "CONFIRMADO POR PROVEEDOR",
    },
    governance: {
      approvedBy: "Agente Autónomo Mint (HITL Autorizado)",
      decisionId: "dec_7718a2bc",
      caseId: "case_stockout_prevention",
    },
  };

  return (
    <div className="space-y-base">
      {/* Cabecera del Voucher */}
      <div className="flex flex-wrap items-center justify-between gap-compact pb-compact border-b border-border">
        <div className="flex items-center gap-compact">
          <div className="w-8 h-8 rounded-control bg-brand/10 text-brand flex items-center justify-center">
            <FileCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-body font-bold text-primary">
                {v.folioNumber}
              </span>
              <span className="text-caption font-mono bg-raised px-2 py-0.5 rounded-pill border border-border text-brand font-medium">
                Adjudicada en PostgreSQL
              </span>
            </div>
            <p className="text-caption text-secondary flex items-center gap-2">
              <span>Emisión: {new Date(v.issuedAt).toLocaleDateString("es-CO")}</span>
              <span>·</span>
              <span>ID Orden: <span className="font-mono text-primary">{v.orderId}</span></span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-section-title font-bold text-primary font-mono tabular-nums block">
            {formatCurrency(v.financials.totalAmount, v.financials.currency)}
          </span>
          <span className="text-caption text-muted">Total liquidado (incluye IVA + Flete)</span>
        </div>
      </div>

      {/* Grid: Empresa Emisora vs Proveedor Adjudicado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-compact">
        {/* Emisor */}
        <div className="p-compact rounded-card-sm bg-panel border border-border space-y-1">
          <div className="flex items-center gap-1.5 text-caption font-semibold text-secondary uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-brand" />
            <span>Empresa Compradora</span>
          </div>
          <h5 className="text-body font-semibold text-primary">{v.company.name}</h5>
          <p className="text-caption text-muted">
            {v.company.city}, {v.company.country} · Moneda: {v.company.currency}
          </p>
        </div>

        {/* Proveedor */}
        <div className="p-compact rounded-card-sm bg-panel border border-border space-y-1">
          <div className="flex items-center gap-1.5 text-caption font-semibold text-secondary uppercase tracking-wider">
            <Truck className="w-3.5 h-3.5 text-state-ok" />
            <span>Proveedor Adjudicado</span>
          </div>
          <h5 className="text-body font-semibold text-primary">{v.supplier.name}</h5>
          <p className="text-caption text-muted">
            {v.supplier.address} · {v.supplier.city} ({v.supplier.email})
          </p>
        </div>
      </div>

      {/* Tabla de ítems pedidos */}
      <div className="overflow-x-auto rounded-card-sm border border-border bg-panel">
        <table className="w-full text-caption text-left">
          <thead className="bg-raised text-secondary font-medium border-b border-border">
            <tr>
              <th className="py-2 px-3">SKU</th>
              <th className="py-2 px-3">Producto</th>
              <th className="py-2 px-3 text-right">Cant.</th>
              <th className="py-2 px-3 text-right">Precio Unit.</th>
              <th className="py-2 px-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {v.items.map((item: any) => (
              <tr key={item.sku} className="hover:bg-raised/50 transition-colors">
                <td className="py-2 px-3 font-mono text-primary font-medium">{item.sku}</td>
                <td className="py-2 px-3 text-primary">{item.name}</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{item.quantity} unids</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">
                  {formatCurrency(item.unitPrice, v.financials.currency)}
                </td>
                <td className="py-2 px-3 text-right font-mono font-semibold text-primary tabular-nums">
                  {formatCurrency(item.subtotal, v.financials.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Flete logístico y Gobernanza */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-compact pt-compact border-t border-border text-caption">
        <div className="space-y-1 bg-raised p-compact rounded-control border border-border">
          <div className="flex items-center gap-1.5 text-secondary font-medium">
            <MapPin className="w-3.5 h-3.5 text-brand" />
            <span>Coordinación Logística:</span>
          </div>
          <p className="text-primary font-mono">
            {v.logistics.carrier} · Guía: <span className="font-bold text-brand">{v.logistics.trackingNumber}</span>
          </p>
          <p className="text-muted">
            Ruta: {v.logistics.origin} → {v.logistics.destination} (ETA: {v.logistics.etaDate})
          </p>
        </div>

        <div className="space-y-1 bg-raised p-compact rounded-control border border-border">
          <div className="flex items-center gap-1.5 text-secondary font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-state-ok" />
            <span>Firma de Gobernanza:</span>
          </div>
          <p className="text-primary">
            Autorizado por: <span className="font-semibold">{v.governance.approvedBy}</span>
          </p>
          <p className="text-muted font-mono text-[11px]">
            Decisión: {v.governance.decisionId} · Caso: {v.governance.caseId}
          </p>
        </div>
      </div>

      {/* Botón de acción */}
      {onNavigateTo && (
        <div className="flex justify-end pt-compact">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigateTo("compras_ordenes")}
            icon={<ExternalLink className="w-3.5 h-3.5" />}
          >
            Ver orden completa en Compras
          </Button>
        </div>
      )}
    </div>
  );
};
