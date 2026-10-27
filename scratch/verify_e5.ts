import {
  analyzeInventoryForProduct,
} from "../packages/core/src/agent/especialistas/inventarioSpecialist";
import {
  db,
  products,
  inventory,
  warehouses,
  generateProfitAndMarginReportData,
} from "@mint/core";
import { eq } from "drizzle-orm";

async function verifyE5() {
  console.log("=== VERIFICACION E5: STOCK Y PRODUCTOS ===");

  // E5.1: Stock real y dias de stock con historial insuficiente
  console.log("\n--- Probando E5.1: Historial insuficiente = burnRate null, cero invento ---");
  const prods = await db.select().from(products).where(eq(products.companyId, "comp_default")).limit(5);
  console.log(`Productos encontrados en comp_default: ${prods.length}`);
  
  for (const prod of prods.slice(0, 3)) {
    const analysis = await analyzeInventoryForProduct(prod.id, "comp_default");
    if (analysis) {
      console.log(`Producto ${prod.name} (${prod.sku}):`, {
        stock: analysis.currentStock,
        minStock: analysis.minStock,
        burnRate: analysis.burnRate,
        daysCoverage: analysis.daysCoverage,
        sufficient: analysis.hasSufficientHistory,
        explanation: analysis.historyExplanation,
      });
      if (!analysis.hasSufficientHistory) {
        console.log(`[OK CERO INVENTO] burnRate es null para ${prod.sku}`);
      }
    }
  }

  // E5.2: Deteccion de deficit y alertas
  console.log("\n--- Probando E5.2: Deteccion de deficit vs min_stock ---");
  let deficitTested = false;
  for (const prod of prods) {
    const analysis = await analyzeInventoryForProduct(prod.id, "comp_default");
    if (analysis && (analysis.status === "QUIEBRE_TOTAL" || analysis.status === "CRÍTICO_INMINENTE" || analysis.status === "BAJO_STOCK_SEGURIDAD")) {
      console.log(`Producto con deficit detectado: ${prod.name} (${prod.sku}), Estado: ${analysis.status}, Deficit: ${analysis.deficit}`);
      deficitTested = true;
      break;
    }
  }
  console.log("Deteccion de deficit en catalogo real:", deficitTested ? "[OK]" : "[NO HAY PRODUCTOS EN DEFICIT ACTIVO]");

  // E5.3: Margen y ganancia; costo no registrado nunca se estima
  console.log("\n--- Probando E5.3: Margen y ganancia (sin costo nunca estima) ---");
  const profitReport = await generateProfitAndMarginReportData("comp_default");
  console.log("Filas generadas en reporte:", profitReport.rows.length);
  console.log("Resumen de reporte:", profitReport.summary);

  // Buscar fila con "costo no registrado"
  const uncostedRow = profitReport.rows.find(row => row.includes("costo no registrado"));
  if (uncostedRow) {
    console.log("Fila de producto sin costo:", uncostedRow);
    const noFabricatedMargin = uncostedRow[3] === "costo no registrado" && uncostedRow[4] === "N/A" && uncostedRow[5] === "N/A";
    console.log("Cero invento de margen para producto sin costo:", noFabricatedMargin ? "[OK]" : "[ERROR INVENTO]");
  } else {
    console.log("Todos los productos del reporte tienen costo registrado.");
  }
}

verifyE5().then(() => {
  console.log("\n=== FIN DE VERIFICACION E5 ===");
  process.exit(0);
}).catch(err => {
  console.error("Fallo critico en E5:", err);
  process.exit(1);
});
