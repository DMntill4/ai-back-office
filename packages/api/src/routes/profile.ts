import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import {
  db,
  companies,
  products,
  inventory,
  suppliers,
  supplierProducts,
  warehouses,
  businessConfig,
  getCompanyDataProfile,
} from "@mint/core";
import {
  extractProductsFromSqlFile,
  extractSuppliersFromSqlFile,
  type ExtractedProductItem,
  type ExtractedSupplierItem,
} from "@mint/ingest";
import { eq, and, sql, desc } from "drizzle-orm";
import { currentSession } from "./auth";
import { sseHub } from "../events/sseHub";

const MAX_SQL_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

interface IngestSqlOptions {
  companyId: string;
  filePath: string;
  filename: string;
  replaceDemo?: boolean;
}

async function executeSqlIngestion(opts: IngestSqlOptions) {
  const { companyId, filePath, filename, replaceDemo = false } = opts;

  // 1. Extraer entidades del archivo SQL usando el motor de introspección de @mint/ingest
  const extractedProducts = extractProductsFromSqlFile(filePath);
  const extractedSuppliers = extractSuppliersFromSqlFile(filePath);

  if (extractedProducts.length === 0 && extractedSuppliers.length === 0) {
    throw new Error(
      "No se encontraron sentencias INSERT reconocibles de productos, inventario ni proveedores en el archivo SQL. Asegúrate de incluir tablas de catálogo (ej. 'products', 'articulos', 'herramientas', 'inventario', 'suppliers', 'proveedores').",
    );
  }

  // 2. Si se solicitó reemplazar los datos demo, eliminar registros no marcados como 'real'
  let deletedDemoCount = 0;
  if (replaceDemo) {
    const demoProds = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.companyId, companyId), eq(products.origin, "simulado")));

    if (demoProds.length > 0) {
      const demoIds = demoProds.map((p) => p.id);
      for (const pId of demoIds) {
        await db.delete(inventory).where(and(eq(inventory.productId, pId), eq(inventory.companyId, companyId)));
        await db.delete(supplierProducts).where(eq(supplierProducts.productId, pId));
        await db.delete(products).where(and(eq(products.id, pId), eq(products.companyId, companyId)));
      }
      deletedDemoCount = demoIds.length;
    }
  }

  // 3. Asegurar almacén central para existencias físicas
  const [comp] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const warehouseId = `alm_central_${companyId}`.slice(0, 36);
  const warehouseCity = comp?.city || comp?.country || "Bucaramanga";

  await db
    .insert(warehouses)
    .values({
      id: warehouseId,
      companyId,
      name: `Almacén Central Operativo (${comp?.name || "Sede Principal"})`,
      location: warehouseCity,
      city: warehouseCity,
    })
    .onConflictDoNothing();

  // 4. Insertar proveedores reales extraídos
  const createdSupplierIds: string[] = [];
  for (const supp of extractedSuppliers) {
    const suppSlug = supp.name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 24);
    const suppId = `supp_${suppSlug}_${companyId}`.slice(0, 50);

    await db
      .insert(suppliers)
      .values({
        id: suppId,
        companyId,
        name: supp.name,
        email: supp.email || `contacto@${suppSlug}.com`,
        phone: supp.phone || "+57 (607) 639-0000",
        streetAddress: supp.city || warehouseCity,
        city: supp.city || warehouseCity,
        origin: "real",
      })
      .onConflictDoNothing();

    createdSupplierIds.push(suppId);
  }

  // 5. Insertar productos reales e inventario
  let importedCount = 0;
  let totalStockCount = 0;
  const sampleItems: Array<{ sku: string; name: string; category: string; stock: number; price: number }> = [];

  for (let i = 0; i < extractedProducts.length; i++) {
    const item = extractedProducts[i];
    const cleanCompany = companyId.replace(/[^a-z0-9_]/g, "_");
    const cleanSku = item.sku.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const prodId = `prod_${cleanCompany}_${cleanSku}`.slice(0, 50);

    await db
      .insert(products)
      .values({
        id: prodId,
        companyId,
        sku: item.sku,
        name: item.name,
        category: item.category || "General",
        minStock: item.minStock || 10,
        origin: "real",
      })
      .onConflictDoUpdate({
        target: [products.companyId, products.sku],
        set: {
          name: item.name,
          category: item.category || "General",
          minStock: item.minStock || 10,
          origin: "real",
        },
      });

    const stock = Number.isFinite(item.stock) && item.stock >= 0 ? item.stock : 15;
    const unitCost = Number.isFinite(item.price) && item.price > 0 ? String(item.price) : "125000";

    const invId = `inv_${prodId}_${warehouseId}`.slice(0, 50);
    const existingInv = await db
      .select({ id: inventory.id })
      .from(inventory)
      .where(and(eq(inventory.productId, prodId), eq(inventory.warehouseId, warehouseId)))
      .limit(1);

    if (existingInv.length > 0) {
      await db
        .update(inventory)
        .set({ stock, updatedAt: new Date() })
        .where(eq(inventory.id, existingInv[0].id));
    } else {
      await db
        .insert(inventory)
        .values({
          id: invId,
          companyId,
          productId: prodId,
          warehouseId,
          stock,
        })
        .onConflictDoNothing();
    }

    // Vincular al proveedor extraído (o al primer proveedor disponible)
    const assignedSupplier = createdSupplierIds[i % (createdSupplierIds.length || 1)];
    if (assignedSupplier) {
      const spId = `sp_${assignedSupplier.slice(0, 15)}_${prodId.slice(0, 25)}`;
      await db
        .insert(supplierProducts)
        .values({
          id: spId,
          companyId,
          supplierId: assignedSupplier,
          productId: prodId,
          unitPrice: unitCost,
          minOrderQuantity: 1,
          leadTimeDays: 3,
        })
        .onConflictDoNothing()
        .catch(() => {});
    }

    importedCount++;
    totalStockCount += stock;

    if (sampleItems.length < 5) {
      sampleItems.push({
        sku: item.sku,
        name: item.name,
        category: item.category || "General",
        stock,
        price: parseFloat(unitCost),
      });
    }
  }

  // 6. Actualizar metadatos de configuración del negocio
  const now = new Date().toISOString();
  await db
    .insert(businessConfig)
    .values([
      {
        companyId,
        key: "database_last_sql_import",
        value: now,
        description: "Fecha y hora de la última ingesta de base de datos SQL real",
      },
      {
        companyId,
        key: "database_last_sql_filename",
        value: filename,
        description: "Nombre del archivo SQL o script fuente cargado por el usuario",
      },
      {
        companyId,
        key: "database_catalog_mode",
        value: "REAL_DATA_ACTIVE",
        description: "Estado del catálogo de datos: Reales (S3)",
      },
    ])
    .onConflictDoUpdate({
      target: [businessConfig.companyId, businessConfig.key],
      set: { value: sql`EXCLUDED.value`, updatedAt: new Date() },
    })
    .catch(() => {});

  // 7. Emitir evento SSE en tiempo real para todos los dashboards
  sseHub.broadcast({
    type: "database_sync_completed",
    agent: "DatabaseConfig [S3 Real Data]",
    action: "sql_import",
    details: `Base de datos configurada e importada desde '${filename}': ${importedCount} productos y ${extractedSuppliers.length} proveedores reales.`,
    resultSummary: `${importedCount} referencias físicas cargadas · ${totalStockCount} unidades en inventario`,
    payload: {
      filename,
      importedProducts: importedCount,
      importedSuppliers: extractedSuppliers.length,
      totalStockCount,
      deletedDemoCount,
      timestamp: now,
    },
  });

  return {
    importedProducts: importedCount,
    importedSuppliers: extractedSuppliers.length,
    totalStockUnits: totalStockCount,
    deletedDemoCount,
    filename,
    timestamp: now,
    sample: sampleItems,
  };
}

