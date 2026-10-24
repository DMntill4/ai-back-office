import { getDaemonStatus } from "@mint/daemon";
import { getSession } from "../keychain";
import { db, products, inventory, cases, decisions, notificationChannels, businessConfig, companies } from "@mint/core";
import { eq, and, or, sql } from "drizzle-orm";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";

export async function dashboardCommand(options: { json?: boolean; noExit?: boolean; companyId?: string } = {}) {
  const session = await getSession();
  const companyId = options.companyId || session?.companyId || "comp_default";

  try {
    const daemon = getDaemonStatus();

    // 1. Obtener datos de la empresa y divisa
    let currency = "COP";
    let companyDisplayName = session?.companyName || "Ferretería Industrial Santandereana S.A.S.";
    try {
      const [comp] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
      if (comp?.name) companyDisplayName = comp.name;
      if (comp?.currency) currency = comp.currency;
    } catch {}

    // 2. Nivel de autonomía configurado
    let autonomyLevel = "dry-run";
    try {
      const autonomyConfig = await db
        .select()
        .from(businessConfig)
        .where(and(eq(businessConfig.companyId, companyId), eq(businessConfig.key, "autonomy_level")))
        .limit(1);
      if (autonomyConfig[0]?.value) autonomyLevel = autonomyConfig[0].value;
    } catch {}

    // 3. Inventario & Quiebres
    let totalProducts = 0;
    let outOfStock = 0;
    let lowStock = 0;
    try {
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

      totalProducts = allProducts.length;
      outOfStock = allProducts.filter((p) => Number(p.currentStock) === 0).length;
      lowStock = allProducts.filter(
        (p) => Number(p.currentStock) > 0 && Number(p.currentStock) <= Number(p.minStock),
      ).length;
    } catch {}

    // 4. Casos y Decisiones
    let activeCasesCount = 0;
    let pendingDecisionsCount = 0;
    let totalValueAtStake = 0;
    try {
      const activeCases = await db
        .select()
        .from(cases)
        .where(
          and(
            eq(cases.companyId, companyId),
            or(eq(cases.status, "recibido"), eq(cases.status, "en_proceso")),
          ),
        );
      activeCasesCount = activeCases.length;

      const pendingDecisions = await db
        .select()
        .from(decisions)
        .where(and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "pending_approval")));
      pendingDecisionsCount = pendingDecisions.length;
      totalValueAtStake = pendingDecisions.reduce((sum, d) => sum + Number(d.costMxn || 0), 0);
    } catch {}

    // 5. Canales de Notificación
    let channels: any[] = [];
    try {
      channels = await db
        .select()
        .from(notificationChannels)
        .where(and(eq(notificationChannels.companyId, companyId), eq(notificationChannels.isActive, true)));
    } catch {}

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            companyId,
            currency,
            autonomyLevel,
            daemon,
            inventory: { totalProducts, outOfStock, lowStock },
            cases: { activeCount: activeCasesCount },
            decisions: { pendingCount: pendingDecisionsCount, totalValueAtStake },
            channels: channels.map((c) => ({ type: c.type, name: c.name })),
          },
          null,
          2,
        ),
      );
      return;
    }

    const daemonStateBadge = daemon.isPaused
      ? theme.badge("PAUSADO (EMERGENCIA)", "red")
      : daemon.isRunning
        ? theme.badge("ACTIVO (VIGILANCIA 24/7)", "mint")
        : theme.badge("STANDBY", "gray");

    const channelNames = channels.length > 0
      ? channels.map((c) => `${c.type.toUpperCase()}: ${c.name}`).join(", ")
      : theme.dim("Ninguno conectado (Opera localmente)");

    const autonomyDescriptions: Record<string, string> = {
      "dry-run": "Autorización humana requerida en /inbox (Cero compras automáticas)",
      "supervised": "Autorización humana requerida en /inbox (Cero compras automáticas)",
      "assisted": "Borradores automáticos; compras de alto valor requieren revisión",
      "auto": "Reabastecimiento autónomo bajo política de presupuesto",
    };
    const autonomyDesc = autonomyDescriptions[autonomyLevel.toLowerCase()] || "Autorización humana requerida";
    const autonomyBadgeColor =
      autonomyLevel === "auto" ? "cyan" : autonomyLevel === "assisted" ? "mint" : "amber";

    const inventoryStatus = totalProducts === 0
      ? theme.dim("Vacío (0 productos registrados en base de datos)")
      : `${theme.bold(totalProducts)} SKUs  ${theme.dim("│")}  ${outOfStock > 0 ? theme.redBold(`${outOfStock} sin existencias`) : theme.mint("0 sin existencias")}  ${theme.dim("│")}  ${lowStock > 0 ? theme.amberBold(`${lowStock} bajo stock`) : theme.mint("0 bajo stock")}`;

    const inboxStatus = pendingDecisionsCount > 0
      ? theme.amberBold(`${pendingDecisionsCount} compras por revisar ($${totalValueAtStake.toLocaleString("es-CO", { minimumFractionDigits: 0 })} ${currency})`)
      : theme.mint("Al día (0 revisiones pendientes)");

    console.log("");
    console.log(
      drawCard(
        [
          `${theme.dim("Organización:")}     ${theme.mintBold(companyDisplayName)} [${theme.dim(companyId)}]`,
          `${theme.dim("Daemon Autónomo:")}  ${daemonStateBadge} (PID ${daemon.pid || process.pid})`,
          `${theme.dim("Modo Autonomía:")}   ${theme.badge(autonomyLevel.toUpperCase(), autonomyBadgeColor)} (${autonomyDesc})`,
          `${theme.dim("Catálogo Stock:")}   ${inventoryStatus}`,
          `${theme.dim("Canales Alerta:")}   ${channelNames}`,
          `${theme.dim("Operaciones:")}       ${activeCasesCount} caso(s) activo(s)  ${theme.dim("│")}  ${inboxStatus}`,
        ],
        {
          title: "ESTADO OPERATIVO Y SALUD DEL SISTEMA",
          borderColor: theme.mint,
        },
      ),
    );
    console.log("");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`[ERROR] ${err.message}`));
    }
    if (!options.noExit) {
      process.exit(1);
    }
  }
}
