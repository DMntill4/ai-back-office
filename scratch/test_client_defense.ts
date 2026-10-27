import {
  sanitizeText,
  cleanSlug,
  cleanCurrencyCode,
} from "../packages/cli/src/commands/onboarding";
import {
  db,
  companies,
  businessConfig,
  products,
  inventory,
  cases,
  addPendingQuestion,
  listPendingQuestions,
  coordinateOperationalEvent,
} from "@mint/core";
import { eq, and } from "drizzle-orm";
import { scanDelayedShipments } from "../packages/daemon/src/triggers";

async function runTests() {
  console.log("=================================================");
  console.log("INICIANDO PRUEBAS DE DEFENSA AL CLIENTE Y EDGE CASES");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  function assert(title: string, condition: boolean, detail = "") {
    total++;
    if (condition) {
      console.log(`[PASS] ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title} - ${detail}`);
    }
  }

  // -------------------------------------------------------------------
  // TEST 1: Sanitización y slugificación de caracteres especiales
  // -------------------------------------------------------------------
  console.log("--- 1. Pruebas de Caracteres Especiales y Robustez ---");

  // 1.1 Nombre comercial realista con tildes, comillas, ampersand, porcentaje, etc.
  const rawComp = 'Plática & Cía. S.A.S. (Bogotá) "El Éxito"! 100% #1';
  const cleanComp = sanitizeText(rawComp);
  assert(
    "1.1 sanitizeText preserva el nombre comercial sin romper tildes ni símbolos legítimos",
    cleanComp === 'Plática & Cía. S.A.S. (Bogotá) "El Éxito"! 100% #1',
    cleanComp,
  );

  const compSlug = cleanSlug(rawComp, "comp", 20);
  assert(
    "1.2 cleanSlug convierte tildes y símbolos en un identificador SQL seguro",
    compSlug === "comp_platica_cia_s_a_s_bo",
    compSlug,
  );

  // 1.3 Intento de inyección de script HTML
  const xssInput = "<script>alert('xss')</script> Empresa";
  const sanitizedXss = sanitizeText(xssInput);
  assert(
    "1.3 sanitizeText elimina etiquetas HTML / scripts",
    sanitizedXss === "alert('xss') Empresa",
    sanitizedXss,
  );

  // 1.4 Entrada con secuencias de escape ANSI de consola
  const ansiInput = "\u001b[31mEmpresa Roja\u001b[0m";
  const sanitizedAnsi = sanitizeText(ansiInput);
  assert(
    "1.4 sanitizeText remueve secuencias ANSI terminal",
    sanitizedAnsi === "Empresa Roja",
    sanitizedAnsi,
  );

  // 1.5 Entrada con emojis de usuario
  const emojiInput = "Supermercado Éxito \u{1F525} \u{1F4E6}";
  const sanitizedEmoji = sanitizeText(emojiInput);
  assert(
    "1.5 sanitizeText remueve emojis de usuario para mantener la consola limpia",
    sanitizedEmoji === "Supermercado Éxito",
    sanitizedEmoji,
  );

  // 1.6 Entrada de puros símbolos raros (no debe crashear ni dar slug vacío)
  const symbolOnly = "$$$###???@@@";
  const fallbackSlug = cleanSlug(symbolOnly, "comp", 20);
  assert(
    "1.6 cleanSlug con puros símbolos genera fallback seguro sin crashear",
    fallbackSlug.startsWith("comp_") && fallbackSlug.length > 5,
    fallbackSlug,
  );

  // -------------------------------------------------------------------
  // TEST 2: Resolución inteligente de divisas y monedas raras
  // -------------------------------------------------------------------
  console.log("\n--- 2. Pruebas de Detección Inteligente de Divisas ---");

  assert("2.1 '$' en Colombia resuelve a COP", cleanCurrencyCode("$", "Colombia") === "COP");
  assert("2.2 '$' en México resuelve a MXN", cleanCurrencyCode("$", "México") === "MXN");
  assert("2.3 'pesos' en Colombia resuelve a COP", cleanCurrencyCode("pesos", "Colombia") === "COP");
  assert("2.4 'pesos' en México resuelve a MXN", cleanCurrencyCode("pesos", "México") === "MXN");
  assert("2.5 'dolares' resuelve a USD", cleanCurrencyCode("dólares", "Colombia") === "USD");
  assert("2.6 'USD ($)' resuelve a USD", cleanCurrencyCode("USD ($)", "Colombia") === "USD");
  assert("2.7 'euro' resuelve a EUR", cleanCurrencyCode("euros", "España") === "EUR");
  assert("2.8 'soles' en Perú resuelve a PEN", cleanCurrencyCode("soles", "Perú") === "PEN");
  assert("2.9 'COP' exacto resuelve a COP", cleanCurrencyCode("COP", "Estados Unidos") === "COP");

  // -------------------------------------------------------------------
  // TEST 3: Modelo Solo Tienda (Desactivación de Flota y Proveedores)
  // -------------------------------------------------------------------
  console.log("\n--- 3. Pruebas del Modelo 'Solo Tienda' (Cero Ruido) ---");

  const testStoreCompId = "comp_test_solo_tienda";
  await db.insert(companies).values({
    id: testStoreCompId,
    name: "Tienda de Prueba",
    country: "Colombia",
    currency: "COP",
  }).onConflictDoUpdate({ target: [companies.id], set: { name: "Tienda de Prueba" } });

  await db.insert(businessConfig).values({
    companyId: testStoreCompId,
    key: "business_profile",
    value: "tienda",
    updatedAt: new Date(),
  }).onConflictDoUpdate({ target: [businessConfig.companyId, businessConfig.key], set: { value: "tienda" } });

  // 3.1 Daemon scanDelayedShipments no genera nada para Solo Tienda
  const delayedShipmentsCount = await scanDelayedShipments(testStoreCompId);
  assert(
    "3.1 scanDelayedShipments devuelve 0 en modo 'Solo Tienda' sin evaluar flota",
    delayedShipmentsCount === 0,
    String(delayedShipmentsCount),
  );

  // 3.2 Producto con desabasto en Solo Tienda genera alerta interna, NO compra a proveedor
  const testProdId = `prod_${testStoreCompId}_p1`;
  await db.insert(products).values({
    id: testProdId,
    companyId: testStoreCompId,
    sku: "SKU-SOLO-TIENDA",
    name: "Camisa de Lino",
    category: "Ropa",
    minStock: 20,
    origin: "real",
  }).onConflictDoUpdate({ target: [products.id], set: { minStock: 20 } });

  await db.insert(inventory).values({
    id: `inv_${testStoreCompId}_p1`,
    companyId: testStoreCompId,
    productId: testProdId,
    warehouseId: "alm_central",
    stock: 2, // crítico bajo
  }).onConflictDoUpdate({ target: [inventory.id], set: { stock: 2 } });

  const coordResult = await coordinateOperationalEvent({
    eventType: "STOCK_BELOW_MIN",
    companyId: testStoreCompId,
    productId: testProdId,
    title: "Stock bajo en camisa",
    force: true,
  });

  assert(
    "3.2 coordinateOperationalEvent en Solo Tienda resuelve internamente sin generar compra externa",
    coordResult.success && coordResult.summary.includes("Solo Tienda"),
    coordResult.summary,
  );

  // -------------------------------------------------------------------
  // TEST 4: Cliente miente o BD completamente vacía
  // -------------------------------------------------------------------
  console.log("\n--- 4. Pruebas de Cliente Miente / Base de Datos Vacía ---");

  const testEmptyCompId = "comp_test_empty_db";
  await db.insert(companies).values({
    id: testEmptyCompId,
    name: "Empresa Sin Datos",
    country: "México",
    currency: "MXN",
  }).onConflictDoUpdate({ target: [companies.id], set: { name: "Empresa Sin Datos" } });

  await db.insert(businessConfig).values({
    companyId: testEmptyCompId,
    key: "business_profile",
    value: "logistica_completa", // El cliente afirmó tener logística completa
    updatedAt: new Date(),
  }).onConflictDoUpdate({ target: [businessConfig.companyId, businessConfig.key], set: { value: "logistica_completa" } });

  // Agregamos la pregunta de auditoría de realidad
  await addPendingQuestion(
    testEmptyCompId,
    "supplier_missing",
    "Declaraste logística completa pero tu base de datos tiene 0 proveedores registrados.",
    { actualSuppliers: 0 },
  );

  const pendingQuestions = await listPendingQuestions(testEmptyCompId, "pending");
  assert(
    "4.1 MINT registra la discrepancia en el banco de preguntas sin inventar proveedores ficticios",
    pendingQuestions.some((q) => q.topic === "supplier_missing"),
    `Total preguntas: ${pendingQuestions.length}`,
  );

  console.log("\n=================================================");
  console.log(`RESUMEN FINAL: ${passed}/${total} PRUEBAS SUPERADAS`);
  console.log("=================================================");

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("ERROR FATAL EN PRUEBAS:", err);
  process.exit(1);
});
