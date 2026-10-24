import {
  db,
  warehouses,
  suppliers,
  shipments,
  analyzeDynamicCatalogHealth,
  evaluateWarehouseRebalancing,
  executeWarehouseTransfer,
  dispatchOutboundShipment,
  receiveInboundShipment,
  buildConsolidatedLoadPlans,
  updateLogisticsNodeLocation,
  resolveNodeGeoPoint,
  calculateRealRoute,
} from "@mint/core";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider, drawTable } from "../ui/box";
import * as readline from "node:readline";

function ask(rl: readline.Interface, question: string, defaultValue = ""): Promise<string> {
  return new Promise((resolve) => {
    const formatted = defaultValue ? `${question} [${theme.mintBold(defaultValue)}]: ` : `${question}: `;
    rl.question(formatted, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

export async function logisticsCommand(subcommand?: string, args: string[] = []) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";
  const sub = (subcommand || "overview").toLowerCase();

  if (sub === "dispatch" || sub === "despachar") {
    await dispatchCliFlow(companyId, args);
    return;
  }

  if (sub === "receive" || sub === "recibir") {
    await receiveCliFlow(companyId, args[0]);
    return;
  }

  if (sub === "rebalance" || sub === "rebalancear" || sub === "transfer") {
    await rebalanceCliFlow(companyId);
    return;
  }

  if (sub === "consolidate" || sub === "consolidar") {
    await consolidateCliFlow(companyId);
    return;
  }

  if (sub === "gps" || sub === "node") {
    await configureGpsNodeCliFlow(companyId, args);
    return;
  }

  if (sub === "route" || sub === "ruta") {
    await routeCalcCliFlow(args);
    return;
  }

  const [whs, supps, ships, health, rebalancing, loads] = await Promise.all([
    db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
    db.select().from(suppliers).where(eq(suppliers.companyId, companyId)),
    db.select().from(shipments).where(eq(shipments.companyId, companyId)).orderBy(desc(shipments.updatedAt)),
    analyzeDynamicCatalogHealth(companyId),
    evaluateWarehouseRebalancing(companyId),
    buildConsolidatedLoadPlans(companyId),
  ]);

  console.log("\n" + drawDivider(`TORRE DE CONTROL LOGISTICA [${companyId}]`, 88));

  // 1. Nodos Logisticos
  console.log(`  ${theme.bold("NODOS GPS (BODEGAS Y PROVEEDORES)")}`);
  for (const w of whs) {
    const coords =
      w.latitude && w.longitude
        ? theme.mint(`${Number(w.latitude).toFixed(4)}, ${Number(w.longitude).toFixed(4)}`)
        : theme.amber("Sin GPS");
    console.log(`    [BODEGA]    ${w.name.padEnd(28)} | ${(w.city || w.location || "N/A").padEnd(18)} | ${coords}`);
  }
  for (const s of supps.slice(0, 5)) {
    const coords =
      s.latitude && s.longitude
        ? theme.cyan(`${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}`)
        : theme.dim("Auto-GPS");
    console.log(`    [PROVEEDOR] ${s.name.padEnd(28)} | ${(s.city || s.streetAddress || "N/A").padEnd(18)} | ${coords}`);
  }

  // 2. Embarques Activos
  console.log("\n" + drawDivider("EMBARQUES Y GUIAS EN TRANSITO", 88));
  if (ships.length === 0) {
    console.log(`  ${theme.dim("Sin embarques activos. Usa '/dispatch' para despachar o '/inbox' para aprobar compras.")}`);
  } else {
    const shipRows = ships.slice(0, 8).map((s) => {
      const dirBadge = s.trackingNumber.includes("-OUT-")
        ? theme.cyanBold("OUTBOUND")
        : s.trackingNumber.includes("-XFER-")
          ? theme.violet("TRANSFER")
          : theme.mintBold("INBOUND");
      const statusBadge =
        s.status === "entregado"
          ? theme.badge("ENTREGADO", "mint")
          : s.status === "retrasado"
            ? theme.badge("RETRASADO", "red")
            : theme.badge("EN TRANSITO", "amber");
      const etaStr = s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString() : "N/A";
      const origStr = s.originLocation || (s as any).origin || "N/A";
      const destStr = s.destinationLocation || (s as any).destination || "N/A";
      return [
        theme.bold(s.trackingNumber),
        dirBadge,
        origStr.slice(0, 20),
        destStr.slice(0, 20),
        s.carrier.slice(0, 18),
        statusBadge,
        etaStr,
      ];
    });
    console.log(
      drawTable(
        ["GUIA", "FLUJO", "ORIGEN", "DESTINO", "TRANSPORTISTA", "ESTADO", "ETA"],
        shipRows,
        [16, 10, 20, 20, 18, 13, 11],
      ),
    );
  }

  const ropAlerts = health.filter((h) => h.needsReorder);
  console.log(
    `\n  ${theme.dim("Resumen:")} ${ropAlerts.length} SKUs bajo ROP  |  ${rebalancing.length} rebalanceos posibles  |  ${loads.length} cargas consolidadas`,
  );
  console.log(
    `  ${theme.dim("Acciones:")} ${theme.mint("/dispatch")} | ${theme.mint("/receive <guia>")} | ${theme.mint("/consolidate")} | ${theme.mint("/rebalance")} | ${theme.mint("/logistics gps")}\n`,
  );
}

export async function dispatchCliFlow(companyId: string, args: string[] = []) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("\n" + drawDivider("DESPACHO DE SALIDA A CLIENTE (OUTBOUND + OSRM)", 82));
    const productQuery = args[0] || (await ask(rl, "  1. SKU, ID o nombre del producto"));
    const qtyRaw = args[1] || (await ask(rl, "  2. Cantidad a enviar", "5"));
    const destCity = args.slice(2).join(" ") || (await ask(rl, "  3. Ciudad o direccion destino", "Monterrey, NL"));
    const customerName = await ask(rl, "  4. Cliente o sucursal receptora", "Cliente Corporativo");

    rl.close();

    console.log(theme.muted("\n  Calculando bodega optima, geocodificando destino y trazando ruta OSRM..."));
    const res = await dispatchOutboundShipment({
      companyId,
      productQuery,
      quantity: Math.max(1, parseInt(qtyRaw, 10) || 1),
      destinationAddressOrCity: destCity,
      customerName,
    });

    if (!res.success) {
      console.log(`\n  ${theme.redBold("[ERROR]")} ${res.message}\n`);
      return;
    }

    console.log(
      "\n" +
        drawCard(
          [
            `${theme.dim("Guia Generada:")}    ${theme.mintBold(res.trackingNumber || "N/A")}`,
            `${theme.dim("Bodega Origen:")}    ${theme.bold(res.originWarehouse || "Almacen Central")}`,
            `${theme.dim("Destino Cliente:")}  ${theme.cyanBold(typeof res.destination === "object" ? res.destination.address : res.destination || destCity)}`,
            `${theme.dim("Ruta Vial:")}        ${res.distanceKm ? `${res.distanceKm} km` : "N/A"} (${res.durationFormatted || "N/A"})`,
            `${theme.dim("Flete Estimado:")}   $${(res.freightCostMxn || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
            `${theme.dim("Stock Restante:")}   ${theme.bold(String(res.remainingStock ?? 0))} unidades`,
          ],
          {
            title: "MANIFIESTO DE DESPACHO EMITIDO",
            badge: "EN TRANSITO",
            badgeColor: "mint",
            borderColor: theme.mint,
          },
        ),
    );
  } catch (err: any) {
    rl.close();
    console.error(theme.redBold(`  [ERROR] ${err.message}`));
  }
}

export async function receiveCliFlow(companyId: string, trackingOrOrderId?: string) {
  let targetId = trackingOrOrderId;
  if (!targetId) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    targetId = await ask(rl, "  Ingresa numero de guia (TRK-...) o ID de orden (po_...)");
    rl.close();
  }

  if (!targetId) {
    console.log(theme.amber("  Operacion cancelada.\n"));
    return;
  }

  const res = await receiveInboundShipment({ companyId, trackingOrOrderId: targetId });
  if (!res.success) {
    console.log(`\n  ${theme.redBold("[ERROR]")} ${res.message}\n`);
    return;
  }

  console.log(`\n  ${theme.mintBold("[OK]")} ${res.message}\n`);
}

export async function consolidateCliFlow(companyId: string) {
  console.log("\n" + drawDivider("CONSOLIDACION DE CARGAS Y LANDED COST (OSRM)", 86));
  const plans = await buildConsolidatedLoadPlans(companyId);

  if (plans.length === 0) {
    console.log(`  ${theme.mint("[OK] Todos los SKUs estan sobre su Punto de Reorden Dinamico.")}\n`);
    return;
  }

  for (const plan of plans) {
    const itemLines = plan.items.map(
      (i) =>
        `  - [${i.sku.padEnd(12)}] ${i.productName.slice(0, 30).padEnd(30)} | ${String(i.quantity).padStart(4)}u | $${i.unitPrice.toFixed(2)}/u = $${i.lineCostMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
    );

    console.log(
      drawCard(
        [
          `${theme.dim("Proveedor:")}          ${theme.bold(plan.supplierName)} (${plan.supplierCity})`,
          `${theme.dim("Ruta Vial:")}          ${plan.distanceKm} km (${plan.durationFormatted})`,
          `${theme.dim("Subtotal Productos:")} $${plan.productsCostMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
          `${theme.dim("Flete Consolidado:")}  $${plan.freightCostMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN (Ahorro: $${plan.consolidationSavingsMxn.toFixed(2)} MXN)`,
          `${theme.dim("LANDED COST TOTAL:")}  ${theme.mintBold(`$${plan.totalLandedCostMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`)}`,
          theme.dim("─".repeat(78)),
          ...itemLines,
        ],
        {
          title: `ORDEN CONSOLIDADA: ${plan.supplierName.toUpperCase()}`,
          borderColor: theme.mint,
          width: 86,
        },
      ),
    );
  }
}

export async function rebalanceCliFlow(companyId: string) {
  console.log("\n" + drawDivider("REBALANCEO INTER-ALMACEN (CROSS-DOCKING)", 84));
  const proposals = await evaluateWarehouseRebalancing(companyId);

  if (proposals.length === 0) {
    console.log(`  ${theme.dim("Sin desbalances entre almacenes (o tu empresa opera con 1 bodega unica).")}\n`);
    return;
  }

  for (const p of proposals) {
    console.log(
      drawCard(
        [
          `${theme.dim("Producto:")}       ${theme.bold(p.productName)} [${p.sku}]`,
          `${theme.dim("Origen:")}         ${theme.mintBold(p.fromWarehouseName)} -> ${theme.amberBold(p.toWarehouseName)}`,
          `${theme.dim("Cantidad:")}       ${p.transferQuantity} unidades (${p.distanceKm} km / ${p.durationFormatted})`,
          `${theme.dim("Flete Interno:")}  $${p.transferFreightCostMxn.toFixed(2)} MXN vs Compra Externa $${p.avoidedPurchaseCostMxn.toFixed(2)} MXN`,
          `${theme.dim("Ahorro Neto:")}    ${theme.mintBold(`$${p.netSavingsMxn.toFixed(2)} MXN`)}`,
        ],
        {
          title: `TRANSFERENCIA SUGERIDA: ${p.sku}`,
          borderColor: theme.cyan,
          width: 84,
        },
      ),
    );
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const confirm = await ask(rl, "\n  Ejecutar la primera transferencia inter-almacen ahora? [s/N]", "N");
  rl.close();

  if (confirm.toLowerCase() === "s" || confirm.toLowerCase() === "y") {
    const first = proposals[0];
    const execRes = await executeWarehouseTransfer({
      companyId,
      productId: first.productId,
      fromWarehouseId: first.fromWarehouseId,
      toWarehouseId: first.toWarehouseId,
      quantity: first.transferQuantity,
    });
    console.log(`\n  ${execRes.success ? theme.mintBold("[OK]") : theme.redBold("[ERROR]")} ${execRes.message}\n`);
  }
}

export async function configureGpsNodeCliFlow(companyId: string, args: string[] = []) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("\n" + drawDivider("CONFIGURAR NODO GPS (BODEGA O PROVEEDOR)", 82));
    const typeRaw = args[0] || (await ask(rl, "  1. Tipo ('warehouse' o 'supplier')", "warehouse"));
    const nodeType = typeRaw.toLowerCase().startsWith("s") ? "supplier" : "warehouse";
    const nameOrId = args[1] || (await ask(rl, "  2. Nombre o ID del nodo", "Central"));
    const cityOrAddr = args.slice(2).join(" ") || (await ask(rl, "  3. Ciudad o direccion fisica", "Ciudad de Mexico"));
    rl.close();

    const res = await updateLogisticsNodeLocation({
      companyId,
      nodeType,
      nodeIdOrName: nameOrId,
      addressOrCity: cityOrAddr,
    });

    console.log(`\n  ${res.success ? theme.mintBold("[OK]") : theme.redBold("[ERROR]")} ${res.message}\n`);
  } catch (err: any) {
    rl.close();
    console.error(theme.redBold(`  [ERROR] ${err.message}`));
  }
}

export async function routeCalcCliFlow(args: string[] = []) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const orig = args[0] || (await ask(rl, "  Ciudad o direccion de Origen", "Queretaro"));
    const dest = args[1] || (await ask(rl, "  Ciudad o direccion de Destino", "Monterrey"));
    rl.close();

    const [p1, p2] = await Promise.all([resolveNodeGeoPoint({ city: orig }), resolveNodeGeoPoint({ city: dest })]);
    if (!p1 || !p2) {
      console.log(theme.redBold("\n  [ERROR] No se pudieron geocodificar ambas ubicaciones.\n"));
      return;
    }

    const route = await calculateRealRoute(p1, p2, { currency: "MXN" });
    console.log(
      "\n" +
        drawCard(
          [
            `${theme.dim("Origen:")}            ${theme.bold(p1.name || orig)} (${p1.latitude.toFixed(4)}, ${p1.longitude.toFixed(4)})`,
            `${theme.dim("Destino:")}           ${theme.bold(p2.name || dest)} (${p2.latitude.toFixed(4)}, ${p2.longitude.toFixed(4)})`,
            `${theme.dim("Distancia Vial:")}    ${theme.mintBold(`${route.distanceKm} km`)} (${route.durationFormatted})`,
            `${theme.dim("Flete Estimado:")}    ${theme.bold(route.costoFleteFormatted)}`,
          ],
          {
            title: "CALCULO DE RUTA Y FLETE OSRM",
            borderColor: theme.mint,
          },
        ),
    );
  } catch (err: any) {
    rl.close();
    console.error(theme.redBold(`  [ERROR] ${err.message}`));
  }
}
