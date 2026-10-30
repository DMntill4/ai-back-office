import { chromium } from "playwright";

async function measure() {
  console.log("Iniciando medición de CPU para AgentParticleCloud (1440x900)...");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto("http://localhost:3000/#inicio", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const client = await page.context().newCDPSession(page);
  await client.send("Performance.enable");

  // Medir Modo Completo (60 fps animado)
  console.log("Midiendo 3 segundos en Modo Completo (animación continua)...");
  const metricsStartFull = await client.send("Performance.getMetrics");
  const startFullTime = Date.now();
  await page.waitForTimeout(3000);
  const metricsEndFull = await client.send("Performance.getMetrics");
  const durationFullSec = (Date.now() - startFullTime) / 1000;

  const getMetric = (metrics: any[], name: string) => {
    const item = metrics.find((m) => m.name === name);
    return item ? item.value : 0;
  };

  const taskDurationFull =
    getMetric(metricsEndFull.metrics, "TaskDuration") -
    getMetric(metricsStartFull.metrics, "TaskDuration");
  const cpuUsagePercentFull = ((taskDurationFull / durationFullSec) * 100).toFixed(2);
  const jsHeapFull = (
    getMetric(metricsEndFull.metrics, "JSHeapUsedSize") /
    (1024 * 1024)
  ).toFixed(2);

  // Activar Modo Ligero (prefers-reduced-motion)
  console.log("\nEmulando prefers-reduced-motion: reduce para Modo Ligero...");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(1000);

  const metricsStartLight = await client.send("Performance.getMetrics");
  const startLightTime = Date.now();
  await page.waitForTimeout(3000);
  const metricsEndLight = await client.send("Performance.getMetrics");
  const durationLightSec = (Date.now() - startLightTime) / 1000;

  const taskDurationLight =
    getMetric(metricsEndLight.metrics, "TaskDuration") -
    getMetric(metricsStartLight.metrics, "TaskDuration");
  const cpuUsagePercentLight = ((taskDurationLight / durationLightSec) * 100).toFixed(2);
  const jsHeapLight = (
    getMetric(metricsEndLight.metrics, "JSHeapUsedSize") /
    (1024 * 1024)
  ).toFixed(2);

  console.log("\n========================================================");
  console.log("  REPORTE DE CONSUMO CPU / MEMORIA (DevTools CDP)       ");
  console.log("========================================================");
  console.log(`Modo Completo (60 fps):`);
  console.log(`  • Carga de CPU estimada:  ~${cpuUsagePercentFull}%`);
  console.log(`  • Heap JS utilizado:      ${jsHeapFull} MB`);
  console.log(`\nModo Ligero (prefers-reduced-motion / estático):`);
  console.log(`  • Carga de CPU estimada:  ~${cpuUsagePercentLight}%`);
  console.log(`  • Heap JS utilizado:      ${jsHeapLight} MB`);
  console.log("========================================================\n");

  await browser.close();
}

measure().catch(console.error);

