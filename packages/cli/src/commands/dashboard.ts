import { getDaemonStatus } from "@mint/daemon";
import { getSession } from "../keychain";
import { db, products, inventory, cases, decisions, notificationChannels, businessConfig } from "@mint/core";
import { eq, and, or, sql } from "drizzle-orm";
import { theme } from "../ui/theme";
import { printBanner } from "../ui/banner";
import { drawCard, drawDivider } from "../ui/box";

export async function dashboardCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const daemon = getDaemonStatus();

    // 1. Obtener nivel de autonomía configurado
    const autonomyConfig = await db
      .select()
      .from(businessConfig)
      .where(and(eq(businessConfig.companyId, companyId), eq(businessConfig.key, "autonomy_level")))
      .limit(1);

    const autonomyLevel = autonomyConfig[0]?.value || "dry-run";

    // 2. Inventario & Quiebres
    const allProducts = await db
      .select({
        id: products.id,
        minStock: products.minStock,
        currentStock: sql<number>`coalesce(sum(${inventory.stock}), 0)`,
      })
      .from(products)
      .leftJoin(inventory, eq(products.id, inventory.productId))
      .where(eq(products.companyId, companyId))
      .groupBy(products.id, products.minStock);

    const totalProducts = allProducts.length;
    const outOfStock = allProducts.filter((p) => Number(p.currentStock) === 0).length;
    const lowStock = allProducts.filter(
      (p) => Number(p.currentStock) > 0 && Number(p.currentStock) <= Number(p.minStock),
    ).length;

    // 3. Casos y Decisiones
    const activeCases = await db
      .select()
      .from(cases)
      .where(
        and(
          eq(cases.companyId, companyId),
          or(eq(cases.status, "recibido"), eq(cases.status, "en_proceso")),
        ),
      );

    const pendingDecisions = await db
      .select()
      .from(decisions)
      .where(and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "pending_approval")));

    const totalValueAtStake = pendingDecisions.reduce((sum, d) => sum + Number(d.costMxn), 0);

    // 4. Canales de Notificación
    const channels = await db
      .select()
      .from(notificationChannels)
      .where(and(eq(notificationChannels.companyId, companyId), eq(notificationChannels.isActive, true)));

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            companyId,
            autonomyLevel,
            daemon,
            inventory: { totalProducts, outOfStock, lowStock },
            cases: { activeCount: activeCases.length },
            decisions: { pendingCount: pendingDecisions.length, totalValueAtStakeMxn: totalValueAtStake },
            channels: channels.map((c) => ({ type: c.type, name: c.name })),
          },
          null,
          2,
        ),
      );
      return;
    }

    // Render Banner
    printBanner({
      companyId,
      autonomyLevel,
      daemonRunning: daemon.isRunning,
      isPaused: daemon.isPaused,
    });

    // Panel 1: Estado del Sistema
    const daemonStateBadge = daemon.isPaused
      ? theme.badge("PAUSADO (EMERGENCIA)", "red")
      : daemon.isRunning
        ? theme.badge("EJECUTÁNDOSE (PID: " + daemon.pid + ")", "mint")
        : theme.badge("STANDBY (DETENIDO)", "gray");

    console.log(
      drawCard(
        [
          `${theme.dim("Daemon:")}     ${daemonStateBadge}`,
          `${theme.dim("Ciclos:")}     ${daemon.stats.ticksCount} ticks ejecutados │ ${daemon.stats.eventsFired} eventos detectados`,
          `${theme.dim("Autonomía:")}  Modo activo: ${theme.bold(autonomyLevel.toUpperCase())} │ Umbral: $10,000 MXN`,
          `${theme.dim("Vigilancia:")} Monitoreando desabastos en stock, guías de envío y fuentes de datos.`,
        ],
        {
          title: "SISTEMA Y GOBERNANZA AUTÓNOMA",
          borderColor: theme.mint,
        },
      ),
    );

    console.log("\n" + drawDivider("METRICAS OPERATIVAS EN TIEMPO REAL"));

    // Panel 2 & 3: Métricas de Stock e Inbox
    console.log("");
    console.log(
      drawCard(
        [
          `${theme.dim("Catálogo:")}   ${totalProducts} productos registrados`,
          `${theme.dim("Agotados:")}   ${outOfStock > 0 ? theme.redBold(`${outOfStock} SKUs en quiebre total`) : theme.success("0 SKUs")}`,
          `${theme.dim("Bajo Stock:")} ${lowStock > 0 ? theme.amberBold(`${lowStock} SKUs bajo mínimo`) : theme.success("0 SKUs")}`,
        ],
        {
          title: "ESTADO DE INVENTARIO",
          borderColor: outOfStock > 0 ? theme.red : theme.cyan,
        },
      ),
    );

    console.log("");
    console.log(
      drawCard(
        [
          `${theme.dim("Casos:")}      ${activeCases.length} casos logísticos abiertos actualmente`,
          `${theme.dim("Pendientes:")} ${pendingDecisions.length > 0 ? theme.amberBold(`${pendingDecisions.length} decisiones esperando autorización`) : theme.success("0 decisiones (Al día)")}`,
          `${theme.dim("En Juego:")}   $${totalValueAtStake.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN esperando firma`,
        ],
        {
          title: "BANDEJA HITL Y COORDINADOR",
          borderColor: pendingDecisions.length > 0 ? theme.amber : theme.mint,
        },
      ),
    );

    // Panel 4: Notificadores Remotos
    const channelNames = channels.map((c) => `${c.type.toUpperCase()} (${c.name})`).join(", ") || "Ninguno conectado";
    console.log("");
    console.log(
      drawCard(
        [
          `${theme.dim("Activos:")}    ${channels.length} canales configurados`,
          `${theme.dim("Destinos:")}   ${theme.bold(channelNames)}`,
          `${theme.dim("Seguridad:")}  Tokens HMAC-SHA256 con firma digital y un solo uso`,
        ],
        {
          title: "NOTIFICACIONES & APROBACIONES REMOTAS",
          borderColor: theme.gray,
        },
      ),
    );

    // Acciones rápidas
    console.log("\n" + theme.dim("Comandos rápidos:"));
    console.log(
      `  ${theme.mintBold("mint inbox")}        Revisar y firmar decisiones pendientes\n` +
        `  ${theme.mintBold("mint scan")}         Forzar escaneo proactivo de stock y transporte\n` +
        `  ${theme.mintBold("mint watch")}        Ver feed en vivo de eventos y decisiones\n` +
        `  ${theme.mintBold("mint simulate")}     Simular escenario logístico what-if en sandbox\n` +
        `  ${theme.mintBold("mint pause")}        Interruptor de emergencia para pausar autonomía\n`,
    );
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`❌ Error al generar dashboard: ${err.message}`));
    }
    process.exit(1);
  }
}
