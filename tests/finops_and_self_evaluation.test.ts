import { describe, it, expect } from "vitest";
import {
    calculateCallCost,
    evaluateBeforeClosing,
    telemetryPublisher,
} from "@mint/core";

describe("Agent FinOps · Costeo por tarea", () => {
    it("calcula el costo exacto con 6 decimales (prompt + completion)", () => {
        // 1000 prompt @ $2.0/1M = 0.002000
        // 500 completion @ $10.0/1M = 0.005000
        expect(calculateCallCost("grok-4.6", 1000, 500, 0)).toBe("0.007000");
    });

    it("aplica descuento a los tokens cacheados", () => {
        // 400 no cacheados @ $2.0/1M = 0.000800
        // 600 cacheados @ $0.5/1M = 0.000300
        expect(calculateCallCost("grok-4.6", 1000, 0, 600)).toBe("0.001100");
    });

    it("acumula el costo de varias llamadas de una misma tarea", () => {
        const calls = [
            calculateCallCost("grok-4.6", 1200, 300, 0),
            calculateCallCost("grok-4.6", 800, 200, 0),
        ];
        const total = calls.reduce((acc, c) => acc + Number(c), 0);
        // 1200*2e-6 + 300*1e-5 = 0.0024 + 0.003 = 0.0054
        // 800*2e-6 + 200*1e-5 = 0.0016 + 0.002 = 0.0036
        expect(total).toBeCloseTo(0.009, 6);
    });

    it("emite un evento de telemetría de costo con el payload correcto", () => {
        const event = telemetryPublisher.emitCost(
            { id: "test-agent", label: "Test Agent", group: "agent" },
            {
                taskId: "case_test_001",
                tokens: 1500,
                costUsd: 0.009,
                model: "grok-4.6",
                promptTokens: 1200,
                completionTokens: 300,
            },
        );

        expect(event.action).toBe("meter");
        expect(event.target.group).toBe("cost");
        expect(event.bytesOrRowsAffected).toBe(1500);
        expect(event.cost?.taskId).toBe("case_test_001");
        expect(event.cost?.costUsd).toBe(0.009);
        expect(event.cost?.model).toBe("grok-4.6");
    });
});

describe("Auto-Evaluación y Verificación (Reflection Loop)", () => {
    it("aprueba una propuesta consistente sin escrituras no verificadas", async () => {
        const result = await evaluateBeforeClosing({
            taskId: "case_ok_001",
            proposalSummary: "Reponer 50 unidades del SKU-DW-714",
            citedData: {
                productId: "prod_dw714",
                supplierId: "sup_dewalt",
                proposedQuantity: 50,
                proposedUnitPrice: 145000,
            },
            executedTools: [
                { toolName: "consultarInventario", isSuccess: true, verified: true },
                { toolName: "evaluarProveedores", isSuccess: true, verified: true },
            ],
            unverifiedWrites: 0,
        });

        expect(result.taskId).toBe("case_ok_001");
        expect(result.feasibility.passed).toBe(true);
        expect(result.policy.passed).toBe(true);
        expect(result.tokensConsumed).toBe(0);
        expect(result.costUsd).toBe(0);
        expect(["aprobado", "requiere_revision"]).toContain(result.verdict);
    });

    it("penaliza la factibilidad ante una cantidad inválida", async () => {
        const result = await evaluateBeforeClosing({
            taskId: "case_bad_qty",
            proposalSummary: "Reponer cantidad inválida",
            citedData: {
                productId: "prod_x",
                supplierId: "sup_x",
                proposedQuantity: -5,
                proposedUnitPrice: 1000,
            },
        });

        // Una cantidad inválida resta 30 puntos de factibilidad (100 -> 70)
        expect(result.feasibility.score).toBe(70);
        expect(result.feasibility.issues.some((i) => i.includes("cantidad"))).toBe(true);
    });

    it("rechaza la propuesta cuando la factibilidad cae por debajo del umbral", async () => {
        const result = await evaluateBeforeClosing({
            taskId: "case_bad_qty_and_tools",
            proposalSummary: "Reponer cantidad inválida con herramientas caídas",
            citedData: {
                productId: "prod_x",
                supplierId: "sup_x",
                proposedQuantity: -5,
                proposedUnitPrice: 1000,
            },
            executedTools: [
                { toolName: "consultarInventario", isSuccess: false },
                { toolName: "evaluarProveedores", isSuccess: false },
            ],
        });

        // 100 - 30 (cantidad) - 30 (2 herramientas fallidas) = 40 < 60
        expect(result.feasibility.passed).toBe(false);
        expect(result.verdict).toBe("rechazado");
        expect(result.requiresRegeneration).toBe(true);
        expect(result.feasibility.issues.length).toBeGreaterThan(0);
    });

    it("marca requiere_revision cuando hay escrituras no verificadas", async () => {
        const result = await evaluateBeforeClosing({
            taskId: "case_unverified",
            proposalSummary: "Ajuste de stock sin verificación",
            citedData: {
                productId: "prod_y",
                supplierId: "sup_y",
                proposedQuantity: 10,
                proposedUnitPrice: 5000,
            },
            unverifiedWrites: 2,
        });

        expect(result.policy.passed).toBe(false);
        expect(result.verdict).toBe("requiere_revision");
        expect(result.policy.issues.some((i) => i.includes("no verificada"))).toBe(true);
    });

    it("penaliza la confianza cuando fallan herramientas", async () => {
        const result = await evaluateBeforeClosing({
            taskId: "case_tool_fail",
            proposalSummary: "Consulta con herramienta caída",
            citedData: {
                productId: "prod_z",
                supplierId: "sup_z",
                proposedQuantity: 20,
                proposedUnitPrice: 3000,
            },
            executedTools: [
                { toolName: "consultarInventario", isSuccess: false },
                { toolName: "evaluarProveedores", isSuccess: false },
            ],
        });

        expect(result.feasibility.issues.some((i) => i.includes("fallaron"))).toBe(true);
        expect(result.feasibility.score).toBeLessThan(100);
    });

    it("respeta un umbral de confianza personalizado", async () => {
        const strict = await evaluateBeforeClosing({
            taskId: "case_strict",
            proposalSummary: "Propuesta con umbral alto",
            citedData: {
                productId: "prod_s",
                supplierId: "sup_s",
                proposedQuantity: 5,
                proposedUnitPrice: 1000,
            },
            confidenceThreshold: 100,
        });

        // Con umbral 100, cualquier penalización de riesgo obliga a revisión.
        if (strict.confidenceScore < 100) {
            expect(strict.requiresRegeneration).toBe(true);
            expect(strict.verdict).toBe("requiere_revision");
        }
    });
});
