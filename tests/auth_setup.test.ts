import { describe, it, expect } from "vitest";
import {
  ROLE_PERMISSIONS,
  registerUser,
  loginUser,
  saveBotSetupConfig,
  getTemplateSql,
  executeSqlUpload,
} from "../packages/core/src/services/authAndSetupService";
import { getStockByProduct } from "../packages/core/src/services/inventoryService";

describe("Autenticación, Roles y Flujo de Setup Step-by-Step", () => {
  it("debe definir adecuadamente los 4 roles canónicos con sus permisos de gobernanza", () => {
    expect(ROLE_PERMISSIONS.owner.canConfigureBot).toBe(true);
    expect(ROLE_PERMISSIONS.owner.canUploadSql).toBe(true);
    expect(ROLE_PERMISSIONS.owner.canApprovePurchases).toBe(true);

    expect(ROLE_PERMISSIONS.operator.canConfigureBot).toBe(false);
    expect(ROLE_PERMISSIONS.operator.canUploadSql).toBe(false);
    expect(ROLE_PERMISSIONS.operator.canExecutePurchases).toBe(true);

    expect(ROLE_PERMISSIONS.auditor.canApprovePurchases).toBe(true);
    expect(ROLE_PERMISSIONS.auditor.canExecutePurchases).toBe(false);

    expect(ROLE_PERMISSIONS.viewer.canExecutePurchases).toBe(false);
    expect(ROLE_PERMISSIONS.viewer.canViewDashboard).toBe(true);
  });

  it("debe registrar una empresa y usuario nuevo con setup_completed en false", async () => {
    const testEmail = `test_${Date.now()}@acme-corp.com`;
    const regResult = await registerUser({
      name: "Carlos Méndez",
      email: testEmail,
      companyName: "Acme Industrial S.A.",
      role: "owner",
    });

    expect(regResult.success).toBe(true);
    expect(regResult.user).toBeDefined();
    expect(regResult.user?.name).toBe("Carlos Méndez");
    expect(regResult.user?.companyName).toBe("Acme Industrial S.A.");
    expect(regResult.user?.role).toBe("owner");
    expect(regResult.user?.setupCompleted).toBe(false);

    // Iniciar sesión con el usuario recién registrado
    const loginResult = await loginUser({ email: testEmail });
    expect(loginResult.success).toBe(true);
    expect(loginResult.user?.email).toBe(testEmail);
  });

  it("debe guardar la personalización del bot y directivas en Step 1 y Step 2", async () => {
    const testEmail = `setup_test_${Date.now()}@logistics.com`;
    const reg = await registerUser({
      name: "Laura Gómez",
      email: testEmail,
      companyName: "Logistics Pro MX",
      role: "owner",
    });

    const companyId = reg.user!.companyId;

    const setupResult = await saveBotSetupConfig({
      companyId,
      botName: "MINT Logístico",
      botTone: "tecnico",
      botCustomRules: "Priorizar proveedores con entrega menor a 48h y verificar siempre FEFO.",
      approvalLimitAmount: 15000,
      currency: "MXN",
    });

    expect(setupResult.success).toBe(true);
    expect(setupResult.config?.botName).toBe("MINT Logístico");
    expect(setupResult.config?.botTone).toBe("tecnico");
    expect(setupResult.config?.approvalLimitAmount).toBe(15000);
    expect(setupResult.config?.currency).toBe("MXN");
  });

  it("debe proveer un template SQL funcional adaptado a la empresa", () => {
    const sql = getTemplateSql("comp_test123");
    expect(sql).toContain("INSERT INTO products");
    expect(sql).toContain("origin");
    expect(sql).toContain("'real'");
    expect(sql).toContain("comp_test123");
  });

  it("debe procesar el archivo SQL en el Step 3, aislarlo por empresa e insertar productos con origin = 'real'", async () => {
    const testEmail = `sql_test_${Date.now()}@industrial.com`;
    const reg = await registerUser({
      name: "Roberto Vega",
      email: testEmail,
      companyName: "Manufacturas Vega",
      role: "owner",
    });

    const companyId = reg.user!.companyId;
    const testSku = `SKU-TEST-${Date.now().toString().slice(-6)}`;
    const testProdId = `prod_real_${Date.now().toString().slice(-6)}`;

    const customSql = `
      INSERT INTO products (id, company_id, name, description, sku, min_stock, origin)
      VALUES ('${testProdId}', '${companyId}', 'Turbina de Enfriamiento TE-10', 'Turbina trifásica para hornos', '${testSku}', 10, 'real')
      ON CONFLICT DO NOTHING;

      INSERT INTO inventory (id, company_id, product_id, warehouse_id, stock)
      VALUES ('inv_${Date.now().toString().slice(-6)}', '${companyId}', '${testProdId}', 'alm_central', 45)
      ON CONFLICT DO NOTHING;
    `;

    const uploadResult = await executeSqlUpload({
      companyId,
      sqlContent: customSql,
    });

    expect(uploadResult.success).toBe(true);
    expect(uploadResult.totalStatementsExecuted).toBeGreaterThan(0);
    expect(uploadResult.realProductsInserted).toBeGreaterThanOrEqual(1);

    // Consultar el stock del producto real insertado
    const stock = await getStockByProduct(testProdId);
    expect(stock).toBeDefined();
    if (stock && !('isFuzzyMatch' in stock)) {
      expect(stock.productName).toBe("Turbina de Enfriamiento TE-10");
      expect(stock.origin).toBe("real");
      expect(stock.currentStock).toBe(45);
    }
  });
});
