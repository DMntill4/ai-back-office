import { getDaemonStatus } from "@mint/daemon";
import { getSession } from "../keychain";
import { db, products, inventory, cases, decisions, notificationChannels, businessConfig } from "@mint/core";
import { eq, and, or, sql } from "drizzle-orm";
import { theme } from "../ui/theme";
import { printBanner } from "../ui/banner";
import { drawCard, drawDivider } from "../ui/box";

export async function dashboardCommand(options: { json?: boolean; noExit?: boolean; companyId?: string } = {}) {
  const session = await getSession();
  const companyId = options.companyId || session?.companyId || "comp_default";

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

    // 4. Canales de Notificación (Auto-healing para canales discord guardados como slack)
    await db
      .update(notificationChannels)
      .set({ type: "discord", name: "Discord Alerts" })
      .where(
        and(
          eq(notificationChannels.companyId, companyId),
          eq(notificationChannels.type, "slack"),
          sql`${notificationChannels.config} LIKE '%discord%'`,
        ),
      )
      .catch(() => null);

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

    // Single, clean, organized status card (No repeated giant banner)
    const daemonStateBadge = daemon.isPaused
      ? theme.badge("PAUSED (EMERGENCY)", "red")
      : daemon.isRunning
        ? theme.badge("ONLINE (LISTENING 24/7)", "mint")
        : theme.badge("STANDBY", "gray");

    const channelNames = channels.length > 0
      ? channels
          .map((c) => {
            const isDiscord =
              c.type === "discord" ||
              String((c.config as any)?.webhookUrl || "").toLowerCase().includes("discord");
            const typeStr = isDiscord ? "DISCORD" : c.type.toUpperCase();
            let nameStr = c.name;
            if (isDiscord && nameStr.toLowerCase().includes("slack")) {
              nameStr = "Discord Alerts";
            }
            return `${typeStr}: ${nameStr}`;
          })
          .join(", ")
      : theme.dim("None connected (Runs locally)");

    const autonomyDescriptions: Record<string, string> = {
      "dry-run": "Human approval required for any restock in /inbox (0 automated buys)",
      "supervised": "Human approval required for any restock in /inbox (0 automated buys)",
      "assisted": "Low-stock alert drafting; high-value purchases require review",
      "auto": "Automated replenishment under budget policy",
    };
    const autonomyDesc =
      autonomyDescriptions[autonomyLevel.toLowerCase()] ||
      "Human approval required for any restock";
    const autonomyBadgeColor =
      autonomyLevel === "auto" ? "cyan" : autonomyLevel === "assisted" ? "mint" : "amber";

    const companyDisplayName = session?.companyName || companyId;

    const inventoryStatus = totalProducts === 0
      ? theme.dim("Empty (0 products registered). Drop a database or file to sync.")
      : `${theme.bold(totalProducts)} products  │  ${outOfStock > 0 ? theme.redBold(`${outOfStock} out of stock`) : theme.success("0 out of stock")}  │  ${lowStock > 0 ? theme.amberBold(`${lowStock} low stock`) : theme.success("0 low")}`;

    const { getCompanyConfig } = await import("@mint/core");
    const config = await getCompanyConfig(companyId);
    const currency = config.currency;

    const inboxStatus = pendingDecisions.length > 0
      ? theme.amberBold(`${pendingDecisions.length} purchases waiting for review ($${totalValueAtStake.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency})`)
      : theme.success("All up to date (0 pending reviews)");

    console.log("");
    console.log(
      drawCard(
        [
          `${theme.dim("Organization:")}  ${theme.mintBold(companyDisplayName)} [${theme.dim(companyId)}]`,
          `${theme.dim("Agent Daemon:")}  ${daemonStateBadge} (PID ${daemon.pid || process.pid})`,
          `${theme.dim("Autonomy Mode:")} ${theme.badge(autonomyLevel.toUpperCase(), autonomyBadgeColor)} (${autonomyDesc})`,
          `${theme.dim("Data Catalog:")}  ${inventoryStatus}`,
          `${theme.dim("Sales Channel:")} ${channelNames}`,
          `${theme.dim("Operations:")}    ${activeCases.length} active case(s)  │  ${inboxStatus}`,
        ],
        {
          title: "OPERATIONAL STATUS & HEALTH",
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
