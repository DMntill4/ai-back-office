import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const VIEWPORTS = [
  { width: 1280, height: 800, name: "1280x800" },
  { width: 1440, height: 900, name: "1440x900" },
  { width: 1920, height: 1080, name: "1920x1080" },
];

const PAGES = [
  { hash: "inicio", filePrefix: "shell" },
  { hash: "inicio", filePrefix: "inicio" },
  { hash: "aprobaciones", filePrefix: "aprobaciones" },
  { hash: "flujo_agente", filePrefix: "flujo-agente" },
  { hash: "mapa_conocimiento", filePrefix: "mapa-conocimiento" },
  { hash: "inventario", filePrefix: "inventario" },
];

const DOCS_DIR = path.resolve(process.cwd(), "docs/screens");
const ARTIFACT_DIR = path.resolve(
  "C:/Users/andre/.gemini/antigravity/brain/ee0a063f-876c-4422-9268-eb52d84bfaa0"
);

async function main() {
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  console.log("Launching browser via Playwright (msedge channel)...");
  let browser;
  try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
  } catch (err) {
    console.log("Fallback to bundled chromium launch:", err);
    browser = await chromium.launch({ headless: true });
  }

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    for (const target of PAGES) {
      const url = `http://localhost:3000/#${target.hash}`;
      console.log(`Navigating to ${url}...`);
      await page.goto(url, { waitUntil: "networkidle" });
      // Wait for fonts & particle canvas to settle
      await page.waitForTimeout(1000);

      const filename = `${target.filePrefix}-${vp.name}.png`;
      const docPath = path.join(DOCS_DIR, filename);
      await page.screenshot({ path: docPath, fullPage: false });
      console.log(`✓ Saved ${docPath}`);

      if (fs.existsSync(ARTIFACT_DIR)) {
        const artPath = path.join(ARTIFACT_DIR, filename);
        fs.copyFileSync(docPath, artPath);
        console.log(`✓ Copied to artifact: ${artPath}`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log("\nAll screenshots captured successfully!");
}

main().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
