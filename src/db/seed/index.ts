import { db, pool } from "../client";
import { sql } from "drizzle-orm";
import {
  cases,
  caseEvents,
  llmCalls,
  toolCalls,
  idempotencyKeys,
  approvals,
  products,
  warehouses,
  inventory,
  suppliers,
  supplierProducts,
  businessConfig,
} from "../schema";

export async function runSeed() {
  console.log("🚀 Iniciando siembra masiva de datos logísticos e industriales...");

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
        name: "Almacén Refrigerado (Cámara Fría)",
        location: "Sector B - Cadena de Frío",
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
      // Alimentos y Perecederos (Cadena de Frío)
      {
        id: "food_app01",
        name: "Caja de Manzanas Orgánicas (20kg)",
        description: "Manzanas rojas cosecha nacional para exportación",
        category: "food",
        sku: "SKU-APP01",
        minStock: 50,
        origin: "real",
      },
      {
        id: "food_mil04",
        name: "Leche Entera 1L (Pack x12)",
        description: "Leche pasteurizada en envase tetrapack",
        category: "food",
        sku: "SKU-MIL04",
        minStock: 200,
        origin: "real",
      },
      {
        id: "food_queso05",
        name: "Queso Manchego Artesanal 500g",
        description: "Queso madurado de leche entera",
        category: "food",
        sku: "SKU-QMA05",
        minStock: 60,
        origin: "real",
      },
      {
        id: "food_carne01",
        name: "Corte Res Vacío Premium (5kg)",
        description: "Carne fresca empacada al alto vacío",
        category: "food",
        sku: "SKU-CRV01",
        minStock: 25,
        origin: "real",
      },
      {
        id: "food_pan02",
        name: "Harina de Trigo Industrial 25kg",
        description: "Saco de harina para panificación y alimentos",
        category: "food",
        sku: "SKU-HAR25",
        minStock: 40,
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
      // Microcontrolador MCU-32: ¡COMPLETAMENTE AGOTADO (0 de 25)!
      { id: "inv_003", productId: "prod_mc32", warehouseId: "alm_central", stock: 0, salesCount: 890 },
      // PLC-10: Carencia crítica (1 de 8)
      { id: "inv_004", productId: "prod_plc10", warehouseId: "alm_central", stock: 1, salesCount: 120 },
      // Válvula VS-100: ¡COMPLETAMENTE AGOTADO (0 de 12)!
      { id: "inv_005", productId: "prod_val99", warehouseId: "alm_central", stock: 0, salesCount: 310 },
      // Bomba Centrífuga: Saludable (3 de 4)
      { id: "inv_006", productId: "prod_bomba_h20", warehouseId: "alm_central", stock: 3, salesCount: 45 },
      // Relevador SSR-12: ¡COMPLETAMENTE AGOTADO (0 de 30)!
      { id: "inv_007", productId: "prod_rele_r12", warehouseId: "alm_central", stock: 0, salesCount: 680 },
      // Bobina Cable: Stock abundante (40 de 15)
      { id: "inv_008", productId: "prod_cables_c5", warehouseId: "alm_central", stock: 40, salesCount: 210 },
      // Manzanas: Carencia (45 de 50) - Caduca en 6 días
      {
        id: "inv_009",
        productId: "food_app01",
        warehouseId: "alm_refrig",
        stock: 45,
        salesCount: 650,
        expirationDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      },
      // Leche: Carencia (180 de 200) - ¡Caduca en 2 días (Crítica)!
      {
        id: "inv_010",
        productId: "food_mil04",
        warehouseId: "alm_refrig",
        stock: 180,
        salesCount: 1980,
        expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      // Queso Manchego: ¡COMPLETAMENTE AGOTADO (0 de 60)!
      {
        id: "inv_011",
        productId: "food_queso05",
        warehouseId: "alm_refrig",
        stock: 0,
        salesCount: 520,
        expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
      // Carne Res: Carencia urgente (8 de 25) - Caduca en 3 días
      {
        id: "inv_012",
        productId: "food_carne01",
        warehouseId: "alm_refrig",
        stock: 8,
        salesCount: 780,
        expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      // Harina de Trigo: Saludable (150 de 40)
      { id: "inv_013", productId: "food_pan02", warehouseId: "alm_central", stock: 150, salesCount: 340 },
      // Guantes de Nitrilo: ¡TOP GANADOR EN VENTAS (2,450 ventas)! Stock saludable (350 de 100)
      { id: "inv_014", productId: "tool_guantes_g1", warehouseId: "alm_central", stock: 350, salesCount: 2450 },
      // Lubricante Alimenticio: Carencia (4 de 15)
      { id: "inv_015", productId: "tool_lub_02", warehouseId: "alm_central", stock: 4, salesCount: 95 },
      // Filtro HEPA: ¡COMPLETAMENTE AGOTADO (0 de 20)!
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

  // 4. Proveedores Industriales y Comerciales
  await db
    .insert(suppliers)
    .values([
      {
        id: "prov_grainger",
        name: "Grainger Industrial México",
        email: "ordenes@grainger.com.mx",
        phone: "+52 55 5804 5000",
        origin: "real",
      },
      {
        id: "prov_uline",
        name: "Uline Supply Co.",
        email: "ventas@uline.mx",
        phone: "+52 800 295 5510",
        origin: "real",
      },
      {
        id: "prov_mouser",
        name: "Mouser Electronics México",
        email: "soporte@mouser.com",
        phone: "+52 33 3612 9000",
        origin: "real",
      },
      {
        id: "prov_sysco",
        name: "Sysco Alimentos & Abasto",
        email: "pedidos@sysco.com.mx",
        phone: "+52 55 9010 4000",
        origin: "real",
      },
      {
        id: "prov_festo",
        name: "Festo Automatización S.A.",
        email: "ventas@festo.com.mx",
        phone: "+52 55 5321 6600",
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
      // Manzanas
      { id: "sp_010", supplierId: "prov_sysco", productId: "food_app01", unitPrice: "280.00", minOrderQuantity: 10, leadTimeDays: 1 },
      // Leche
      { id: "sp_011", supplierId: "prov_sysco", productId: "food_mil04", unitPrice: "220.00", minOrderQuantity: 20, leadTimeDays: 1 },
      // Queso Manchego (Agotado)
      { id: "sp_012", supplierId: "prov_sysco", productId: "food_queso05", unitPrice: "75.00", minOrderQuantity: 30, leadTimeDays: 2 },
      // Guantes de Nitrilo (Top Ventas)
      { id: "sp_013", supplierId: "prov_uline", productId: "tool_guantes_g1", unitPrice: "140.00", minOrderQuantity: 20, leadTimeDays: 2 },
      { id: "sp_014", supplierId: "prov_grainger", productId: "tool_guantes_g1", unitPrice: "155.00", minOrderQuantity: 10, leadTimeDays: 1 },
    ])
    .onConflictDoNothing();

  // 6. Configuración de Negocio (Límite de Aprobación de Compras)
  await db
    .insert(businessConfig)
    .values([
      {
        key: "approval_limit_amount",
        value: "10000.00",
        description: "Monto máximo en MXN permitido para crear órdenes de compra sin requerir aprobación humana",
      },
    ])
    .onConflictDoNothing();

  console.log("✅ Datos logísticos de prueba sembrados exitosamente en Supabase.");
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
