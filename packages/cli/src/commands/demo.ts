import {
  db,
  companies,
  products,
  inventory,
  warehouses,
  decisions,
  cases,
} from "@mint/core";
import { eq } from "drizzle-orm";
import { getSession, switchCompanySession } from "../keychain";
import { theme } from "../ui/theme";
import { drawDivider, drawCard } from "../ui/box";

export const DEMO_COMPANY_ID = "comp_demo_isolated";

export async function demoCommand(action?: string, options: { json?: boolean } = {}) {
  const session = await getSession();
  const sub = (action || "enter").toLowerCase();

  if (sub === "exit" || sub === "salir") {
    if (session?.companyId === DEMO_COMPANY_ID) {
      await switchCompanySession("comp_default", "Empresa Principal");
      console.log(theme.mintBold("\n[DEMO] Has salido del modo demo."));
      console.log(theme.dim("Sesión restaurada a la empresa de producción (comp_default).\n"));
    } else {
      console.log(theme.dim("\nNo estás en modo demo actualmente.\n"));
    }
    return;
  }

  // 1. Asegurar existencia de empresa aislada DEMO
  const existingComp = await db
    .select()
    .from(companies)
    .where(eq(companies.id, DEMO_COMPANY_ID))
    .limit(1);

  if (existingComp.length === 0) {
    await db.insert(companies).values({
      id: DEMO_COMPANY_ID,
      name: "Empresa Demo Aislada (Sandbox)",
      country: "Colombia",
      currency: "COP",
    });

    // Crear almacén DEMO
    await db.insert(warehouses).values({
      id: "wh_demo_01",
      companyId: DEMO_COMPANY_ID,
      name: "Almacén Central DEMO",
      city: "Bogotá",
      location: "Carrera 7 # 72-10",
      latitude: "4.6533",
      longitude: "-74.0583",
    });

    // Crear catálogo DEMO
    const demoItems = [
      { id: "demo_prod_01", sku: "DEMO-01", name: "Caja Cartón Reforzada (DEMO)", price: "4500", cost: "3200", stock: 12 },
      { id: "demo_prod_02", sku: "DEMO-02", name: "Cinta Adhesiva Industrial (DEMO)", price: "8900", cost: "6100", stock: 5 },
      { id: "demo_prod_03", sku: "DEMO-03", name: "Plástico Burbuja 50m (DEMO)", price: "24000", cost: "17500", stock: 80 },
    ];

    for (const item of demoItems) {
      await db.insert(products).values({
        id: item.id,
        companyId: DEMO_COMPANY_ID,
        sku: item.sku,
        name: item.name,
        price: item.price,
        costPrice: item.cost,
        minStock: 25,
        category: "Embalaje (DEMO)",
        origin: "simulado",
      });

      await db.insert(inventory).values({
        id: `inv_${item.id}`,
        companyId: DEMO_COMPANY_ID,
        warehouseId: "wh_demo_01",
        productId: item.id,
        stock: item.stock,
      });
    }

    // Crear propuesta DEMO en inbox
    const caseId = "case_demo_01";
    await db.insert(cases).values({
      id: caseId,
      companyId: DEMO_COMPANY_ID,
      title: "Quiebre de stock inminente (DEMO)",
      description: "El producto DEMO-02 tiene stock por debajo del punto de reorden.",
      status: "en_proceso",
      priority: "alta",
    });

    await db.insert(decisions).values({
      id: "dec_demo_sample_01",
      companyId: DEMO_COMPANY_ID,
      caseId,
      actionType: "crear_orden_compra",
      proposingAgent: "comprasSpecialist",
      title: "Reabastecimiento preventivo Cinta Adhesiva (DEMO)",
      costMxn: "122000.00",
      riskScore: "0.10",
      reversible: true,
      evidencePayload: {
        productId: "demo_prod_02",
        sku: "DEMO-02",
        productName: "Cinta Adhesiva Industrial (DEMO)",
        currentStock: 5,
        minStock: 25,
        deficit: 20,
        supplierName: "Distribuidora Empaques DEMO",
        unitPrice: "6100",
        quantity: 20,
        expectedMargin: "31.4",
      },
      policyDecision: "pending_approval",
      policyReason: "Stock crítico (5 unidades). Consumo estimado de 4 u/día.",
    });
  }

  // 2. Conmutar sesión al entorno demo
  await switchCompanySession(DEMO_COMPANY_ID, "Empresa Demo Aislada (Sandbox)");

  if (options.json) {
    console.log(JSON.stringify({ success: true, companyId: DEMO_COMPANY_ID, mode: "DEMO" }));
    return;
  }

  console.log("\n" + drawDivider("MODO DEMO ACTIVADO (ENTORNO TOTALMENTE AISLADO)", 85));
  console.log(
    drawCard(
      [
        `${theme.dim("ID Empresa:")}    ${theme.mintBold(DEMO_COMPANY_ID)}`,
        `${theme.dim("Nombre:")}        Empresa Demo Aislada (Sandbox)`,
        `${theme.dim("Aislamiento:")}   Todas las operaciones, stock y pedidos quedan etiquetados [DEMO].`,
        `${theme.dim("Seguridad:")}     Tus datos reales de producción están completamente protegidos.`,
        `${theme.dim("Comandos:")}      Prueba '/stock', '/inbox', '/briefing' o escribe preguntas naturales.`,
        `${theme.dim("Para salir:")}    Escribe '/demo exit' para regresar a tu empresa real.`,
      ],
      { title: "SANDBOX AISLADO", borderColor: theme.mint }
    )
  );
  console.log("");
}
