import { db } from "../../db/client";
import { purchaseOrders, suppliers } from "../../db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { compactRecentOrdersFacts } from "../context/contextManager";

export interface RiskAuditResult {
  riskScore: number; // 0.0 (seguro) a 1.0 (crítico)
  isDuplicate: boolean;
  supplierVerified: boolean;
  redFlags: string[];
  mitigatedObjections: string[];
  recentOrdersCount72h: number;
  compactFacts: string;
}

/**
 * Especialista en Riesgo y Auditoría (Agente Adversarial - Abogado del Diablo)
 * Cuestiona activamente la propuesta antes de que llegue al humano o al motor de políticas.
 */
export async function auditProposalRisk(params: {
  productId: string;
  supplierId: string;
  proposedQuantity: number;
  proposedUnitPrice: number;
  totalCostMxn: number;
  companyId?: string;
}): Promise<RiskAuditResult> {
  const companyId = params.companyId || "comp_default";
  const redFlags: string[] = [];
  const mitigatedObjections: string[] = [];
  let riskScore = 0.05; // Base segura inicial

  // 1. Auditoría de Órdenes Duplicadas en las últimas 72 horas
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const recentOrders = await db
    .select()
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.productId, params.productId),
        eq(purchaseOrders.companyId, companyId),
        gte(purchaseOrders.createdAt, seventyTwoHoursAgo),
      ),
    )
    .orderBy(desc(purchaseOrders.createdAt));

  const isDuplicate = recentOrders.some((o) => o.status === "abierta");
  if (isDuplicate) {
    redFlags.push("Ya existe una orden de compra abierta en curso para este producto emitida en las últimas 72 horas.");
    riskScore += 0.85;
  } else if (recentOrders.length > 0) {
    mitigatedObjections.push("Se detectaron compras previas en 72h pero están cerradas/entregadas; no hay duplicidad activa.");
    riskScore += 0.10;
  } else {
    mitigatedObjections.push("Auditoría de duplicados superada: Cero órdenes emitidas en las últimas 72 horas.");
  }

  // 2. Auditoría de Proveedor Homologado
  const supp = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, params.supplierId), eq(suppliers.companyId, companyId)))
    .limit(1);

  const supplierVerified = supp.length > 0;
  if (!supplierVerified) {
    redFlags.push(`El proveedor ${params.supplierId} no está registrado en el directorio homologado de la empresa.`);
    riskScore += 0.50;
  } else {
    mitigatedObjections.push(`Proveedor "${supp[0].name}" validado en directorio corporativo.`);
  }

  // 3. Auditoría de Desviación de Precios contra Historial
  const historicalOrders = await db
    .select({ unitPrice: purchaseOrders.unitPrice })
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.productId, params.productId), eq(purchaseOrders.companyId, companyId)))
    .limit(10);

  if (historicalOrders.length > 0) {
    const avgHistoricalPrice =
      historicalOrders.reduce((sum, o) => sum + parseFloat(o.unitPrice), 0) / historicalOrders.length;

    const priceInflationPercent = ((params.proposedUnitPrice - avgHistoricalPrice) / avgHistoricalPrice) * 100;

    if (priceInflationPercent > 25) {
      redFlags.push(
        `Sobrecosto atípico detectado: El precio unitario propuesto ($${params.proposedUnitPrice} MXN) está +${priceInflationPercent.toFixed(1)}% por encima del histórico promedio ($${avgHistoricalPrice.toFixed(2)} MXN).`,
      );
      riskScore += 0.35;
    } else if (priceInflationPercent > 0) {
      mitigatedObjections.push(
        `Sobrecosto moderado (+${priceInflationPercent.toFixed(1)}%) justificado por plazos de entrega inmediata o inflación de mercado.`,
      );
      riskScore += 0.08;
    } else {
      mitigatedObjections.push("Precio unitario igual o inferior al promedio histórico de compras.");
    }
  }

  // 4. Auditoría de Volumen Inusual
  if (params.proposedQuantity <= 0) {
    redFlags.push("La cantidad propuesta es menor o igual a cero.");
    riskScore = 1.0;
  }

  riskScore = Math.min(1.0, parseFloat(riskScore.toFixed(3)));

  const compactFacts = compactRecentOrdersFacts(
    recentOrders.map((o) => ({
      id: o.id,
      productId: o.productId,
      quantity: o.quantity,
      totalAmount: o.totalAmount,
      status: o.status,
      createdAt: o.createdAt,
    })),
  );

  return {
    riskScore,
    isDuplicate,
    supplierVerified,
    redFlags,
    mitigatedObjections,
    recentOrdersCount72h: recentOrders.length,
    compactFacts,
  };
}
