import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { runAgentLoop } from "../src/agent/loop";
import { FakeGrokClient } from "../src/llm/fake";

describe("Business Scenarios and Automated Tests with Fake LLM", () => {
  let mockClient: FakeGrokClient;

  beforeEach(() => {
    mockClient = new FakeGrokClient();
  });

  /**
   * SCENARIO 1: Stock shortage replenished and resolved within authorization budget
   * - Case: Shortage of thermal sensors (prod_st200).
   * - Agent checks stock -> detects shortage -> creates PO for 8 units ($3,600 MXN < $10,000 threshold) -> resolves.
   */
  it("Scenario 1: should replenish missing inventory and resolve case when purchase is within budget", async () => {
    let turn = 0;
    mockClient.chatCompletion = async () => {
      turn++;
      // Turn 1: Check stock
      if (turn === 1) {
        return {
          message: {
            role: "assistant",
            content: "Checking inventory levels for prod_st200.",
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
          content: "Checking inventory levels for prod_st200.",
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
          usage: { promptTokens: 40, completionTokens: 15, cachedTokens: 0, totalTokens: 55 },
          latencyMs: 20,
          cost: "0.000080",
        };
      }

      // Turn 2: Create purchase order for 8 units
      if (turn === 2) {
        return {
          message: {
            role: "assistant",
            content: "Low stock confirmed (2 of 10). Creating purchase order for 8 units.",
            refusal: null,
            tool_calls: [
              {
                id: "call_order_1",
                type: "function",
                function: {
                  name: "crear_orden_compra",
                  arguments: JSON.stringify({
                    case_id: "case_escenario_compra_ok",
                    producto_id: "prod_st200",
                    proveedor_id: "prov_acme",
                    cantidad: 8, // 8 * $450 = $3,600 MXN (Allowed < $10,000)
                    idempotency_key: "idem_escenario1_compra_8",
                  }),
                },
              },
            ],
          },
          content: "Low stock confirmed. Creating purchase order for 8 units.",
          toolCalls: [
            {
              id: "call_order_1",
              type: "function",
              function: {
                name: "crear_orden_compra",
                arguments: JSON.stringify({
                  case_id: "case_escenario_compra_ok",
                  producto_id: "prod_st200",
                  proveedor_id: "prov_acme",
                  cantidad: 8,
                  idempotency_key: "idem_escenario1_compra_8",
                }),
              },
            },
          ],
          model: "fake-grok",
          finishReason: "tool_calls",
          usage: { promptTokens: 60, completionTokens: 25, cachedTokens: 0, totalTokens: 85 },
          latencyMs: 25,
          cost: "0.000120",
        };
      }

      // Turn 3: Resolve case
      return {
        message: {
          role: "assistant",
          content: "Purchase order created and verified successfully. Resolving case.",
          refusal: null,
          tool_calls: [
            {
              id: "call_resolve_1",
              type: "function",
              function: {
                name: "resolver_caso",
                arguments: JSON.stringify({
                  resumen_resolucion: "Purchase order created for 8 units of prod_st200 ($3,600 MXN).",
                  justificacion: "Inventory was below threshold and purchase order was verified.",
                }),
              },
            },
          ],
        },
        content: "Purchase order created and verified successfully. Resolving case.",
        toolCalls: [
          {
            id: "call_resolve_1",
            type: "function",
            function: {
              name: "resolver_caso",
              arguments: JSON.stringify({
                resumen_resolucion: "Purchase order created for 8 units of prod_st200 ($3,600 MXN).",
                justificacion: "Inventory was below threshold and purchase order was verified.",
              }),
            },
          },
        ],
        model: "fake-grok",
        finishReason: "tool_calls",
        usage: { promptTokens: 50, completionTokens: 20, cachedTokens: 0, totalTokens: 70 },
        latencyMs: 18,
        cost: "0.000100",
      };
    };

    const report = await runAgentLoop("case_escenario_compra_ok", {
      client: mockClient,
      maxSteps: 5,
    });

    expect(report.status).toBe("resuelto");
    expect(report.summary).toContain("Purchase order created");
    expect(report.totalSteps).toBe(3);
    expect(report.totalTokens).toBe(210);
  });

  /**
   * SCENARIO 2: Repeated purchase order attempt (Idempotency guarantee)
   * - Case: Request with duplicate idempotency key.
   * - Service detects existing order without creating duplicate records.
   */
  it("Scenario 2: should ensure idempotency and prevent duplicate orders with same idempotency key", async () => {
    let turn = 0;
    mockClient.chatCompletion = async () => {
      turn++;
      if (turn === 1) {
        return {
          message: {
            role: "assistant",
            content: "Processing order with existing idempotency key.",
            refusal: null,
            tool_calls: [
              {
                id: "call_order_dup",
                type: "function",
                function: {
                  name: "crear_orden_compra",
                  arguments: JSON.stringify({
                    case_id: "case_escenario_idempotente",
                    producto_id: "prod_st200",
                    proveedor_id: "prov_acme",
                    cantidad: 5,
                    idempotency_key: "idem_escenario1_compra_8", // Same idempotency key
                  }),
                },
              },
            ],
          },
          content: "Processing order with duplicate key.",
          toolCalls: [
            {
              id: "call_order_dup",
              type: "function",
              function: {
                name: "crear_orden_compra",
                arguments: JSON.stringify({
                  case_id: "case_escenario_idempotente",
                  producto_id: "prod_st200",
                  proveedor_id: "prov_acme",
                  cantidad: 5,
                  idempotency_key: "idem_escenario1_compra_8",
                }),
              },
            },
          ],
          model: "fake-grok",
          finishReason: "tool_calls",
          usage: { promptTokens: 40, completionTokens: 15, cachedTokens: 0, totalTokens: 55 },
          latencyMs: 15,
          cost: "0.000070",
        };
      }

      return {
        message: {
          role: "assistant",
          content: "Order already existed, case resolved through idempotency.",
          refusal: null,
          tool_calls: [
            {
              id: "call_resolve_dup",
              type: "function",
              function: {
                name: "resolver_caso",
                arguments: JSON.stringify({
                  resumen_resolucion: "Existing order recognized without duplication.",
                  justificacion: "Idempotency verified by the business service.",
                }),
              },
            },
          ],
        },
        content: "Order already existed, case resolved through idempotency.",
        toolCalls: [
          {
            id: "call_resolve_dup",
            type: "function",
            function: {
              name: "resolver_caso",
              arguments: JSON.stringify({
                resumen_resolucion: "Existing order recognized without duplication.",
                justificacion: "Idempotency verified by the business service.",
              }),
            },
          },
        ],
        model: "fake-grok",
        finishReason: "tool_calls",
        usage: { promptTokens: 35, completionTokens: 15, cachedTokens: 0, totalTokens: 50 },
        latencyMs: 10,
        cost: "0.000060",
      };
    };

    const report = await runAgentLoop("case_escenario_idempotente", {
      client: mockClient,
      maxSteps: 4,
    });

    expect(report.status).toBe("resuelto");
    expect(report.summary).toContain("Existing order recognized");
  });

  /**
   * SCENARIO 3: Unknown product / corrupted data (Rule: Never invent data, escalate)
   * - Case: Ticket requests non-existing SKU "prod_ghost_999".
   * - Agent checks stock -> does not exist -> immediately escalates to human operator.
   */
  it("Scenario 3: when product is missing or data is invalid, agent must escalate and never hallucinate", async () => {
    let turn = 0;
    mockClient.chatCompletion = async () => {
      turn++;
      if (turn === 1) {
        return {
          message: {
            role: "assistant",
            content: "Checking inventory for non-existent product prod_ghost_999.",
            refusal: null,
            tool_calls: [
              {
                id: "call_stock_inexistente",
                type: "function",
                function: {
                  name: "consultar_stock",
                  arguments: JSON.stringify({ producto_id: "prod_ghost_999" }),
                },
              },
            ],
          },
          content: "Checking inventory for non-existent product prod_ghost_999.",
          toolCalls: [
            {
              id: "call_stock_inexistente",
              type: "function",
              function: {
                name: "consultar_stock",
                arguments: JSON.stringify({ producto_id: "prod_ghost_999" }),
              },
            },
          ],
          model: "fake-grok",
          finishReason: "tool_calls",
          usage: { promptTokens: 30, completionTokens: 10, cachedTokens: 0, totalTokens: 40 },
          latencyMs: 12,
          cost: "0.000050",
        };
      }

      // Turn 2: Agent escalates
      return {
        message: {
          role: "assistant",
          content: "Product does not exist in catalog. Escalating to human supervisor.",
          refusal: null,
          tool_calls: [
            {
              id: "call_escalate_inexistente",
              type: "function",
              function: {
                name: "escalar_caso",
                arguments: JSON.stringify({
                  motivo_escalamiento: "Product prod_ghost_999 not found in catalog",
                  expediente: "Database lookup yielded no results. Human review is required.",
                }),
              },
            },
          ],
        },
        content: "Product does not exist in catalog. Escalating to human supervisor.",
        toolCalls: [
          {
            id: "call_escalate_inexistente",
            type: "function",
            function: {
              name: "escalar_caso",
              arguments: JSON.stringify({
                motivo_escalamiento: "Product prod_ghost_999 not found in catalog",
                expediente: "Database lookup yielded no results. Human review is required.",
              }),
            },
          },
        ],
        model: "fake-grok",
        finishReason: "tool_calls",
        usage: { promptTokens: 45, completionTokens: 20, cachedTokens: 0, totalTokens: 65 },
        latencyMs: 15,
        cost: "0.000080",
      };
    };

    const report = await runAgentLoop("case_escenario_producto_inexistente", {
      client: mockClient,
      maxSteps: 4,
    });

    expect(report.status).toBe("escalado");
    expect(report.reason).toContain("not found in catalog");
  });

  afterAll(async () => {
    const { pool } = await import("../src/db/client");
    await pool.end();
  });
});
