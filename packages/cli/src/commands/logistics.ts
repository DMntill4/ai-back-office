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

/**
 * Torre de Control Logística en CLI:
 * - /logistics: Panel completo de Nodos GPS, Embarques Inbound/Outbound, Consolidación de Cargas y Rebalanceo
 * - /dispatch: Despachar mercancía a un cliente desde la bodega más cercana con ruta OSRM
 * - /receive: Recibir mercancía de un embarque en tránsito y sumar al stock físico
 * - /rebalance: Evaluar y ejecutar transferencias inter-almacén (Cross-Docking)
 * - /consolidate: Ver planes de consolidación multi-SKU con Landed Cost
 */
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

  // Overview completo de Torre de Control Logística
  const [whs, supps, ships, health, rebalancing, loads] = await Promise.all([
    db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
    db.select().from(suppliers).where(eq(suppliers.companyId, companyId)),
    db.select().from(shipments).where(eq(shipments.companyId, companyId)).orderBy(desc(shipments.updatedAt)),
    analyzeDynamicCatalogHealth(companyId),
    evaluateWarehouseRebalancing(companyId),
    buildConsolidatedLoadPlans(companyId),
  ]);

  console.log("\n" + drawDivider(`🚚 TORRE DE CONTROL LOGÍSTICA, GPS & EMBARQUES [${companyId}]`, 92));

  // 1. Nodos Logísticos (Almacenes y Proveedores con GPS)
  const whLines =
    whs.length > 0
      ? whs.map((w) => {
          const coords =
            w.latitude && w.longitude
              ? theme.mint(`${Number(w.latitude).toFixed(4)}, ${Number(w.longitude).toFixed(4)}`)
              : theme.amber("Sin GPS (usa /logistics gps)");
          return `🏭 ${theme.bold(w.name.padEnd(28))} │ ${(w.city || w.location || "N/A").padEnd(18)} │ GPS: ${coords}`;
        })
      : [`${theme.dim("No hay almacenes registrados.")}`];

  const suppLines =
    supps.length > 0
      ? supps.slice(0, 6).map((s) => {
          const coords =
            s.latitude && s.longitude
              ? theme.cyan(`${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}`)
              : theme.dim("Geocodificación automática por ciudad");
          return `🏢 ${theme.bold(s.name.padEnd(28))} │ ${(s.city || s.streetAddress || "N/A").padEnd(18)} │ GPS: ${coords}`;
        })
      : [`${theme.dim("Catálogo operando en modalidad Compra Directa / Licitación Abierta (0 proveedores fijos).")}`];

  console.log(
    drawCard([...whLines, theme.dim("─".repeat(78)), ...suppLines], {
      title: "📍 NODOS LOGÍSTICOS Y TELEMETRÍA GPS (ALMACENES Y PROVEEDORES)",
      borderColor: theme.mint,
      width: 92,
    }),
  );

  // 2. Embarques Activos (Inbound & Outbound)
  console.log("\n" + drawDivider("📦 EMBARQUES Y GUÍAS EN TRÁNSITO (INBOUND / OUTBOUND)", 92));
  if (ships.length === 0) {
    console.log(`  ${theme.dim("No hay embarques registrados actualmente. Usa '/dispatch' para despachar a cliente o aprueba una orden en '/inbox'.")}`);
  } else {
    const shipRows = ships.slice(0, 10).map((s) => {
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
            : theme.badge("EN TRÁNSITO", "amber");
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
        ["GUÍA", "FLUJO", "ORIGEN", "DESTINO", "TRANSPORTISTA", "ESTADO", "ETA"],
        shipRows,
        [16, 10, 20, 20, 18, 13, 11],
      ),
    );
  }

  // 3. Resumen de ROP Dinámico, Consolidación y Cross-Docking
  const ropAlerts = health.filter((h) => h.needsReorder);
  console.log("\n" + drawDivider("🧠 INTELIGENCIA DEL COORDINADOR (ROP DINÁMICO, CONSOLIDACIÓN & CROSS-DOCKING)", 92));
  console.log(
    drawCard(
      [
        `• ${theme.bold("SKUs bajo Punto de Reorden Dinámico (ROP):")} ${ropAlerts.length > 0 ? theme.amberBold(`${ropAlerts.length} producto(s) requieren acción`) : theme.mintBold("0 (Catálogo óptimo)")}`,
        `• ${theme.bold("Oportunidades de Rebalanceo Inter-Almacén:")} ${rebalancing.length > 0 ? theme.cyanBold(`${rebalancing.length} transferencia(s) internas posibles`) : theme.dim("0 (Una sola bodega o sin excedentes cruzados)")}`,
        `• ${theme.bold("Planes de Consolidación de Carga (Landed Cost):")} ${loads.length > 0 ? theme.mintBold(`${loads.length} camión/orden consolidada lista`) : theme.dim("0 pendientes")}`,
        ``,
        `${theme.bold("Comandos rápidos de Torre Logística:")}`,
        `  ${theme.mintBold("/dispatch")}      Despachar pedido de salida a cliente (calcula bodega óptima + ruta OSRM + descuento de stock)`,
        `  ${theme.mintBold("/receive <id>")}  Recibir guía en tránsito en almacén y sumar existencias automáticamente`,
        `  ${theme.mintBold("/consolidate")}   Ver desglose de cargas consolidadas por proveedor y Landed Cost (Producto + Flete)`,
        `  ${theme.mintBold("/rebalance")}     Ver/ejecutar transferencias entre almacenes antes de comprar a terceros`,
        `  ${theme.mintBold("/logistics gps")} Geocodificar y actualizar ciudad/coordenadas GPS de cualquier bodega o proveedor`,
      ],
      {
        title: "ACCIONES OPERATIVAS DISPONIBLES",
        borderColor: theme.cyan,
        width: 92,
      },
    ),
  );
  console.log("");
}

