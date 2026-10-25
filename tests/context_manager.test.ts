import { describe, it, expect } from "vitest";
import {
  compactStockFacts,
  compactSupplierFacts,
  compactShipmentFacts,
  enforceTokenBudget,
} from "../packages/core/src/agent/context/contextManager";

describe("Capa de Gestión y Compresión de Ventana de Contexto (ContextManager)", () => {
  it("debe compactar datos de inventario en hechos densos sin campos innecesarios", () => {
    const facts = compactStockFacts({
      product: { id: "prod_v500", name: "Válvula V-500", sku: "SKU-V500", minStock: 30 },
      stock: 12,
      burnRate: 4.2,
      daysCoverage: 2.85,
      salesCountLast30Days: 25,
    });

    expect(facts).toContain("[FACTS_INVENTARIO_REAL]");
    expect(facts).toContain('Válvula V-500');
    expect(facts).toContain("Stock Físico: 12 uds");
    expect(facts).toContain("Déficit Actual: 18 uds");
    expect(facts).toContain("CRÍTICO_INMINENTE");
    expect(facts).toContain("Burn Rate");
  });

  it("debe compactar cotizaciones de proveedores en una lista sintetizada", () => {
    const facts = compactSupplierFacts([
      {
        supplierId: "prov_acme",
        supplierName: "Acme Industrial",
        unitPrice: 120.5,
        leadTimeDays: 2,
        minOrderQuantity: 10,
      },
    ]);

    expect(facts).toContain("[FACTS_PROVEEDORES_REAL]");
    expect(facts).toContain("Acme Industrial");
    expect(facts).toContain("120.5");
    expect(facts).toContain("/u");
    expect(facts).toContain("2 días");
  });

  it("debe recortar el contexto respetando estrictamente el presupuesto de tokens", () => {
    const longText = "A".repeat(2000); // ~500 tokens
    const trimmed = enforceTokenBudget(longText, 100); // Máximo 100 tokens (400 chars)

    expect(trimmed.length).toBeLessThan(longText.length);
    expect(trimmed).toContain("[Contexto truncado por límite de ventana]");
  });
});
