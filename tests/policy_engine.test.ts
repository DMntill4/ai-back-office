import { describe, it, expect } from "vitest";
import { evaluatePolicy, type ActionProposal } from "@mint/core";

describe("Motor de Políticas Determinista (Policy Engine Guardrails)", () => {
  const baseProposal: ActionProposal = {
    id: "prop_test_001",
    companyId: "comp_default",
    caseId: "case_001",
    actionType: "crear_orden_compra",
    title: "Compra de reposición de 50 válvulas",
    proposingAgent: "compras_agent",
    costMxn: 4500,
    reversible: true,
    confidence: 0.95,
    evidence: {
      productId: "prod_v500",
      productName: "Válvula V-500",
      currentStock: 5,
      deficit: 25,
      burnRate: 4,
      daysCoverage: 1.25,
      supplierId: "prov_acme",
      supplierName: "Acme Industrial",
      unitPrice: 90,
      quantity: 50,
    },
    riskAssessment: {
      riskScore: 0.1,
      redFlags: [],
      isDuplicate: false,
      supplierVerified: true,
      objections: ["Auditoría de duplicados superada"],
    },
  };

  it("debe autoejecutar si el monto está bajo el umbral, es reversible, bajo riesgo y alta confianza", () => {
    const evaluation = evaluatePolicy(baseProposal, { approvalLimitAmount: 10000 });

    expect(evaluation.policyDecision).toBe("auto_executed");
    expect(evaluation.requiresHitl).toBe(false);
    expect(evaluation.canExecuteNow).toBe(true);
    expect(evaluation.matchedRule).toBe("RULE_AUTONOMOUS_EXECUTION_ELIGIBLE");
  });

  it("debe escalar a la Bandeja de Decisiones (HITL) si el monto excede el umbral de autonomía", () => {
    const expensiveProposal = {
      ...baseProposal,
      costMxn: 18500,
    };

    const evaluation = evaluatePolicy(expensiveProposal, { approvalLimitAmount: 10000 });

    expect(evaluation.policyDecision).toBe("pending_approval");
    expect(evaluation.requiresHitl).toBe(true);
    expect(evaluation.canExecuteNow).toBe(false);
    expect(evaluation.matchedRule).toBe("RULE_EXCEEDS_AUTONOMOUS_BUDGET");
    expect(evaluation.reason).toContain("excede el umbral de autonomía");
  });

  it("debe BLOQUEAR de inmediato si se detecta una orden duplicada", () => {
    const duplicateProposal = {
      ...baseProposal,
      riskAssessment: {
        ...baseProposal.riskAssessment,
        isDuplicate: true,
      },
    };

    const evaluation = evaluatePolicy(duplicateProposal, { approvalLimitAmount: 10000 });

    expect(evaluation.policyDecision).toBe("blocked");
    expect(evaluation.requiresHitl).toBe(false);
    expect(evaluation.canExecuteNow).toBe(false);
    expect(evaluation.matchedRule).toBe("RULE_DUPLICATE_ORDER_PREVENTION");
  });

  it("debe BLOQUEAR si el proveedor no está homologado", () => {
    const unverifiedSupplierProposal = {
      ...baseProposal,
      riskAssessment: {
        ...baseProposal.riskAssessment,
        supplierVerified: false,
      },
    };

    const evaluation = evaluatePolicy(unverifiedSupplierProposal, { approvalLimitAmount: 10000 });

    expect(evaluation.policyDecision).toBe("blocked");
    expect(evaluation.matchedRule).toBe("RULE_UNVERIFIED_SUPPLIER");
  });

  it("debe BLOQUEAR si el score de riesgo del agente adversarial supera el 70%", () => {
    const highRiskProposal = {
      ...baseProposal,
      riskAssessment: {
        ...baseProposal.riskAssessment,
        riskScore: 0.85,
        redFlags: ["Sobrecosto atípico del +45%", "Proveedor con quejas de calidad"],
      },
    };

    const evaluation = evaluatePolicy(highRiskProposal, { approvalLimitAmount: 10000 });

    expect(evaluation.policyDecision).toBe("blocked");
    expect(evaluation.matchedRule).toBe("RULE_HIGH_RISK_REJECTION");
  });
});
