import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { db, products, suppliers, warehouses, decisions, runFullOperationalEventScan } from "@mint/core";
import { eq, sql } from "drizzle-orm";

export async function agentsCommand(subAction?: string) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  if (subAction === "run" || subAction === "scan" || subAction === "orchestrate") {
    console.log(`\n${theme.mintBold("[ORQUESTADOR]")} Iniciando ciclo de deliberación multi-agente en vivo para '${theme.bold(companyId)}'...\n`);
    
    console.log(`  ${theme.cyanBold("[1/4 SUB-AGENTE INVENTARIO]")} Inspeccionando existencias, burn rate y puntos de reorden en PostgreSQL...`);
    const [prodRows] = await db.select({ n: sql<number>`count(*)::int` }).from(products).where(eq(products.companyId, companyId));
    console.log(`      Catálogo activo: ${prodRows?.n ?? 0} SKUs bajo vigilancia continua.`);

    console.log(`  ${theme.cyanBold("[2/4 SUB-AGENTE TRANSPORTE]")} Comprobando envíos en tránsito y tiempos de entrega viales (OSRM)...`);
    const [whRows] = await db.select({ n: sql<number>`count(*)::int` }).from(warehouses).where(eq(warehouses.companyId, companyId));
    console.log(`      Nodos logísticos: ${whRows?.n ?? 0} almacenes geocodificados.`);

    console.log(`  ${theme.cyanBold("[3/4 SUB-AGENTE COMPRAS]")} Consultando listas de precios y MOQs con proveedores homologados...`);
    const [suppRows] = await db.select({ n: sql<number>`count(*)::int` }).from(suppliers).where(eq(suppliers.companyId, companyId));
    console.log(`      Proveedores activos: ${suppRows?.n ?? 0} suplidores disponibles.`);

    console.log(`  ${theme.cyanBold("[4/4 AUDITOR DE RIESGO]")} Evaluando márgenes, detección de duplicados y reglas de gobernanza...`);

    const scanResult = await runFullOperationalEventScan(companyId);

    console.log(`\n${drawDivider("RESULTADO DE LA DELIBERACIÓN MULTI-AGENTE", 76)}`);
    console.log(`  • Desabastos identificados: ${scanResult.stockDeficitsFound > 0 ? theme.amberBold(`${scanResult.stockDeficitsFound} producto(s)`) : theme.mint("0 (Stock saludable)")}`);
    console.log(`  • Retrasos en transporte:  ${scanResult.delayedShipmentsFound > 0 ? theme.redBold(`${scanResult.delayedShipmentsFound} envío(s)`) : theme.mint("0 retrasos")}`);
    console.log(`  • Nuevas propuestas en /inbox: ${scanResult.processedDecisions.length > 0 ? theme.mintBold(`${scanResult.processedDecisions.length} decisión(es) generada(s)`) : theme.dim("Al día (sin compras innecesarias)")}`);
    console.log(`\n${theme.dim("Usa '/inbox' para autorizar o auditar cada recomendación generada.")}\n`);
    return;
  }

  // Vista del Panel de Agentes
  console.log("");
  console.log(
    drawCard(
      [
        `${theme.mintBold("[DIRECTOR ORQUESTADOR]")}  MINT Brain — Coordinador General`,
        `  ${theme.dim("Función:")} Recibe eventos, delega a subagentes, arbitra y genera decisiones ejecutables.`,
        `  ${theme.dim("Estado:")}  ${theme.mintBold("ONLINE")} │ Modo Supervisado (Cero compras unilaterales)`,
        "",
        `${theme.cyanBold("[SUB-AGENTE 1]")}          Especialista en Inventario (Existencias & ROP)`,
        `  ${theme.dim("Función:")} Monitorea stock real, consumo diario, cobertura y rebalanceo entre bodegas.`,
        `  ${theme.dim("Estado:")}  ${theme.mint("ACTIVO")}`,
        "",
        `${theme.cyanBold("[SUB-AGENTE 2]")}          Especialista en Compras & Abastecimiento`,
        `  ${theme.dim("Función:")} Compara cotizaciones con proveedores, pedidos mínimos (MOQ) y lead times.`,
        `  ${theme.dim("Estado:")}  ${theme.mint("ACTIVO")}`,
        "",
        `${theme.cyanBold("[SUB-AGENTE 3]")}          Especialista en Logística & Transporte`,
        `  ${theme.dim("Función:")} Calcula fletes viales y distancias OSRM, y vigila envíos en tránsito.`,
        `  ${theme.dim("Estado:")}  ${theme.mint("ACTIVO")}`,
        "",
        `${theme.cyanBold("[SUB-AGENTE 4]")}          Auditor Adversarial de Riesgo (Abogado del Diablo)`,
        `  ${theme.dim("Función:")} Valida márgenes de ganancia, evita sobrecostos y filtra compras duplicadas.`,
        `  ${theme.dim("Estado:")}  ${theme.mint("ACTIVO")}`,
      ],
      {
        title: `PANEL DE AGENTES Y ORQUESTACIÓN MULTI-AGENTE [${companyId}]`,
        borderColor: theme.mint,
      },
    ),
  );

  console.log(
    `  ${theme.dim("Para forzar una deliberación completa de los 4 subagentes ahora:")} ${theme.mintBold("/agents run")}\n`
  );
}
