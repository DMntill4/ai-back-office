import { GrokClient, getLlmApiKey } from "@mint/core";

export interface ColumnMappingProposal {
  targetField: string;
  sourceHeader: string | null;
  confidence: number; // 0.0 a 1.0
  isRequired: boolean;
}

export interface MappingResult {
  mappings: Record<string, string>; // targetField -> sourceHeader
  unmappedHeaders: string[];
  missingRequired: string[];
  confidence: number;
  aiInferred?: boolean;
}

const FIELD_PATTERNS: Record<string, { regex: RegExp; required: boolean }> = {
  sku: {
    regex: /(sku|c[oó]digo|codigo|cod|referencia|ref|part_?number|id_?producto|id_?item|clave|barcode|ean|upc|^id$)/i,
    required: true,
  },
  name: {
    regex: /(nombre|name|producto|product|descripci[oó]n|description|item|t[ií]tulo|art[ií]culo|articulo|herramienta|equipo|concepto|material)/i,
    required: true,
  },
  stock: {
    regex: /(stock|existencias?|existensias?|cantidad|qty|quantity|unidades|inventario|disponible|saldo|on_?hand|cant)/i,
    required: true,
  },
  minStock: {
    regex: /(min_?stock|stock_?m[ií]nimo|m[ií]nimo|minimo|safety_?stock|umbral|reorden|rop|min_?qty)/i,
    required: false,
  },
  category: {
    regex: /(categor[ií]a|categoria|category|l[ií]nea|linea|familia|tipo|clasificaci[oó]n|departamento|grupo|brand|marca)/i,
    required: false,
  },
  unitCost: {
    regex: /(costo|cost|precio|price|unit_?cost|unit_?price|costo_?unitario|precio_?unitario|valor|tarifa|importe|val_?unit)/i,
    required: false,
  },
  supplierName: {
    regex: /(proveedor|supplier|vendor|distribuidor|fabricante|maker|prov_?nombre|supplier_?name)/i,
    required: false,
  },
  supplierCity: {
    regex: /(ciudad_?proveedor|ubicaci[oó]n_?proveedor|origen_?proveedor|supplier_?city|supplier_?location|origen)/i,
    required: false,
  },
  warehouseName: {
    regex: /(almac[eé]n|almacen|bodega|warehouse|sucursal|cedis|planta|ubicaci[oó]n_?almacen)/i,
    required: false,
  },
  warehouseCity: {
    regex: /(ciudad_?almacen|ciudad_?bodega|warehouse_?city|ciudad_?sucursal)/i,
    required: false,
  },
  leadTimeDays: {
    regex: /(lead_?time|tiempo_?entrega|d[ií]as_?entrega|dias_?entrega|plazo_?entrega)/i,
    required: false,
  },
};

/**
 * Propone un mapeo de columnas inteligente basado en heurística y patrones semánticos
 * (Síncrono para retrocompatibilidad instantánea y tests deterministas)
 */
export function proposeColumnMapping(headers: string[]): MappingResult {
  const mappings: Record<string, string> = {};
  const mappedHeaders = new Set<string>();
  const missingRequired: string[] = [];

  for (const [targetField, def] of Object.entries(FIELD_PATTERNS)) {
    const match = headers.find((h) => !mappedHeaders.has(h) && def.regex.test(h.trim()));

    if (match) {
      mappings[targetField] = match;
      mappedHeaders.add(match);
    } else if (def.required) {
      missingRequired.push(targetField);
    }
  }

  // Tolerancia para comercios locales / tiendas de barrio: Si no tienen columna SKU pero sí Nombre del producto,
  // MINT auto-deriva el SKU determinista a partir del nombre del producto en lugar de bloquear la importación.
  if (missingRequired.includes("sku") && mappings.name) {
    const skuIndex = missingRequired.indexOf("sku");
    missingRequired.splice(skuIndex, 1);
    mappings.sku = mappings.name;
  }

  const unmappedHeaders = headers.filter((h) => !mappedHeaders.has(h));
  const mappedCount = Object.keys(mappings).length;
  const requiredCount = Object.values(FIELD_PATTERNS).filter((p) => p.required).length;
  const mappedRequiredCount = Object.keys(mappings).filter((k) => FIELD_PATTERNS[k]?.required).length;

  const requiredRatio = mappedRequiredCount / requiredCount;
  const totalRatio = mappedCount / Object.keys(FIELD_PATTERNS).length;
  const confidence = parseFloat((requiredRatio * 0.7 + totalRatio * 0.3).toFixed(2));

  return {
    mappings,
    unmappedHeaders,
    missingRequired,
    confidence,
  };
}

