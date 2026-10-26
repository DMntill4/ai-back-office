import {
  discoverCustomerSchema,
  saveConfirmedTableMapping,
  canWriteToCustomerTable,
  hasPermission,
} from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { renderTable, type ColumnDef } from "../ui/table";

export async function mappingCommand(
  action: string = "show",
  targetTable?: string,
  options: { json?: boolean; confirm?: boolean; readonly?: boolean } = {},
) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  // 1. Descubrimiento de tablas del cliente
  if (action === "discover" || action === "detect" || action === "scan") {
    console.log("\n" + drawDivider("DESCUBRIMIENTO DE ESQUEMA EXISTENTE (MODO SOLO LECTURA)", 86));
    console.log(`  ${theme.dim("Analizando catálogo de tablas y columnas sin alterar la base de datos...")}\n`);

    const discovery = await discoverCustomerSchema(companyId);

    if (options.json) {
      console.log(JSON.stringify(discovery, null, 2));
      return;
    }

    if (discovery.tables.length === 0) {
      console.log(`  ${theme.mint("No se detectaron tablas externas del cliente. La base de datos está limpia con tablas nativas de MINT.")}\n`);
      return;
    }

    console.log(`  ${theme.bold(`Tablas de cliente detectadas (${discovery.tables.length}):`)}`);
    for (const t of discovery.tables) {
      const match = discovery.proposals.find((p) => p.sourceTable === t.tableName);
      const entityLabel = match?.targetEntity !== "unknown" ? theme.mintBold(match!.targetEntity) : theme.amber("desconocida");
      const readOnlyBadge = match?.isReadOnly ? theme.badge("SOLO LECTURA", "cyan") : theme.badge("ESCRITURA HABILITADA", "amber");

      console.log(`\n  ┌─ Tabla Cliente: ${theme.bold(t.tableName)} ➔ Equivalente MINT: ${entityLabel} ${readOnlyBadge}`);
      console.log(`  │  Columnas: ${t.columns.map((c) => c.name).join(", ")}`);
      if (match && Object.keys(match.columnMappings).length > 0) {
        console.log(`  │  Mapeo propuesto:`);
        for (const [k, v] of Object.entries(match.columnMappings)) {
          console.log(`  │    • ${k} ➔ ${theme.cyan(v)}`);
        }
      }
      if (match?.missingMintFields && match.missingMintFields.length > 0) {
        console.log(`  │  Campos requeridos pendientes: ${theme.amber(match.missingMintFields.join(", "))}`);
      }
      console.log(`  └─ Para confirmar: ${theme.mintBold(`mint map confirm ${t.tableName}`)}`);
    }

    console.log("");
    return;
  }

  // 2. Confirmar mapeo propuesto
  if (action === "confirm" && targetTable) {
    if (session?.role !== "owner" && session?.role !== "admin") {
      console.log(`\n  ${theme.redBold("[ACCESO DENEGADO]")} Solo el rol 'owner' o 'admin' puede confirmar o modificar mapeos de esquema.\n`);
      return;
    }

    const discovery = await discoverCustomerSchema(companyId);
    const proposal = discovery.proposals.find((p) => p.sourceTable.toLowerCase() === targetTable.toLowerCase());

    if (!proposal) {
      console.log(`\n  ${theme.amber(`Tabla '${targetTable}' no encontrada en el descubrimiento de esquema.`)}\n`);
      return;
    }

    await saveConfirmedTableMapping({
      companyId,
      sourceTable: proposal.sourceTable,
      targetEntity: proposal.targetEntity,
      columnMappings: proposal.columnMappings,
      isConfirmed: true,
      isReadOnly: true, // Mantener estrictamente solo lectura
      writeRoles: [],
    });

    if (options.json) {
      console.log(JSON.stringify({ success: true, table: proposal.sourceTable, targetEntity: proposal.targetEntity }));
    } else {
      console.log(`\n  ${theme.mintBold("[OK]")} Mapeo para tabla de cliente '${proposal.sourceTable}' CONFIRMADO y guardado en memoria.`);
      console.log(`  Equivalente MINT: ${theme.bold(proposal.targetEntity)} | Modo: ${theme.cyan("SOLO LECTURA")} (protegida de escrituras accidentales).\n`);
    }
    return;
  }

  // 3. Ver mapeos actuales guardados
  console.log("\n" + drawDivider(`MAPEO DE TABLAS Y EQUIVALENCIAS [${companyId}]`, 86));
  const discovery = await discoverCustomerSchema(companyId);

  if (options.json) {
    console.log(JSON.stringify(discovery.proposals, null, 2));
    return;
  }

  const cols: ColumnDef[] = [
    { header: "TABLA CLIENTE", key: "sourceTable", width: 22 },
    { header: "ENTIDAD MINT", key: "targetEntity", width: 18 },
    { header: "CONFIRMADO", key: "confirmed", width: 14, align: "center" },
    { header: "PROTECCIÓN", key: "protection", width: 18, align: "center" },
    { header: "CONFIANZA", key: "confidence", width: 12, align: "right" },
  ];

  const rows = discovery.proposals.map((p) => ({
    sourceTable: p.sourceTable,
    targetEntity: p.targetEntity !== "unknown" ? p.targetEntity : "sin equivalencia",
    confirmed: p.isConfirmed ? theme.mint("SÍ") : theme.amber("PENDIENTE"),
    protection: p.isReadOnly ? theme.cyan("SOLO LECTURA") : theme.amber("ESCRITURA"),
    confidence: `${(p.confidence * 100).toFixed(0)}%`,
  }));

  if (rows.length === 0) {
    console.log(`\n  ${theme.mint("No hay tablas externas registradas. Base de datos estándar MINT.")}\n`);
    return;
  }

  console.log(renderTable(cols, rows));
  console.log(`\n  ${theme.dim("Comandos:")} ${theme.mintBold("mint map discover")}  ${theme.dim("│")}  ${theme.mintBold("mint map confirm <tabla>")}\n`);
}
