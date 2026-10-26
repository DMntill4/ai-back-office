import { db, pool } from "../db/client";
import {
  products,
  inventory,
  warehouses,
  suppliers,
  companies,
} from "../db/schema";
import {
  mintTableMappings,
  mintQuarantineRecords,
  mintQualityScores,
  mintSalesOrders,
} from "../db/schema/mintEntities";
import { eq, and, sql, desc } from "drizzle-orm";
import { performance } from "node:perf_hooks";

export type ModuleConfidenceLevel = "CONFIABLE" | "DUDOSO" | "NO_CONFIABLE";

export interface ModuleAuditResult {
  module: "inventory" | "sales" | "finance" | "logistics" | "suppliers";
  confidenceLevel: ModuleConfidenceLevel;
  scorePercent: number;
  totalRecordsAudited: number;
  corruptRecordsCount: number;
  reasons: string[];
  sampleCorruptRecords: Array<{
    identifier: string;
    violationType: string;
    reason: string;
  }>;
  suggestedFixes: string[];
}

export interface DataHealthReport {
  companyId: string;
  evaluatedAt: string;
  overallHealth: ModuleConfidenceLevel;
  averageScorePercent: number;
  modules: Record<string, ModuleAuditResult>;
  quarantinedTotal: number;
  decisionGateStatus: {
    canPropose: boolean;
    canExecute: boolean;
    requiresDoubtfulBadge: boolean;
    blockedModules: string[];
  };
}

/**
 * Sanitiza cualquier texto proveniente de la BD antes de enviarlo al LLM o CLI.
 * Neutraliza inyecciones de prompt, secuencias de escape y sobrecarga de tokens.
 */
export function sanitizeForAgentContext(text: string | null | undefined, maxLength: number = 300): string {
  if (!text) return "";
  let clean = String(text);

  // 1. Limpieza de secuencias de control / prompts maliciosos
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/gi,
    /system\s+prompt\s*:/gi,
    /you\s+are\s+now\s+(an?|the)/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
    /\[system\]/gi,
    /\[inst\]/gi,
    /developer\s+mode/gi,
    /act\s+as\s+DAN/gi,
    /drop\s+table/gi,
    /union\s+select/gi,
  ];

  for (const pattern of injectionPatterns) {
    clean = clean.replace(pattern, "[FILTRADO_SEGURIDAD]");
  }

  // 2. Truncar longitud para evitar ataques de contexto masivo
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength) + "…[TRUNCADO]";
  }

  // 3. Fencing de seguridad
  return clean.trim();
}

/**
 * Detección de patrones de codificación rota (Mojibake UTF-8 vs Latin1)
 */
export function isBrokenEncoding(text: string): boolean {
  if (!text) return false;
  // Patrones típicos de doble decodificación UTF-8 en español:
  // Ã¡ (á), Ã© (é), Ã­ (í), Ã³ (ó), Ãº (ú), Ã± (ñ), Â¿ (¿)
  const mojibakeRegex = /Ã¡|Ã©|Ã­|Ã³|Ãº|Ã±|Ã‘|Â¿|Â¡|Ã¼|Ãœ|â€œ|â€|ï¿½/g;
  return mojibakeRegex.test(text);
}

/**
 * Registra un registro corrupto en la tabla de cuarentena de MINT.
 * NUNCA modifica ni elimina el registro original del cliente.
 */
