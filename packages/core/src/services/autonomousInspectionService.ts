import { pool, db } from "../db/client";
import { discoverCustomerSchema, type DiscoveredTable, type TableMappingProposal } from "./schemaDiscoveryService";
import { resolveLocaleAutonomously, type ResolvedLocale } from "./universalLocaleEngine";
import { quarantineRecord, isBrokenEncoding } from "./dataHealthService";

export interface AutonomousInspectionResult {
  companyId: string;
  inferredProfile: "tienda" | "tienda_proveedores" | "logistica_completa";
  profileReason: string;
  inferredLocale: ResolvedLocale;
  tableProposals: TableMappingProposal[];
  dataHealthScore: number;
  detectedErrors: Array<{
    type: "CORRUPT_PRICE" | "NEGATIVE_STOCK" | "BROKEN_ENCODING" | "SCHEMA_COLLISION" | "DUPLICATE_SKU";
    table: string;
    description: string;
    sampleId?: string;
  }>;
  totalProductsCount: number;
  totalSuppliersCount: number;
  totalShipmentsCount: number;
  quarantinedCount: number;
}

/**
 * Inspecciona una base de datos de forma 100% autónoma:
 * - Deduce el modelo de negocio (Solo Tienda vs Proveedores vs Logística) sin que el usuario tenga que adivinarlo.
 * - Deduce país, divisa y sede a partir del contenido real de los datos (sin hardcodear ningún país).
 * - Reconoce de forma autónoma anomalías, registros corruptos y colisiones de esquema (Tarea 0).
 */
