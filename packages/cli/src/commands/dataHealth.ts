import { auditDataHealth, listQuarantinedRecords, updateQuarantineStatus, updateAllQuarantineStatus } from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawFrame } from "../ui/frame";
import { drawCard, drawDivider } from "../ui/box";

export async function dataHealthCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  const report = await auditDataHealth(companyId);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const badgeColor =
    report.overallHealth === "CONFIABLE"
      ? theme.mint
      : report.overallHealth === "DUDOSO"
      ? theme.amber
      : theme.red;

  console.log("");
  console.log(
    drawFrame({
      title: `SALUD DE DATOS & COMPUERTA DE DECISION: ${companyId}`,
      rows: [
        { key: "Estado General", value: report.overallHealth, color: badgeColor },
        { key: "Calidad Promedio", value: `${report.averageScorePercent}%` },
        { key: "Registros en Cuarentena", value: `${report.quarantinedTotal} aislados`, color: report.quarantinedTotal > 0 ? theme.amber : theme.mint },
        { key: "Compuerta Propuestas", value: report.decisionGateStatus.canPropose ? "HABILITADA" : "BLOQUEADA", color: report.decisionGateStatus.canPropose ? theme.mint : theme.red },
        { key: "Compuerta Ejecución", value: report.decisionGateStatus.canExecute ? "HABILITADA" : "BLOQUEADA (Solo Auditoría)", color: report.decisionGateStatus.canExecute ? theme.mint : theme.amber },
      ],
      footerLeft: theme.dim("ejecuta /quarantine para ver registros aislados"),
      footerRight: theme.dim(`auditoría: ${new Date(report.evaluatedAt).toLocaleTimeString()}`),
    })
  );

  console.log(theme.mintBold("\n[MODULOS OPERATIVOS AUDITADOS]"));
  drawDivider();

  for (const [modKey, mod] of Object.entries(report.modules)) {
    const modColor =
      mod.confidenceLevel === "CONFIABLE"
        ? theme.mint
        : mod.confidenceLevel === "DUDOSO"
        ? theme.amber
        : theme.red;

    console.log(
      ` ${modColor(`[${mod.confidenceLevel.padEnd(12)}]`)} ${theme.bold(modKey.toUpperCase().padEnd(15))} ` +
      `Puntaje: ${String(mod.scorePercent).padStart(3)}% | Auditados: ${String(mod.totalRecordsAudited).padStart(4)} | Corruptos: ${mod.corruptRecordsCount}`
    );

    if (mod.reasons.length > 0) {
      for (const r of mod.reasons.slice(0, 3)) {
        console.log(theme.dim(`   • Alerta: ${r}`));
      }
    }

    if (mod.suggestedFixes.length > 0) {
      for (const f of mod.suggestedFixes.slice(0, 2)) {
        console.log(theme.cyan(`   → Acción correctiva: ${f}`));
      }
    }
  }

  if (report.decisionGateStatus.blockedModules.length > 0) {
    console.log(theme.redBold(`\n[AVISO] ATENCIÓN: MINT ha apagado la autonomía en los módulos: [${report.decisionGateStatus.blockedModules.join(", ")}] hasta corregir datos.`));
  } else if (report.decisionGateStatus.requiresDoubtfulBadge) {
    console.log(theme.amber(`\n[AVISO] MODO DUDOSO ACTIVO: Las sugerencias operativas llevarán la marca [DATOS DUDOSOS] y no se ejecutarán automáticamente.`));
  } else {
    console.log(theme.mint(`\n[OK]  COMPUERTA DESPEJADA: Todos los módulos superaron el umbral de confianza y operan con normalidad.`));
  }
  console.log("");
}

export async function quarantineCommand(args: string[] = []) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  const action = args[0]?.toLowerCase(); // ej: 'resolve', 'ignore'
  const targetId = args[1];

  if (action === "resolve" && targetId) {
    if (targetId.toLowerCase() === "all") {
      await updateAllQuarantineStatus(companyId, "resolved", session?.name || "operator");
      console.log(theme.mint(`\n[OK] Todos los registros en cuarentena pendientes fueron marcados como RESUELTOS.\n`));
    } else {
      await updateQuarantineStatus(targetId, "resolved", session?.name || "operator");
      console.log(theme.mint(`\n[OK] Registro en cuarentena '${targetId}' marcado como RESUELTO.\n`));
    }
    return;
  }

  if (action === "ignore" && targetId) {
    if (targetId.toLowerCase() === "all") {
      await updateAllQuarantineStatus(companyId, "ignored", session?.name || "operator");
      console.log(theme.gray(`\nTodos los registros en cuarentena pendientes fueron marcados como IGNORADOS.\n`));
    } else {
      await updateQuarantineStatus(targetId, "ignored", session?.name || "operator");
      console.log(theme.gray(`\nRegistro en cuarentena '${targetId}' marcado como IGNORADO.\n`));
    }
    return;
  }

  const quarantined = await listQuarantinedRecords(companyId, 25);

  if (quarantined.length === 0) {
    console.log(theme.mint("\n[OK] La mesa de cuarentena está vacía. No hay registros hostiles ni corruptos pendientes de revisión.\n"));
    return;
  }

  console.log(theme.amberBold(`\n[REGISTROS EN CUARENTENA AISLADOS - COMPAÑÍA: ${companyId}]`));
  console.log(theme.dim("Los registros corruptos fueron excluidos de cálculos métricos sin modificar la tabla original del cliente.\n"));
  drawDivider();

  for (const q of quarantined) {
    const sevColor = q.severity === "CRITICAL" ? theme.redBold : q.severity === "ERROR" ? theme.amber : theme.gray;
    console.log(
      ` ${sevColor(`[${q.severity}]`)} ${theme.bold(q.id)} | Entidad: ${q.entityType} | Tabla: ${q.sourceTable} | Id: ${q.recordIdentifier || "N/A"}`
    );
    console.log(`   Motivo: ${q.reason}`);
    console.log(theme.dim(`   Fecha: ${new Date(q.createdAt).toLocaleString("es-CO")} | Estado: ${q.status}`));
    console.log("");
  }

  console.log(theme.dim("Para resolver un registro: /quarantine resolve <id> | Para ignorar: /quarantine ignore <id>\n"));
}
