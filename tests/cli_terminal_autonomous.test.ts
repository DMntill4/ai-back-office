import { describe, it, expect, beforeAll } from "vitest";
import { theme } from "../packages/cli/src/ui/theme";
import { drawCard, drawDivider } from "../packages/cli/src/ui/box";
import { renderTable } from "../packages/cli/src/ui/table";
import { explainCommand } from "../packages/cli/src/commands/explain";
import { dashboardCommand } from "../packages/cli/src/commands/dashboard";
import { simulateCommand } from "../packages/cli/src/commands/simulate";
import { db, companies, users, products, suppliers, supplierProducts, inventory, warehouses, cases, decisions } from "@mint/core";
import { eq } from "drizzle-orm";

describe("Mejoras de Experiencia en Terminal y Coordinador Autónomo (CLI TUI & Agent Upgrades)", () => {
  const companyId = "comp_terminal_test";
  const userId = "usr_term_01";
  const prodId = "prod_term_valve";
  const suppId = "supp_term_01";
  const caseId = "case_term_01";
  const decisionId = "dec_term_explain_01";

  beforeAll(async () => {
    // Fixtures para pruebas de UI y Explain
    await db.insert(companies).values({
      id: companyId,
      name: "Terminal Logistics Corp",
    }).onConflictDoNothing();

    await db.insert(users).values({
      id: userId,
      companyId,
      email: "operator@terminallogistics.com",
      passwordHash: "dummy",
      name: "Operator Terminal",
      role: "owner",
    }).onConflictDoNothing();

    await db.insert(warehouses).values({
      id: "alm_central",
      companyId,
      name: "Almacén Central Test",
      location: "Principal",
    }).onConflictDoNothing();

    await db.insert(suppliers).values({
      id: suppId,
      companyId,
      name: "Terminal Fast Supplies SA",
      origin: "real",
    }).onConflictDoNothing();

    await db.insert(products).values({
      id: prodId,
      companyId,
      name: "Válvula de Presión Terminal Ultra",
      sku: `SKU-TERM-${Date.now()}`,
      minStock: 20,
      origin: "real",
    }).onConflictDoNothing();

    await db.insert(supplierProducts).values({
      id: `sp_term_${Date.now()}`,
      companyId,
      supplierId: suppId,
      productId: prodId,
      unitPrice: "120.00",
      minOrderQuantity: 10,
      leadTimeDays: 2,
    }).onConflictDoNothing();

    await db.insert(inventory).values({
      id: `inv_term_${Date.now()}`,
      companyId,
      productId: prodId,
      warehouseId: "alm_central",
      stock: 5,
    }).onConflictDoNothing();

    await db.insert(cases).values({
      id: caseId,
      companyId,
      title: "Desabasto Crítico Detectado por Daemon",
      description: "Stock cayó a 5 unidades; mínimo requerido es 20",
      status: "en_proceso",
      priority: "urgente",
    }).onConflictDoNothing();

    await db.insert(decisions).values({
      id: decisionId,
      companyId,
      caseId,
      actionType: "crear_orden_compra",
      proposingAgent: "compras_agent",
      title: "Comprar 25 unidades de Válvula de Presión a Terminal Fast Supplies",
      costMxn: "3000.00",
      riskScore: "0.080",
      reversible: false,
      evidencePayload: {
        currentStock: 5,
        deficit: 15,
        supplierName: "Terminal Fast Supplies SA",
        unitCostMxn: 120,
      },
      riskPayload: {
        redFlags: [],
        confidence: 0.92,
      },
      policyDecision: "pending_approval",
      policyReason: "RULE_DRY_RUN_GUARDRAIL: Modo dry-run activo por defecto",
    }).onConflictDoNothing();
  });

  it("1. ANSI Theme y Helpers de Color calculan contrastes y badges correctamente", () => {
    const mintStr = theme.mint("Texto Verde Mint");
    expect(mintStr).toContain("Texto Verde Mint");

    const badge = theme.badge("ONLINE", "mint");
    expect(badge).toContain("ONLINE");

    const raw = "\x1b[38;2;16;185;129mTexto\x1b[39m";
    expect(theme.stripAnsi(raw)).toBe("Texto");
  });

  it("2. Unicode Card Renderer (drawCard) y Divider dibujan marcos redondeados consistentes", () => {
    const card = drawCard(
      [
        "Línea 1: Estado del Sistema",
        "Línea 2: Autonomía Asistida",
      ],
      {
        title: "PANEL PRINCIPAL",
        badge: "ACTIVO",
        badgeColor: "mint",
      },
    );

    expect(card).toContain("╭");
    expect(card).toContain("PANEL PRINCIPAL");
    expect(card).toContain("ACTIVO");
    expect(card).toContain("Línea 1: Estado del Sistema");
    expect(card).toContain("╰");

    const divider = drawDivider("METRICAS");
    expect(divider).toContain("METRICAS");
  });

  it("3. Unicode Table Renderer (renderTable) alinea columnas dinámicas y bordes", () => {
    const table = renderTable(
      [
        { header: "SKU", key: "sku", width: 12 },
        { header: "PRODUCTO", key: "name", width: 20 },
        { header: "STOCK", key: "stock", width: 8, align: "right" },
      ],
      [
        { sku: "SKU-001", name: "Filtro Hidráulico", stock: "15u" },
        { sku: "SKU-002", name: "Bomba Sumergible", stock: "3u" },
      ],
    );

    expect(table).toContain("┌");
    expect(table).toContain("SKU");
    expect(table).toContain("PRODUCTO");
    expect(table).toContain("Filtro Hidráulico");
    expect(table).toContain("└");
  });

  it("4. mint explain <id> extrae la deliberación multi-agente, evidencia y regla determinista en JSON", async () => {
    let capturedJson: any = null;
    const originalLog = console.log;
    console.log = (msg: string) => {
      try {
        capturedJson = JSON.parse(msg);
      } catch {
        // ignore non-json
      }
    };

    try {
      await explainCommand(decisionId, { json: true });
    } finally {
      console.log = originalLog;
    }

    expect(capturedJson).not.toBeNull();
    expect(capturedJson.decision.id).toBe(decisionId);
    expect(capturedJson.decision.proposingAgent).toBe("compras_agent");
    expect(capturedJson.decision.policyDecision).toBe("pending_approval");
    expect(capturedJson.decision.evidencePayload.supplierName).toBe("Terminal Fast Supplies SA");
  });

  it("5. mint dashboard reporta métricas de inventario, casos y canales en JSON", async () => {
    let capturedJson: any = null;
    const originalLog = console.log;
    console.log = (msg: string) => {
      try {
        capturedJson = JSON.parse(msg);
      } catch {
        // ignore non-json
      }
    };

    try {
      await dashboardCommand({ json: true, companyId });
    } finally {
      console.log = originalLog;
    }

    expect(capturedJson).not.toBeNull();
    expect(capturedJson.inventory).toBeDefined();
    expect(capturedJson.inventory.totalProducts).toBeGreaterThanOrEqual(1);
    expect(capturedJson.cases).toBeDefined();
    expect(capturedJson.decisions).toBeDefined();
  });

  it("6. mint simulate ejecuta el bucle de deliberación multi-agente en sandbox y emite propuesta", async () => {
    let capturedJson: any = null;
    const originalLog = console.log;
    console.log = (msg: string) => {
      try {
        capturedJson = JSON.parse(msg);
      } catch {
        // ignore non-json
      }
    };

    try {
      await simulateCommand("stockout", { json: true, companyId });
    } finally {
      console.log = originalLog;
    }

    expect(capturedJson).not.toBeNull();
    expect(capturedJson.success).toBe(true);
    expect(capturedJson.proposal).toBeDefined();
    expect(capturedJson.proposal.actionType).toBe("crear_orden_compra");
    expect(capturedJson.policyResult.policyDecision).toBe("pending_approval");
  });
});
