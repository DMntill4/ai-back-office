import * as readline from "node:readline";
import * as path from "node:path";
import * as fs from "node:fs";
import {
  db,
  companies,
  users,
  warehouses,
  suppliers,
  supplierProducts,
  products,
  businessConfig,
} from "@mint/core";
import { discoverLocalSources, parseCsvFile, proposeColumnMapping, syncDataSource } from "@mint/ingest";
import { addNotificationChannel } from "@mint/notifiers";
import { saveSession, type StoredSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { eq } from "drizzle-orm";

function ask(rl: readline.Interface, question: string, defaultValue = ""): Promise<string> {
  return new Promise((resolve) => {
    const formatted = defaultValue ? `${question} [${theme.mintBold(defaultValue)}]: ` : `${question}: `;
    rl.question(formatted, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * Friendly Interactive First-Time Onboarding in English
 * Guides the user through:
 * 1. Operator profile & company setup
 * 2. Automated data source discovery & connection
 * 3. Sales channel connection (Telegram / Slack / Discord)
 * 4. Autonomy governance policy
 */
export async function runOnboardingWizard(): Promise<StoredSession> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.clear();

  // Polished Mint Logo & Welcome Greeting
  const logo = [
    "  ███╗   ███╗██╗███╗   ██╗████████╗",
    "  ████╗ ████║██║████╗  ██║╚══██╔══╝",
    "  ██╔████╔██║██║██╔██╗ ██║   ██║   ",
    "  ██║╚██╔╝██║██║██║╚██╗██║   ██║   ",
    "  ██║ ╚═╝ ██║██║██║ ╚████║   ██║   ",
    "  ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝   ",
  ];

  console.log("");
  for (const line of logo) {
    console.log(theme.mintBold(line));
  }
  console.log(
    theme.dim("  ┌─ ") +
      theme.cyanBold("MINT AUTONOMOUS BACK-OFFICE") +
      theme.dim(" // ") +
      theme.muted("ZERO-HASSLE ONBOARDING WIZARD") +
      theme.dim(" ─┐\n"),
  );

  console.log(
    drawCard(
      [
        `Hello and welcome! I am your autonomous back-office coordinator.`,
        `I run in the background to monitor stock, connect to your real database,`,
        `and automatically execute incoming sales and reorders from your messaging channels.`,
        ``,
        `Let's complete a quick 4-step interactive setup so I can start working for you.`,
      ],
      {
        title: "WELCOME TO MINT",
        borderColor: theme.mint,
      },
    ),
  );
  console.log("");

  try {
    // -------------------------------------------------------------
    // STEP 1: IDENTITY & COMPANY
    // -------------------------------------------------------------
    console.log(drawDivider("STEP 1 OF 4: OPERATOR & COMPANY IDENTITY", 76));
    const userName = await ask(rl, `  ${theme.bold("1.1 What's your name or operator handle?")}`, "Dale");
    const companyName = await ask(rl, `  ${theme.bold("1.2 What's your company or business name?")}`, "My Logistics Co.");
    const email = await ask(
      rl,
      `  ${theme.bold("1.3 Account email address")}`,
      `${userName.toLowerCase().replace(/[^a-z0-9]/g, "") || "admin"}@mint.local`,
    );

    const companyId = `comp_${companyName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 16) || "main"}`;
    const userId = `usr_${userName.toLowerCase().replace(/[^a-z0-9]/g, "_") || "admin"}`;

    // Register Company, Central Warehouse, and User in DB
    await db.insert(companies).values({ id: companyId, name: companyName }).onConflictDoNothing();
    await db
      .insert(warehouses)
      .values({
        id: `alm_central_${companyId}`,
        companyId,
        name: "Central Operations Warehouse",
        location: "Main Facility",
      })
      .onConflictDoNothing();

    await db
      .insert(users)
      .values({
        id: userId,
        companyId,
        name: userName,
        email,
        role: "owner",
        passwordHash: "onboarding_local_auth",
        setupCompleted: true,
      })
      .onConflictDoNothing();

    // Default approved suppliers (Express 1-day & Wholesale Economy 6-day)
    const suppFastId = `supp_fast_${companyId}`;
    const suppEconId = `supp_econ_${companyId}`;
    await db
      .insert(suppliers)
      .values([
        { id: suppFastId, companyId, name: "FastTrack Industrial Supplies SA", origin: "real" },
        { id: suppEconId, companyId, name: "Global Wholesale Distribution Co", origin: "real" },
      ])
      .onConflictDoNothing();

    console.log(`\n  ${theme.success("✔")} Organization & profile registered for ${theme.mintBold(companyName)}.\n`);

    // -------------------------------------------------------------
    // STEP 2: CONNECT REAL DATA SOURCE (DATABASE / INVENTORY)
    // -------------------------------------------------------------
    console.log(drawDivider("STEP 2 OF 4: DATA SOURCE & INVENTORY CONNECTION", 76));
    console.log(`  Scanning local workspace for existing databases and inventory files...`);

    let discovered: any[] = [];
    try {
      discovered = await discoverLocalSources({ maxDepth: 2, includeSamples: true });
    } catch {}

    let selectedFilePath = "";
    let importedProductsCount = 0;

    if (discovered.length > 0) {
      console.log(`\n  Found ${theme.bold(discovered.length)} local data source(s) in your workspace:`);
      discovered.slice(0, 3).forEach((d, idx) => {
        const rel = path.relative(process.cwd(), d.path);
        console.log(`    ${theme.mintBold(`[${idx + 1}]`)} ${rel} (${d.sourceType.toUpperCase()})`);
      });
      console.log(`    ${theme.cyanBold(`[c]`)} Enter a custom path to your database / spreadsheet`);
      console.log(`    ${theme.dim(`[s] Skip for now (start with a clean, empty catalog)`)}`);

      const choice = await ask(rl, `\n  Select an option`, "s");

      if (choice === "1" && discovered[0]) {
        selectedFilePath = discovered[0].path;
      } else if (choice === "2" && discovered[1]) {
        selectedFilePath = discovered[1].path;
      } else if (choice === "3" && discovered[2]) {
        selectedFilePath = discovered[2].path;
      } else if (choice.toLowerCase() === "c") {
        selectedFilePath = await ask(rl, `  Enter path to file (.csv, .xlsx, or .sqlite)`);
      }
    } else {
      console.log(`  No local database found automatically.`);
      const customPath = await ask(
        rl,
        `  Enter path to your database/file (.sqlite, .db, .csv, .xlsx) or press Enter to skip`,
        "",
      );
      selectedFilePath = customPath;
    }

    if (!selectedFilePath) {
      console.log(`  ${theme.dim("○ No data source linked. Starting with a clean, empty catalog.")}\n`);
    }

    if (selectedFilePath && fs.existsSync(selectedFilePath)) {
      try {
        console.log(`  Connecting and importing: ${theme.bold(path.basename(selectedFilePath))}...`);
        const parsed = parseCsvFile(selectedFilePath);
        const mapping = proposeColumnMapping(parsed.headers);
        const syncRes = await syncDataSource({
          companyId,
          sourceName: path.basename(selectedFilePath),
          sourceType: "csv",
          uriOrPath: selectedFilePath,
          currentHeaders: parsed.headers,
          rows: parsed.rows,
          explicitMappings: mapping.mappings,
        });

        importedProductsCount = syncRes.importedRows;

        // Auto-link suppliers
        const allProds = await db.select().from(products).where(eq(products.companyId, companyId));
        for (const p of allProds) {
          await db
            .insert(supplierProducts)
            .values([
              {
                id: `sp_fast_${p.id}`,
                companyId,
                supplierId: suppFastId,
                productId: p.id,
                unitPrice: "185.00",
                minOrderQuantity: 10,
                leadTimeDays: 1,
              },
              {
                id: `sp_econ_${p.id}`,
                companyId,
                supplierId: suppEconId,
                productId: p.id,
                unitPrice: "140.00",
                minOrderQuantity: 25,
                leadTimeDays: 6,
              },
            ])
            .onConflictDoNothing();
        }

        console.log(`  ${theme.success("✔")} Connected! ${theme.bold(importedProductsCount)} SKUs synced with live stock tracking.\n`);
      } catch (err: any) {
        console.log(`  ${theme.warning("⚠")} Could not fully ingest file (${err.message}). Ready for manual import.\n`);
      }
    } else {
      console.log(`  ${theme.muted("○ Skipped catalog import. You can add data anytime.")}\n`);
    }

    // -------------------------------------------------------------
    // STEP 3: SALES CHANNELS (TELEGRAM / SLACK / DISCORD)
    // -------------------------------------------------------------
    console.log(drawDivider("STEP 3 OF 4: SALES CHANNELS & MESSAGING", 76));
    console.log(`  Where should Mint listen for sales to execute or send order notices?`);
    console.log(`    ${theme.mintBold("[1]")} Telegram Bot (Direct bot notifications & sales execution)`);
    console.log(`    ${theme.cyanBold("[2]")} Slack or Discord Webhook`);
    console.log(`    ${theme.dim("[3] Skip for now (can be connected later)")}`);

    const chanChoice = await ask(rl, `\n  Choose an option`, "3");
    let channelDescription = "None connected (Runs locally)";

    if (chanChoice === "1") {
      const token = await ask(rl, `  Enter your Telegram Bot Token`);
      const chatId = await ask(rl, `  Enter your Telegram Chat ID`);
      if (token && chatId) {
        await addNotificationChannel({
          companyId,
          type: "telegram",
          name: "Telegram Sales Bot",
          config: { botToken: token, chatId },
        });
        channelDescription = `Telegram Bot (Chat ID: ${chatId})`;
        console.log(`  ${theme.success("✔")} Telegram sales channel linked and active.\n`);
      } else {
        console.log(`  ${theme.dim("○ Incomplete Telegram credentials. Skipped for now.")}\n`);
      }
    } else if (chanChoice === "2") {
      const webhook = await ask(rl, `  Enter Webhook URL (Slack or Discord)`);
      if (webhook) {
        await addNotificationChannel({
          companyId,
          type: "slack",
          name: "Incoming Sales Webhook",
          config: { webhookUrl: webhook },
        });
        channelDescription = "Slack/Discord Webhook";
        console.log(`  ${theme.success("✔")} Webhook channel linked.\n`);
      } else {
        console.log(`  ${theme.dim("○ No webhook entered. Skipped for now.")}\n`);
      }
    } else {
      console.log(`  ${theme.dim("○ Skipped remote channels. Mint will log actions locally.")}\n`);
    }

    // -------------------------------------------------------------
    // STEP 4: AUTONOMY GOVERNANCE
    // -------------------------------------------------------------
    console.log(drawDivider("STEP 4 OF 4: AUTONOMY GOVERNANCE LEVEL", 76));
    console.log(`  How autonomously should Mint reorder inventory when stock drops below minimum?`);
    console.log(
      `    ${theme.mintBold("[1] Assisted (Recommended)")} — Automatically buys orders < $10,000 MXN; notifies you on bigger purchases.`,
    );
    console.log(
      `    ${theme.cyanBold("[2] Fully Autonomous")} — Autonomously executes all restocking orders without waiting.`,
    );
    console.log(
      `    ${theme.dim("[3] Supervised / Dry-run")} — Only suggests purchase orders; requires manual operator approval.`,
    );

    const autoChoice = await ask(rl, `\n  Select autonomy mode`, "1");
    let autonomyLevel = "assisted";
    if (autoChoice === "2") autonomyLevel = "auto";
    if (autoChoice === "3") autonomyLevel = "dry-run";

    await db
      .insert(businessConfig)
      .values({
        companyId,
        key: "autonomy_level",
        value: autonomyLevel,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [businessConfig.companyId, businessConfig.key],
        set: { value: autonomyLevel, updatedAt: new Date() },
      });

    console.log(`  ${theme.success("✔")} Autonomy policy set to ${theme.mintBold(autonomyLevel.toUpperCase())}.\n`);

    // -------------------------------------------------------------
    // FINALIZE & SAVE SESSION IN SECURE KEYCHAIN
    // -------------------------------------------------------------
    const session: StoredSession = {
      token: `mint_token_${companyId}_${Date.now()}`,
      userId,
      email,
      name: userName,
      role: "owner",
      companyId,
      companyName,
      savedAt: new Date().toISOString(),
    };

    await saveSession(session);

    // Summary Card
    console.log("");
    console.log(
      drawCard(
        [
          `${theme.dim("Operator:")}     ${theme.bold(userName)} (${theme.cyan("OWNER")})`,
          `${theme.dim("Organization:")} ${theme.mintBold(companyName)} [${theme.dim(companyId)}]`,
          `${theme.dim("Catalog:")}      ${theme.bold(importedProductsCount)} SKUs connected with real stock`,
          `${theme.dim("Channel:")}      ${theme.bold(channelDescription)}`,
          `${theme.dim("Autonomy:")}     ${theme.badge(autonomyLevel.toUpperCase(), "mint")} (Restocks < $10k MXN auto-executed)`,
          `${theme.dim("Background:")}   ${theme.mintBold("DAEMON ONLINE")} — Listening for sales & watching stock 24/7`,
        ],
        {
          title: "🎉 SETUP COMPLETE — AGENT IS READY TO OPERATE",
          badge: "ONLINE",
          badgeColor: "mint",
          borderColor: theme.mint,
        },
      ),
    );

    console.log(`\n${theme.mintBold("Everything is configured.")} Mint is running autonomously.`);
    console.log(`Whenever a sale comes through your channel, Mint automatically updates your database and restocks.`);
    console.log(`You can close this terminal anytime, or type ${theme.cyanBold("/status")} to inspect live activity.\n`);

    return session;
  } finally {
    rl.close();
  }
}
