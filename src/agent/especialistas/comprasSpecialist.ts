import { db } from "../../db/client";
import { suppliers, supplierProducts } from "../../db/schema";
import { eq, and, asc } from "drizzle-orm";
import { compactSupplierFacts } from "../context/contextManager";

export interface SupplierOption {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  leadTimeDays: number;
  minOrderQuantity: number;
  totalCostMxn: number;
}

export interface PurchasingProposal {
  recommendedOption: SupplierOption;
  alternativeOptions: SupplierOption[];
  recommendedQuantity: number;
  totalCostMxn: number;
  reason: string;
  compactFacts: string;
}

/**
 * Especialista en Compras: evalúa proveedores reales homologados en PostgreSQL
 */
export async function analyzePurchasingOptions(
  productId: string,
  targetQuantity: number,
  companyId: string = "comp_default",
  isUrgent: boolean = false,
): Promise<PurchasingProposal | null> {
  const options = await db
    .select({
      supplierId: suppliers.id,
      supplierName: suppliers.name,
      unitPrice: supplierProducts.unitPrice,
      leadTimeDays: supplierProducts.leadTimeDays,
      minOrderQuantity: supplierProducts.minOrderQuantity,
    })
    .from(supplierProducts)
    .innerJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
    .where(and(eq(supplierProducts.productId, productId), eq(supplierProducts.companyId, companyId)))
    .orderBy(asc(supplierProducts.unitPrice));

  if (options.length === 0) {
    return null;
  }

  const mappedOptions: SupplierOption[] = options.map((opt) => {
    const unitPrice = parseFloat(opt.unitPrice);
    const qty = Math.max(targetQuantity, opt.minOrderQuantity);
    return {
      supplierId: opt.supplierId,
      supplierName: opt.supplierName,
      unitPrice,
      leadTimeDays: opt.leadTimeDays,
      minOrderQuantity: opt.minOrderQuantity,
      totalCostMxn: unitPrice * qty,
    };
  });

  // Si es urgente, priorizar proveedor con menor tiempo de entrega
  let recommended: SupplierOption;
  if (isUrgent) {
    mappedOptions.sort((a, b) => a.leadTimeDays - b.leadTimeDays || a.unitPrice - b.unitPrice);
    recommended = mappedOptions[0];
  } else {
    // Si es rutinario, priorizar menor costo
    mappedOptions.sort((a, b) => a.unitPrice - b.unitPrice);
    recommended = mappedOptions[0];
  }

  const finalQuantity = Math.max(targetQuantity, recommended.minOrderQuantity);
  const totalCostMxn = recommended.unitPrice * finalQuantity;

  const compactFacts = compactSupplierFacts(
    mappedOptions.map((o) => ({
      supplierId: o.supplierId,
      supplierName: o.supplierName,
      unitPrice: o.unitPrice,
      leadTimeDays: o.leadTimeDays,
      minOrderQuantity: o.minOrderQuantity,
    })),
  );

  return {
    recommendedOption: recommended,
    alternativeOptions: mappedOptions.filter((o) => o.supplierId !== recommended.supplierId),
    recommendedQuantity: finalQuantity,
    totalCostMxn,
    reason: isUrgent
      ? `Proveedor "${recommended.supplierName}" seleccionado por menor tiempo de entrega (${recommended.leadTimeDays} días) para mitigar riesgo de desabasto.`
      : `Proveedor "${recommended.supplierName}" seleccionado por mejor costo unitario ($${recommended.unitPrice.toFixed(2)} MXN).`,
    compactFacts,
  };
}
