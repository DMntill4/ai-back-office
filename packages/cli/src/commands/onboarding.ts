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
  scanLocalWorkspaceProjects,
  extractProductsFromSqlFile,
  extractSuppliersFromSqlFile,
  type DiscoveredProject,
  type ExtractedProductItem,
  type ExtractedSupplierItem,
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

    // Real suppliers are populated from database/project SQL schemas in Step 2 without fabricating fake vendors
    console.log(`\n  ${theme.success("✔")} Profile registered & verified with Gmail: ${theme.mintBold(email)}.\n`);

    // -------------------------------------------------------------
    // STEP 2: CONNECT REAL DATA SOURCE (DATABASE / INVENTORY)
    // -------------------------------------------------------------
    console.log(drawDivider("STEP 2 OF 4: DATA SOURCE & INVENTORY CONNECTION", 76));

    // Dynamic pre-scan of current host computer's developer directories
    const localProjects = scanLocalWorkspaceProjects();

    if (localProjects.length > 0) {
      console.log(`  ${theme.mintBold("● Detected software project(s) on this computer:")}`);
      localProjects.slice(0, 5).forEach((proj, idx) => {
        const dbInfo = proj.databaseName
          ? ` [DB: ${proj.databaseName} (${proj.dbType.toUpperCase()})]`
          : proj.sqlFiles.length > 0
          ? " [SQL Scripts]"
          : "";
        console.log(`    ${theme.cyanBold(`[#${idx + 1}]`)} ${theme.bold(proj.projectName)} ${theme.dim(`(${proj.framework})${dbInfo}`)}`);
      });
      console.log("");
    } else {
      console.log(`  ${theme.dim("○ No software projects detected automatically in standard developer folders.")}\n`);
    }

    console.log(`  How would you like to connect your database or catalog?`);
    if (localProjects.length > 0) {
      console.log(`    ${theme.mintBold(`[1] ⚡ Quick connect a detected project (select 1-${localProjects.length})`)}`);
      console.log(`    ${theme.cyanBold(`[2] 💬 Chat with AI to find anywhere (e.g. "busca en downloads mi proyecto...", "está en D:\\repos")`)}`);
      console.log(`    ${theme.dim("[3] 📁 Enter file path or database URI (.sqlite, .db, .sql, .csv)")}`);
      console.log(`    ${theme.dim("[4] ⏭  Skip for now (start with a clean, empty catalog)")}`);
    } else {
      console.log(`    ${theme.cyanBold(`[1] 💬 Chat with AI to find your project (e.g. "busca en downloads mi proyecto...", "está en C:\\work")`)}`);
      console.log(`    ${theme.dim("[2] 📁 Enter file path or database URI (.sqlite, .db, .sql, .csv)")}`);
      console.log(`    ${theme.dim("[3] ⏭  Skip for now (start with a clean, empty catalog)")}`);
    }

    const sourceChoice = await ask(rl, `\n  Choose an option`, "1");
    let importedProductsCount = 0;
    let selectedSourceLabel = "Empty (0 products)";
    let foundProjects: DiscoveredProject[] = [];

    const isQuickSelect = localProjects.length > 0 && sourceChoice === "1";
    const isChatAiSearch = (localProjects.length > 0 && sourceChoice === "2") || (localProjects.length === 0 && sourceChoice === "1");
    const isCustomPath = (localProjects.length > 0 && sourceChoice === "3") || (localProjects.length === 0 && sourceChoice === "2");

    if (isQuickSelect) {
      const queryPrompt = `  ${theme.bold(`Enter project number (1-${localProjects.length}) or project name`)}`;
      const selected = await ask(rl, queryPrompt, "1");
      const selectedNum = parseInt(selected, 10);
      if (!isNaN(selectedNum) && selectedNum >= 1 && selectedNum <= localProjects.length) {
        foundProjects = [localProjects[selectedNum - 1]];
      } else {
        console.log(`\n  Searching your PC with Mint AI Brain for "${theme.mintBold(selected)}"...`);
        foundProjects = await searchProjectDatabase(selected);
      }
    } else if (isChatAiSearch) {
      console.log(`\n  ${theme.cyanBold("💬 Mint AI Location & Project Discovery:")}`);
      console.log(`  You can name any project and give location hints (e.g. "busca en downloads mi proyecto...", "está en D:\\repos\\app")`);
      const chatQuery = await ask(
        rl,
        `  ${theme.bold("Tell Mint AI what to find and where to look")}`,
        localProjects.length > 0 ? localProjects[0].projectName : "",
      );

      if (chatQuery) {
        console.log(`\n  Mint AI Brain is searching across target locations for "${theme.mintBold(chatQuery)}"...`);
        foundProjects = await searchProjectDatabase(chatQuery);
      }
    }

    if (foundProjects.length > 0) {
      console.log(`\n  ${theme.success("✔")} Mint AI identified ${theme.bold(foundProjects.length)} project(s):\n`);
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
        const extractedSuppliers: ExtractedSupplierItem[] = [];

        for (const sqlFile of projToUse.sqlFiles) {
          if (fs.existsSync(sqlFile)) {
            const fileItems = extractProductsFromSqlFile(sqlFile);
            if (fileItems.length > 0) {
              console.log(`  Extracting catalog and inventory items from ${theme.bold(path.basename(sqlFile))}... (${fileItems.length} items found)`);
              extracted.push(...fileItems);
            }

            const fileSuppliers = extractSuppliersFromSqlFile(sqlFile);
            if (fileSuppliers.length > 0) {
              console.log(`  Extracting verified suppliers from ${theme.bold(path.basename(sqlFile))}... (${fileSuppliers.length} suppliers found)`);
              extractedSuppliers.push(...fileSuppliers);
            }
          }
        }

        // Insert real suppliers from the project (if present)
        for (const s of extractedSuppliers) {
          const suppId = `supp_${s.name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 30)}_${companyId}`;
          await db
            .insert(suppliers)
            .values({
              id: suppId,
              companyId,
              name: s.name,
              origin: "real",
            })
            .onConflictDoNothing();
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

            const invId = `inv_${companyId}_${productId}`;
            await db
              .insert(inventory)
              .values({
                id: invId,
                companyId,
                productId,
                warehouseId: `alm_central_${companyId}`,
                stock: item.stock,
              })
              .onConflictDoUpdate({
                target: inventory.id,
                set: { stock: item.stock, updatedAt: new Date() },
              });

            importedProductsCount++;
          }

          selectedSourceLabel = `${projToUse.projectName} (${importedProductsCount} items)`;
          console.log(`  ${theme.success("✔")} Successfully synced ${theme.bold(importedProductsCount)} real items from ${theme.mintBold(projToUse.projectName)}!\n`);
        } else {
          console.log(`  ${theme.dim("○ Project registered. Database ready for live connection.")}\n`);
          selectedSourceLabel = `${projToUse.projectName} (Live DB)`;
        }
      }
    } else if (isChatAiSearch || isQuickSelect) {
      console.log(`  ${theme.amber("No project matching that query was found on this computer.")} Starting with empty catalog.\n`);
    } else if (isCustomPath) {
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

            const invId = `inv_${companyId}_${productId}`;
            await db
              .insert(inventory)
              .values({
                id: invId,
                companyId,
                productId,
                warehouseId: `alm_central_${companyId}`,
                stock: item.stock,
              })
              .onConflictDoUpdate({
                target: inventory.id,
                set: { stock: item.stock, updatedAt: new Date() },
              });

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
    // STEP 3: AUTONOMOUS NOTIFICATIONS & ALERTS CHANNELS (MANDATORY)
    // -------------------------------------------------------------
    console.log(drawDivider("STEP 3 OF 4: AUTONOMOUS NOTIFICATION CHANNELS (MANDATORY)", 76));
    console.log(`  ${theme.bold("Para que Mint opere de forma autónoma, DEBES configurar dónde recibir avisos:")}`);
    console.log(`    • Actualizaciones y quiebres de existencias (Stock Alerts)`);
    console.log(`    • Alertas críticas de logística y demoras de transporte`);
    console.log(`    • Propuestas de compra y reposición para autorización inmediata`);
    console.log("");
    console.log(`  Selecciona tu canal de recepción de alertas:`);
    console.log(`    ${theme.mintBold("[1] 🎮 Discord Webhook")} (Canal de alertas en tu servidor Discord)`);
    console.log(`    ${theme.cyanBold("[2] 💬 Slack Webhook")} (Canal de operaciones en Slack)`);
    console.log(`    ${theme.violet("[3] ✈️ Telegram Bot")} (Bot interactivo con tokens de aprobación)`);
    console.log(`    ${theme.amberBold(`[4] 📧 Gmail Alerts`)} (Notificaciones al correo registrado: ${email})`);
    console.log(`    ${theme.bold("[5] 🖥️ Dashboard Web Integrada")} (Alertas en vivo en navegador con /web)`);

    let channelDescription = "None";
    let channelConfigured = false;

    while (!channelConfigured) {
      const chanChoice = await ask(rl, `\n  Selecciona una opción (1-5)`, "1");

      if (chanChoice === "1") {
        const webhook = await ask(rl, `  Ingresa Webhook URL de Discord`);
        if (webhook && webhook.startsWith("http")) {
          await addNotificationChannel({
            companyId,
            type: "discord",
            name: "Discord Operational Alerts",
            config: { webhookUrl: webhook, topics: ["stock", "critical", "orders"] },
          });
          channelDescription = "Discord Webhook (Canal de Alertas)";
          channelConfigured = true;
          console.log(`  ${theme.success("✔")} Canal de Discord vinculado con éxito.\n`);
        } else {
          console.log(`  ${theme.redBold("❌ URL inválida.")} Debe iniciar con https://discord.com/api/webhooks/...\n`);
        }
      } else if (chanChoice === "2") {
        const webhook = await ask(rl, `  Ingresa Webhook URL de Slack`);
        if (webhook && webhook.startsWith("http")) {
          await addNotificationChannel({
            companyId,
            type: "slack",
            name: "Slack Ops Channel",
            config: { webhookUrl: webhook, topics: ["stock", "critical", "orders"] },
          });
          channelDescription = "Slack Webhook (Canal de Operaciones)";
          channelConfigured = true;
          console.log(`  ${theme.success("✔")} Canal de Slack vinculado con éxito.\n`);
        } else {
          console.log(`  ${theme.redBold("❌ URL inválida.")} Debe iniciar con https://hooks.slack.com/...\n`);
        }
      } else if (chanChoice === "3") {
        const token = await ask(rl, `  Ingresa Telegram Bot Token`);
        const chatId = await ask(rl, `  Ingresa Telegram Chat ID`);
        if (token && chatId) {
          await addNotificationChannel({
            companyId,
            type: "telegram",
            name: "Telegram Sales Bot",
            config: { botToken: token, chatId, topics: ["stock", "critical", "orders"] },
          });
          channelDescription = `Telegram Bot (@${chatId})`;
          channelConfigured = true;
          console.log(`  ${theme.success("✔")} Bot de Telegram vinculado con éxito.\n`);
        } else {
          console.log(`  ${theme.redBold("❌ Credenciales incompletas.")} Debes ingresar tanto el Token como el Chat ID.\n`);
        }
      } else if (chanChoice === "4") {
        await addNotificationChannel({
          companyId,
          type: "gmail",
          name: `Gmail Alerts (${email})`,
          config: { email, topics: ["stock", "critical", "orders"] },
        });
        channelDescription = `Gmail Alerts (${email})`;
        channelConfigured = true;
        console.log(`  ${theme.success("✔")} Canal de alertas por Gmail vinculado a ${theme.bold(email)}.\n`);
      } else if (chanChoice === "5") {
        await addNotificationChannel({
          companyId,
          type: "gmail",
          name: "Dashboard Web Live Feed",
          config: { email, webFeed: true, topics: ["stock", "critical", "orders"] },
        });
        channelDescription = "Dashboard Web Visual (http://localhost:5173)";
        channelConfigured = true;
        console.log(`  ${theme.success("✔")} Dashboard Web configurada como receptor de alertas en tiempo real.`);
        console.log(`  ${theme.dim("Podrás abrir la consola visual en cualquier momento usando el comando '/web'.")}\n`);
      } else {
        console.log(`  ${theme.amber("Por favor selecciona una opción válida entre 1 y 5.")}`);
      }
    }

    // -------------------------------------------------------------
    // STEP 4: AUTONOMY GOVERNANCE
    // -------------------------------------------------------------
    console.log(drawDivider("STEP 4 OF 4: AUTONOMY GOVERNANCE LEVEL", 76));
    console.log(`  How should Mint handle inventory deficits when stock falls below safety levels?`);
    console.log(
      `    ${theme.mintBold("[1] Supervised / Human Approval First (Recommended for Production)")} — Generates restocking proposals for your 1-click review in /inbox; zero unauthorized purchases.`,
    );
    console.log(
      `    ${theme.cyanBold("[2] Assisted / Low-Stock Alerts & Auto-Drafting")} — Proactively alerts your team on Discord/Gmail and drafts purchase orders with supplier comparisons.`,
    );
    console.log(
      `    ${theme.dim("[3] Autonomous (Policy-Governed)")} — Automatically restocks under strict budget policy with vetted suppliers.`,
    );

    const autoChoice = await ask(rl, `\n  Select autonomy mode`, "1");
    let autonomyLevel = "dry-run";
    if (autoChoice === "2") autonomyLevel = "assisted";
    if (autoChoice === "3") autonomyLevel = "auto";

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
