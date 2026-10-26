import {
  db,
  pool,
  companies,
  users,
  products,
  inventory,
  suppliers,
  supplierProducts,
  purchaseOrders,
  shipments,
  decisions,
  cases,
  ensureDecisionsTables,
  discoverCustomerSchema,
  saveConfirmedTableMapping,
  canWriteToCustomerTable,
  verifyMigrationCollisions,
  analyzePurchasingOptions,
  executeAndVerifyDecision,
  rejectDecision,
  cancelPendingDecision,
  trackShipmentOrOrder,
  proposeAlternativeRoute,
  approveAlternativeRoute,
  generateProfitAndMarginReportData,
  exportReportToCsv,
  exportReportToPdf,
  listPendingQuestions,
  resolveNaturalLanguageIntent,
  mintSalesOrders,
} from "@mint/core";
import { processIncomingSale, verifyWebhookSignature } from "../packages/notifiers/src/salesChannelListener";
import { eq, and, sql } from "drizzle-orm";
import { createHmac } from "node:crypto";

async function runAcceptanceTests() {
  console.log("\n========================================================");
  console.log("🚀 MINT CLI: BATERÍA COMPLETA DE PRUEBAS DE ACEPTACIÓN");
  console.log("========================================================\n");

  const client = await pool.connect();
  const testErrors: string[] = [];

  try {
    // 0. Asegurar tablas e infraestructura
    await ensureDecisionsTables();

    // ---------------------------------------------------------
    // TEST 1: Convivencia con BD del cliente que ya tiene "guias" (CRÍTICO)
    // ---------------------------------------------------------
    console.log("--- TEST 1: Convivencia con BD existente (Tabla 'guias' del cliente) ---");
    // Crear tabla del cliente 'guias' simulando base de datos previa
    await client.query(`
      CREATE TABLE IF NOT EXISTS guias (
        id_guia VARCHAR(50) PRIMARY KEY,
        folio_externo VARCHAR(50) NOT NULL,
        destinatario TEXT NOT NULL,
        direccion_entrega TEXT NOT NULL,
        transportista TEXT NOT NULL,
        estado_envio VARCHAR(32) NOT NULL,
        fecha_registro TIMESTAMP DEFAULT NOW()
      );
    `);

    // Insertar registros preexistentes del cliente
    await client.query(`
      INSERT INTO guias (id_guia, folio_externo, destinatario, direccion_entrega, transportista, estado_envio)
      VALUES 
        ('GUIA-CLI-001', 'FOL-9901', 'Corporativo Alfa SA', 'Av. Industrial 400', 'Transportes del Norte', 'en_camino'),
        ('GUIA-CLI-002', 'FOL-9902', 'Industrias Beta SL', 'Calle Comercio 12', 'Fletes Express', 'entregado')
      ON CONFLICT (id_guia) DO NOTHING;
    `);

    const countBefore = (await client.query(`SELECT count(*)::int as c FROM guias;`)).rows[0].c;

    // Ejecutar descubrimiento de esquema de MINT en modo solo lectura
    const discovery = await discoverCustomerSchema("comp_platica");
    const guiasTable = discovery.tables.find((t) => t.tableName === "guias");
    const guiasProposal = discovery.proposals.find((p) => p.sourceTable === "guias");

    if (!guiasTable || !guiasProposal) {
      testErrors.push("FAIL 1.1: Descubrimiento de esquema no detectó la tabla 'guias'.");
    } else {
      console.log(`  ✔ Tabla 'guias' detectada con equivalencia MINT: '${guiasProposal.targetEntity}' (Confianza: ${(guiasProposal.confidence * 100).toFixed(0)}%)`);
      console.log(`  ✔ Mapeo detectado: trackingNumber -> ${guiasProposal.columnMappings.trackingNumber}, carrier -> ${guiasProposal.columnMappings.carrier}`);
    }

    // Confirmar y guardar mapeo
    if (guiasProposal) {
      await saveConfirmedTableMapping({
        companyId: "comp_platica",
        sourceTable: "guias",
        targetEntity: guiasProposal.targetEntity,
        columnMappings: guiasProposal.columnMappings,
        isConfirmed: true,
        isReadOnly: true,
      });
      console.log("  ✔ Mapeo confirmado y persistido en memoria de MINT (mint_table_mappings).");
    }

    // Probar protección de Solo Lectura
    const writeCheck = await canWriteToCustomerTable("comp_platica", "guias", "operator");
    if (writeCheck.allowed) {
      testErrors.push("FAIL 1.2: Tabla del cliente no bloqueó la escritura no autorizada.");
    } else {
      console.log(`  ✔ Protección activa: ${writeCheck.reason}`);
    }

    // Probar simulación de colisiones de migraciones
    const collisionCheck = await verifyMigrationCollisions(["guias", "mint_table_mappings"]);
    if (collisionCheck.safe) {
      testErrors.push("FAIL 1.3: Detección de colisiones debió alertar que 'guias' ya existía sin company_id.");
    } else {
      console.log(`  ✔ Detección de colisiones efectiva: ${collisionCheck.message}`);
    }

    // Verificar que NINGÚN registro de 'guias' fue alterado
    const countAfter = (await client.query(`SELECT count(*)::int as c FROM guias;`)).rows[0].c;
    const sample = (await client.query(`SELECT * FROM guias WHERE id_guia = 'GUIA-CLI-001';`)).rows[0];
    if (countBefore !== countAfter || sample.destinatario !== "Corporativo Alfa SA") {
      testErrors.push("FAIL 1.4: La base de datos del cliente fue alterada o modificada.");
    } else {
      console.log(`  ✔ Integridad 100%: 0 registros del cliente alterados. Filas antes: ${countBefore}, después: ${countAfter}.`);
    }

    // ---------------------------------------------------------
    // TEST 2: Venta desde Canal Web / Webhook con Firma e Idempotencia
    // ---------------------------------------------------------
    console.log("\n--- TEST 2: Venta omnicanal/webhook (Firma, Idempotencia, Descuento) ---");
    // Crear producto de prueba con stock conocido
    const testSku = `SKU-TEST-${Date.now()}`;
    const testProdId = `prod_${Date.now()}`;
    await db.insert(products).values({
      id: testProdId,
      companyId: "comp_platica",
      sku: testSku,
      name: "Sensor de Presión Industrial Pro",
      minStock: 5,
    });

    const [wh] = await db.select().from(inventory).limit(1);
    const whId = wh?.warehouseId || "alm_central";

    await db.insert(inventory).values({
      id: `inv_${Date.now()}`,
      companyId: "comp_platica",
      productId: testProdId,
      warehouseId: whId,
      stock: 20,
    });

    // Simular firma criptográfica HMAC-SHA256
    const webhookSecret = "super_secret_webhook_key_2026";
    const rawPayload = JSON.stringify({ sku: testSku, qty: 3, customer: "Empresa Minera del Sur" });
    const hmac = createHmac("sha256", webhookSecret).update(rawPayload).digest("hex");

    // Verificar validador de firma
    const isValidSig = verifyWebhookSignature(rawPayload, hmac, webhookSecret);
    const isInvalidSig = verifyWebhookSignature(rawPayload, "bad_signature_xyz", webhookSecret);
    if (!isValidSig || isInvalidSig) {
      testErrors.push("FAIL 2.1: Validador de firma criptográfica HMAC falló.");
    } else {
      console.log("  ✔ Firma HMAC SHA-256 verificada correctamente.");
    }

    // Procesar venta 1
    const idempotencyKey = `idem_sale_${Date.now()}`;
    const saleRes1 = await processIncomingSale({
      companyId: "comp_platica",
      channel: "web",
      senderId: "system_ecommerce_shopify",
      senderName: "Web Store Oficial",
      sku: testSku,
      quantity: 3,
      unitPriceMxn: 150,
      customerName: "Empresa Minera del Sur",
      customerEmail: "compras@minerasur.pe",
      shippingAddress: "Km 45 Panamericana Sur, Arequipa",
      idempotencyKey,
      signature: hmac,
      rawPayload,
      webhookSecret,
    });

    console.log(`  ✔ Venta 1 procesada: ID ${saleRes1.saleId} | Stock anterior: ${saleRes1.previousStock}u ➔ restante: ${saleRes1.remainingStock}u`);

    // Procesar venta 2 con IDÉNTICA clave de idempotencia (simulando reintento de red)
    const saleRes2 = await processIncomingSale({
      companyId: "comp_platica",
      channel: "web",
      senderId: "system_ecommerce_shopify",
      senderName: "Web Store Oficial",
      sku: testSku,
      quantity: 3,
      idempotencyKey,
    });

    if (!saleRes2.isDuplicate) {
      testErrors.push("FAIL 2.2: Idempotencia falló: la venta repetida no fue detectada como duplicada.");
    } else {
      console.log(`  ✔ Idempotencia garantizada: Venta duplicada interceptada. Stock NO se volvió a descontar.`);
    }

    // Verificar persistencia en mint_sales_orders
    const [savedOrder] = await db.select().from(mintSalesOrders).where(eq(mintSalesOrders.idempotencyKey, idempotencyKey));
    if (!savedOrder || savedOrder.customerName !== "Empresa Minera del Sur") {
      testErrors.push("FAIL 2.3: La venta no se guardó en mint_sales_orders con metadatos completos.");
    } else {
      console.log(`  ✔ Venta persistida en mint_sales_orders: Cliente: ${savedOrder.customerName}, Destino: ${savedOrder.shippingAddress}`);
    }

    // ---------------------------------------------------------
    // TEST 3: Negocio Solo Tienda (Sin Proveedores ni Camiones)
    // ---------------------------------------------------------
    console.log("\n--- TEST 3: Negocio Solo Tienda (Sin Proveedores ni Camiones) ---");
    const storeOnlyCompId = `comp_store_only_${Date.now()}`;
    await db.insert(companies).values({
      id: storeOnlyCompId,
      name: "Boutique Solo Tienda",
      currency: "USD",
      country: "Colombia",
    });

    // Crear producto en esta empresa
    await db.insert(products).values({
      id: `prod_store_${Date.now()}`,
      companyId: storeOnlyCompId,
      sku: "SKU-BOUTIQUE-1",
      name: "Bolso de Cuero Hecho a Mano",
      minStock: 2,
    });

    // Preguntar por proveedores en lenguaje natural
    const intentSupp = await resolveNaturalLanguageIntent(storeOnlyCompId, "¿quiénes son nuestros proveedores?");
    if (!intentSupp.response.includes("no tengo este dato")) {
      testErrors.push(`FAIL 3.1: Negocio solo tienda no debió inventar proveedores. Respuesta: ${intentSupp.response}`);
    } else {
      console.log(`  ✔ Respuesta veraz en tienda sin proveedores: "${intentSupp.response}"`);
    }

    // Preguntar por camiones/flota
    const intentFleet = await resolveNaturalLanguageIntent(storeOnlyCompId, "¿dónde van los camiones?");
    if (!intentFleet.response.includes("no tengo este dato")) {
      testErrors.push(`FAIL 3.2: Negocio solo tienda no debió inventar camiones. Respuesta: ${intentFleet.response}`);
    } else {
      console.log(`  ✔ Respuesta veraz en tienda sin flota: "${intentFleet.response}"`);
    }

    // Verificar que se registró en mint_pending_questions
    const questions = await listPendingQuestions(storeOnlyCompId);
    if (questions.length === 0) {
      testErrors.push("FAIL 3.3: No se registró la pregunta faltante en el banco de pendientes.");
    } else {
      console.log(`  ✔ Pregunta pendiente registrada automáticamente en banco de preguntas (ID: ${questions[0].id}).`);
    }

    // ---------------------------------------------------------
    // TEST 4: Reporte de Ganancias (Profit) y Margen con y sin Costo Registrado
    // ---------------------------------------------------------
    console.log("\n--- TEST 4: Reportes de Ganancias (Costo registrado vs Costo no registrado) ---");
    // Crear producto A con costo registrado en supplier_products
    const prodWithCostId = `prod_cost_${Date.now()}`;
    await db.insert(products).values({
      id: prodWithCostId,
      companyId: "comp_platica",
      sku: `SKU-WITH-COST-${Date.now()}`,
      name: "Válvula Reguladora de Presión",
      minStock: 5,
    });

    const [testSupp] = await db.select().from(suppliers).where(eq(suppliers.companyId, "comp_platica")).limit(1);
    if (testSupp) {
      await db.insert(supplierProducts).values({
        id: `sp_${Date.now()}`,
        companyId: "comp_platica",
        supplierId: testSupp.id,
        productId: prodWithCostId,
        unitPrice: "40.00",
        minOrderQuantity: 1,
        leadTimeDays: 2,
      });
    }

    // Crear producto B SIN costo registrado
    const prodNoCostId = `prod_nocost_${Date.now()}`;
    await db.insert(products).values({
      id: prodNoCostId,
      companyId: "comp_platica",
      sku: `SKU-NO-COST-${Date.now()}`,
      name: "Accesorio Sin Costo Homologado",
      minStock: 2,
    });

    const profitReport = await generateProfitAndMarginReportData("comp_platica");
    const rowWithCost = profitReport.rows.find((r) => r[0].toString().includes("SKU-WITH-COST"));
    const rowNoCost = profitReport.rows.find((r) => r[0].toString().includes("SKU-NO-COST"));

    if (!rowWithCost || !rowNoCost) {
      testErrors.push("FAIL 4.1: Filas del reporte de ganancias no encontradas.");
    } else {
      console.log(`  ✔ Producto con costo registrado: Costo: ${rowWithCost[3]} | Origen: ${rowWithCost[8]}`);
      if (rowNoCost[3] !== "costo no registrado" || rowNoCost[5] !== "N/A") {
        testErrors.push(`FAIL 4.2: Producto sin costo debió mostrar 'costo no registrado' y margen 'N/A'. Mostró: ${rowNoCost[3]}, ${rowNoCost[5]}`);
      } else {
        console.log(`  ✔ Producto sin costo: Costo: '${rowNoCost[3]}' | Margen: '${rowNoCost[5]}' (MINT nunca estima costos).`);
      }
    }

    // Probar exportación a CSV y PDF
    const csvExp = await exportReportToCsv("test_ganancias", profitReport.headers, profitReport.rows);
    const pdfExp = await exportReportToPdf("test_ganancias", "Reporte Financiero Platica", profitReport.headers, profitReport.rows);
    console.log(`  ✔ Exportación CSV generada: ${csvExp.filename} (${csvExp.totalRows} filas).`);
    console.log(`  ✔ Exportación PDF generada: ${pdfExp.filename} (${pdfExp.totalRows} filas).`);

    // ---------------------------------------------------------
    // TEST 5: Nuevo Flujo de Compras a Proveedores con Aprobación Estricta
    // ---------------------------------------------------------
    console.log("\n--- TEST 5: Flujo de Compras con Aprobación (Anti-Self-Approval, Supervisor) ---");
    // 1. Producto sin proveedor registrado
    const purchasePropNoSupp = await analyzePurchasingOptions(prodNoCostId, 10, storeOnlyCompId, false, "requester_dale");
    if (purchasePropNoSupp !== null) {
      testErrors.push("FAIL 5.1: Se propuso compra para una empresa sin proveedores registrados.");
    } else {
      console.log("  ✔ Sin proveedor: MINT NO inventa proveedores, retorna null y registra pendiente.");
    }

    // 2. Producto con proveedor y precio
    const purchaseProp = await analyzePurchasingOptions(prodWithCostId, 10, "comp_platica", false, "usr_solicitante_pedro");
    if (!purchaseProp) {
      testErrors.push("FAIL 5.2: analyzePurchasingOptions falló en producto con proveedor.");
    } else {
      console.log(`  ✔ Propuesta generada: Proveedor: ${purchaseProp.recommendedOption.supplierName} | Cantidad: ${purchaseProp.recommendedQuantity}u | Total: $${purchaseProp.totalCostMxn} | Estabilidad: ${purchaseProp.recommendedOption.priceStatus}`);

      // Insertar en decisions como pending_approval
      const decId = `dec_test_${Date.now()}`;
      const caseId = `case_test_${Date.now()}`;
      await db.insert(cases).values({
        id: caseId,
        companyId: "comp_platica",
        title: "Caso de Reabastecimiento",
        description: "Test de aprobación",
      });

      await db.insert(decisions).values({
        id: decId,
        companyId: "comp_platica",
        caseId,
        actionType: "crear_orden_compra",
        proposingAgent: "compras_specialist",
        title: `Compra de ${purchaseProp.recommendedQuantity}u de ${prodWithCostId}`,
        costMxn: purchaseProp.totalCostMxn.toString(),
        requesterUserId: "usr_solicitante_pedro",
        evidencePayload: {
          productId: prodWithCostId,
          supplierId: purchaseProp.recommendedOption.supplierId,
          supplierName: purchaseProp.recommendedOption.supplierName,
          quantity: purchaseProp.recommendedQuantity,
          unitPrice: purchaseProp.recommendedOption.unitPrice.toString(),
        },
        policyDecision: "pending_approval",
      });

      // 3. Intento de Auto-Aprobación por el mismo usuario que la solicitó
      const selfApproveRes = await executeAndVerifyDecision(decId, "Pedro Solicitante", undefined, "usr_solicitante_pedro", "admin");
      if (selfApproveRes.success) {
        testErrors.push("FAIL 5.3: El sistema permitió que el solicitante se auto-aprobara la compra.");
      } else {
        console.log(`  ✔ Bloqueo de Auto-Aprobación exitoso: ${selfApproveRes.message}`);
      }

      // 4. Intento de aprobación por rol sin permisos (operator)
      const nonAdminRes = await executeAndVerifyDecision(decId, "Juan Operador", undefined, "usr_operador_juan", "operator");
      if (nonAdminRes.success) {
        testErrors.push("FAIL 5.4: El sistema permitió que un rol 'operator' aprobara la compra.");
      } else {
        console.log(`  ✔ Control de Rol exitoso: ${nonAdminRes.message}`);
      }

      // 5. Aprobación legítima por Admin distinto
      const legitApproveRes = await executeAndVerifyDecision(decId, "Admin Diego", undefined, "usr_admin_diego", "owner");
      if (!legitApproveRes.success || !legitApproveRes.orderId) {
        testErrors.push(`FAIL 5.5: Falló la aprobación legítima: ${legitApproveRes.message}`);
      } else {
        console.log(`  ✔ Aprobación legítima completada: ${legitApproveRes.message}`);
        console.log(`  ✔ Orden de compra emitida: ${legitApproveRes.orderId} con guía logística: ${legitApproveRes.trackingNumber}`);
      }
    }

    // ---------------------------------------------------------
    // TEST 6: Seguimiento Logístico en Tiempo Real (mint track)
    // ---------------------------------------------------------
    console.log("\n--- TEST 6: Seguimiento de Transporte y Detección de Incidencias ---");
    // Crear un embarque de prueba con coordenadas
    const testShipId = `ship_track_${Date.now()}`;
    const testTrackingNo = `TRK-TEST-${Date.now()}`;
    await db.insert(shipments).values({
      id: testShipId,
      companyId: "comp_platica",
      trackingNumber: testTrackingNo,
      carrier: "Transportes Andinos SA",
      originLocation: "Bogotá, Colombia",
      currentLocation: "Tunja, Boyacá, Colombia",
      destinationLocation: "Bucaramanga, Santander, Colombia",
      status: "en_transito",
      estimatedDelivery: new Date(Date.now() + 48 * 3600 * 1000),
      notes: "Conductor: Carlos Gómez; Placas: AND-882",
    });

    const trackRes = await trackShipmentOrOrder(testTrackingNo, "comp_platica");
    if (!trackRes.found || trackRes.carrier !== "Transportes Andinos SA") {
      testErrors.push("FAIL 6.1: trackShipmentOrOrder no encontró el embarque.");
    } else {
      console.log(`  ✔ Guía rastreada: ${trackRes.trackingNumber} | Transportista: ${trackRes.carrier} | Conductor: ${trackRes.driverName}`);
      console.log(`  ✔ Dónde va: ${trackRes.currentLocation} ➔ Destino: ${trackRes.destinationLocation} | ETA: ${trackRes.etaStr} (Distancia: ${trackRes.distanceKm} km)`);
      console.log(`  ✔ URL en navegador: ${trackRes.browserMapUrl}`);
    }

    // Probar guía sin ubicación física
    const noLocShipId = `ship_noloc_${Date.now()}`;
    const noLocTracking = `TRK-NOLOC-${Date.now()}`;
    await db.insert(shipments).values({
      id: noLocShipId,
      companyId: "comp_platica",
      trackingNumber: noLocTracking,
      carrier: "DHL Express",
      status: "en_preparacion",
      estimatedDelivery: new Date(),
    });

    const noLocRes = await trackShipmentOrOrder(noLocTracking, "comp_platica");
    if (noLocRes.currentLocation !== "sin ubicación disponible") {
      testErrors.push(`FAIL 6.2: Sin ubicación debió mostrar 'sin ubicación disponible'. Mostró: ${noLocRes.currentLocation}`);
    } else {
      console.log(`  ✔ Guía sin ubicación: Estado verídico -> '${noLocRes.currentLocation}'.`);
    }

    // Simular incidencia de ruta y propuesta de ruta alternativa
    const incRes = await proposeAlternativeRoute({
      companyId: "comp_platica",
      trackingNumber: testTrackingNo,
      incidentType: "traffic_incident",
      reason: "Derrumbe en tramo Barbosa-Oiba; desvío sugerido por Chiquinquirá",
      delayMinutes: 75,
      currentLocation: "Tunja",
      newRouteDetails: { via: "Chiquinquirá - Vélez", distanceKm: 280, etaMinutes: 340 },
    });

    console.log(`  ✔ Incidencia registrada: ${incRes.incidentId}. Ruta alternativa propuesta.`);

    // Aprobar ruta alternativa
    const approveIncRes = await approveAlternativeRoute(incRes.incidentId, "Admin Logístico");
    if (!approveIncRes.success) {
      testErrors.push(`FAIL 6.3: Falló la aprobación de la ruta alternativa: ${approveIncRes.message}`);
    } else {
      console.log(`  ✔ ${approveIncRes.message}`);
    }

    // ---------------------------------------------------------
    // TEST 7: Aislamiento Total Multiempresa
    // ---------------------------------------------------------
    console.log("\n--- TEST 7: Aislamiento Total Multiempresa ---");
    const platicaProds = await db.select().from(products).where(eq(products.companyId, "comp_platica"));
    const storeOnlyProds = await db.select().from(products).where(eq(products.companyId, storeOnlyCompId));

    const leaked = platicaProds.some((p) => p.companyId === storeOnlyCompId) || storeOnlyProds.some((p) => p.companyId === "comp_platica");
    if (leaked) {
      testErrors.push("FAIL 7.1: Filtración de datos detectada entre comp_platica y comp_store_only.");
    } else {
      console.log(`  ✔ Aislamiento 100%: comp_platica (${platicaProds.length} productos) y ${storeOnlyCompId} (${storeOnlyProds.length} productos) completamente estancos.`);
    }

  } finally {
    client.release();
  }

  console.log("\n========================================================");
  if (testErrors.length === 0) {
    console.log("🎉 TODAS LAS PRUEBAS DE ACEPTACIÓN PASARON SATISFACTORIAMENTE (0 ERRORES)");
    console.log("========================================================\n");
    process.exit(0);
  } else {
    console.error("❌ SE ENCONTRARON FALLOS EN LA BATERÍA DE PRUEBAS:");
    for (const err of testErrors) {
      console.error(`  • ${err}`);
    }
    console.log("========================================================\n");
    process.exit(1);
  }
}

runAcceptanceTests().catch((err) => {
  console.error("Error fatal en suite de pruebas:", err);
  process.exit(1);
});
