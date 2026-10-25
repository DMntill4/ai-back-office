import { db, pool } from "../client";
import { sql } from "drizzle-orm";
import {
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
  console.log("[SEED] Sembrando datos de empresa de herramientas y ferreteria industrial en Colombia (Bucaramanga/Bogota/Medellin)...");

  // 0. Empresa Base (Comercializadora Industrial en Colombia)
  await db
    .insert(companies)
    .values([
      {
        id: "comp_default",
        name: "Ferreteria Industrial Santandereana S.A.S.",
        slug: "ferreteria-industrial-santander",
        legalName: "Herramientas y Ferreteria Industrial de Santander S.A.S.",
        taxId: "900.842.190-3",
        rfcTaxId: "9008421903",
        currency: "COP",
        streetAddress: "Zona Franca Santander, Bodega 4",
        city: "Bucaramanga",
        state: "Santander",
        country: "Colombia",
        latitude: "7.072200",
        longitude: "-73.167800",
      },
    ])
    .onConflictDoUpdate({
      target: companies.id,
      set: {
        name: sql`excluded.name`,
        legalName: sql`excluded.legal_name`,
        taxId: sql`excluded.tax_id`,
        currency: sql`excluded.currency`,
        streetAddress: sql`excluded.street_address`,
        city: sql`excluded.city`,
        state: sql`excluded.state`,
        country: sql`excluded.country`,
        latitude: sql`excluded.latitude`,
        longitude: sql`excluded.longitude`,
      },
    });

  // 0.1 Usuario Administrador / Dueño Base
  await db
    .insert(users)
    .values([
      {
        id: "usr_default_admin",
        companyId: "comp_default",
        email: "operaciones@ferreteriasantander.com.co",
        name: "Andres Administrador",
        role: "owner",
        setupCompleted: true,
      },
    ])
    .onConflictDoNothing();

  // 1. Almacenes y Centros de Distribucion en Colombia (GPS Real)
  await db
    .insert(warehouses)
    .values([
      {
        id: "alm_central",
        companyId: "comp_default",
        name: "Almacen Central Bucaramanga",
        location: "Zona Franca Santander, Bodega 4",
        streetAddress: "Km 4 Anillo Vial Giron - Floridablanca",
        city: "Bucaramanga",
        state: "Santander",
        country: "Colombia",
        latitude: "7.072200",
        longitude: "-73.167800",
        contactPhone: "+57 (607) 685-1100",
      },
      {
        id: "alm_bogota",
        companyId: "comp_default",
        name: "Centro de Distribucion Bogota",
        location: "Parque Logistico Calle 80, Modulo 12",
        streetAddress: "Autopista Medellin Km 2.5 Cota",
        city: "Bogota",
        state: "Cundinamarca",
        country: "Colombia",
        latitude: "4.743100",
        longitude: "-74.135200",
        contactPhone: "+57 (601) 745-3300",
      },
      {
        id: "alm_medellin",
        companyId: "comp_default",
        name: "Hub Regional Medellin",
        location: "Itagui, Sector Guayabal, Bodega 8",
        streetAddress: "Carrera 42 # 54A-71",
        city: "Medellin",
        state: "Antioquia",
        country: "Colombia",
        latitude: "6.173000",
        longitude: "-75.611100",
        contactPhone: "+57 (604) 448-2200",
      },
    ])
    .onConflictDoUpdate({
      target: warehouses.id,
      set: {
        name: sql`excluded.name`,
        location: sql`excluded.location`,
        streetAddress: sql`excluded.street_address`,
        city: sql`excluded.city`,
        state: sql`excluded.state`,
        country: sql`excluded.country`,
        latitude: sql`excluded.latitude`,
        longitude: sql`excluded.longitude`,
        contactPhone: sql`excluded.contact_phone`,
      },
    });

  // 2. Catalogo Real de Herramientas y Ferreteria Industrial (16 SKUs)
  await db
    .insert(products)
    .values([
      {
        id: "tool_tld_850",
        companyId: "comp_default",
        name: "Taladro Percutor Industrial 850W Mandril 1/2\"",
        description: "Taladro percutor reversible de alto torque con caja de engranajes metalica",
        category: "herramientas_electricas",
        sku: "SKU-TLD-850",
        minStock: 15,
        origin: "real",
      },
      {
        id: "tool_esm_450",
        companyId: "comp_default",
        name: "Esmeriladora Angular 4-1/2\" 11000 RPM",
        description: "Amoladora angular profesional para corte y desbaste pesado de acero",
        category: "herramientas_electricas",
        sku: "SKU-ESM-450",
        minStock: 20,
        origin: "real",
      },
      {
        id: "tool_rtm_sds",
        companyId: "comp_default",
        name: "Rotomartillo SDS Plus 800W 3 Modos",
        description: "Martillo perforador y demoledor 3.2 Joules para concreto y mamposteria",
        category: "herramientas_electricas",
        sku: "SKU-RTM-SDS",
        minStock: 10,
        origin: "real",
      },
      {
        id: "tool_llv_24p",
        companyId: "comp_default",
        name: "Juego de Llaves Combinadas Cromo-Vanadio 24pz",
        description: "Set profesional milimetrico y en pulgadas forjado en acero Cr-V",
        category: "herramientas_manuales",
        sku: "SKU-LLV-24P",
        minStock: 12,
        origin: "real",
      },
      {
        id: "tool_cmp_50l",
        companyId: "comp_default",
        name: "Compresor de Aire Lubricado 50L 2.5HP",
        description: "Compresor de transmision directa para herramientas neumaticas y pintura",
        category: "maquinaria_industrial",
        sku: "SKU-CMP-50L",
        minStock: 8,
        origin: "real",
      },
      {
        id: "prod_b200",
        companyId: "comp_default",
        name: "Bomba Centrifuga Industrial 2HP 220V",
        description: "Bomba sumergible de acero inoxidable para fluidos y refrigeracion",
        category: "hidraulica_industrial",
        sku: "SKU-B200",
        minStock: 6,
        origin: "real",
      },
      {
        id: "prod_v500",
        companyId: "comp_default",
        name: "Valvula Reguladora de Presion 2\" Brida",
        description: "Valvula de paso para control de sobrepresion hidraulica y de vapor",
        category: "hidraulica_industrial",
        sku: "SKU-V500",
        minStock: 8,
        origin: "real",
      },
      {
        id: "prod_st200",
        companyId: "comp_default",
        name: "Sensor Termico Industrial PT-100 Alta Precision",
        description: "Sonda termometrica de acero inoxidable para hornos y calderas industriales",
        category: "instrumentacion_control",
        sku: "SKU-ST200",
        minStock: 15,
        origin: "real",
      },
      {
        id: "prod_plc10",
        companyId: "comp_default",
        name: "Controlador Logico Programable PLC 24V Ethernet",
        description: "Modulo CPU para automatizacion de lineas de ensamblaje industrial",
        category: "instrumentacion_control",
        sku: "SKU-PLC10",
        minStock: 5,
        origin: "real",
      },
      {
        id: "tool_cable_c12",
        companyId: "comp_default",
        name: "Bobina Cable Cobre Calibre 12 AWG THHN (500m)",
        description: "Conductor electrico antiflama certificado RETIE para fuerza industrial",
        category: "material_electrico",
        sku: "SKU-C12-500",
        minStock: 10,
        origin: "real",
      },
      {
        id: "tool_guantes_g1",
        companyId: "comp_default",
        name: "Guantes de Nitrilo Industrial Reforzados (Caja 100u)",
        description: "Guantes desechables de alta resistencia a solventes quimicos y aceites",
        category: "seguridad_industrial",
        sku: "SKU-GNT100",
        minStock: 50,
        origin: "real",
      },
      {
        id: "tool_careta_sol",
        companyId: "comp_default",
        name: "Careta Fotosensible para Soldadura 4 Sensores",
        description: "Casco de soldadura electronico con oscurecimiento automatico DIN 9-13",
        category: "seguridad_industrial",
        sku: "SKU-CRT-SLD",
        minStock: 15,
        origin: "real",
      },
      {
        id: "tool_disco_corte",
        companyId: "comp_default",
        name: "Discos de Corte Extra Fino 4-1/2\" x 1mm (Paquete 25u)",
        description: "Discos abrasivos de oxido de aluminio para corte rapido de acero inoxidable",
        category: "consumibles_taller",
        sku: "SKU-DSC-100",
        minStock: 40,
        origin: "real",
      },
      {
        id: "tool_lub_02",
        companyId: "comp_default",
        name: "Aceite Lubricante Sintetico ISO 68 Caneca 5 Galones",
        description: "Lubricante de alta viscosidad para engranajes y reductores industriales",
        category: "mantenimiento_industrial",
        sku: "SKU-LUB-05G",
        minStock: 12,
        origin: "real",
      },
      {
        id: "tool_calibrador_v",
        companyId: "comp_default",
        name: "Calibrador Pie de Rey Digital 6\" Acero Inox",
        description: "Vernier digital resolucion 0.01mm con display LCD y estuche rigido",
        category: "metrologia",
        sku: "SKU-CAL-06D",
        minStock: 10,
        origin: "real",
      },
      {
        id: "tool_cortadora_met",
        companyId: "comp_default",
        name: "Tronzadora Sensitiva de Metales 14\" 2400W",
        description: "Cortadora de metales estacionaria con mordaza de fijacion rapida",
        category: "maquinaria_industrial",
        sku: "SKU-TRZ-14",
        minStock: 6,
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

  // 3. Inventario Físico en Bodegas (Con casos reales de quiebre y alerta ROP)
  await db
    .insert(inventory)
    .values([
      // Taladro: Carencia severa (4 de 15) -> Alerta ROP
      { id: "inv_001", companyId: "comp_default", productId: "tool_tld_850", warehouseId: "alm_central", stock: 4, salesCount: 380 },
      // Esmeriladora: Stock critico (3 de 20) -> Alerta ROP
      { id: "inv_002", companyId: "comp_default", productId: "tool_esm_450", warehouseId: "alm_central", stock: 3, salesCount: 520 },
      // Rotomartillo: COMPLETAMENTE AGOTADO (0 de 10) -> Quiebre total
      { id: "inv_003", companyId: "comp_default", productId: "tool_rtm_sds", warehouseId: "alm_central", stock: 0, salesCount: 190 },
      // Juego de Llaves: Saludable (22 de 12)
      { id: "inv_004", companyId: "comp_default", productId: "tool_llv_24p", warehouseId: "alm_central", stock: 22, salesCount: 410 },
      // Compresor 50L: Carencia critica (1 de 8)
      { id: "inv_005", companyId: "comp_default", productId: "tool_cmp_50l", warehouseId: "alm_central", stock: 1, salesCount: 65 },
      // Bomba Centrifuga: Saludable (8 de 6)
      { id: "inv_006", companyId: "comp_default", productId: "prod_b200", warehouseId: "alm_central", stock: 8, salesCount: 42 },
      // Valvula Reguladora: COMPLETAMENTE AGOTADO (0 de 8)
      { id: "inv_007", companyId: "comp_default", productId: "prod_v500", warehouseId: "alm_central", stock: 0, salesCount: 110 },
      // Sensor Termico PT-100: Carencia (3 de 15)
      { id: "inv_008", companyId: "comp_default", productId: "prod_st200", warehouseId: "alm_central", stock: 3, salesCount: 140 },
      // PLC 24V: Stock critico (1 de 5)
      { id: "inv_009", companyId: "comp_default", productId: "prod_plc10", warehouseId: "alm_central", stock: 1, salesCount: 28 },
      // Cable Cobre 12: Saludable (18 de 10)
      { id: "inv_010", companyId: "comp_default", productId: "tool_cable_c12", warehouseId: "alm_central", stock: 18, salesCount: 95 },
      // Guantes de Nitrilo: TOP VENTAS (120 de 50)
      { id: "inv_011", companyId: "comp_default", productId: "tool_guantes_g1", warehouseId: "alm_central", stock: 120, salesCount: 1450 },
      // Careta Soldadura: Carencia (4 de 15)
      { id: "inv_012", companyId: "comp_default", productId: "tool_careta_sol", warehouseId: "alm_central", stock: 4, salesCount: 210 },
      // Discos de Corte: Saludable (65 de 40)
      { id: "inv_013", companyId: "comp_default", productId: "tool_disco_corte", warehouseId: "alm_central", stock: 65, salesCount: 980 },
      // Lubricante Caneca: Carencia (2 de 12)
      { id: "inv_014", companyId: "comp_default", productId: "tool_lub_02", warehouseId: "alm_central", stock: 2, salesCount: 75 },
      // Calibrador Digital: Saludable (14 de 10)
      { id: "inv_015", companyId: "comp_default", productId: "tool_calibrador_v", warehouseId: "alm_central", stock: 14, salesCount: 160 },
      // Tronzadora 14\": Carencia (1 de 6)
      { id: "inv_016", companyId: "comp_default", productId: "tool_cortadora_met", warehouseId: "alm_central", stock: 1, salesCount: 35 },

      // Stock distribuido en Bodega Bogota para permitir Cross-Docking y Balanceo
      { id: "inv_017", companyId: "comp_default", productId: "tool_rtm_sds", warehouseId: "alm_bogota", stock: 12, salesCount: 80 },
      { id: "inv_018", companyId: "comp_default", productId: "tool_esm_450", warehouseId: "alm_medellin", stock: 25, salesCount: 150 },
    ])
    .onConflictDoUpdate({
      target: inventory.id,
      set: {
        stock: sql`excluded.stock`,
        salesCount: sql`excluded.sales_count`,
      },
    });

  // 4. Proveedores Reales del Sector Industrial en Colombia (Bogota, Medellin, Bucaramanga)
  await db
    .insert(suppliers)
    .values([
      {
        id: "prov_dewalt",
        companyId: "comp_default",
        name: "DeWalt Colombia S.A.S.",
        email: "pedidos@dewalt.com.co",
        phone: "+57 (601) 745-8900",
        taxId: "860.052.120-1",
        streetAddress: "Calle 100 # 19-61, Piso 8",
        city: "Bogota",
        state: "Cundinamarca",
        country: "Colombia",
        latitude: "4.686500",
        longitude: "-74.053200",
        origin: "real",
      },
      {
        id: "prov_bosch",
        companyId: "comp_default",
        name: "Bosch Herramientas Industriales Colombia",
        email: "ventas@bosch-herramientas.com.co",
        phone: "+57 (604) 448-1200",
        taxId: "890.900.540-3",
        streetAddress: "Carrera 48 # 26-85, Sector Industriales",
        city: "Medellin",
        state: "Antioquia",
        country: "Colombia",
        latitude: "6.225400",
        longitude: "-75.576800",
        origin: "real",
      },
      {
        id: "prov_makita",
        companyId: "comp_default",
        name: "Makita de Colombia S.A.S.",
        email: "ordenes@makita.com.co",
        phone: "+57 (607) 632-4500",
        taxId: "800.142.330-9",
        streetAddress: "Centro Industrial Chimita, Bodega 12",
        city: "Bucaramanga",
        state: "Santander",
        country: "Colombia",
        latitude: "7.142100",
        longitude: "-73.155400",
        origin: "real",
      },
      {
        id: "prov_stanley",
        companyId: "comp_default",
        name: "Stanley Black & Decker Andina",
        email: "comercial@stanleyandina.com.co",
        phone: "+57 (601) 390-5000",
        taxId: "860.001.450-7",
        streetAddress: "Parque Industrial San Carlos, Bodega 3",
        city: "Bogota",
        state: "Cundinamarca",
        country: "Colombia",
        latitude: "4.711000",
        longitude: "-74.072100",
        origin: "real",
      },
      {
        id: "prov_seguridad",
        companyId: "comp_default",
        name: "Distribuidora de EPP y Seguridad Industrial S.A.S.",
        email: "suministros@seguridad-santander.com",
        phone: "+57 (607) 685-2200",
        taxId: "900.320.115-2",
        streetAddress: "Carrera 15 # 34-45, Centro",
        city: "Bucaramanga",
        state: "Santander",
        country: "Colombia",
        latitude: "7.119300",
        longitude: "-73.122700",
        origin: "real",
      },
    ])
    .onConflictDoUpdate({
      target: suppliers.id,
      set: {
        name: sql`excluded.name`,
        email: sql`excluded.email`,
        phone: sql`excluded.phone`,
        taxId: sql`excluded.tax_id`,
        streetAddress: sql`excluded.street_address`,
        city: sql`excluded.city`,
        state: sql`excluded.state`,
        country: sql`excluded.country`,
        latitude: sql`excluded.latitude`,
        longitude: sql`excluded.longitude`,
      },
    });

  // 5. Ofertas y Cotizaciones en Moneda Real COP (Evaluacion Costo vs Tiempo)
  await db
    .insert(supplierProducts)
    .values([
      // Taladro Percutor 850W
      { id: "sp_001", companyId: "comp_default", supplierId: "prov_dewalt", productId: "tool_tld_850", unitPrice: "185000.00", minOrderQuantity: 5, leadTimeDays: 2 },
      { id: "sp_002", companyId: "comp_default", supplierId: "prov_makita", productId: "tool_tld_850", unitPrice: "192000.00", minOrderQuantity: 2, leadTimeDays: 1 },
      // Esmeriladora Angular 4-1/2
      { id: "sp_003", companyId: "comp_default", supplierId: "prov_bosch", productId: "tool_esm_450", unitPrice: "165000.00", minOrderQuantity: 6, leadTimeDays: 2 },
      { id: "sp_004", companyId: "comp_default", supplierId: "prov_dewalt", productId: "tool_esm_450", unitPrice: "172000.00", minOrderQuantity: 3, leadTimeDays: 2 },
      // Rotomartillo SDS Plus (Agotado)
      { id: "sp_005", companyId: "comp_default", supplierId: "prov_dewalt", productId: "tool_rtm_sds", unitPrice: "480000.00", minOrderQuantity: 2, leadTimeDays: 2 },
      { id: "sp_006", companyId: "comp_default", supplierId: "prov_makita", productId: "tool_rtm_sds", unitPrice: "495000.00", minOrderQuantity: 1, leadTimeDays: 1 },
      // Juego de Llaves Combinadas
      { id: "sp_007", companyId: "comp_default", supplierId: "prov_stanley", productId: "tool_llv_24p", unitPrice: "120000.00", minOrderQuantity: 4, leadTimeDays: 2 },
      // Compresor de Aire 50L
      { id: "sp_008", companyId: "comp_default", supplierId: "prov_bosch", productId: "tool_cmp_50l", unitPrice: "750000.00", minOrderQuantity: 1, leadTimeDays: 3 },
      // Bomba Centrifuga 2HP
      { id: "sp_009", companyId: "comp_default", supplierId: "prov_makita", productId: "prod_b200", unitPrice: "580000.00", minOrderQuantity: 1, leadTimeDays: 1 },
      // Valvula Reguladora de Presion 2\"
      { id: "sp_010", companyId: "comp_default", supplierId: "prov_dewalt", productId: "prod_v500", unitPrice: "210000.00", minOrderQuantity: 2, leadTimeDays: 2 },
      // Sensor Termico PT-100
      { id: "sp_011", companyId: "comp_default", supplierId: "prov_bosch", productId: "prod_st200", unitPrice: "95000.00", minOrderQuantity: 5, leadTimeDays: 2 },
      // PLC 24V Ethernet
      { id: "sp_012", companyId: "comp_default", supplierId: "prov_bosch", productId: "prod_plc10", unitPrice: "1250000.00", minOrderQuantity: 1, leadTimeDays: 3 },
      // Bobina Cable 12 AWG
      { id: "sp_013", companyId: "comp_default", supplierId: "prov_makita", productId: "tool_cable_c12", unitPrice: "320000.00", minOrderQuantity: 2, leadTimeDays: 1 },
      // Guantes de Nitrilo (Caja 100u)
      { id: "sp_014", companyId: "comp_default", supplierId: "prov_seguridad", productId: "tool_guantes_g1", unitPrice: "28000.00", minOrderQuantity: 20, leadTimeDays: 1 },
      // Careta de Soldadura
      { id: "sp_015", companyId: "comp_default", supplierId: "prov_seguridad", productId: "tool_careta_sol", unitPrice: "85000.00", minOrderQuantity: 3, leadTimeDays: 1 },
      // Discos de Corte (Paquete 25u)
      { id: "sp_016", companyId: "comp_default", supplierId: "prov_bosch", productId: "tool_disco_corte", unitPrice: "45000.00", minOrderQuantity: 10, leadTimeDays: 2 },
    ])
    .onConflictDoNothing();

  // 6. Configuracion de Negocio (Moneda COP y Limite de Aprobacion en Pesos Colombianos)
  await db
    .insert(businessConfig)
    .values([
      {
        companyId: "comp_default",
        key: "approval_limit_amount",
        value: "5000000.00",
        currency: "COP",
        description: "Monto maximo en COP ($5,000,000) permitido para compras antes de requerir autorizacion humana en /inbox",
      },
      {
        companyId: "comp_default",
        key: "currency",
        value: "COP",
        currency: "COP",
        description: "Moneda de operacion contable y logistica",
      },
      {
        companyId: "comp_default",
        key: "bot_name",
        value: "Mint Autonomous Logistics Director",
        currency: "COP",
        description: "Nombre del asistente autonomo",
      },
    ])
    .onConflictDoUpdate({
      target: [businessConfig.companyId, businessConfig.key],
      set: {
        value: sql`excluded.value`,
        currency: sql`excluded.currency`,
        description: sql`excluded.description`,
      },
    });

  // 7. Historial de Ventas (Para cálculo de Burn Rate y ROP Dinámico)
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  await db
    .insert(salesHistory)
    .values([
      { id: "sh_001", companyId: "comp_default", productId: "tool_tld_850", saleDate: daysAgo(28), quantity: 8, unitPrice: "245000.00", totalAmount: "1960000.00", channel: "mostrador" },
      { id: "sh_002", companyId: "comp_default", productId: "tool_tld_850", saleDate: daysAgo(14), quantity: 12, unitPrice: "245000.00", totalAmount: "2940000.00", channel: "contratista" },
      { id: "sh_003", companyId: "comp_default", productId: "tool_tld_850", saleDate: daysAgo(5), quantity: 10, unitPrice: "245000.00", totalAmount: "2450000.00", channel: "mostrador" },
      { id: "sh_004", companyId: "comp_default", productId: "tool_esm_450", saleDate: daysAgo(20), quantity: 14, unitPrice: "215000.00", totalAmount: "3010000.00", channel: "industrial" },
      { id: "sh_005", companyId: "comp_default", productId: "tool_esm_450", saleDate: daysAgo(7), quantity: 16, unitPrice: "215000.00", totalAmount: "3440000.00", channel: "industrial" },
      { id: "sh_006", companyId: "comp_default", productId: "tool_guantes_g1", saleDate: daysAgo(15), quantity: 40, unitPrice: "36000.00", totalAmount: "1440000.00", channel: "mostrador" },
      { id: "sh_007", companyId: "comp_default", productId: "tool_guantes_g1", saleDate: daysAgo(3), quantity: 60, unitPrice: "36000.00", totalAmount: "2160000.00", channel: "empresa" },
      { id: "sh_008", companyId: "comp_default", productId: "tool_rtm_sds", saleDate: daysAgo(18), quantity: 6, unitPrice: "620000.00", totalAmount: "3720000.00", channel: "contratista" },
    ])
    .onConflictDoNothing();

  // 8. Seguimiento de Envíos en Colombia (Corredores Bucaramanga - Bogota - Medellin)
  await db
    .insert(shipments)
    .values([
      {
        id: "ship_001",
        companyId: "comp_default",
        trackingNumber: "TRK-SER-44910",
        carrier: "Servientrega Industrial",
        status: "en_transito",
        estimatedDelivery: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        originLocation: "Centro de Distribucion Bogota (Parque Cota)",
        currentLocation: "Tunja - Boyaca (En transito por Ruta 55)",
        destinationLocation: "Almacen Central Bucaramanga",
        notes: "Despacho consolidado de herramientas electricas. Transito en tiempo.",
      },
      {
        id: "ship_002",
        companyId: "comp_default",
        trackingNumber: "TRK-COO-88120",
        carrier: "Coordinadora Mercantil",
        status: "retrasado",
        estimatedDelivery: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Venció ayer
        originLocation: "Hub Regional Medellin (Itagui)",
        currentLocation: "Puerto Araujo (Retencion preventiva en via Magdalena Medio)",
        destinationLocation: "Almacen Central Bucaramanga",
        notes: "Alerta de retraso: derrumbe temporal reportado por Invias.",
      },
      {
        id: "ship_003",
        companyId: "comp_default",
        trackingNumber: "TRK-TCC-10934",
        carrier: "TCC Logistica",
        status: "en_preparacion",
        estimatedDelivery: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        originLocation: "Almacen Central Bucaramanga",
        currentLocation: "Bahia de Despachos Bucaramanga",
        destinationLocation: "Centro de Distribucion Bogota",
        notes: "En espera de consolidacion de carga de maquinaria liviana.",
      },
      {
        id: "ship_004",
        companyId: "comp_default",
        trackingNumber: "TRK-ENV-55219",
        carrier: "Envia Colvanes",
        status: "en_transito",
        estimatedDelivery: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
        originLocation: "Distribuidora EPP Bucaramanga Centro",
        currentLocation: "Giron - Anillo Vial",
        destinationLocation: "Almacen Central Bucaramanga",
        notes: "Entrega local prioritaria de insumos de seguridad.",
      },
    ])
    .onConflictDoNothing();

  console.log("[SEED] Empresa de herramientas industriales en Colombia sembrada con exito en PostgreSQL.");
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
