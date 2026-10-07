import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { runAgentLoop } from "../src/agent/loop";
import { FakeGrokClient } from "../src/llm/fake";

describe("Escenarios de Negocio y Pruebas Automáticas con LLM Falso", () => {
  let mockClient: FakeGrokClient;

  beforeEach(() => {
    mockClient = new FakeGrokClient();
  });

  /**
   * ESCENARIO 1: Faltante de stock resuelto con compra exitosa dentro del límite monetario
   * - Caso: Faltan sensores térmicos (prod_st200).
   * - El agente consulta stock -> ve faltante -> crea orden por 8 unidades ($3,600 MXN, menor a $10,000) -> resuelve.
   */
  it("Escenario 1: debe abastecer stock faltante y resolver cuando la compra está dentro del presupuesto permitido", async () => {
    let turn = 0;
    mockClient.chatCompletion = async () => {
      turn++;
      // Turno 1: Consultar stock
      if (turn === 1) {
        return {
          message: {
            role: "assistant",
            content: "Consultando stock actual de prod_st200.",
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
          content: "Consultando stock actual de prod_st200.",
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

      // Turno 2: Crear orden de compra por 8 unidades
      if (turn === 2) {
        return {
          message: {
            role: "assistant",
            content: "Stock bajo confirmado (2 de 10). Creando orden de compra por 8 unidades.",
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
                    cantidad: 8, // 8 * $450 = $3,600 MXN (Permitido < $10,000)
                    idempotency_key: "idem_escenario1_compra_8",
                  }),
                },
              },
            ],
          },
          content: "Stock bajo confirmado. Creando orden de compra por 8 unidades.",
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

      // Turno 3: Resolver caso
      return {
        message: {
          role: "assistant",
          content: "Orden creada y verificada exitosamente. Procedo a resolver el caso.",
          refusal: null,
          tool_calls: [
            {
              id: "call_resolve_1",
              type: "function",
              function: {
                name: "resolver_caso",
                arguments: JSON.stringify({
                  resumen_resolucion: "Se generó orden de compra por 8 unidades de prod_st200 ($3,600 MXN).",
                  justificacion: "El stock estaba por debajo del mínimo y la compra fue verificada.",
                }),
              },
            },
          ],
        },
        content: "Orden creada y verificada exitosamente. Procedo a resolver el caso.",
        toolCalls: [
          {
            id: "call_resolve_1",
            type: "function",
            function: {
              name: "resolver_caso",
              arguments: JSON.stringify({
                resumen_resolucion: "Se generó orden de compra por 8 unidades de prod_st200 ($3,600 MXN).",
                justificacion: "El stock estaba por debajo del mínimo y la compra fue verificada.",
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
    expect(report.summary).toContain("Se generó orden de compra");
    expect(report.totalSteps).toBe(3);
    expect(report.totalTokens).toBe(210);
  });

  /**
   * ESCENARIO 2: Intento de compra repetida (Garantía de Idempotencia)
   * - Caso: Se recibe solicitud con clave de idempotencia existente.
   * - La herramienta devuelve la orden existente sin crear una nueva ni duplicar cobros.
   */
  it("Escenario 2: debe garantizar idempotencia y no duplicar órdenes ante claves repetidas", async () => {
    let turn = 0;
    mockClient.chatCompletion = async () => {
      turn++;
      if (turn === 1) {
        return {
          message: {
            role: "assistant",
            content: "Procesando orden con clave de idempotencia ya registrada.",
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
                    idempotency_key: "idem_escenario1_compra_8", // Mismo idempotency_key
                  }),
                },
              },
            ],
          },
          content: "Procesando orden con clave repetida.",
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
          content: "La orden ya existía, caso resuelto por idempotencia.",
          refusal: null,
          tool_calls: [
            {
              id: "call_resolve_dup",
              type: "function",
              function: {
                name: "resolver_caso",
                arguments: JSON.stringify({
                  resumen_resolucion: "Orden previamente existente reconocida sin duplicar.",
                  justificacion: "Idempotencia confirmada por el servicio.",
                }),
              },
            },
          ],
        },
        content: "La orden ya existía, caso resuelto por idempotencia.",
        toolCalls: [
          {
            id: "call_resolve_dup",
            type: "function",
            function: {
              name: "resolver_caso",
              arguments: JSON.stringify({
                resumen_resolucion: "Orden previamente existente reconocida sin duplicar.",
                justificacion: "Idempotencia confirmada por el servicio.",
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
    expect(report.summary).toContain("previamente existente");
  });

  /**
   * ESCENARIO 3: Producto inexistente o información corrupta (Regla: no inventar datos, escalar)
   * - Caso: Se recibe un ticket solicitando "prod_fantasma_999".
   * - El agente consulta stock -> no existe -> escala inmediatamente a persona.
   */
  it("Escenario 3: ante productos inexistentes o falta de información, el agente debe escalar y no inventar datos", async () => {
    let turn = 0;
    mockClient.chatCompletion = async () => {
      turn++;
      if (turn === 1) {
        return {
          message: {
            role: "assistant",
            content: "Consultando producto prod_fantasma_999.",
            refusal: null,
            tool_calls: [
              {
                id: "call_stock_inexistente",
                type: "function",
                function: {
                  name: "consultar_stock",
                  arguments: JSON.stringify({ producto_id: "prod_fantasma_999" }),
                },
              },
            ],
          },
          content: "Consultando producto prod_fantasma_999.",
          toolCalls: [
            {
              id: "call_stock_inexistente",
              type: "function",
              function: {
                name: "consultar_stock",
                arguments: JSON.stringify({ producto_id: "prod_fantasma_999" }),
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

      // Turno 2: El agente nota que no existe y escala
      return {
        message: {
          role: "assistant",
          content: "El producto no existe en el catálogo. Escalando a operaciones.",
          refusal: null,
          tool_calls: [
            {
              id: "call_escalate_inexistente",
              type: "function",
              function: {
                name: "escalar_caso",
                arguments: JSON.stringify({
                  motivo_escalamiento: "Producto prod_fantasma_999 no registrado en catálogo",
                  expediente: "Se consultó la base de datos y no arrojó resultados. Se requiere verificación humana.",
                }),
              },
            },
          ],
        },
        content: "El producto no existe en el catálogo. Escalando a operaciones.",
        toolCalls: [
          {
            id: "call_escalate_inexistente",
            type: "function",
            function: {
              name: "escalar_caso",
              arguments: JSON.stringify({
                motivo_escalamiento: "Producto prod_fantasma_999 no registrado en catálogo",
                expediente: "Se consultó la base de datos y no arrojó resultados. Se requiere verificación humana.",
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
    expect(report.reason).toContain("no registrado en catálogo");
  });

  afterAll(async () => {
    const { pool } = await import("../src/db/client");
    await pool.end();
  });
});