export async function dispatchCliFlow(companyId: string, args: string[] = []) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("\n" + drawDivider("🚚 DESPACHO DE SALIDA A CLIENTE (OUTBOUND DISPATCH + OSRM GPS)", 86));
    const productQuery = args[0] || (await ask(rl, "  1. SKU, ID o nombre del producto a despachar"));
    const qtyRaw = args[1] || (await ask(rl, "  2. Cantidad de unidades a enviar", "5"));
    const destCity = args.slice(2).join(" ") || (await ask(rl, "  3. Ciudad o dirección destino del cliente", "Monterrey, NL"));
    const customerName = await ask(rl, "  4. Nombre del cliente o sucursal receptora", "Cliente Corporativo");

    rl.close();

    console.log(theme.muted("\n  Calculando bodega óptima con stock, geocodificando destino y trazando ruta vial OSRM..."));
    const res = await dispatchOutboundShipment({
      companyId,
      productQuery,
      quantity: Math.max(1, parseInt(qtyRaw, 10) || 1),
      destinationAddressOrCity: destCity,
      customerName,
    });

    if (!res.success) {
      console.log(`\n  ${theme.redBold("❌ No se pudo despachar:")} ${res.message}\n`);
      return;
    }

    console.log(
      "\n" +
        drawCard(
          [
            `${theme.dim("Guía Generada:")}      ${theme.mintBold(res.trackingNumber || "N/A")}`,
            `${theme.dim("Bodega Origen:")}      ${theme.bold(res.originWarehouse || "Almacén Central")}`,
            `${theme.dim("Destino Cliente:")}    ${theme.cyanBold(typeof res.destination === "object" ? res.destination.address : res.destination || destCity)}`,
            `${theme.dim("Distancia Vial:")}     ${res.distanceKm ? `${res.distanceKm} km` : "N/A"} (${res.durationFormatted || "N/A"})`,
            `${theme.dim("Flete Estimado:")}     $${(res.freightCostMxn || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
            `${theme.dim("ETA Estimado:")}       ${res.estimatedDelivery ? new Date(res.estimatedDelivery).toLocaleString() : "N/A"}`,
            `${theme.dim("Stock Restante:")}     ${theme.bold(String(res.remainingStock ?? 0))} unidades en bodega`,
          ],
          {
            title: "✔ MANIFIESTO DE DESPACHO EMITIDO Y VERIFICADO",
            badge: "EN TRÁNSITO",
            badgeColor: "mint",
            borderColor: theme.mint,
          },
        ),
    );
    console.log("");
  } catch (err: any) {
    rl.close();
    console.error(theme.redBold(`❌ Error en despacho: ${err.message}`));
  }
}

export async function receiveCliFlow(companyId: string, trackingOrOrderId?: string) {
  let targetId = trackingOrOrderId;
  if (!targetId) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    targetId = await ask(rl, "  Ingresa el número de guía (TRK-...) o ID de orden (po_...) a recibir");
    rl.close();
  }

  if (!targetId) {
    console.log(theme.amber("  Operación cancelada: debes indicar una guía o ID de orden.\n"));
    return;
  }

  const res = await receiveInboundShipment({ companyId, trackingOrOrderId: targetId });
  if (!res.success) {
    console.log(`\n  ${theme.redBold("❌")} ${res.message}\n`);
    return;
  }

  console.log(`\n  ${theme.success("✔")} ${theme.bold(res.message)}\n`);
}

export async function consolidateCliFlow(companyId: string) {
  console.log("\n" + drawDivider("📦 CONSOLIDACIÓN DE CARGAS MULTI-SKU Y LANDED COST (PRODUCTO + FLETE OSRM)", 92));
  const plans = await buildConsolidatedLoadPlans(companyId);

  if (plans.length === 0) {
    console.log(`  ${theme.mint("✔ Todos los SKUs están por encima de su Punto de Reorden Dinámico. No se requieren compras consolidadas hoy.")}\n`);
    return;
  }

  for (const plan of plans) {
    const itemLines = plan.items.map(
      (i) =>
        `  • [${i.sku.padEnd(12)}] ${i.productName.slice(0, 32).padEnd(32)} │ Cant: ${String(i.quantity).padStart(4)}u │ $${i.unitPrice.toFixed(2)}/u = $${i.lineCostMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
    );

    console.log(
      drawCard(
        [
          `${theme.dim("Proveedor / Modalidad:")} ${theme.bold(plan.supplierName)} (${plan.supplierCity})`,
          `${theme.dim("Ruta y Distancia:")}      ${plan.distanceKm} km por carretera (Tiempo conducción: ${plan.durationFormatted})`,
          `${theme.dim("Subtotal Productos:")}    $${plan.productsCostMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
          `${theme.dim("Flete Consolidado:")}     $${plan.freightCostMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN ${theme.mint(`(Ahorro por consolidar: $${plan.consolidationSavingsMxn.toFixed(2)} MXN)`)}`,
          `${theme.dim("LANDED COST TOTAL:")}     ${theme.mintBold(`$${plan.totalLandedCostMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`)}`,
          theme.dim("─".repeat(82)),
          ...itemLines,
        ],
        {
          title: `CAMIÓN / ORDEN CONSOLIDADA: ${plan.supplierName.toUpperCase()}`,
          borderColor: theme.mint,
          width: 92,
        },
      ),
    );
    console.log("");
  }
}

export async function rebalanceCliFlow(companyId: string) {
  console.log("\n" + drawDivider("🔄 REBALANCEO INTER-ALMACÉN (CROSS-DOCKING ANTES DE COMPRAR)", 90));
  const proposals = await evaluateWarehouseRebalancing(companyId);

  if (proposals.length === 0) {
    console.log(
      `  ${theme.dim("No se detectaron desbalances entre almacenes (o tu empresa opera con 1 almacén central único).")}\n`,
    );
    return;
  }

  for (const p of proposals) {
    console.log(
      drawCard(
        [
          `${theme.dim("Producto:")}            ${theme.bold(p.productName)} [${p.sku}]`,
          `${theme.dim("Bodega Origen:")}       ${theme.mintBold(p.fromWarehouseName)} (Excedente disponible)`,
          `${theme.dim("Bodega Destino:")}      ${theme.amberBold(p.toWarehouseName)} (En déficit)`,
          `${theme.dim("Cantidad a Mover:")}    ${theme.bold(String(p.transferQuantity))} unidades (${p.distanceKm} km / ${p.durationFormatted})`,
          `${theme.dim("Costo Flete Interno:")} $${p.transferFreightCostMxn.toFixed(2)} MXN vs Compra Externa $${p.avoidedPurchaseCostMxn.toFixed(2)} MXN`,
          `${theme.dim("Ahorro Neto:")}         ${theme.mintBold(`$${p.netSavingsMxn.toFixed(2)} MXN`)}`,
        ],
        {
          title: `TRANSFERENCIA SUGERIDA: ${p.sku}`,
          borderColor: theme.cyan,
          width: 88,
        },
      ),
    );
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const confirm = await ask(rl, "\n  ¿Deseas ejecutar la primera transferencia inter-almacén ahora? [s/N]", "N");
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
    console.log(`\n  ${execRes.success ? theme.success("✔") : theme.redBold("❌")} ${execRes.message}\n`);
  }
}

export async function configureGpsNodeCliFlow(companyId: string, args: string[] = []) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("\n" + drawDivider("📍 CONFIGURAR Y GEOCODIFICAR NODO LOGÍSTICO (ALMACÉN O PROVEEDOR)", 86));
    const typeRaw = args[0] || (await ask(rl, "  1. Tipo de nodo ('warehouse' para almacén, 'supplier' para proveedor)", "warehouse"));
    const nodeType = typeRaw.toLowerCase().startsWith("s") ? "supplier" : "warehouse";
    const nameOrId = args[1] || (await ask(rl, `  2. Nombre o ID del ${nodeType === "warehouse" ? "almacén" : "proveedor"}`, "Central"));
    const cityOrAddr = args.slice(2).join(" ") || (await ask(rl, "  3. Ciudad o dirección física (ej: 'Monterrey, NL', 'Querétaro')", "Ciudad de México"));
    rl.close();

    const res = await updateLogisticsNodeLocation({
      companyId,
      nodeType,
      nodeIdOrName: nameOrId,
      addressOrCity: cityOrAddr,
    });

    if (res.success) {
      console.log(`\n  ${theme.success("✔")} ${theme.bold(res.message)}\n`);
    } else {
      console.log(`\n  ${theme.redBold("❌")} ${res.message}\n`);
    }
  } catch (err: any) {
    rl.close();
    console.error(theme.redBold(`❌ Error geocodificando nodo: ${err.message}`));
  }
}

export async function routeCalcCliFlow(args: string[] = []) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const orig = args[0] || (await ask(rl, "  Ciudad o dirección de Origen", "Querétaro"));
    const dest = args[1] || (await ask(rl, "  Ciudad o dirección de Destino", "Monterrey"));
    rl.close();

    const [p1, p2] = await Promise.all([resolveNodeGeoPoint({ city: orig }), resolveNodeGeoPoint({ city: dest })]);
    if (!p1 || !p2) {
      console.log(theme.redBold("\n  ❌ No se pudieron geocodificar ambas ubicaciones.\n"));
      return;
    }

    const route = await calculateRealRoute(p1, p2, { currency: "MXN" });
    console.log(
      "\n" +
        drawCard(
          [
            `${theme.dim("Origen:")}             ${theme.bold(p1.name)} (${p1.latitude.toFixed(4)}, ${p1.longitude.toFixed(4)})`,
            `${theme.dim("Destino:")}            ${theme.bold(p2.name)} (${p2.latitude.toFixed(4)}, ${p2.longitude.toFixed(4)})`,
            `${theme.dim("Distancia Vial:")}     ${theme.mintBold(`${route.distanceKm} km`)}`,
            `${theme.dim("Tiempo Conducción:")}  ${theme.cyanBold(route.durationFormatted)}`,
            `${theme.dim("Flete Estimado:")}     ${theme.bold(route.costoFleteFormatted)}`,
            `${theme.dim("Motor Cartográfico:")} ${theme.dim(route.motorUtilizado)}`,
          ],
          {
            title: "🗺️ CÁLCULO DE RUTA Y FLETE OSRM",
            borderColor: theme.mint,
          },
        ) +
        "\n",
    );
  } catch (err: any) {
    rl.close();
    console.error(theme.redBold(`❌ Error calculando ruta: ${err.message}`));
  }
}
