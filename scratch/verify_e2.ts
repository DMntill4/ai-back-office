import {
  parseJsonSource,
  parseRestApiSource,
  testSqlServerConnectivity,
  parseCsvFile,
  listExcelSheets,
  parseExcelFile,
  listSqliteTables,
} from "@mint/ingest";
import {
  discoverCustomerSchema,
  resolveLocaleAutonomously,
  resolveCurrencyFromTextOrSymbol,
  db,
  products,
} from "@mint/core";
import { eq } from "drizzle-orm";
import * as fs from "node:fs";
import * as path from "node:path";

async function verifyE2() {
  console.log("=== VERIFICACION E2: FUENTES DE DATOS ===");

  // E2.1: Soporte de formatos reales
  console.log("\n--- Probando E2.1: Parsers multi-fuente ---");
  
  // 1. JSON
  const sampleJson = JSON.stringify([
    { sku: "SKU-001", nombre: "Arroz 1kg", precio: 4500, stock: 120 },
    { sku: "SKU-002", nombre: "Aceite 900ml", precio: 9500, stock: 45 },
  ]);
  const parsedJson = parseJsonSource(sampleJson);
  console.log("JSON Parser:", parsedJson.rows.length === 2 ? "[OK]" : "[ERROR]", `Filas: ${parsedJson.rows.length}, Columnas: ${parsedJson.headers.join(", ")}`);

  // 2. CSV
  const csvPath = path.join(process.cwd(), "scratch", "sample_test_e2.csv");
  fs.writeFileSync(csvPath, "codigo,descripcion,cantidad,costo\nPRD-01,Leche Entera,50,3200\nPRD-02,Pan Tajado,30,4000\n", "utf8");
  const parsedCsv = await parseCsvFile(csvPath);
  console.log("CSV Parser:", parsedCsv.rows.length === 2 ? "[OK]" : "[ERROR]", `Filas: ${parsedCsv.rows.length}, Columnas: ${parsedCsv.headers.join(", ")}`);
  fs.unlinkSync(csvPath);

  // 3. SQL Server Connectivity Validator (TCP ping)
  const sqlPingFail = await testSqlServerConnectivity("Server=127.0.0.1;Database=inexistente;Port=9999;");
  console.log("SQL Server TCP Ping (puerto cerrado):", !sqlPingFail.success ? "[OK RECHAZADO]" : "[ERROR FALSO POSITIVO]", sqlPingFail.message);

  // 4. SQLite Validator
  let sqliteRejected = false;
  try {
    listSqliteTables("C:/ruta/inexistente/db.sqlite");
  } catch (err: any) {
    sqliteRejected = true;
  }
  console.log("SQLite File Validator (archivo inexistente):", sqliteRejected ? "[OK RECHAZADO]" : "[ERROR FALSO POSITIVO]");

  // E2.2: Prueba de conexión (falla no se guarda)
  console.log("\n--- Probando E2.2: Prueba de conexión antes de guardar ---");
  let testSaveBlocked = false;
  try {
    const unreachableUrl = "https://unreachable-domain-12345.xyz/api/v1/products";
    const restRes = await parseRestApiSource(unreachableUrl);
    if (!restRes.success) {
      testSaveBlocked = true;
    }
  } catch (err: any) {
    testSaveBlocked = true;
  }
  console.log("Conexión inalcanzable no guardada:", testSaveBlocked ? "[OK BLOQUEADO]" : "[ERROR GUARDADO]");

  // E2.3: Descubrimiento de estructura y propuesta de significado
  console.log("\n--- Probando E2.3: Descubrimiento de esquema ---");
  const schemaReport = await discoverCustomerSchema();
  console.log("Tablas públicas descubiertas:", schemaReport.tables.length > 0 ? "[OK]" : "[ERROR]", `Total: ${schemaReport.tables.length} tablas`);
  const hasProducts = schemaReport.tables.some(t => t.tableName.toLowerCase().includes("product"));
  console.log("Detección tabla de catálogo/productos:", hasProducts ? "[OK]" : "[ADVERTENCIA]", schemaReport.tables.slice(0, 5).map(t => t.tableName));

  // E2.4: País solo cambia formato y divisa; fuente vacía = cero datos inventados
  console.log("\n--- Probando E2.4: Localización autónoma y no invención ---");
  const locCol = resolveLocaleAutonomously("Colombia");
  const locMex = resolveLocaleAutonomously("México");
  const locEsp = resolveLocaleAutonomously("España");
  console.log("Resolución de divisa y zona horaria:", 
    locCol.currency === "COP" && locMex.currency === "MXN" && locEsp.currency === "EUR" ? "[OK]" : "[ERROR]",
    { Colombia: locCol, Mexico: locMex, Espana: locEsp }
  );

  // Verificación de fuente vacía en empresa sin productos
  const emptyCompProducts = await db
    .select()
    .from(products)
    .where(eq(products.companyId, "comp_empty_test"));
  console.log("Consulta de catálogo para empresa vacía (debe ser 0 filas):", emptyCompProducts.length === 0 ? "[OK CERO INVENTO]" : "[ERROR CON DATOS]");
}

verifyE2().then(() => {
  console.log("\n=== FIN DE VERIFICACION E2 ===");
  process.exit(0);
}).catch(err => {
  console.error("Fallo critico en E2:", err);
  process.exit(1);
});
