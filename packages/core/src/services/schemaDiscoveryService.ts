import { db, pool } from "../db/client";
import { mintTableMappings } from "../db/schema/mintEntities";
import { eq, and, desc } from "drizzle-orm";

export interface DiscoveredColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey?: boolean;
}

export interface DiscoveredTable {
  tableName: string;
  tableType: string;
  columns: DiscoveredColumn[];
  rowCount?: number;
}

export interface TableMappingProposal {
  sourceTable: string;
  targetEntity: "shipments" | "orders" | "products" | "customers" | "inventory" | "suppliers" | "unknown";
  confidence: number;
  columnMappings: Record<string, string>; // mintField -> customerColumn
  unmappedColumns: string[];
  missingMintFields: string[];
  isConfirmed: boolean;
  isReadOnly: boolean;
  writeRoles: string[];
}

// Patrones semánticos para detección de entidades del cliente
const TABLE_PATTERNS: Record<TableMappingProposal["targetEntity"], RegExp> = {
  shipments: /^(guias?|despachos?|env[ií]os?|remisiones?|fletes?|entregas?|tracking|shipments?)$/i,
  orders: /^(ordenes?|pedidos?|ventas?|facturas?|sales?|orders?)$/i,
  products: /^(art[ií]culos?|productos?|items?|catalogo|mercanc[ií]as?|referencias?|parts?)$/i,
  customers: /^(clientes?|compradores?|buyers?|customers?|contactos?)$/i,
  inventory: /^(inventarios?|existencias?|stock|almacenaje)$/i,
  suppliers: /^(proveedores?|suplidores?|vendors?|suppliers?)$/i,
  unknown: /^$/i,
};

const ENTITY_COLUMN_PATTERNS: Record<
  Exclude<TableMappingProposal["targetEntity"], "unknown">,
  Record<string, { regex: RegExp; required: boolean }>
> = {
  shipments: {
    trackingNumber: { regex: /(n[uú]mero_?gu[ií]a|gu[ií]a|tracking|c[oó]digo|id_?gu[ií]a|folio|^id$)/i, required: true },
    carrier: { regex: /(transportista|carrier|empresa_?transporte|fletero|conductor|chofer)/i, required: false },
    status: { regex: /(estado|status|fase|situaci[oó]n)/i, required: false },
    currentLocation: { regex: /(ubicaci[oó]n|posici[oó]n|d[oó]nde_?va|ciudad_?actual|lat_?lon)/i, required: false },
    destination: { regex: /(destino|ciudad_?destino|direcci[oó]n|entrega_?a)/i, required: false },
    eta: { regex: /(eta|fecha_?estimada|estimada_?entrega|compromiso)/i, required: false },
  },
  orders: {
    externalId: { regex: /(n[uú]mero_?orden|folio|id_?pedido|order_?id|orden|^id$)/i, required: true },
    customer: { regex: /(cliente|comprador|destinatario|nombre_?cliente)/i, required: true },
    total: { regex: /(total|monto|valor|importe|precio_?total)/i, required: true },
    date: { regex: /(fecha|date|creado|hora)/i, required: false },
    channel: { regex: /(canal|origen|source|medio)/i, required: false },
    status: { regex: /(estado|status|pago|estado_?pago)/i, required: false },
  },
  products: {
    sku: { regex: /(sku|c[oó]digo|cod|referencia|ref|clave|^id$)/i, required: true },
    name: { regex: /(nombre|descripci[oó]n|producto|art[ií]culo|t[ií]tulo)/i, required: true },
    unitCost: { regex: /(costo|cost|precio_?costo|valor_?compra)/i, required: false },
    salePrice: { regex: /(precio|price|precio_?venta|pvp|tarifa)/i, required: false },
    category: { regex: /(categor[ií]a|familia|l[ií]nea|tipo)/i, required: false },
  },
  customers: {
    id: { regex: /(id_?cliente|c[oó]digo|documento|nit|rfc|cedula|^id$)/i, required: true },
    name: { regex: /(nombre|razon_?social|contacto|cliente)/i, required: true },
    email: { regex: /(email|correo|mail)/i, required: false },
    phone: { regex: /(tel[eé]fono|celular|phone|m[oó]vil)/i, required: false },
    address: { regex: /(direcci[oó]n|ubicaci[oó]n|domicilio|ciudad)/i, required: false },
  },
  inventory: {
    productId: { regex: /(id_?producto|sku|item|c[oó]digo)/i, required: true },
    stock: { regex: /(stock|existencia|cantidad|unidades|disponible)/i, required: true },
    warehouseId: { regex: /(almac[eé]n|bodega|sucursal|ubicaci[oó]n)/i, required: false },
  },
  suppliers: {
    id: { regex: /(id_?proveedor|c[oó]digo|rfc|nit|^id$)/i, required: true },
    name: { regex: /(nombre|proveedor|razon_?social|empresa)/i, required: true },
    email: { regex: /(email|correo)/i, required: false },
    city: { regex: /(ciudad|origen|ubicaci[oó]n)/i, required: false },
  },
};

