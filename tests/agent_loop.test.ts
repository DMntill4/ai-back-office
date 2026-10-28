import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { runAgentLoop, FakeGrokClient } from "@mint/core";

describe("Bucle del Agente (Agent Loop)", () => {
  let mockClient: FakeGrokClient;

  beforeEach(() => {
    mockClient = new FakeGrokClient();
  });

  it("debe resolver el caso cuando las herramientas comprueban existencias y se resuelve exitosamente", async () => {
    // Paso 1: Grok pide consultar stock
    let turn = 0;
    mockClient.chatCompletion = async () => {
      turn++;
      if (turn === 1) {
        return {
          message: {
            role: "assistant",
            content: "Voy a consultar el inventario de prod_st200.",
            refusal: null,
            tool_calls: [
              {
                id: "call_stock_1",
                type: "function",
                function: {
                  name: "consultar_stock",
                  arguments: JSON.stringify({ producto_id: "prod_st200" }),
                },
              },
            ],
          },
          content: "Voy a consultar el inventario de prod_st200.",
          toolCalls: [
            {
              id: "call_stock_1",
              type: "function",
              function: {
                name: "consultar_stock",
                arguments: JSON.stringify({ producto_id: "prod_st200" }),
              },
            },
          ],
          model: "fake-grok",
          finishReason: "tool_calls",
          usage: {
            promptTokens: 50,
            completionTokens: 20,
            cachedTokens: 0,
            totalTokens: 70,
          },
          latencyMs: 15,
          cost: "0.000100",
        };
      }

      // Paso 2: Grok ve que hay stock y decide resolver el caso
      return {
        message: {
          role: "assistant",
          content: "Hay suficiente stock, voy a resolver el caso.",
          refusal: null,
          tool_calls: [
            {
              id: "call_resolve_1",
              type: "function",
              function: {
                name: "resolver_caso",
                arguments: JSON.stringify({
                  resumen_resolucion: "Stock verificado en bodega central.",
                  justificacion:
                    "Se comprobó la existencia y no requiere compra.",
                }),
              },
            },
          ],
        },
        content: "Hay suficiente stock, voy a resolver el caso.",
        toolCalls: [
          {
            id: "call_resolve_1",
            type: "function",
            function: {
              name: "resolver_caso",
              arguments: JSON.stringify({
                resumen_resolucion: "Stock verificado en bodega central.",
                justificacion:
                  "Se comprobó la existencia y no requiere compra.",
              }),
            },
          },
        ],
        model: "fake-grok",
        finishReason: "tool_calls",
        usage: {
          promptTokens: 60,
          completionTokens: 25,
          cachedTokens: 0,
          totalTokens: 85,
        },
        latencyMs: 12,
        cost: "0.000120",
      };
    };

    const report = await runAgentLoop("case_test_resolve", {
      client: mockClient,
      maxSteps: 5,
    });

    expect(report.status).toBe("resuelto");
    expect(report.summary).toContain("Stock verificado");
    expect(report.totalSteps).toBe(2);
    expect(report.totalTokens).toBe(155);
  });

  it("debe escalar el caso a un humano cuando la orden de compra supera el límite de autorización", async () => {
    let turn = 0;
    mockClient.chatCompletion = async () => {
      turn++;
      if (turn === 1) {
        return {
          message: {
            role: "assistant",
            content: "Intentando crear orden de compra para abastecimiento.",
            refusal: null,
            tool_calls: [
              {
                id: "call_buy_1",
                type: "function",
                function: {
                  name: "crear_orden_compra",
                  arguments: JSON.stringify({
                    case_id: "case_test_escalate",
                    producto_id: "prod_st200",
                    proveedor_id: "prov_acme",
                    cantidad: 100, // Supera los $10,000 MXN
                    idempotency_key: "idem_test_supera_limite_loop",
                  }),
                },
              },
            ],
          },
          content: "Intentando crear orden de compra para abastecimiento.",
          toolCalls: [
            {
              id: "call_buy_1",
              type: "function",
              function: {
                name: "crear_orden_compra",
                arguments: JSON.stringify({
                  case_id: "case_test_escalate",
                  producto_id: "prod_st200",
                  proveedor_id: "prov_acme",
                  cantidad: 100,
                  idempotency_key: "idem_test_supera_limite_loop",
                }),
              },
            },
          ],
          model: "fake-grok",
          finishReason: "tool_calls",
          usage: {
            promptTokens: 50,
            completionTokens: 20,
            cachedTokens: 0,
            totalTokens: 70,
          },
          latencyMs: 15,
          cost: "0.000100",
        };
      }

      // Paso 2: La herramienta notificó que requiere aprobación, Grok escala
      return {
        message: {
          role: "assistant",
          content: "Supera el límite de autorización, escalando a supervisor.",
          refusal: null,
          tool_calls: [
            {
              id: "call_escalate_1",
              type: "function",
              function: {
                name: "escalar_caso",
                arguments: JSON.stringify({
                  motivo_escalamiento:
                    "El monto supera el límite de autorización de $10,000 MXN.",
                  expediente:
                    "Se solicitaron 100 unidades por un total de $45,000 MXN.",
                }),
              },
            },
          ],
        },
        content: "Supera el límite de autorización, escalando a supervisor.",
        toolCalls: [
          {
            id: "call_escalate_1",
            type: "function",
            function: {
              name: "escalar_caso",
              arguments: JSON.stringify({
                motivo_escalamiento:
                  "El monto supera el límite de autorización de $10,000 MXN.",
                expediente:
                  "Se solicitaron 100 unidades por un total de $45,000 MXN.",
              }),
            },
          },
        ],
        model: "fake-grok",
        finishReason: "tool_calls",
        usage: {
          promptTokens: 60,
          completionTokens: 25,
          cachedTokens: 0,
          totalTokens: 85,
        },
        latencyMs: 12,
        cost: "0.000120",
      };
    };

    const report = await runAgentLoop("case_test_escalate", {
      client: mockClient,
      maxSteps: 5,
    });

    expect(report.status).toBe("escalado");
    expect(report.reason).toContain("supera el límite");
  });

  afterAll(async () => {
    const { pool } = await import("../src/db/client");
    await pool.end();
  });
});