export async function inspectAndDiagnoseDatabaseAutonomously(
  companyId: string,
): Promise<AutonomousInspectionResult> {
  const schema = await discoverCustomerSchema(companyId);
  const detectedErrors: AutonomousInspectionResult["detectedErrors"] = [];
  let quarantinedCount = 0;

  // 1. Análisis de tablas encontradas
  const targetEntities = schema.proposals.map((p) => p.targetEntity);
  const hasLogistics = targetEntities.includes("shipments");
  const hasSuppliers = targetEntities.includes("suppliers");
  const hasProducts = targetEntities.includes("products");
  const hasOrders = targetEntities.includes("orders");

  let inferredProfile: AutonomousInspectionResult["inferredProfile"] = "tienda";
  let profileReason = "Tu base de datos contiene catálogo de productos y pedidos minoristas. MINT activó el modo Solo Tienda sin ruido de flota.";

  if (hasLogistics) {
    inferredProfile = "logistica_completa";
    profileReason = "Detectamos tablas de transporte, despachos o guías en tu base de datos. MINT habilitó Logística Completa con rastreo.";
  } else if (hasSuppliers) {
    inferredProfile = "tienda_proveedores";
    profileReason = "Detectamos directorio de proveedores en tu base de datos. MINT habilitó gestión de compras y reabastecimiento.";
  }

  // 2. Muestreo de datos reales para detectar divisa, ciudad y errores
  const client = await pool.connect();
  let sampledCurrency = "";
  let sampledCity = "";
  let sampledCountry = "";
  let productsCount = 0;
  let suppliersCount = 0;
  let shipmentsCount = 0;

  try {
    for (const proposal of schema.proposals) {
      const tableName = proposal.sourceTable;

      // Obtener conteo real de registros
      try {
        const countRes = await client.query(`SELECT count(*)::int as c FROM "${tableName}"`);
        const count = countRes.rows[0]?.c || 0;
        if (proposal.targetEntity === "products") productsCount = count;
        if (proposal.targetEntity === "suppliers") suppliersCount = count;
        if (proposal.targetEntity === "shipments") shipmentsCount = count;
      } catch {}

      // Muestrear hasta 20 filas para análisis de contenido y errores
      try {
        const sampleRes = await client.query(`SELECT * FROM "${tableName}" LIMIT 20`);
        const rows = sampleRes.rows;

        for (const row of rows) {
          const rowStr = JSON.stringify(row);

          // A. Reconocer errores de codificación rota (Mojibake UTF-8)
          if (isBrokenEncoding(rowStr)) {
            detectedErrors.push({
              type: "BROKEN_ENCODING",
              table: tableName,
              description: `Caracteres corruptos o codificación rota detectada en registro '${row.id || row.sku || "id"}'.`,
              sampleId: String(row.id || row.sku || "fila"),
            });
            await quarantineRecord({
              companyId,
              entityType: (proposal.targetEntity === "unknown" ? "products" : proposal.targetEntity) as any,
              sourceTable: tableName,
              recordIdentifier: String(row.id || row.sku || "desconocido"),
              rawPayload: row,
              violationType: "BROKEN_ENCODING",
              reason: "Codificación rota / Mojibake UTF-8 detectada automáticamente",
            }).catch(() => {});
            quarantinedCount++;
          }

          // B. Reconocer errores en productos (precios NULL, negativos o stock negativo)
          if (proposal.targetEntity === "products") {
            const priceCol = proposal.columnMappings["salePrice"] || "precio" || "price";
            const val = row[priceCol];
            if (val !== undefined && (val === null || Number(val) < 0 || isNaN(Number(val)))) {
              detectedErrors.push({
                type: "CORRUPT_PRICE",
                table: tableName,
                description: `Producto '${row.name || row.nombre || row.sku}' tiene un precio inválido o nulo (${val}).`,
                sampleId: String(row.sku || row.id || "prod"),
              });
              await quarantineRecord({
                companyId,
                entityType: "products",
                sourceTable: tableName,
                recordIdentifier: String(row.sku || row.id || "prod"),
                rawPayload: row,
                violationType: "CORRUPT_PRICE",
                reason: `Precio nulo o negativo (${val}) detectado en auditoría autónoma`,
              }).catch(() => {});
              quarantinedCount++;
            }
          }

          // C. Reconocer errores de existencias negativas
          if (proposal.targetEntity === "inventory") {
            const stockCol = proposal.columnMappings["stock"] || "stock" || "cantidad";
            const sVal = Number(row[stockCol]);
            if (!isNaN(sVal) && sVal < 0) {
              detectedErrors.push({
                type: "NEGATIVE_STOCK",
                table: tableName,
                description: `Existencias negativas (${sVal}u) detectadas en almacén.`,
                sampleId: String(row.productId || row.sku || "inv"),
              });
              await quarantineRecord({
                companyId,
                entityType: "inventory",
                sourceTable: tableName,
                recordIdentifier: String(row.productId || row.sku || "inv"),
                rawPayload: row,
                violationType: "NEGATIVE_STOCK",
                reason: `Stock negativo (${sVal}) detectado en auditoría autónoma`,
              }).catch(() => {});
              quarantinedCount++;
            }
          }

          // D. Extraer pistas de divisa y ubicación de los datos
          if (!sampledCurrency) {
            for (const [k, v] of Object.entries(row)) {
              const kNorm = k.toLowerCase();
              if (kNorm.includes("currency") || kNorm.includes("moneda") || kNorm.includes("divisa")) {
                if (typeof v === "string" && v.length >= 2) {
                  sampledCurrency = v.trim();
                }
              }
            }
          }

          if (!sampledCity) {
            for (const [k, v] of Object.entries(row)) {
              const kNorm = k.toLowerCase();
              if (kNorm.includes("ciudad") || kNorm.includes("city") || kNorm.includes("destino") || kNorm.includes("sede")) {
                if (typeof v === "string" && v.trim().length > 2) {
                  sampledCity = v.trim();
                }
              }
              if (kNorm.includes("pais") || kNorm.includes("country")) {
                if (typeof v === "string" && v.trim().length > 2) {
                  sampledCountry = v.trim();
                }
              }
            }
          }
        }
      } catch {}
    }

    // Inspección de tablas de productos e inventario de la empresa
    try {
      const prodRes = await client.query(
        `SELECT * FROM products WHERE company_id = $1 LIMIT 50`,
        [companyId]
      );
      if (prodRes.rows.length > 0) {
        productsCount += prodRes.rows.length;
        for (const row of prodRes.rows) {
          const rowStr = JSON.stringify(row);
          if (isBrokenEncoding(rowStr)) {
            detectedErrors.push({
              type: "BROKEN_ENCODING",
              table: "products",
              description: `Caracteres corruptos o codificación rota detectada en producto '${row.sku || row.name}'.`,
              sampleId: String(row.id || row.sku),
            });
            await quarantineRecord({
              companyId,
              entityType: "products",
              sourceTable: "products",
              recordIdentifier: String(row.id || row.sku),
              rawPayload: row,
              violationType: "BROKEN_ENCODING",
              reason: "Codificación rota / Mojibake UTF-8 detectada en catálogo de productos",
            }).catch(() => {});
            quarantinedCount++;
          }

          const priceVal = row.price;
          if (priceVal !== undefined && priceVal !== null) {
            const numP = Number(priceVal);
            if (isNaN(numP) || numP < 0) {
              detectedErrors.push({
                type: "CORRUPT_PRICE",
                table: "products",
                description: `Producto '${row.name || row.sku}' tiene un precio inválido o negativo (${priceVal}).`,
                sampleId: String(row.id || row.sku),
              });
              await quarantineRecord({
                companyId,
                entityType: "products",
                sourceTable: "products",
                recordIdentifier: String(row.id || row.sku),
                rawPayload: row,
                violationType: "CORRUPT_PRICE",
                reason: `Precio nulo o negativo (${priceVal}) detectado en auditoría autónoma`,
              }).catch(() => {});
              quarantinedCount++;
            }
          }
        }
      }
    } catch {}

    try {
      const invRes = await client.query(
        `SELECT * FROM inventory WHERE company_id = $1 LIMIT 50`,
        [companyId]
      );
      for (const row of invRes.rows) {
        const sVal = Number(row.stock);
        if (!isNaN(sVal) && sVal < 0) {
          detectedErrors.push({
            type: "NEGATIVE_STOCK",
            table: "inventory",
            description: `Existencias negativas (${sVal}u) detectadas en inventario para '${row.product_id}'.`,
            sampleId: String(row.id || row.product_id),
          });
          await quarantineRecord({
            companyId,
            entityType: "inventory",
            sourceTable: "inventory",
            recordIdentifier: String(row.id || row.product_id),
            rawPayload: row,
            violationType: "NEGATIVE_STOCK",
            reason: `Stock negativo (${sVal}) detectado en auditoría autónoma`,
          }).catch(() => {});
          quarantinedCount++;
        }
      }
    } catch {}

    try {
      const suppRes = await client.query(
        `SELECT count(*)::int as c FROM suppliers WHERE company_id = $1`,
        [companyId]
      );
      const sCount = suppRes.rows[0]?.c || 0;
      if (sCount > 0) suppliersCount += sCount;
    } catch {}

    try {
      const shipRes = await client.query(
        `SELECT count(*)::int as c FROM shipments WHERE company_id = $1`,
        [companyId]
      );
      const shCount = shipRes.rows[0]?.c || 0;
      if (shCount > 0) shipmentsCount += shCount;
    } catch {}

    try {
      const compRes = await client.query(
        `SELECT * FROM companies WHERE id = $1 LIMIT 1`,
        [companyId]
      );
      if (compRes.rows.length > 0) {
        if (!sampledCurrency && compRes.rows[0].currency && compRes.rows[0].currency !== "USD") {
          sampledCurrency = compRes.rows[0].currency;
        }
        if (!sampledCountry && compRes.rows[0].country && compRes.rows[0].country !== "sin definir") {
          sampledCountry = compRes.rows[0].country;
        }
      }
    } catch {}
  } finally {
    client.release();
  }

  // Actualizar perfil deducido considerando tablas externas y tablas internas
  if (hasLogistics || shipmentsCount > 0) {
    inferredProfile = "logistica_completa";
    profileReason = "Detectamos operaciones de transporte, despachos o flota. MINT habilitó Logística Completa con rastreo.";
  } else if (hasSuppliers || suppliersCount > 0) {
    inferredProfile = "tienda_proveedores";
    profileReason = "Detectamos directorio de proveedores activos. MINT habilitó gestión de compras y reabastecimiento.";
  }

  // 3. Resolución autónoma de país y divisa basada en los datos reales encontrados
  const localeQuery = [sampledCity, sampledCountry, sampledCurrency].filter(Boolean).join(" ");
  const inferredLocale = resolveLocaleAutonomously(localeQuery || "Internacional");

  // Si se detectó una divisa explícita en las columnas (ej: "EUR", "ARS", "CLP", "USD")
  if (sampledCurrency && /^[A-Z]{3}$/i.test(sampledCurrency)) {
    inferredLocale.currency = sampledCurrency.toUpperCase();
  }

  // 4. Calcular puntaje de salud de datos
  const totalAudited = Math.max(productsCount + suppliersCount + shipmentsCount, 1);
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - (detectedErrors.length * 100) / totalAudited)));

  return {
    companyId,
    inferredProfile,
    profileReason,
    inferredLocale,
    tableProposals: schema.proposals,
    dataHealthScore: healthScore,
    detectedErrors,
    totalProductsCount: productsCount,
    totalSuppliersCount: suppliersCount,
    totalShipmentsCount: shipmentsCount,
    quarantinedCount,
  };
}
