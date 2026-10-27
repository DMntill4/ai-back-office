import {
  resolveLocaleAutonomously,
  resolveCurrencyFromTextOrSymbol,
  inspectAndDiagnoseDatabaseAutonomously,
  db,
  companies,
  businessConfig,
  products,
  inventory,
  mintQuarantineRecords,
} from "../packages/core/src";
import { eq } from "drizzle-orm";

function assert(description: string, condition: boolean, extraInfo?: any) {
  if (condition) {
    console.log(`  [OK] ${description}`);
  } else {
    console.error(`  [FAIL] ${description}`, extraInfo !== undefined ? extraInfo : "");
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("TEST SUITE: MINT MOTOR AUTÓNOMO GLOBAL Y ERROR DETECTOR");
  console.log("=======================================================\n");

  // -----------------------------------------------------------------
  // 1. RESOLUCIÓN GLOBAL DE TERRITORIOS Y DIVISAS (CERO HARDCODING)
  // -----------------------------------------------------------------
  console.log("1. RESOLUCIÓN AUTÓNOMA GLOBAL (SIN HARDCODE DE COLOMBIA/MEXICO/PERU):");

  // España / Europa
  const spain = resolveLocaleAutonomously("Madrid, España");
  assert("Detecta España y Euro desde 'Madrid, España'", spain.country === "España" && spain.currency === "EUR", spain);

  // Argentina
  const argentina = resolveLocaleAutonomously("Buenos Aires");
  assert("Detecta Argentina y ARS desde 'Buenos Aires'", argentina.country === "Argentina" && argentina.currency === "ARS", argentina);

  // Brasil
  const brasil = resolveLocaleAutonomously("São Paulo, Brasil");
  assert("Detecta Brasil y BRL desde 'São Paulo, Brasil'", brasil.country === "Brasil" && brasil.currency === "BRL", brasil);

  // Chile
  const chile = resolveLocaleAutonomously("Santiago de Chile");
  assert("Detecta Chile y CLP desde 'Santiago de Chile'", chile.country === "Chile" && chile.currency === "CLP", chile);

  // Estados Unidos
  const usa = resolveLocaleAutonomously("Miami, Florida");
  assert("Detecta Estados Unidos y USD desde 'Miami, Florida'", usa.country === "Estados Unidos" && usa.currency === "USD", usa);

  // Reino Unido
  const uk = resolveLocaleAutonomously("Londres");
  assert("Detecta Reino Unido y GBP desde 'Londres'", uk.country === "Reino Unido" && uk.currency === "GBP", uk);

  // Japón
  const japan = resolveLocaleAutonomously("Tokyo");
  assert("Detecta Japón y JPY desde 'Tokyo'", japan.country === "Japón" && japan.currency === "JPY", japan);

  // Costa Rica
  const costaRica = resolveLocaleAutonomously("San José");
  assert("Detecta Costa Rica y CRC desde 'San José'", costaRica.country === "Costa Rica" && costaRica.currency === "CRC", costaRica);

  // Detección de divisas directas por símbolo o texto
  assert("Resuelve '€' a EUR", resolveCurrencyFromTextOrSymbol("€") === "EUR");
  assert("Resuelve '£' a GBP", resolveCurrencyFromTextOrSymbol("£") === "GBP");
  assert("Resuelve 'R$' a BRL", resolveCurrencyFromTextOrSymbol("R$") === "BRL");
  assert("Resuelve 'reales' a BRL", resolveCurrencyFromTextOrSymbol("reales") === "BRL");
  assert("Resuelve 'pesos uruguayos' a UYU", resolveCurrencyFromTextOrSymbol("pesos uruguayos") === "UYU");
  assert("Resuelve '$' con pista de Argentina a ARS", resolveCurrencyFromTextOrSymbol("$", "Argentina") === "ARS");
  assert("Resuelve '$' con pista de Chile a CLP", resolveCurrencyFromTextOrSymbol("$", "Chile") === "CLP");

  console.log("\n2. INSPECCIÓN AUTÓNOMA DE BASE DE DATOS Y AISLAMIENTO DE ERRORES:");

  const testCompId = "comp_test_auto_" + Date.now();

  // Insertar empresa de prueba
  await db.insert(companies).values({
    id: testCompId,
    name: "Tienda Global de Prueba",
    country: "España",
    currency: "EUR",
  });

  // Insertar producto con error de precio nulo/cero
  const badPriceProdId = `prod_bad_${Date.now()}`;
  await db.insert(products).values({
    id: badPriceProdId,
    companyId: testCompId,
    sku: "BAD-PRICE-01",
    name: "Producto con Precio Corrupto",
    price: "-15.00",
    origin: "real",
  });

  // Insertar producto con mojibake UTF-8
  const mojibakeProdId = `prod_moji_${Date.now()}`;
  await db.insert(products).values({
    id: mojibakeProdId,
    companyId: testCompId,
    sku: "MOJI-01",
    name: "Camisa de AlgodÃ³n y DiseÃ±o",
    origin: "real",
  });

  // Ejecutar inspección autónoma
  const diagnosis = await inspectAndDiagnoseDatabaseAutonomously(testCompId);

  assert("Diagnóstico dedujo perfil empresarial", diagnosis.inferredProfile.length > 0, diagnosis.inferredProfile);
  assert("Diagnóstico detectó los errores en los registros de producto", diagnosis.detectedErrors.length >= 2, diagnosis.detectedErrors);

  const foundBadPrice = diagnosis.detectedErrors.some((e) => e.sampleId === badPriceProdId);
  const foundMojibake = diagnosis.detectedErrors.some((e) => e.sampleId === mojibakeProdId);

  assert("Aisló específicamente el producto con precio negativo", foundBadPrice, diagnosis.detectedErrors);
  assert("Aisló específicamente el producto con texto corrupto (mojibake)", foundMojibake, diagnosis.detectedErrors);

  // Verificar que se enviaron a la tabla de cuarentena
  const qRecords = await db
    .select()
    .from(mintQuarantineRecords)
    .where(eq(mintQuarantineRecords.companyId, testCompId));

  assert("Los registros corruptos existen en la tabla /quarantine para proteger al cliente", qRecords.length >= 2, qRecords.length);

  console.log("\n=======================================================");
  if (process.exitCode === 1) {
    console.error("ALERTA: Algunos tests fallaron.");
  } else {
    console.log("TODOS LOS TESTS DEL MOTOR AUTÓNOMO PASARON CON ÉXITO.");
  }
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Error ejecutando tests:", err);
  process.exit(1);
});