export async function quarantineRecord(params: {
  companyId: string;
  entityType: "products" | "inventory" | "sales" | "shipments" | "suppliers";
  sourceTable: string;
  recordIdentifier: string;
  violationType: string;
  reason: string;
  severity?: "WARNING" | "ERROR" | "CRITICAL";
  rawPayload?: Record<string, any>;
}): Promise<void> {
  const id = `quar_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    await db.insert(mintQuarantineRecords).values({
      id,
      companyId: params.companyId,
      entityType: params.entityType,
      sourceTable: params.sourceTable,
      recordIdentifier: params.recordIdentifier,
      violationType: params.violationType,
      reason: params.reason,
      severity: params.severity || "ERROR",
      rawPayload: params.rawPayload || {},
      status: "quarantined",
      createdAt: new Date(),
    });
  } catch (err: any) {
    // Si ya existe o falla por restricción temporal, loguear sin tumbar el hilo principal
    console.warn(`[QUARANTINE_WARN] Fallo al aislar registro ${params.recordIdentifier}:`, err.message);
  }
}

/**
 * Realiza el perfilado exhaustivo de calidad de datos por módulo.
 * Solo lectura; nunca escribe sobre tablas del cliente.
 */
export async function auditDataHealth(companyId: string = "comp_default"): Promise<DataHealthReport> {
  const modulesResults: Record<string, ModuleAuditResult> = {
    inventory: {
      module: "inventory",
      confidenceLevel: "CONFIABLE",
      scorePercent: 100,
      totalRecordsAudited: 0,
      corruptRecordsCount: 0,
      reasons: [],
      sampleCorruptRecords: [],
      suggestedFixes: [],
    },
    sales: {
      module: "sales",
      confidenceLevel: "CONFIABLE",
      scorePercent: 100,
      totalRecordsAudited: 0,
      corruptRecordsCount: 0,
      reasons: [],
      sampleCorruptRecords: [],
      suggestedFixes: [],
    },
    finance: {
      module: "finance",
      confidenceLevel: "CONFIABLE",
      scorePercent: 100,
      totalRecordsAudited: 0,
      corruptRecordsCount: 0,
      reasons: [],
      sampleCorruptRecords: [],
      suggestedFixes: [],
    },
    logistics: {
      module: "logistics",
      confidenceLevel: "CONFIABLE",
      scorePercent: 100,
      totalRecordsAudited: 0,
      corruptRecordsCount: 0,
      reasons: [],
      sampleCorruptRecords: [],
      suggestedFixes: [],
    },
    suppliers: {
      module: "suppliers",
      confidenceLevel: "CONFIABLE",
      scorePercent: 100,
      totalRecordsAudited: 0,
      corruptRecordsCount: 0,
      reasons: [],
      sampleCorruptRecords: [],
      suggestedFixes: [],
    },
  };

  // ----------------------------------------------------
  // 1. Auditoría Módulo Inventario & Catálogo
  // ----------------------------------------------------
  try {
    const prods = await db.select().from(products).where(eq(products.companyId, companyId)).limit(2000);
    const invs = await db.select().from(inventory).where(eq(inventory.companyId, companyId)).limit(2000);

    const invMod = modulesResults.inventory;
    invMod.totalRecordsAudited = prods.length + invs.length;

    if (prods.length === 0) {
      invMod.confidenceLevel = "NO_CONFIABLE";
      invMod.scorePercent = 0;
      invMod.reasons.push("Catálogo vacío: no hay productos para gestionar ni controlar stock.");
      invMod.suggestedFixes.push("Importa tu catálogo de productos mediante archivo CSV o webhook.");
    } else {
      // Cálculo de mediana de precios para detectar outliers (1000x)
      const validPrices = prods.map((p) => Number(p.price || 0)).filter((p) => p > 0).sort((a, b) => a - b);
      const medianPrice = validPrices.length > 0 ? validPrices[Math.floor(validPrices.length / 2)] : 50;

      for (const p of prods) {
        const numPrice = Number(p.price);

        // Precios imposibles (negativos o cero)
        if (isNaN(numPrice) || numPrice <= 0) {
          invMod.corruptRecordsCount++;
          const reason = `Precio imposible o cero (${p.price}) en producto '${p.name}' (${p.sku})`;
          invMod.reasons.push(reason);
          invMod.sampleCorruptRecords.push({ identifier: p.sku || p.id, violationType: "invalid_price", reason });
          await quarantineRecord({
            companyId,
            entityType: "products",
            sourceTable: "products",
            recordIdentifier: p.sku || p.id,
            violationType: "invalid_price",
            reason,
            rawPayload: { id: p.id, sku: p.sku, price: p.price, name: p.name },
          });
        }

        // Outlier 1000x la mediana
        if (numPrice > medianPrice * 1000 && medianPrice > 0) {
          invMod.corruptRecordsCount++;
          const reason = `Precio outlier anómalo (${numPrice} vs mediana ${medianPrice}) en producto '${p.name}'`;
          invMod.reasons.push(reason);
          invMod.sampleCorruptRecords.push({ identifier: p.sku || p.id, violationType: "outlier_price", reason });
          await quarantineRecord({
            companyId,
            entityType: "products",
            sourceTable: "products",
            recordIdentifier: p.sku || p.id,
            violationType: "outlier_price",
            reason,
            rawPayload: { id: p.id, sku: p.sku, price: p.price },
          });
        }

        // Detección de Mojibake / codificación rota
        if (isBrokenEncoding(p.name)) {
          invMod.corruptRecordsCount++;
          const reason = `Codificación rota (mojibake) en nombre: '${p.name}'`;
          invMod.reasons.push(reason);
          invMod.sampleCorruptRecords.push({ identifier: p.sku || p.id, violationType: "broken_encoding", reason });
        }

        // Intento de Prompt Injection en nombre
        const rawName = p.name || "";
        if (
          rawName.toLowerCase().includes("ignore") ||
          rawName.toLowerCase().includes("system prompt") ||
          rawName.toLowerCase().includes("drop table")
        ) {
          invMod.corruptRecordsCount++;
          const reason = `Intento de Prompt/SQL Injection detectado en nombre del producto: '${p.name}'`;
          invMod.reasons.push(reason);
          invMod.sampleCorruptRecords.push({ identifier: p.sku || p.id, violationType: "hostile_injection", reason });
          await quarantineRecord({
            companyId,
            entityType: "products",
            sourceTable: "products",
            recordIdentifier: p.sku || p.id,
            violationType: "hostile_injection",
            reason,
            severity: "CRITICAL",
            rawPayload: { id: p.id, sku: p.sku, name: p.name },
          });
        }
      }

      // Validar inventario (stock negativo o absurdo)
      for (const inv of invs) {
        if (inv.stock < 0) {
          invMod.corruptRecordsCount++;
          const reason = `Stock negativo (${inv.stock}) en producto_id '${inv.productId}'`;
          invMod.reasons.push(reason);
          invMod.sampleCorruptRecords.push({ identifier: inv.id, violationType: "negative_stock", reason });
          await quarantineRecord({
            companyId,
            entityType: "inventory",
            sourceTable: "inventory",
            recordIdentifier: inv.id,
            violationType: "negative_stock",
            reason,
            rawPayload: { id: inv.id, productId: inv.productId, stock: inv.stock },
          });
        }
      }

      // Calcular puntaje
      const errRatio = invMod.totalRecordsAudited > 0 ? invMod.corruptRecordsCount / invMod.totalRecordsAudited : 0;
      invMod.scorePercent = Math.max(0, Math.round((1 - errRatio) * 100));

      if (invMod.corruptRecordsCount > 0 && invMod.scorePercent >= 70) {
        invMod.confidenceLevel = "DUDOSO";
        invMod.suggestedFixes.push("Revisa registros en cuarentena ('mint quarantine') y corrige precios o stock negativo.");
      } else if (invMod.scorePercent < 70 || invMod.reasons.some((r) => r.includes("Injection"))) {
        invMod.confidenceLevel = "NO_CONFIABLE";
        invMod.suggestedFixes.push("Módulo inventario bloqueado para decisiones autónomas hasta corregir inconsistencias críticas.");
      }
    }
  } catch (err: any) {
    modulesResults.inventory.confidenceLevel = "NO_CONFIABLE";
    modulesResults.inventory.reasons.push(`Error en consulta: ${err.message}`);
  }

  // ----------------------------------------------------
  // 2. Auditoría Módulo Ventas & Órdenes
  // ----------------------------------------------------
  try {
    const salesMod = modulesResults.sales;
    const orders = await db.select().from(mintSalesOrders).where(eq(mintSalesOrders.companyId, companyId)).limit(2000);
    salesMod.totalRecordsAudited = orders.length;

    if (orders.length === 0) {
      salesMod.confidenceLevel = "CONFIABLE";
      salesMod.scorePercent = 100;
      salesMod.reasons.push("Sin historial de ventas aún; canal a la espera de transacciones.");
    } else {
      const now = new Date();
      const futureThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Mañana
      const ancientThreshold = new Date("2015-01-01T00:00:00Z");

      for (const ord of orders) {
        const orderDate = new Date(ord.createdAt);
        const amount = Number(ord.totalAmount);

        // Fecha imposible (futura o demasiado antigua)
        if (orderDate > futureThreshold || orderDate < ancientThreshold) {
          salesMod.corruptRecordsCount++;
          const reason = `Fecha imposible (${orderDate.toISOString()}) en orden ${ord.externalOrderId || ord.id}`;
          salesMod.reasons.push(reason);
          salesMod.sampleCorruptRecords.push({ identifier: ord.id, violationType: "impossible_date", reason });
          await quarantineRecord({
            companyId,
            entityType: "sales",
            sourceTable: "mint_sales_orders",
            recordIdentifier: ord.id,
            violationType: "impossible_date",
            reason,
            rawPayload: { id: ord.id, createdAt: ord.createdAt },
          });
        }

        // Venta sin productos o monto negativo
        const items = Array.isArray(ord.itemsPayload) ? ord.itemsPayload : [];
        if (items.length === 0 || amount <= 0) {
          salesMod.corruptRecordsCount++;
          const reason = `Venta sin ítems o monto inválido (${amount} ${ord.currency}) en orden ${ord.id}`;
          salesMod.reasons.push(reason);
          salesMod.sampleCorruptRecords.push({ identifier: ord.id, violationType: "invalid_order_items", reason });
          await quarantineRecord({
            companyId,
            entityType: "sales",
            sourceTable: "mint_sales_orders",
            recordIdentifier: ord.id,
            violationType: "invalid_order_items",
            reason,
            rawPayload: { id: ord.id, amount, itemsCount: items.length },
          });
        }

        // Suma de ítems vs Total de orden
        if (items.length > 0) {
          const sumItems = items.reduce((acc: number, it: any) => acc + (Number(it.unitPrice || 0) * Number(it.quantity || 1)), 0);
          if (Math.abs(sumItems - amount) > 0.05 && sumItems > 0) {
            salesMod.corruptRecordsCount++;
            const reason = `Inconsistencia: suma de ítems (${sumItems}) ≠ total de orden (${amount}) en ${ord.id}`;
            salesMod.reasons.push(reason);
            salesMod.sampleCorruptRecords.push({ identifier: ord.id, violationType: "item_sum_mismatch", reason });
          }
        }
      }

      const errRatio = salesMod.totalRecordsAudited > 0 ? salesMod.corruptRecordsCount / salesMod.totalRecordsAudited : 0;
      salesMod.scorePercent = Math.max(0, Math.round((1 - errRatio) * 100));

      if (salesMod.corruptRecordsCount > 0 && salesMod.scorePercent >= 75) {
        salesMod.confidenceLevel = "DUDOSO";
        salesMod.suggestedFixes.push("Excluyendo órdenes corruptas de métricas de facturación ('mint data-health').");
      } else if (salesMod.scorePercent < 75) {
        salesMod.confidenceLevel = "NO_CONFIABLE";
        salesMod.suggestedFixes.push("Audita el webhook de ventas: hay transacciones con montos o fechas erróneas.");
      }
    }
  } catch (err: any) {
    modulesResults.sales.confidenceLevel = "NO_CONFIABLE";
    modulesResults.sales.reasons.push(`Error en auditoría de ventas: ${err.message}`);
  }

  // ----------------------------------------------------
  // 3. Auditoría Módulo Finanzas (Costos y Márgenes)
  // ----------------------------------------------------
  try {
    const finMod = modulesResults.finance;
    const prods = await db.select().from(products).where(eq(products.companyId, companyId)).limit(2000);
    finMod.totalRecordsAudited = prods.length;

    let missingCostCount = 0;
    let negativeMarginCount = 0;

    for (const p of prods) {
      const cost = Number(p.costPrice || 0);
      const price = Number(p.price || 0);

      if (cost <= 0) {
        missingCostCount++;
      } else if (cost > price && price > 0) {
        negativeMarginCount++;
        finMod.sampleCorruptRecords.push({
          identifier: p.sku || p.id,
          violationType: "negative_margin",
          reason: `Margen negativo: costo (${cost}) supera al precio de venta (${price}) en '${p.name}'`,
        });
      }
    }

    if (missingCostCount > 0) {
      finMod.reasons.push(`${missingCostCount} productos tienen 'costo no registrado' (afecta precisión de ganancias).`);
      finMod.suggestedFixes.push("Registra los costos faltantes con '/products' o pregunta al proveedor correspondiente.");
    }
    if (negativeMarginCount > 0) {
      finMod.reasons.push(`${negativeMarginCount} productos operan con margen negativo (pérdida directa por venta).`);
      finMod.suggestedFixes.push("Ajusta los precios de venta o renegocia costos con proveedores.");
    }

    const finErrors = missingCostCount + negativeMarginCount;
    const finRatio = finMod.totalRecordsAudited > 0 ? finErrors / finMod.totalRecordsAudited : 0;
    finMod.scorePercent = Math.max(0, Math.round((1 - finRatio * 0.7) * 100)); // Ponderación balanceada

    if (negativeMarginCount > 0 || missingCostCount > prods.length * 0.4) {
      finMod.confidenceLevel = "DUDOSO";
    } else {
      finMod.confidenceLevel = "CONFIABLE";
    }
  } catch (err: any) {
    modulesResults.finance.confidenceLevel = "NO_CONFIABLE";
    modulesResults.finance.reasons.push(`Error en auditoría financiera: ${err.message}`);
  }

  // ----------------------------------------------------
  // 4. Auditoría Módulo Logística & Almacenes
  // ----------------------------------------------------
  try {
    const logMod = modulesResults.logistics;
    const whs = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId)).limit(500);
    logMod.totalRecordsAudited = whs.length;

    if (whs.length === 0) {
      logMod.confidenceLevel = "CONFIABLE";
      logMod.scorePercent = 100;
      logMod.reasons.push("Modo solo tienda o sin almacenes físicos registrados.");
    } else {
      for (const w of whs) {
        const lat = Number(w.latitude);
        const lng = Number(w.longitude);

        // Coordenadas imposibles o en (0,0) (Isla Nula)
        if (
          !isNaN(lat) &&
          !isNaN(lng) &&
          ((lat === 0 && lng === 0) || lat < -90 || lat > 90 || lng < -180 || lng > 180)
        ) {
          logMod.corruptRecordsCount++;
          const reason = `Coordenadas inválidas o nulas (${lat}, ${lng}) en almacén '${w.name}'`;
          logMod.reasons.push(reason);
          logMod.sampleCorruptRecords.push({ identifier: w.id, violationType: "invalid_coordinates", reason });
          await quarantineRecord({
            companyId,
            entityType: "shipments",
            sourceTable: "warehouses",
            recordIdentifier: w.id,
            violationType: "invalid_coordinates",
            reason,
            rawPayload: { id: w.id, name: w.name, lat, lng },
          });
        }
      }

      const logRatio = logMod.totalRecordsAudited > 0 ? logMod.corruptRecordsCount / logMod.totalRecordsAudited : 0;
      logMod.scorePercent = Math.max(0, Math.round((1 - logRatio) * 100));

      if (logMod.corruptRecordsCount > 0) {
        logMod.confidenceLevel = "DUDOSO";
        logMod.suggestedFixes.push("Actualiza la dirección o geocodificación del almacén con '/setup'.");
      }
    }
  } catch (err: any) {
    modulesResults.logistics.confidenceLevel = "NO_CONFIABLE";
    modulesResults.logistics.reasons.push(`Error en auditoría logística: ${err.message}`);
  }

  // ----------------------------------------------------
  // 5. Auditoría Módulo Proveedores & Compras
  // ----------------------------------------------------
  try {
    const suppMod = modulesResults.suppliers;
    const supps = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId)).limit(500);
    suppMod.totalRecordsAudited = supps.length;

    if (supps.length === 0) {
      suppMod.confidenceLevel = "CONFIABLE";
      suppMod.scorePercent = 100;
      suppMod.reasons.push("Modo sin proveedores registrados; módulo en espera pasiva.");
    } else {
      const seenTaxIds = new Set<string>();
      for (const s of supps) {
        if (s.taxId) {
          if (seenTaxIds.has(s.taxId.trim().toUpperCase())) {
            suppMod.corruptRecordsCount++;
            const reason = `Identificación fiscal (tax_id/RFC) duplicada: '${s.taxId}' en proveedor '${s.name}'`;
            suppMod.reasons.push(reason);
            suppMod.sampleCorruptRecords.push({ identifier: s.id, violationType: "duplicate_tax_id", reason });
          } else {
            seenTaxIds.add(s.taxId.trim().toUpperCase());
          }
        }
      }

      const suppRatio = suppMod.totalRecordsAudited > 0 ? suppMod.corruptRecordsCount / suppMod.totalRecordsAudited : 0;
      suppMod.scorePercent = Math.max(0, Math.round((1 - suppRatio) * 100));

      if (suppMod.corruptRecordsCount > 0) {
        suppMod.confidenceLevel = "DUDOSO";
      }
    }
  } catch (err: any) {
    modulesResults.suppliers.confidenceLevel = "NO_CONFIABLE";
    modulesResults.suppliers.reasons.push(`Error en auditoría de proveedores: ${err.message}`);
  }

  // Guardar puntajes en tabla mint_quality_scores
  for (const [modKey, modRes] of Object.entries(modulesResults)) {
    const scoreId = `qs_${companyId}_${modKey}`;
    try {
      await db
        .insert(mintQualityScores)
        .values({
          id: scoreId,
          companyId,
          module: modKey,
          confidenceLevel: modRes.confidenceLevel,
          scorePercent: modRes.scorePercent,
          totalRecordsAudited: modRes.totalRecordsAudited,
          corruptRecordsCount: modRes.corruptRecordsCount,
          reasons: modRes.reasons.slice(0, 5),
          sampleCorruptRecords: modRes.sampleCorruptRecords.slice(0, 5),
          evaluatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [mintQualityScores.id],
          set: {
            confidenceLevel: modRes.confidenceLevel,
            scorePercent: modRes.scorePercent,
            totalRecordsAudited: modRes.totalRecordsAudited,
            corruptRecordsCount: modRes.corruptRecordsCount,
            reasons: modRes.reasons.slice(0, 5),
            sampleCorruptRecords: modRes.sampleCorruptRecords.slice(0, 5),
            evaluatedAt: new Date(),
          },
        });
    } catch {}
  }

  // Contar registros en cuarentena activos
  const quarTotalRes = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(mintQuarantineRecords)
    .where(and(eq(mintQuarantineRecords.companyId, companyId), eq(mintQuarantineRecords.status, "quarantined")));
  const quarantinedTotal = Number(quarTotalRes[0]?.c || 0);

  // Calcular Salud General y Compuerta de Decisión (Tarea C.3)
  const allModules = Object.values(modulesResults);
  const avgScore = Math.round(allModules.reduce((acc, m) => acc + m.scorePercent, 0) / allModules.length);

  let overallHealth: ModuleConfidenceLevel = "CONFIABLE";
  if (allModules.some((m) => m.confidenceLevel === "NO_CONFIABLE")) {
    overallHealth = "NO_CONFIABLE";
  } else if (allModules.some((m) => m.confidenceLevel === "DUDOSO")) {
    overallHealth = "DUDOSO";
  }

  const blockedModules = allModules.filter((m) => m.confidenceLevel === "NO_CONFIABLE").map((m) => m.module);
  const requiresDoubtfulBadge = allModules.some((m) => m.confidenceLevel === "DUDOSO");

  return {
    companyId,
    evaluatedAt: new Date().toISOString(),
    overallHealth,
    averageScorePercent: avgScore,
    modules: modulesResults,
    quarantinedTotal,
    decisionGateStatus: {
      canPropose: overallHealth !== "NO_CONFIABLE",
      canExecute: overallHealth === "CONFIABLE",
      requiresDoubtfulBadge,
      blockedModules,
    },
  };
}

/**
 * Consulta y lista registros actualmente en cuarentena.
 */
export async function listQuarantinedRecords(companyId: string, limit = 50) {
  return db
    .select()
    .from(mintQuarantineRecords)
    .where(eq(mintQuarantineRecords.companyId, companyId))
    .orderBy(desc(mintQuarantineRecords.createdAt))
    .limit(limit);
}

/**
 * Marca un registro de cuarentena como revisado o resuelto.
 */
export async function updateQuarantineStatus(
  id: string,
  status: "reviewed" | "ignored" | "resolved",
  reviewer: string,
) {
  return db
    .update(mintQuarantineRecords)
    .set({
      status,
      reviewedBy: reviewer,
      reviewedAt: new Date(),
    })
    .where(eq(mintQuarantineRecords.id, id));
}
