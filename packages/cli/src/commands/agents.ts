import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import {
  db,
  products,
  suppliers,
  warehouses,
  decisions,
  runFullOperationalEventScan,
  agentRegistry,
  mintOrchestrator,
} from "@mint/core";
import { eq, sql } from "drizzle-orm";

export async function agentsCommand(subAction?: string) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  if (subAction === "run" || subAction === "scan" || subAction === "orchestrate") {
    console.log(`\n${theme.mintBold("[ORQUESTADOR]")} Iniciando ciclo de deliberación multi-agente autónomo para '${theme.bold(companyId)}'...\n`);

    // Recuperar primero eventos operativos pendientes en cola
    const recoveredCount = await mintOrchestrator.processPendingOperationalEvents(companyId).catch(() => 0);
    if (recoveredCount > 0) {
      console.log(`  ${theme.mint("[RECUPERACIÓN]")} ${recoveredCount} evento(s) operativo(s) pendiente(s) recuperado(s) y procesado(s).`);
    }

    console.log(`  ${theme.cyanBold("[1/6 INVENTARIO]")} Inspeccionando existencias, burn rate y puntos de reorden en PostgreSQL...`);
    const [prodRows] = await db.select({ n: sql<number>`count(*)::int` }).from(products).where(eq(products.companyId, companyId));
    console.log(`      Catálogo activo: ${prodRows?.n ?? 0} SKUs bajo vigilancia continua.`);

    console.log(`  ${theme.cyanBold("[2/6 LOGÍSTICA]")} Comprobando envíos en tránsito y tiempos de entrega viales...`);
    const [whRows] = await db.select({ n: sql<number>`count(*)::int` }).from(warehouses).where(eq(warehouses.companyId, companyId));
    console.log(`      Nodos logísticos: ${whRows?.n ?? 0} almacenes registrados.`);

    console.log(`  ${theme.cyanBold("[3/6 COMPRAS]")} Consultando listas de precios y MOQs con proveedores homologados...`);
    const [suppRows] = await db.select({ n: sql<number>`count(*)::int` }).from(suppliers).where(eq(suppliers.companyId, companyId));
    console.log(`      Proveedores activos: ${suppRows?.n ?? 0} suplidores disponibles.`);

    console.log(`  ${theme.cyanBold("[4/6 AUDITORÍA]")} Evaluando márgenes, detección de duplicados (72h) y reglas de gobernanza...`);
    console.log(`  ${theme.cyanBold("[5/6 NOTIFICACIONES]")} Verificando canales de alerta (Discord/Telegram/Slack/Webhooks)...`);
    console.log(`  ${theme.cyanBold("[6/6 DATOS]")} Verificando frescura de datos y salud de orígenes de sincronización...`);

    const scanResult = await runFullOperationalEventScan(companyId);

    console.log(`\n${drawDivider("RESULTADO DE LA DELIBERACIÓN MULTI-AGENTE", 76)}`);
    console.log(`  • Desabastos identificados: ${scanResult.stockDeficitsFound > 0 ? theme.amberBold(`${scanResult.stockDeficitsFound} producto(s)`) : theme.mint("0 (Stock saludable)")}`);
    console.log(`  • Retrasos en transporte:  ${scanResult.delayedShipmentsFound > 0 ? theme.redBold(`${scanResult.delayedShipmentsFound} envío(s)`) : theme.mint("0 retrasos")}`);
    console.log(`  • Nuevas propuestas en /inbox: ${scanResult.processedDecisions.length > 0 ? theme.mintBold(`${scanResult.processedDecisions.length} decisión(es) generada(s)`) : theme.dim("Al día (sin compras innecesarias)")}`);
    console.log(`\n${theme.dim("Usa '/inbox' para autorizar o auditar cada recomendación generada.")}\n`);
    return;
  }

  // Vista del Panel de Agentes basada en el registro dinámico real
  const enabledAgents = await agentRegistry.getEnabledAgentsForCompany(companyId);

  const cardLines: string[] = [
    `${theme.mintBold("[DIRECTOR GENERAL]")} MINT Orchestrator — Coordinador Central`,
    `  ${theme.dim("Función:")} Recibe eventos, descompone tareas con Correlation ID, arbitra y genera decisiones.`,
    `  ${theme.dim("Estado:")}  ${theme.mintBold("ONLINE 24/7")} │ Gobernanza HITL activa (Cero compras no autorizadas)`,
    "",
  ];

  for (let i = 0; i < enabledAgents.length; i++) {
    const { agent, isEnabled, reason } = enabledAgents[i];
    const statusLabel = isEnabled
      ? theme.mintBold("ACTIVO")
      : theme.dim(`DESACTIVADO (${reason || "Por configuración"})`);

    cardLines.push(`${theme.cyanBold(`[AGENTE ${i + 1}/6]`)} ${agent.contract.name}`);
    cardLines.push(`  ${theme.dim("Rol:")}     ${agent.contract.role} │ ${theme.dim("Timeout:")} ${agent.contract.maxExecutionMs}ms`);
    cardLines.push(`  ${theme.dim("Función:")} ${agent.contract.description}`);
    cardLines.push(`  ${theme.dim("Tareas:")}  ${agent.contract.acceptedTasks.join(", ")}`);
    cardLines.push(`  ${theme.dim("Estado:")}  ${statusLabel}`);
    if (i < enabledAgents.length - 1) cardLines.push("");
  }

  console.log("");
  console.log(
    drawCard(cardLines, {
      title: `ARQUITECTURA DE AGENTES ESPECIALIZADOS [${companyId}]`,
      borderColor: theme.mint,
    }),
  );

  console.log(
    `  ${theme.dim("Para forzar una deliberación completa de todos los agentes ahora:")} ${theme.mintBold("mint agents run")}\n`,
  );
}
