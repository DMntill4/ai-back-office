import { describe, it, expect } from "vitest";
import {
  cases,
  caseEvents,
  llmCalls,
  toolCalls,
  idempotencyKeys,
  approvals,
} from "@mint/core";
import { getTableName } from "drizzle-orm";

describe("Esquemas de las tablas del Agente", () => {
  it("debe contener las 6 tablas requeridas por CONTEXT.md", () => {
    expect(getTableName(cases)).toBe("cases");
    expect(getTableName(caseEvents)).toBe("case_events");
    expect(getTableName(llmCalls)).toBe("llm_calls");
    expect(getTableName(toolCalls)).toBe("tool_calls");
    expect(getTableName(idempotencyKeys)).toBe("idempotency_keys");
    expect(getTableName(approvals)).toBe("approvals");
  });

  it("la tabla cases debe tener los campos clave definidos", () => {
    expect(cases.id).toBeDefined();
    expect(cases.title).toBeDefined();
    expect(cases.description).toBeDefined();
    expect(cases.status).toBeDefined();
    expect(cases.priority).toBeDefined();
    expect(cases.inputData).toBeDefined();
    expect(cases.totalCost).toBeDefined();
  });

  it("la tabla llm_calls debe registrar tokens, costo y latencia", () => {
    expect(llmCalls.promptTokens).toBeDefined();
    expect(llmCalls.completionTokens).toBeDefined();
    expect(llmCalls.cost).toBeDefined();
    expect(llmCalls.latencyMs).toBeDefined();
  });
});