export async function profileRoutes(fastify: FastifyInstance) {
  // 1. Perfil general de capacidades y salud del negocio
  fastify.get("/api/profile", async (request: FastifyRequest) => {
    const query = (request.query as any) || {};
    const companyId = query.companyId || currentSession.companyId;

    try {
      const data = await getCompanyDataProfile(companyId);
      return { success: true, data };
    } catch (err: any) {
      return {
        success: false,
        data: null,
        message: `Error al construir el perfil de datos: ${err.message}`,
      };
    }
  });

  // 2. Estado de conexión y catálogo de la Base de Datos (Requerimiento S3: Datos Reales)
  fastify.get("/api/profile/database", async (request: FastifyRequest) => {
    const query = (request.query as any) || {};
    const companyId = query.companyId || currentSession.companyId;

    try {
      const [comp] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);

      const [prods, invs, supps, whs, configs] = await Promise.all([
        db.select({ id: products.id, origin: products.origin, sku: products.sku, name: products.name, category: products.category }).from(products).where(eq(products.companyId, companyId)),
        db.select({ stock: inventory.stock }).from(inventory).where(eq(inventory.companyId, companyId)),
        db.select({ id: suppliers.id, origin: suppliers.origin }).from(suppliers).where(eq(suppliers.companyId, companyId)),
        db.select({ id: warehouses.id, name: warehouses.name }).from(warehouses).where(eq(warehouses.companyId, companyId)),
        db.select().from(businessConfig).where(eq(businessConfig.companyId, companyId)),
      ]);

      const configMap = new Map(configs.map((c) => [c.key, c.value]));
      const realProducts = prods.filter((p) => p.origin === "real");
      const demoProducts = prods.filter((p) => p.origin === "simulado");
      const realSuppliers = supps.filter((s) => s.origin === "real");

      const totalStock = invs.reduce((acc, row) => acc + (Number(row.stock) || 0), 0);

      return {
        success: true,
        data: {
          companyId,
          companyName: comp?.name || "Empresa Registrada",
          connectedEngine: "PostgreSQL 16 (Drizzle ORM)",
          databaseName: "ai_back_office",
          totalProducts: prods.length,
          realProductsCount: realProducts.length,
          demoProductsCount: demoProducts.length,
          totalSuppliers: supps.length,
          realSuppliersCount: realSuppliers.length,
          totalWarehouses: whs.length,
          totalStockUnits: totalStock,
          hasRealData: realProducts.length > 0,
          isCatalogRealOnly: demoProducts.length === 0 && realProducts.length > 0,
          lastSyncAt: configMap.get("database_last_sql_import") || null,
          activeDatabaseSource: configMap.get("database_last_sql_filename") || "Catálogo PostgreSQL Predeterminado",
          sampleProducts: prods.slice(0, 5),
        },
      };
    } catch (err: any) {
      return {
        success: false,
        data: null,
        message: `Error al consultar estado de la base de datos: ${err.message}`,
      };
    }
  });

  // 3. Ingesta de Base de Datos vía Script SQL o contenido de texto
  fastify.post("/api/profile/database/sql", async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = currentSession.companyId;
    const body = (request.body as any) || {};

    const sqlContent = body.sqlContent;
    const filename = body.filename || "import_custom.sql";
    const replaceDemo = Boolean(body.replaceDemo);

    if (!sqlContent || typeof sqlContent !== "string" || !sqlContent.trim()) {
      reply.code(400);
      return {
        success: false,
        message: "Se requiere 'sqlContent' con sentencias SQL válidas (ej. CREATE TABLE, INSERT INTO).",
      };
    }

    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "mint-sql-"));
    const tmpPath = path.join(tmpDir, filename);

    try {
      await fs.promises.writeFile(tmpPath, sqlContent, "utf8");

      const result = await executeSqlIngestion({
        companyId,
        filePath: tmpPath,
        filename,
        replaceDemo,
      });

      return {
        success: true,
        message: `Base de datos configurada: ${result.importedProducts} productos y ${result.importedSuppliers} proveedores reales cargados en PostgreSQL.`,
        data: result,
      };
    } catch (err: any) {
      reply.code(422);
      return {
        success: false,
        message: err.message || "Error al procesar e importar el script SQL.",
      };
    } finally {
      try {
        await fs.promises.unlink(tmpPath);
        await fs.promises.rmdir(tmpDir);
      } catch {}
    }
  });

  // 4. Ingesta de Base de Datos vía Carga de Archivo .SQL (Multipart)
  fastify.post("/api/profile/database/upload-sql", async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = currentSession.companyId;

    if (!request.isMultipart()) {
      reply.code(415);
      return {
        success: false,
        message: "Se requiere multipart/form-data con un archivo .sql en el campo 'file'.",
      };
    }

    let tmpPath: string | null = null;
    let tmpDir: string | null = null;

    try {
      const data = await request.file({ limits: { fileSize: MAX_SQL_UPLOAD_BYTES } });
      if (!data) {
        reply.code(400);
        return { success: false, message: "No se recibió ningún archivo SQL." };
      }

      const filename = data.filename || "database.sql";
      if (!filename.toLowerCase().endsWith(".sql")) {
        reply.code(415);
        return {
          success: false,
          message: `Formato no soportado: '${filename}'. Debe ser un archivo .sql.`,
        };
      }

      tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "mint-sql-upload-"));
      tmpPath = path.join(tmpDir, filename);
      await pipeline(data.file, fs.createWriteStream(tmpPath));

      if (data.file.truncated) {
        reply.code(413);
        return {
          success: false,
          message: `El archivo SQL excede el límite permitido de ${Math.round(MAX_SQL_UPLOAD_BYTES / 1024 / 1024)} MB.`,
        };
      }

      // Obtener el campo replaceDemo de los campos multipart si está presente
      const fields = (data as any).fields || {};
      const replaceDemo = String(fields.replaceDemo?.value || "true") === "true";

      const result = await executeSqlIngestion({
        companyId,
        filePath: tmpPath,
        filename,
        replaceDemo,
      });

      return {
        success: true,
        message: `Base de datos configurada exitosamente: ${result.importedProducts} productos reales y ${result.importedSuppliers} proveedores cargados.`,
        data: result,
      };
    } catch (err: any) {
      reply.code(422);
      return {
        success: false,
        message: err.message || "Error al procesar el archivo SQL subido.",
      };
    } finally {
      if (tmpPath) {
        try {
          await fs.promises.unlink(tmpPath);
          if (tmpDir) await fs.promises.rmdir(tmpDir);
        } catch {}
      }
    }
  });

  // 5. Purga de datos demo/simulados para conservar exclusivamente el catálogo real
  fastify.post("/api/profile/database/clean-demo", async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = currentSession.companyId;

    try {
      const demoProds = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.companyId, companyId), eq(products.origin, "simulado")));

      let deletedCount = 0;
      for (const p of demoProds) {
        await db.delete(inventory).where(and(eq(inventory.productId, p.id), eq(inventory.companyId, companyId)));
        await db.delete(supplierProducts).where(eq(supplierProducts.productId, p.id));
        await db.delete(products).where(and(eq(products.id, p.id), eq(products.companyId, companyId)));
        deletedCount++;
      }

      return {
        success: true,
        message: `Se eliminaron ${deletedCount} registros simulados. Solo el catálogo real permanece activo.`,
        deletedCount,
      };
    } catch (err: any) {
      reply.code(500);
      return {
        success: false,
        message: `Error al purgar datos simulados: ${err.message}`,
      };
    }
  });
}
