import { db, pool } from "../client";
import { sql } from "drizzle-orm";
import {
  cases,
  caseEvents,
  llmCalls,
  toolCalls,
  idempotencyKeys,
  approvals,
  companies,
  products,
  warehouses,
  inventory,
  suppliers,
  supplierProducts,
  businessConfig,
  salesHistory,
  shipments,
  users,
} from "../schema";

export async function runSeed() {
  console.log("[SEED] Iniciando siembra masiva de datos logísticos de herramientas y maquinaria industrial...");

  // 0. Empresa Base (Multi-tenant)
  await db
    .insert(companies)
    .values([
      {
        id: "comp_default",
        name: "Acme Industrial Corp",
        slug: "acme-industrial",
      },
    ])
    .onConflictDoNothing();

  // 0.1 Usuario Administrador / Dueño Base
  await db
    .insert(users)
    .values([
      {
        id: "usr_default_admin",
        companyId: "comp_default",
        email: "andres@mint-ai.io",
        name: "Andrés Administrador",
        role: "owner",
        setupCompleted: false, // Permitir ver el setup wizard
      },
    ])
    .onConflictDoNothing();

  // 1. Almacenes / Bodegas
  await db
    .insert(warehouses)
    .values([
      {
        id: "alm_central",
        name: "Almacén Central (Bodega Principal)",
        location: "Sector Industrial A - Bahía 4",
      },
      {
        id: "alm_refrig",
        name: "Almacén de Maquinaria y Herramientas Pesadas",
        location: "Sector B - Bahía de Maquinaria",
      },
      {
        id: "alm_norte",
        name: "Almacén Regional Norte",
        location: "Parque Logístico Norte - Bodega 12",
      },
    ])
    .onConflictDoUpdate({
      target: warehouses.id,
      set: {
        name: sql`excluded.name`,
        location: sql`excluded.location`,
      },
    });

  // 2. Catálogo Extendido de Productos (16 SKUs industriales y comerciales)
  await db
    .insert(products)
    .values([
      // Componentes y Automatización Industrial
      {
        id: "prod_st200",
        name: "Sensor Térmico ST-200",
        description: "Sensor de temperatura industrial de alta precisión (-40C a 200C)",
        category: "industrial",
        sku: "SKU-ST200",
        minStock: 10,
        origin: "real",
      },
      {
        id: "prod_v500",
        name: "Válvula Reguladora V-500",
        description: "Válvula de presión hidráulica de acero inoxidable",
        category: "industrial",
        sku: "SKU-V500",
        minStock: 5,
        origin: "real",
      },
      {
        id: "prod_mc32",
        name: "Microcontrolador MCU-32",
        description: "Placa base de automatización PLC Cortex-M4",
        category: "electronica",
        sku: "SKU-MC32",
        minStock: 25,
        origin: "real",
      },
      {
        id: "prod_plc10",
        name: "Controlador Lógico Programable PLC-10",
        description: "Módulo CPU de automatización con puertos Ethernet/IP",
        category: "industrial",
        sku: "SKU-PLC10",
        minStock: 8,
        origin: "real",
      },
      {
        id: "prod_val99",
        name: "Válvula Sellada VS-100",
        description: "Válvula de seguridad contra sobrepresión para tuberías de vapor",
        category: "hidraulica",
        sku: "SKU-VS100",
        minStock: 12,
        origin: "real",
      },
      {
        id: "prod_bomba_h20",
        name: "Bomba Centrífuga B-200",
        description: "Bomba industrial sumergible para recirculación de refrigerante",
        category: "industrial",
        sku: "SKU-B200",
        minStock: 4,
        origin: "real",
      },
      {
        id: "prod_rele_r12",
        name: "Relevador de Estado Sólido SSR-12",
        description: "Relevador de conmutación rápida 40A para control térmico",
        category: "electronica",
        sku: "SKU-SSR12",
        minStock: 30,
        origin: "real",
      },
      {
        id: "prod_cables_c5",
        name: "Bobina Cable Cobre Calibre 12 (500m)",
        description: "Conductor eléctrico THHN antiflama para instalaciones de fuerza",
        category: "electrico",
        sku: "SKU-C12-500",
        minStock: 15,
        origin: "real",
      },
      // Herramientas, Maquinaria y Equipos Industriales
      {
        id: "tool_tld_850",
        name: "Taladro Percutor Industrial 850W",
        description: "Taladro percutor reversible de alto torque con mandril de 1/2 pulgada",
        category: "herramientas",
        sku: "SKU-TLD-850",
        minStock: 25,
        origin: "real",
      },
      {
        id: "tool_esm_450",
        name: "Esmeriladora Angular 4-1/2 Pulgadas",
        description: "Amoladora angular profesional 11000 RPM para corte y desbaste de metales",
        category: "herramientas",
        sku: "SKU-ESM-450",
        minStock: 20,
        origin: "real",
      },
      {
        id: "tool_llv_24p",
        name: "Juego de Llaves Combinadas Cromo-Vanadio 24pz",
        description: "Set completo métrico y estándar forjado en acero cromo-vanadio",
        category: "herramientas",
        sku: "SKU-LLV-24P",
        minStock: 15,
        origin: "real",
      },
      {
        id: "tool_rtm_sds",
        name: "Rotomartillo Electro-Neumático SDS Plus",
        description: "Martillo perforador y demoledor 3.2 Joules para concreto y mampostería",
        category: "maquinaria",
        sku: "SKU-RTM-SDS",
        minStock: 10,
        origin: "real",
      },
      {
        id: "tool_cmp_50l",
        name: "Compresor de Aire Lubricado 50L 2.5HP",
        description: "Compresor de tanque horizontal para herramientas neumáticas de taller",
        category: "maquinaria",
        sku: "SKU-CMP-50L",
        minStock: 8,
        origin: "real",
      },
      // Herramientas y Consumibles Operativos
      {
        id: "tool_guantes_g1",
        name: "Guantes de Nitrilo Industrial (Caja 100u)",
        description: "Guantes resistentes a químicos e hidrocarburos",
        category: "seguridad",
        sku: "SKU-GNT100",
        minStock: 100,
        origin: "real",
      },
      {
        id: "tool_lub_02",
        name: "Lubricante Sintético Alimenticio 5L",
        description: "Aceite sintético grado NSF H1 para engranajes",
        category: "mantenimiento",
        sku: "SKU-LUB05",
        minStock: 15,
        origin: "real",
      },
      {
        id: "prod_filtro_f10",
        name: "Filtro de Aire HEPA Industrial",
        description: "Filtro de alta eficiencia para cuartos limpios y plantas",
        category: "mantenimiento",
        sku: "SKU-HEPA10",
        minStock: 20,
        origin: "real",
      },
    ])
    .onConflictDoUpdate({
      target: products.id,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        category: sql`excluded.category`,
        sku: sql`excluded.sku`,
        minStock: sql`excluded.min_stock`,
      },
    });

  // 3. Inventario Actualizado (Incluye productos agotados en 0, carencias y vencimientos)
  await db
    .insert(inventory)
    .values([
      // Sensor ST-200: Carencia severa (2 de 10)
      { id: "inv_001", productId: "prod_st200", warehouseId: "alm_central", stock: 2, salesCount: 450 },
      // Válvula V-500: Saludable (15 de 5)
      { id: "inv_002", productId: "prod_v500", warehouseId: "alm_central", stock: 15, salesCount: 1250 },
      // Microcontrolador MCU-32: COMPLETAMENTE AGOTADO (0 de 25)
      { id: "inv_003", productId: "prod_mc32", warehouseId: "alm_central", stock: 0, salesCount: 890 },
      // PLC-10: Carencia crítica (1 de 8)
      { id: "inv_004", productId: "prod_plc10", warehouseId: "alm_central", stock: 1, salesCount: 120 },
      // Válvula VS-100: COMPLETAMENTE AGOTADO (0 de 12)
      { id: "inv_005", productId: "prod_val99", warehouseId: "alm_central", stock: 0, salesCount: 310 },
      // Bomba Centrífuga: Saludable (3 de 4)
      { id: "inv_006", productId: "prod_bomba_h20", warehouseId: "alm_central", stock: 3, salesCount: 45 },
      // Relevador SSR-12: COMPLETAMENTE AGOTADO (0 de 30)
      { id: "inv_007", productId: "prod_rele_r12", warehouseId: "alm_central", stock: 0, salesCount: 680 },
      // Bobina Cable: Stock abundante (40 de 15)
      { id: "inv_008", productId: "prod_cables_c5", warehouseId: "alm_central", stock: 40, salesCount: 210 },
      // Taladro Percutor: Carencia crítica (3 de 25)
      {
        id: "inv_009",
        productId: "tool_tld_850",
        warehouseId: "alm_refrig",
        stock: 3,
        salesCount: 650,
      },
      // Esmeriladora Angular: Carencia severa (4 de 20)
      {
        id: "inv_010",
        productId: "tool_esm_450",
        warehouseId: "alm_refrig",
        stock: 4,
        salesCount: 880,
      },
      // Juego de Llaves: COMPLETAMENTE AGOTADO (0 de 15)
      {
        id: "inv_011",
        productId: "tool_llv_24p",
        warehouseId: "alm_refrig",
        stock: 0,
        salesCount: 520,
      },
      // Rotomartillo: Carencia urgente (1 de 10)
      {
        id: "inv_012",
        productId: "tool_rtm_sds",
        warehouseId: "alm_refrig",
        stock: 1,
        salesCount: 380,
      },
      // Compresor de Aire 50L: Saludable (12 de 8)
      { id: "inv_013", productId: "tool_cmp_50l", warehouseId: "alm_central", stock: 12, salesCount: 140 },
      // Guantes de Nitrilo: TOP GANADOR EN VENTAS (2,450 ventas) - Stock saludable (350 de 100)
      { id: "inv_014", productId: "tool_guantes_g1", warehouseId: "alm_central", stock: 350, salesCount: 2450 },
      // Lubricante Alimenticio: Carencia (4 de 15)
      { id: "inv_015", productId: "tool_lub_02", warehouseId: "alm_central", stock: 4, salesCount: 95 },
      // Filtro HEPA: COMPLETAMENTE AGOTADO (0 de 20)
      { id: "inv_016", productId: "prod_filtro_f10", warehouseId: "alm_norte", stock: 0, salesCount: 140 },
    ])
    .onConflictDoUpdate({
      target: inventory.id,
      set: {
        stock: sql`excluded.stock`,
        salesCount: sql`excluded.sales_count`,
        expirationDate: sql`excluded.expiration_date`,
      },
    });

  // 4. Proveedores Industriales y de Herramientas
  await db
    .insert(suppliers)
    .values([
      {
        id: "prov_grainger",
        name: "Grainger Industrial Supply",
        email: "ordenes@grainger-supply.com",
        phone: "+1 800 472 4643",
        origin: "real",
      },
      {
        id: "prov_uline",
        name: "Uline Supply Co.",
        email: "ventas@uline-supply.com",
        phone: "+1 800 295 5510",
        origin: "real",
      },
      {
        id: "prov_mouser",
        name: "Mouser Electronics Global",
        email: "soporte@mouser-global.com",
        phone: "+1 800 346 6873",
        origin: "real",
      },
      {
        id: "prov_dewalt",
        name: "Distribuidora Mayorista de Herramientas & Maquinaria",
        email: "pedidos@distribuidora-herramientas.com",
        phone: "+1 800 442 8890",
        origin: "real",
      },
      {
        id: "prov_festo",
        name: "Festo Automatización Industrial",
        email: "ventas@festo-industrial.com",
        phone: "+1 800 993 3786",
        origin: "real",
      },
    ])
    .onConflictDoUpdate({
      target: suppliers.id,
      set: {
        name: sql`excluded.name`,
        email: sql`excluded.email`,
        phone: sql`excluded.phone`,
      },
    });

  // 5. Oferta y Cotizaciones de Proveedores (Para evaluar costo vs tiempo)
  await db
    .insert(supplierProducts)
    .values([
      // Sensor ST-200
      { id: "sp_001", supplierId: "prov_grainger", productId: "prod_st200", unitPrice: "450.00", minOrderQuantity: 5, leadTimeDays: 2 },
      { id: "sp_002", supplierId: "prov_uline", productId: "prod_st200", unitPrice: "420.00", minOrderQuantity: 10, leadTimeDays: 4 },
      // Válvula V-500
      { id: "sp_003", supplierId: "prov_festo", productId: "prod_v500", unitPrice: "1250.00", minOrderQuantity: 2, leadTimeDays: 3 },
      { id: "sp_004", supplierId: "prov_grainger", productId: "prod_v500", unitPrice: "1350.00", minOrderQuantity: 1, leadTimeDays: 1 },
      // Microcontrolador MCU-32 (Agotado)
      { id: "sp_005", supplierId: "prov_mouser", productId: "prod_mc32", unitPrice: "85.50", minOrderQuantity: 20, leadTimeDays: 1 },
      { id: "sp_006", supplierId: "prov_grainger", productId: "prod_mc32", unitPrice: "79.00", minOrderQuantity: 50, leadTimeDays: 5 },
      // PLC-10 (Carencia)
      { id: "sp_007", supplierId: "prov_festo", productId: "prod_plc10", unitPrice: "4800.00", minOrderQuantity: 1, leadTimeDays: 2 },
      // Válvula VS-100 (Agotado)
      { id: "sp_008", supplierId: "prov_grainger", productId: "prod_val99", unitPrice: "890.00", minOrderQuantity: 5, leadTimeDays: 2 },
      // Relevador SSR-12 (Agotado)
      { id: "sp_009", supplierId: "prov_mouser", productId: "prod_rele_r12", unitPrice: "120.00", minOrderQuantity: 10, leadTimeDays: 1 },
      // Taladro Percutor
      { id: "sp_010", supplierId: "prov_dewalt", productId: "tool_tld_850", unitPrice: "1280.00", minOrderQuantity: 5, leadTimeDays: 2 },
      { id: "sp_011", supplierId: "prov_grainger", productId: "tool_tld_850", unitPrice: "1340.00", minOrderQuantity: 2, leadTimeDays: 1 },
      // Esmeriladora Angular
      { id: "sp_012", supplierId: "prov_dewalt", productId: "tool_esm_450", unitPrice: "980.00", minOrderQuantity: 5, leadTimeDays: 2 },
      // Juego de Llaves Combinadas
      { id: "sp_013", supplierId: "prov_dewalt", productId: "tool_llv_24p", unitPrice: "750.00", minOrderQuantity: 3, leadTimeDays: 2 },
      // Rotomartillo
      { id: "sp_014", supplierId: "prov_dewalt", productId: "tool_rtm_sds", unitPrice: "3450.00", minOrderQuantity: 2, leadTimeDays: 3 },
      // Guantes de Nitrilo (Top Ventas)
      { id: "sp_015", supplierId: "prov_uline", productId: "tool_guantes_g1", unitPrice: "140.00", minOrderQuantity: 20, leadTimeDays: 2 },
      { id: "sp_016", supplierId: "prov_grainger", productId: "tool_guantes_g1", unitPrice: "155.00", minOrderQuantity: 10, leadTimeDays: 1 },
    ])
    .onConflictDoNothing();

  // 6. Configuración de Negocio (Límite de Aprobación de Compras)
  await db
    .insert(businessConfig)
    .values([
      {
        companyId: "comp_default",
        key: "approval_limit_amount",
        value: "10000.00",
        currency: "MXN",
        description: "Monto máximo en MXN permitido para crear órdenes de compra sin requerir aprobación humana",
      },
    ])
    .onConflictDoNothing();

  // 7. Historial de Ventas (Para pronosticar_demanda)
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  await db
    .insert(salesHistory)
    .values([
      { id: "sh_001", companyId: "comp_default", productId: "prod_st200", saleDate: daysAgo(30), quantity: 12, unitPrice: "520.00", totalAmount: "6240.00", channel: "directo" },
      { id: "sh_002", companyId: "comp_default", productId: "prod_st200", saleDate: daysAgo(21), quantity: 15, unitPrice: "520.00", totalAmount: "7800.00", channel: "directo" },
      { id: "sh_003", companyId: "comp_default", productId: "prod_st200", saleDate: daysAgo(14), quantity: 18, unitPrice: "520.00", totalAmount: "9360.00", channel: "directo" },
      { id: "sh_004", companyId: "comp_default", productId: "prod_st200", saleDate: daysAgo(7), quantity: 22, unitPrice: "520.00", totalAmount: "11440.00", channel: "directo" },
      { id: "sh_005", companyId: "comp_default", productId: "prod_v500", saleDate: daysAgo(25), quantity: 4, unitPrice: "1400.00", totalAmount: "5600.00", channel: "industrial" },
      { id: "sh_006", companyId: "comp_default", productId: "prod_v500", saleDate: daysAgo(10), quantity: 6, unitPrice: "1400.00", totalAmount: "8400.00", channel: "industrial" },
      { id: "sh_007", companyId: "comp_default", productId: "tool_guantes_g1", saleDate: daysAgo(15), quantity: 50, unitPrice: "180.00", totalAmount: "9000.00", channel: "retail" },
      { id: "sh_008", companyId: "comp_default", productId: "tool_guantes_g1", saleDate: daysAgo(5), quantity: 70, unitPrice: "180.00", totalAmount: "12600.00", channel: "retail" },
    ])
    .onConflictDoNothing();

  // 8. Seguimiento de Envíos (Para consultar_envios)
  await db
    .insert(shipments)
    .values([
      {
        id: "ship_001",
        companyId: "comp_default",
        trackingNumber: "TRK-FEDEX-98214",
        carrier: "FedEx Express",
        status: "en_transito",
        estimatedDelivery: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        originLocation: "Monterrey Hub",
        currentLocation: "Querétaro Distribución",
        destinationLocation: "Almacén Central (CDMX)",
        notes: "Tránsito regular sin incidencias",
      },
      {
        id: "ship_002",
        companyId: "comp_default",
        trackingNumber: "TRK-DHL-44102",
        carrier: "DHL Supply Chain",
        status: "retrasado",
        estimatedDelivery: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Venció ayer!
        originLocation: "Guadalajara Norte",
        currentLocation: "Toluca Retención Aduana/Inspección",
        destinationLocation: "Almacén Refrigerado",
        notes: "Retraso logístico de 48h por inspección en ruta",
      },
      {
        id: "ship_003",
        companyId: "comp_default",
        trackingNumber: "TRK-SIM-10023",
        carrier: "Simulado Logistics",
        status: "en_preparacion",
        estimatedDelivery: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        originLocation: "Saltillo Terminal",
        currentLocation: "Patio de Salida",
        destinationLocation: "Almacén Regional Norte",
        notes: "En espera de carga de unidades",
      },
      {
        id: "ship_004",
        companyId: "comp_default",
        trackingNumber: "TRK-MX-88902",
        carrier: "Estafeta Logistics",
        status: "en_transito",
        estimatedDelivery: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        originLocation: "Guadalajara Hub",
        currentLocation: "Querétaro Distribución",
        destinationLocation: "Almacén Central (CDMX)",
        notes: "Envío prioritario en ruta",
      },
    ])
    .onConflictDoNothing();

  console.log("[SEED] Catálogo industrial y almacén sembrados exitosamente en PostgreSQL.");
}

if (require.main === module) {
  runSeed()
    .catch((err) => {
      console.error("Error al sembrar datos:", err);
      process.exit(1);
    })
    .finally(async () => {
      await pool.end();
    });
}
