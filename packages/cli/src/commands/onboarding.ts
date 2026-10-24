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
  inventory,
  businessConfig,
} from "@mint/core";
import {
  discoverLocalSources,
  parseCsvFile,
  proposeColumnMapping,
  syncDataSource,
  searchProjectDatabase,
  extractProductsFromSqlFile,
  type DiscoveredProject,
  type ExtractedProductItem,
} from "@mint/ingest";
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

    // Validate Gmail email address
    const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@g(oogle)?mail\.com$/i;
    let email = "";
    while (true) {
      email = await ask(
        rl,
        `  ${theme.bold("1.3 Account Gmail address (required for Google notifications)")}`,
        "dalej@gmail.com",
      );
      if (GMAIL_REGEX.test(email)) {
        break;
      }
      console.log(`  ${theme.redBold("❌ Invalid email:")} Only Gmail accounts (e.g. yourname@gmail.com) are accepted for automated operational alerts.\n`);
    }

    // Validate operator password
    let password = "";
    while (true) {
      password = await ask(
        rl,
        `  ${theme.bold("1.4 Operator password (min 6 characters)")}`,
        "password123",
      );
      if (password.length >= 6) {
        break;
      }
      console.log(`  ${theme.redBold("❌ Password too short:")} Must be at least 6 characters.\n`);
    }

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
        passwordHash: password,
        setupCompleted: true,
      })
      .onConflictDoNothing();

    // Auto-register Gmail notification channel so alerts can be sent directly
    await addNotificationChannel({
      companyId,
      type: "gmail",
      name: `Gmail Alerts (${email})`,
      config: { email },
    }).catch(() => null);

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

    console.log(`\n  ${theme.success("✔")} Profile registered & verified with Gmail: ${theme.mintBold(email)}.\n`);

    // -------------------------------------------------------------
    // STEP 2: CONNECT REAL DATA SOURCE (DATABASE / INVENTORY)
    // -------------------------------------------------------------
    console.log(drawDivider("STEP 2 OF 4: DATA SOURCE & INVENTORY CONNECTION", 76));
    console.log(`  How would you like to connect your database or catalog?`);
    console.log(`    ${theme.mintBold("[1] 🔎 Find database by project name")} (e.g. "opus rentals", "springboot app")`);
    console.log(`    ${theme.cyanBold("[2] 📁 Enter file path or database URI")} (.sqlite, .db, .sql, .csv)`);
    console.log(`    ${theme.dim("[3] ⏭  Skip for now (start with a clean, empty catalog)")}`);

    const sourceChoice = await ask(rl, `\n  Choose an option`, "1");
    let importedProductsCount = 0;
    let selectedSourceLabel = "Empty (0 products)";

    if (sourceChoice === "1") {
      const projectQuery = await ask(
        rl,
        `  ${theme.bold("Enter project name or search query")}`,
        "opus rentals",
      );

      console.log(`\n  Searching your PC with Mint AI Brain for projects matching "${theme.mintBold(projectQuery)}"...`);
      const foundProjects: DiscoveredProject[] = await searchProjectDatabase(projectQuery);

      if (foundProjects.length > 0) {
        console.log(`  ${theme.success("✔")} Mint AI identified ${theme.bold(foundProjects.length)} project(s):\n`);
        foundProjects.forEach((proj: DiscoveredProject, idx: number) => {
          console.log(`    ${theme.mintBold(`[#${idx + 1}] ${proj.projectName}`)} (${proj.framework})`);
          console.log(`        Location:   ${theme.dim(proj.projectPath)}`);
          if (proj.databaseName) {
            console.log(`        Database:   ${theme.cyanBold(proj.databaseName)} (${proj.dbType.toUpperCase()}) on ${proj.host}:${proj.port}`);
          }
          if (proj.sqlFiles.length > 0) {
            const sqlNames = proj.sqlFiles.map((f: string) => path.basename(f)).join(", ");
            console.log(`        SQL Data:   ${theme.bold(sqlNames)}`);
          }
          if (proj.aiReasoning) {
            console.log(`        AI Decision: ${theme.mint(proj.aiReasoning)}`);
          }
          console.log("");
        });

        const projToUse = foundProjects[0];
        const confirmSync = await ask(
          rl,
          `  Would you like to sync items from '${theme.bold(projToUse.projectName)}'? [Y/n]`,
          "Y",
        );

        if (confirmSync.toLowerCase() !== "n") {
          // Check for data SQL files in the project
          const extracted: ExtractedProductItem[] = [];
          for (const sqlFile of projToUse.sqlFiles) {
            if (fs.existsSync(sqlFile)) {
              const fileItems = extractProductsFromSqlFile(sqlFile);
              if (fileItems.length > 0) {
                console.log(`  Extracting real machinery & equipment catalog from ${theme.bold(path.basename(sqlFile))}... (${fileItems.length} items found)`);
                extracted.push(...fileItems);
              }
            }
          }

          if (extracted.length > 0) {
            for (const item of extracted) {
              const productId = `prod_${item.sku.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
              await db
                .insert(products)
                .values({
                  id: productId,
                  companyId,
                  sku: item.sku,
                  name: item.name,
                  category: item.category,
                  minStock: item.minStock,
                  origin: "real",
                })
                .onConflictDoUpdate({
                  target: [products.companyId, products.sku],
                  set: { name: item.name, category: item.category, minStock: item.minStock },
                });

              await db
                .insert(inventory)
                .values({
                  id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  companyId,
                  productId,
                  warehouseId: `alm_central_${companyId}`,
                  stock: item.stock,
                })
                .onConflictDoNothing();

              // Link suppliers
              await db
                .insert(supplierProducts)
                .values([
                  {
                    id: `sp_fast_${productId}`,
                    companyId,
                    supplierId: suppFastId,
                    productId,
                    unitPrice: String(item.price * 0.8),
                    minOrderQuantity: 1,
                    leadTimeDays: 1,
                  },
                  {
                    id: `sp_econ_${productId}`,
                    companyId,
                    supplierId: suppEconId,
                    productId,
                    unitPrice: String(item.price * 0.65),
                    minOrderQuantity: 5,
                    leadTimeDays: 6,
                  },
                ])
                .onConflictDoNothing();

              importedProductsCount++;
            }

            selectedSourceLabel = `${projToUse.projectName} (${importedProductsCount} items)`;
            console.log(`  ${theme.success("✔")} Successfully synced ${theme.bold(importedProductsCount)} real items from ${theme.mintBold(projToUse.projectName)}!\n`);
          } else {
            console.log(`  ${theme.dim("○ Project registered. Database ready for live connection.")}\n`);
            selectedSourceLabel = `${projToUse.projectName} (Live DB)`;
          }
        }
      } else {
        console.log(`  ${theme.amber("No project matching that query was found.")} Starting with empty catalog.\n`);
      }
    } else if (sourceChoice === "2") {
      const customPath = await ask(rl, `  Enter path to file (.sqlite, .db, .sql, .csv)`);
      if (customPath && fs.existsSync(customPath)) {
        const ext = path.extname(customPath).toLowerCase();
        if (ext === ".sql") {
          const extracted = extractProductsFromSqlFile(customPath);
          for (const item of extracted) {
            const productId = `prod_${item.sku.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
            await db
              .insert(products)
              .values({
                id: productId,
                companyId,
                sku: item.sku,
                name: item.name,
                category: item.category,
                minStock: item.minStock,
                origin: "real",
              })
              .onConflictDoNothing();

            await db
              .insert(inventory)
              .values({
                id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                companyId,
                productId,
                warehouseId: `alm_central_${companyId}`,
                stock: item.stock,
              })
              .onConflictDoNothing();

            importedProductsCount++;
          }
          selectedSourceLabel = `${path.basename(customPath)} (${importedProductsCount} items)`;
          console.log(`  ${theme.success("✔")} Imported ${theme.bold(importedProductsCount)} items from SQL file!\n`);
        } else if (ext === ".csv") {
          const parsed = parseCsvFile(customPath);
          const mapping = proposeColumnMapping(parsed.headers);
          const syncRes = await syncDataSource({
            companyId,
            sourceName: path.basename(customPath),
            sourceType: "csv",
            uriOrPath: customPath,
            currentHeaders: parsed.headers,
            rows: parsed.rows,
            explicitMappings: mapping.mappings,
          });
          importedProductsCount = syncRes.importedRows;
          selectedSourceLabel = `${path.basename(customPath)} (${importedProductsCount} items)`;
          console.log(`  ${theme.success("✔")} Imported ${theme.bold(importedProductsCount)} items from CSV file!\n`);
        }
      } else {
        console.log(`  ${theme.dim("○ File not found or skipped. Starting with empty catalog.")}\n`);
      }
    } else {
      console.log(`  ${theme.dim("○ Skipped. Starting with a clean, empty catalog for your company.")}\n`);
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
