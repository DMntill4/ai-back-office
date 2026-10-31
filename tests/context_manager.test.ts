import { describe, it, expect } from "vitest";
import {
  compactStockFacts,
  compactSupplierFacts,
  compactShipmentFacts,
  compactToolPayload,
  enforceTokenBudget,
  fitMessagesToBudget,
} from "@mint/core";

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
    expect(facts).toContain("$120.50 MXN/u");
    expect(facts).toContain("2 días");
  });

  it("debe recortar el contexto respetando estrictamente el presupuesto de tokens", () => {
    const longText = "A".repeat(2000); // ~500 tokens
    const trimmed = enforceTokenBudget(longText, 100); // Máximo 100 tokens (400 chars)

    expect(trimmed.length).toBeLessThan(longText.length);
    expect(trimmed).toContain("[Contexto truncado por límite de ventana]");
  });

  it("compacta resultados de herramientas como JSON válido y conserva campos críticos", () => {
    const output = compactToolPayload({
      isSuccess: true,
      verified: true,
      productId: "prod_123",
      data: { sku: "SKU-123", details: "dato".repeat(3000) },
      diagnostics: Array.from({ length: 40 }, (_, index) => `fila-${index}`),
    }, 120);

    expect(output.length).toBeLessThanOrEqual(480);
    expect(JSON.parse(output)).toMatchObject({
      isSuccess: true,
      verified: true,
      productId: "prod_123",
    });
  });

  it("preserva la consulta actual y solo interacciones completas dentro del presupuesto", () => {
    const messages = [
      { role: "system", content: "system ".repeat(20) },
      { role: "user", content: "old question ".repeat(80) },
      { role: "assistant", content: "old answer ".repeat(80) },
      { role: "user", content: "Consulta actual: SKU-123" },
      ...[1, 2, 3].flatMap((step) => [
        {
          role: "assistant",
          tool_calls: [{ id: `tool-${step}` }],
          content: null,
        },
        { role: "tool", tool_call_id: `tool-${step}`, content: "resultado ".repeat(400) },
      ]),
    ];

    const bounded = fitMessagesToBudget(messages, 1000);
    expect(Math.ceil(JSON.stringify(bounded).length / 4)).toBeLessThanOrEqual(1000);
    expect(bounded.some((message) => message.content === "Consulta actual: SKU-123")).toBe(true);
    expect(bounded.filter((message) => message.role === "assistant" && "tool_calls" in message).length).toBeLessThanOrEqual(2);
  });
});
