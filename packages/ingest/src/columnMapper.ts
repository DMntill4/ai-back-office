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
}

const FIELD_PATTERNS: Record<string, { regex: RegExp; required: boolean }> = {
  sku: {
    regex: /(sku|c[oó]digo|codigo|cod|referencia|ref|part_?number|id_?producto)/i,
    required: true,
  },
  name: {
    regex: /(nombre|name|producto|product|descripci[oó]n|description|item|t[ií]tulo)/i,
    required: true,
  },
  stock: {
    regex: /(stock|existencias|cantidad|qty|quantity|unidades|inventario|disponible)/i,
    required: true,
  },
  minStock: {
    regex: /(min_?stock|stock_?m[ií]nimo|m[ií]nimo|minimo|safety_?stock|umbral)/i,
    required: false,
  },
  category: {
    regex: /(categor[ií]a|categoria|category|l[ií]nea|linea|familia|tipo|clasificaci[oó]n)/i,
    required: false,
  },
  unitCost: {
    regex: /(costo|cost|precio|price|unit_?cost|unit_?price|costo_?unitario|precio_?unitario)/i,
    required: false,
  },
};

/**
 * Propone un mapeo de columnas inteligente basado en heurística y patrones semánticos
 */
export function proposeColumnMapping(headers: string[]): MappingResult {
  const mappings: Record<string, string> = {};
  const mappedHeaders = new Set<string>();
  const missingRequired: string[] = [];

  for (const [targetField, def] of Object.entries(FIELD_PATTERNS)) {
    // Buscar coincidencia contra encabezados aún no asignados
    const match = headers.find((h) => !mappedHeaders.has(h) && def.regex.test(h.trim()));

    if (match) {
      mappings[targetField] = match;
      mappedHeaders.add(match);
    } else if (def.required) {
      missingRequired.push(targetField);
    }
  }

  const unmappedHeaders = headers.filter((h) => !mappedHeaders.has(h));
  const mappedCount = Object.keys(mappings).length;
  const requiredCount = Object.values(FIELD_PATTERNS).filter((p) => p.required).length;
  const mappedRequiredCount = Object.keys(mappings).filter((k) => FIELD_PATTERNS[k].required).length;

  // Confianza: peso mayor a los campos obligatorios
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