/**
 * 1. Descubrimiento de esquema en modo SOLO LECTURA (queries a information_schema)
 * MINT nunca altera ni toca tablas existentes del cliente.
 */
export async function discoverCustomerSchema(companyId: string): Promise<{
  tables: DiscoveredTable[];
  proposals: TableMappingProposal[];
  mintInternalTables: string[];
}> {
  const client = await pool.connect();
  try {
    // Listar tablas existentes en la BD
    const tablesRes = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    const tables: DiscoveredTable[] = [];
    const proposals: TableMappingProposal[] = [];
    const mintInternalTables: string[] = [];

    // Tablas reservadas del sistema Mint
    const MINT_CORE_TABLES = new Set([
      "companies",
      "users",
      "products",
      "warehouses",
      "inventory",
      "suppliers",
      "supplier_products",
      "purchase_orders",
      "business_config",
      "sales_history",
      "shipments",
      "cases",
      "decisions",
      "operational_events",
      "policy_rules",
      "data_sources",
      "import_jobs",
      "import_templates",
      "notification_channels",
      "notification_log",
      "agent_conversations",
      "mint_table_mappings",
      "mint_pending_questions",
      "mint_route_incidents",
      "mint_sales_orders",
    ]);

    // Recuperar mapeos ya guardados y confirmados en la BD de Mint
    const existingMappings = await db
      .select()
      .from(mintTableMappings)
      .where(eq(mintTableMappings.companyId, companyId));

    const mappingMap = new Map(existingMappings.map((m) => [m.sourceTable, m]));

    for (const row of tablesRes.rows) {
      const tableName = row.table_name as string;

      if (MINT_CORE_TABLES.has(tableName) || tableName.startsWith("mint_")) {
        mintInternalTables.push(tableName);
        continue; // No mapear tablas propias de MINT
      }

      // Obtener columnas de tabla externa
      const colsRes = await client.query(
        `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `,
        [tableName],
      );

      const columns: DiscoveredColumn[] = colsRes.rows.map((c: any) => ({
        name: c.column_name,
        dataType: c.data_type,
        isNullable: c.is_nullable === "YES",
      }));

      tables.push({
        tableName,
        tableType: row.table_type,
        columns,
      });

      // Si ya hay un mapeo guardado para esta tabla, usarlo
      const saved = mappingMap.get(tableName);
      if (saved) {
        proposals.push({
          sourceTable: tableName,
          targetEntity: saved.targetEntity as any,
          confidence: 1.0,
          columnMappings: (saved.columnMappings as Record<string, string>) || {},
          unmappedColumns: [],
          missingMintFields: [],
          isConfirmed: saved.isConfirmed,
          isReadOnly: saved.isReadOnly,
          writeRoles: (saved.writeRoles as string[]) || [],
        });
        continue;
      }

      // Detectar heurísticamente la entidad
      let detectedEntity: TableMappingProposal["targetEntity"] = "unknown";
      let highestScore = 0;

      for (const [entityKey, pattern] of Object.entries(TABLE_PATTERNS)) {
        if (entityKey === "unknown") continue;
        if (pattern.test(tableName)) {
          detectedEntity = entityKey as any;
          highestScore = 0.9;
          break;
        }
      }

      // Proponer mapeo de columnas
      const columnMappings: Record<string, string> = {};
      const mappedCustomerCols = new Set<string>();
      const missingMintFields: string[] = [];

      if (detectedEntity !== "unknown") {
        const fieldDefs = ENTITY_COLUMN_PATTERNS[detectedEntity];
        for (const [targetField, def] of Object.entries(fieldDefs)) {
          const match = columns.find((c) => !mappedCustomerCols.has(c.name) && def.regex.test(c.name));
          if (match) {
            columnMappings[targetField] = match.name;
            mappedCustomerCols.add(match.name);
          } else if (def.required) {
            missingMintFields.push(targetField);
          }
        }
      }

      const unmappedColumns = columns.filter((c) => !mappedCustomerCols.has(c.name)).map((c) => c.name);

      proposals.push({
        sourceTable: tableName,
        targetEntity: detectedEntity,
        confidence: detectedEntity !== "unknown" ? (missingMintFields.length === 0 ? 0.95 : 0.75) : 0.1,
        columnMappings,
        unmappedColumns,
        missingMintFields,
        isConfirmed: false,
        isReadOnly: true, // Estrictamente solo lectura por defecto
        writeRoles: [],
      });
    }

    return {
      tables,
      proposals,
      mintInternalTables,
    };
  } finally {
    client.release();
  }
}