/**
 * Cerebro AI de Ingestión Universal:
 * Si los encabezados tienen nombres arbitrarios, abreviaturas raras o errores ortográficos
 * que la heurística no captura, utiliza el LLM (GrokClient) junto con una muestra de filas
 * para deducir semánticamente cada columna.
 */
export async function proposeColumnMappingWithAI(
  headers: string[],
  sampleRows: Array<Record<string, any>> = [],
): Promise<MappingResult> {
  const heuristic = proposeColumnMapping(headers);
  // Si la heurística encontró los campos principales y no hay encabezados sin mapear dudosos, o no hay API key:
  const apiKey = getLlmApiKey();
  if (!apiKey || (heuristic.missingRequired.length === 0 && heuristic.unmappedHeaders.length === 0)) {
    return heuristic;
  }

  try {
    const client = new GrokClient();
    const response = await client.chatCompletion({
      messages: [
        {
          role: "system",
          content: `You are Mint's Universal Schema Introspection AI.
Given a list of column headers and up to 3 sample rows from ANY arbitrary store/ERP/warehouse database or spreadsheet (which may contain typos, abbreviations, Spanish/English/Portuguese terms, or missing supplier/SKU columns), map the source headers to our canonical fields:
- "sku": Product code, SKU, ID, reference, or barcode (if none exists, leave null)
- "name": Product name, item description, tool, or concept
- "stock": Current quantity, stock on hand, units available
- "minStock": Reorder point, minimum stock, safety stock (optional)
- "category": Category, family, brand, or department (optional)
- "unitCost": Unit price, cost, daily rate, or value (optional)
- "supplierName": Supplier, vendor, distributor, or manufacturer name (optional)
- "supplierCity": Supplier city, origin, or address (optional)
- "warehouseName": Warehouse, branch, store, or CEDIS name (optional)
- "warehouseCity": Warehouse city or location (optional)
- "leadTimeDays": Delivery time in days (optional)

Return strictly valid JSON without markdown fences:
{
  "mappings": {
    "sku": "source_header_or_null",
    "name": "source_header_or_null",
    "stock": "source_header_or_null",
    "minStock": "source_header_or_null",
    "category": "source_header_or_null",
    "unitCost": "source_header_or_null",
    "supplierName": "source_header_or_null",
    "supplierCity": "source_header_or_null",
    "warehouseName": "source_header_or_null",
    "warehouseCity": "source_header_or_null",
    "leadTimeDays": "source_header_or_null"
  },
  "confidence": 0.95
}`,
        },
        {
          role: "user",
          content: JSON.stringify({
            headers,
            sampleRows: sampleRows.slice(0, 3),
          }),
        },
      ],
      temperature: 0.0,
    });

    const raw = response.content?.replace(/```json|```/g, "").trim();
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.mappings && typeof parsed.mappings === "object") {
        const mergedMappings: Record<string, string> = { ...heuristic.mappings };
        for (const [k, v] of Object.entries(parsed.mappings)) {
          if (typeof v === "string" && headers.includes(v)) {
            mergedMappings[k] = v;
          }
        }
        const mappedSet = new Set(Object.values(mergedMappings));
        const missingReq = ["sku", "name", "stock"].filter((req) => !mergedMappings[req]);
        return {
          mappings: mergedMappings,
          unmappedHeaders: headers.filter((h) => !mappedSet.has(h)),
          missingRequired: missingReq,
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.9,
          aiInferred: true,
        };
      }
    }
  } catch {
    // Fallback limpio a heurística si falla la red
  }

  return heuristic;
}
