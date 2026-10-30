import { db } from "../client";
import {
  companies,
  warehouses,
  suppliers,
  supplierProducts,
  products,
  inventory,
  businessConfig,
} from "../schema";

export async function seedCocaColaCatalog() {
  const companyId = "comp_coca_cola";
  console.log(`[SEED] Registrando catálogo industrial y logística para ${companyId}...`);

  // 1. Empresa
  await db
    .insert(companies)
    .values({
      id: companyId,
      name: "Coca Cola Company",
      currency: "USD",
      country: "Colombia",
    })
    .onConflictDoUpdate({
      target: [companies.id],
      set: { name: "Coca Cola Company", currency: "USD", country: "Colombia" },
    });

  // 2. Almacén Central geolocalizado
  await db
    .insert(warehouses)
    .values({
      id: "alm_central_comp_coca_cola",
      companyId,
      name: "Centro de Distribución Central Coca Cola",
      location: "Avenida El Dorado # 68-50",
      city: "Bogotá",
      state: "Cundinamarca",
      country: "Colombia",
      latitude: "4.6533",
      longitude: "-74.0583",
    })
    .onConflictDoUpdate({
      target: [warehouses.id],
      set: { name: "Centro de Distribución Central Coca Cola", city: "Bogotá" },
    });

  // 3. Proveedor Homologado
  const suppId = "prov_femsa_coca";
  await db
    .insert(suppliers)
    .values({
      id: suppId,
      companyId,
      name: "FEMSA Distribución Logística",
      email: "pedidos@femsa-logistics.com",
      phone: "+57 1 800 33672",
      city: "Bogotá",
      origin: "real",
    })
    .onConflictDoUpdate({
      target: [suppliers.id],
      set: { name: "FEMSA Distribución Logística", email: "pedidos@femsa-logistics.com" },
    });

  // 4. Catálogo de productos con existencias y punto de reorden
  const items = [
    {
      id: "prod_coca_350",
      sku: "KO-350-LAT",
      name: "Coca Cola Sabor Original 350ml Lata",
      category: "Bebidas Gaseosas",
      price: "1.50",
      costPrice: "0.85",
      minStock: 25,
      stock: 4, // DESABASTO CRITICO ACTIVO: 4 <= 25
      unitPriceSupp: "0.80",
      minQty: 50,
      leadTime: 2,
    },
    {
      id: "prod_coca_zero_500",
      sku: "KO-500-ZER",
      name: "Coca Cola Sin Azúcar 500ml PET",
      category: "Bebidas Gaseosas",
      price: "1.80",
      costPrice: "1.05",
      minStock: 20,
      stock: 1, // DESABASTO CRITICO ACTIVO: 1 <= 20
      unitPriceSupp: "0.98",
      minQty: 40,
      leadTime: 2,
    },
    {
      id: "prod_coca_fam_25l",
      sku: "KO-2500-FAM",
      name: "Coca Cola Original 2.5L Familiar",
      category: "Bebidas Gaseosas",
      price: "3.60",
      costPrice: "2.10",
      minStock: 15,
      stock: 48, // STOCK NORMAL
      unitPriceSupp: "2.00",
      minQty: 20,
      leadTime: 3,
    },
  ];

  for (const item of items) {
    await db
      .insert(products)
      .values({
        id: item.id,
        companyId,
        sku: item.sku,
        name: item.name,
        category: item.category,
        price: item.price,
        costPrice: item.costPrice,
        minStock: item.minStock,
        origin: "real",
      })
      .onConflictDoUpdate({
        target: [products.id],
        set: { name: item.name, minStock: item.minStock, price: item.price, costPrice: item.costPrice },
      });

    await db
      .insert(inventory)
      .values({
        id: `inv_${companyId}_${item.id}`,
        companyId,
        warehouseId: "alm_central_comp_coca_cola",
        productId: item.id,
        stock: item.stock,
      })
      .onConflictDoUpdate({
        target: [inventory.id],
        set: { stock: item.stock },
      });

    await db
      .insert(supplierProducts)
      .values({
        id: `sp_${companyId}_${item.id}`,
        companyId,
        supplierId: suppId,
        productId: item.id,
        unitPrice: item.unitPriceSupp,
        minOrderQuantity: item.minQty,
        leadTimeDays: item.leadTime,
      })
      .onConflictDoUpdate({
        target: [supplierProducts.id],
        set: { unitPrice: item.unitPriceSupp, minOrderQuantity: item.minQty, leadTimeDays: item.leadTime },
      });
  }

  // 5. Configuración de autonomía y módulos
  await db
    .insert(businessConfig)
    .values({
      companyId,
      key: "autonomy_level",
      value: "assisted",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [businessConfig.companyId, businessConfig.key],
      set: { value: "assisted", updatedAt: new Date() },
    });

  await db
    .insert(businessConfig)
    .values({
      companyId,
      key: "active_modules",
      value: JSON.stringify(["inventario", "ventas", "finanzas", "compras_proveedores", "logistica"]),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [businessConfig.companyId, businessConfig.key],
      set: { value: JSON.stringify(["inventario", "ventas", "finanzas", "compras_proveedores", "logistica"]), updatedAt: new Date() },
    });

  console.log(`[OK] Catálogo Coca Cola sembrado con éxito en PostgreSQL.`);
}

if (require.main === module) {
  seedCocaColaCatalog()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