/**
 * 2. Guarda o actualiza un mapeo confirmado por el usuario en la BD de MINT
 */
export async function saveConfirmedTableMapping(input: {
  companyId: string;
  sourceTable: string;
  targetEntity: string;
  columnMappings: Record<string, string>;
  isConfirmed?: boolean;
  isReadOnly?: boolean;
  writeRoles?: string[];
}): Promise<void> {
  const id = `map_${input.companyId}_${input.sourceTable}`;

  try {
    const { companies } = await import("../db/schema/business");
    await db
      .insert(companies)
      .values({
        id: input.companyId,
        name: input.companyId,
        country: "Internacional",
        currency: "USD",
      })
      .onConflictDoNothing();
  } catch {
    // Continuar si ya existe
  }

  const existing = await db
    .select()
    .from(mintTableMappings)
    .where(eq(mintTableMappings.id, id))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(mintTableMappings)
      .set({
        targetEntity: input.targetEntity,
        columnMappings: input.columnMappings,
        isConfirmed: input.isConfirmed ?? true,
        isReadOnly: input.isReadOnly ?? true,
        writeRoles: input.writeRoles ?? [],
        version: existing[0].version + 1,
        updatedAt: new Date(),
      })
      .where(eq(mintTableMappings.id, id));
  } else {
    await db.insert(mintTableMappings).values({
      id,
      companyId: input.companyId,
      sourceTable: input.sourceTable,
      targetEntity: input.targetEntity,
      columnMappings: input.columnMappings,
      isConfirmed: input.isConfirmed ?? true,
      isReadOnly: input.isReadOnly ?? true,
      writeRoles: input.writeRoles ?? [],
      version: 1,
    });
  }
}

/**
 * 3. Validador de seguridad de escritura en tablas del cliente:
 * Solo lectura por defecto. Escribir requiere confirmación y rol explícito.
 */
export async function canWriteToCustomerTable(
  companyId: string,
  tableName: string,
  userRole?: string,
): Promise<{ allowed: boolean; reason: string }> {
  // Las tablas internas de MINT siempre se pueden escribir según RBAC
  if (tableName.startsWith("mint_") || tableName === "purchase_orders" || tableName === "decisions") {
    return { allowed: true, reason: "Tabla nativa de MINT." };
  }

  const mapping = await db
    .select()
    .from(mintTableMappings)
    .where(and(eq(mintTableMappings.companyId, companyId), eq(mintTableMappings.sourceTable, tableName)))
    .limit(1);

  if (mapping.length === 0) {
    return {
      allowed: false,
      reason: `Tabla de cliente '${tableName}' sin mapeo confirmado. Modo SOLO LECTURA estricto.`,
    };
  }

  const map = mapping[0];
  if (map.isReadOnly) {
    return {
      allowed: false,
      reason: `La tabla de cliente '${tableName}' está configurada como SOLO LECTURA. Habilite permisos explícitos con '/mapping edit ${tableName}'.`,
    };
  }

  const roles = (map.writeRoles as string[]) || [];
  if (!userRole || !roles.includes(userRole)) {
    return {
      allowed: false,
      reason: `El rol '${userRole || "sin_rol"}' no tiene permisos de escritura sobre la tabla de cliente '${tableName}'. Roles autorizados: [${roles.join(", ")}].`,
    };
  }

  return { allowed: true, reason: "Escritura autorizada por política." };
}

/**
 * 4. Simulación previa (Dry-Run) de Migraciones y Detección de Colisiones
 * Asegura que ninguna migración de MINT pise una tabla preexistente del cliente.
 */
export async function verifyMigrationCollisions(mintRequiredTables: string[]): Promise<{
  safe: boolean;
  collisions: string[];
  message: string;
}> {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);

    const existingTables = new Set(res.rows.map((r: any) => r.table_name));
    const collisions: string[] = [];

    for (const table of mintRequiredTables) {
      if (existingTables.has(table) && !table.startsWith("mint_")) {
        // Verificar si la tabla fue creada por Mint o si es una tabla del cliente con el mismo nombre
        // Si no tiene columna company_id, es claramente una tabla externa en colisión!
        const colRes = await client.query(
          `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'company_id';
        `,
          [table],
        );

        if (colRes.rows.length === 0) {
          collisions.push(table);
        }
      }
    }

    if (collisions.length > 0) {
      return {
        safe: false,
        collisions,
        message: `¡ALERTA DE COLISIÓN DE ESQUEMA! Las tablas [${collisions.join(", ")}] ya existen en la base de datos del cliente y no tienen 'company_id'. MINT ha detenido la migración para no alterar datos del cliente.`,
      };
    }

    return {
      safe: true,
      collisions: [],
      message: "Verificación de colisiones aprobada: es seguro proceder sin tocar tablas del cliente.",
    };
  } finally {
    client.release();
  }
}
