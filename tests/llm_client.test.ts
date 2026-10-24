import { describe, it, expect } from "vitest";
import { calculateCallCost } from "../packages/core/src/llm/pricing";
import { fakeGrokClient } from "../packages/core/src/llm/fake";

describe("Módulo LLM y Pricing", () => {
  it("debe calcular el costo exacto con 6 decimales", () => {
    // 1000 tokens prompt @ $2.0/1M = 0.002
    // 500 tokens completion @ $10.0/1M = 0.005
    // Total = 0.007000
    const cost = calculateCallCost("grok-4.6", 1000, 500, 0);
    expect(cost).toBe("0.007000");
  });

  it("debe considerar descuento de tokens cacheados", () => {
    // 1000 tokens prompt total, 600 cacheados ($0.5/1M), 400 no cacheados ($2.0/1M)
    // uncached = 400 * 0.000002 = 0.000800
    // cached = 600 * 0.0000005 = 0.000300
    // completion = 0
    // Total = 0.001100
    const cost = calculateCallCost("grok-4.6", 1000, 0, 600);
    expect(cost).toBe("0.001100");
  });

  it("el cliente falso no debe llamar a Grok real y debe registrar llamadas", async () => {
    fakeGrokClient.reset();
    fakeGrokClient.setResponse("inventario", {
      content: "Stock disponible: 15 unidades",
      latencyMs: 12,
    });

    const result = await fakeGrokClient.chatCompletion({
      messages: [{ role: "user", content: "Consultar inventario" }],
    });

    expect(result.content).toBe("Stock disponible: 15 unidades");
    expect(result.latencyMs).toBe(12);
    expect(fakeGrokClient.callsMade.length).toBe(1);
  });
});
