import { listCompanyFleet, getHojaDeRuta } from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { renderTable, type ColumnDef } from "../ui/table";

function renderCapacityBar(pct: number, width: number = 14): string {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  const bar = "=".repeat(filled) + "-".repeat(empty);
  return `[${bar}] ${clamped}%`;
}

export async function fleetCommand(action?: string, arg1?: string, ...rest: string[]) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  const sub = action ? action.trim().toLowerCase() : "";

  // Subcomando: Registrar envío o vehículo (/fleet add <guia> <transportista> [origen] [destino])
  if (sub === "add" || sub === "nuevo") {
    const trackingNumber = arg1;
    const carrier = rest[0];
    const originLocation = rest[1] || "Almacén Central";
    const destinationLocation = rest.slice(2).join(" ") || "Destino Final";

    if (!trackingNumber || !carrier) {
      console.log(`\n  ${theme.amberBold("[USO]")} mint fleet add <NUMERO_GUIA_O_PLACA> <TRANSPORTISTA_O_CONDUCTOR> [ORIGEN] [DESTINO]`);
      console.log(`  ${theme.dim("Ejemplo:")} mint fleet add GUIA-101 "Camión 01 - Carlos" "Bogotá" "Medellín"\n`);
      return;
    }

    const { db, shipments } = await import("@mint/core");
    const shipId = `ship_${companyId}_${trackingNumber.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
    await db.insert(shipments).values({
      id: shipId,
      companyId,
      trackingNumber,
      carrier,
      originLocation,
      destinationLocation,
      currentLocation: originLocation,
      estimatedDelivery: new Date(Date.now() + 48 * 3600 * 1000),
      status: "en_transito",
    }).onConflictDoUpdate({
      target: [shipments.id],
      set: { carrier, originLocation, destinationLocation },
    });

    console.log(`\n  ${theme.mintBold("[OK]")} Envío / Vehículo '${trackingNumber}' registrado en tránsito exitosamente.\n`);
    return;
  }

  // Subcomando: Conductores de la empresa (/fleet drivers)
  if (sub === "drivers" || sub === "conductores" || sub === "choferes") {
    console.log("\n" + drawDivider("PLANTILLA DE CONDUCTORES // FLOTA DE TRANSPORTE", 84));
    const fleet = await listCompanyFleet(companyId);

    if (fleet.drivers.length === 0) {
      console.log(`\n  ${theme.dim("o No hay conductores registrados con rol 'driver' en el equipo.")}`);
      console.log(`  ${theme.dim("Puedes invitar a un conductor con:")} ${theme.mintBold("/team invite carlos@empresa.com driver")}\n`);
      return;
    }

    const cols: ColumnDef[] = [
      { header: "ID", key: "id", width: 14 },
      { header: "CONDUCTOR", key: "name", width: 26 },
      { header: "EMAIL", key: "email", width: 28 },
      { header: "ROL", key: "role", width: 12, format: (v) => theme.badge(String(v).toUpperCase(), "violet") },
      { header: "ENVÍOS ASIGNADOS", key: "assignedShipmentsCount", width: 18, align: "right" },
    ];

    console.log(renderTable(cols, fleet.drivers));
    console.log("");
    return;
  }

  const isDriver = session?.role === "driver";

  // Subcomando: Actualizar estado de entrega por conductor (/fleet deliver <guia>)
  if (sub === "deliver" || sub === "entregar") {
    const trackingQuery = arg1 || "";
    if (!trackingQuery) {
      console.log(`\n  ${theme.amberBold("[USO]")} /fleet deliver <NUMERO_GUIA_O_ID>\n`);
      return;
    }

    const fleet = await listCompanyFleet(companyId);
    const ship = fleet.activeShipments.find(
      (s) =>
        s.trackingNumber.toLowerCase() === trackingQuery.toLowerCase() ||
        s.id.toLowerCase() === trackingQuery.toLowerCase(),
    );

    if (!ship) {
      console.log(`\n  ${theme.amber(`No se encontró ningún embarque con guía o ID '${trackingQuery}'.`)}\n`);
      return;
    }

    if (isDriver) {
      const driverIdentifier = (session?.name || "").toLowerCase();
      const driverId = (session?.userId || "").toLowerCase();
      const isAssigned =
        ship.carrier.toLowerCase().includes(driverIdentifier) ||
        (ship.notes && (ship.notes.toLowerCase().includes(driverId) || ship.notes.toLowerCase().includes(driverIdentifier)));
      if (!isAssigned) {
        console.log(`\n  ${theme.redBold("[ACCESO DENEGADO]")} Como conductor, solo puedes actualizar tus propias entregas asignadas.\n`);
        return;
      }
    }

    const { confirmDeliveryReception } = await import("@mint/core");
    const res = await confirmDeliveryReception(ship.id, companyId);
    console.log(`\n  ${res.success ? theme.mintBold("[OK]") : theme.redBold("[ERROR]")} ${res.message}\n`);
    return;
  }

  // Subcomando: Rastrear envío con Manifiesto (/fleet track <guia>)
  if (sub === "track" || sub === "rastrear" || (sub && sub !== "list" && sub !== "all")) {
    const trackingQuery = (sub === "track" || sub === "rastrear" ? arg1 : sub) || "";
    if (!trackingQuery) {
      console.log(`\n  ${theme.amberBold("[USO]")} /fleet track <NUMERO_GUIA_O_ID>\n`);
      return;
    }

    const hojaRes = await getHojaDeRuta(companyId, trackingQuery);

    if (!hojaRes.isSuccess || !hojaRes.hojaDeRuta) {
      console.log(`\n  ${theme.amber(hojaRes.message || `No se encontró ningún embarque con guía o ID '${trackingQuery}'.`)}\n`);
      return;
    }

    const hoja = hojaRes.hojaDeRuta;

    if (isDriver) {
      const driverIdentifier = (session?.name || "").toLowerCase();
      const isAssigned =
        hoja.transportista.toLowerCase().includes(driverIdentifier) ||
        hoja.conductor.toLowerCase().includes(driverIdentifier);
      if (!isAssigned) {
        console.log(`\n  ${theme.redBold("[ACCESO DENEGADO]")} Como conductor, solo tienes acceso a tus propias entregas asignadas.\n`);
        return;
      }
    }

    console.log("\n" + drawDivider(`HOJA DE RUTA & MANIFIESTO // GUÍA ${hoja.guiaRastreo}`, 86));
    const statusFormatted =
      hoja.estado === "ENTREGADO"
        ? theme.mintBold("[ENTREGADO]")
        : hoja.estado === "RETRASADO"
          ? theme.redBold("[RETRASADO EN TRÁNSITO]")
          : hoja.estado === "EN_TRANSITO"
            ? theme.cyanBold("[EN TRÁNSITO]")
            : theme.amberBold(`[${hoja.estado}]`);

    const occupancyPct = parseFloat(hoja.porcentajeOcupacion) || 0;

    console.log(
      drawCard(
        [
          `${theme.bold("ESTADO DE LA CARGA:")} ${statusFormatted}`,
          "",
          `  - Número de Guía:       ${theme.mintBold(hoja.guiaRastreo)}`,
          `  - Vehículo / Placa:     ${theme.bold(hoja.transportista)}`,
          `  - Operador / Conductor: ${theme.bold(hoja.conductor)}`,
          `  - Origen Físico:        ${hoja.origen || theme.dim("Almacén Central")}`,
          `  - Ubicación Actual:     ${hoja.posicionActual || theme.dim("En ruta")}`,
          `  - Destino / Entrega:    ${hoja.destino || theme.dim("Cliente / Destinatario")}`,
          `  - ETA Estimada:         ${hoja.fechaEstimadaLlegada}`,
          `  - Flete Estimado:       ${hoja.costoFleteEstimado}`,
          `  - Ocupación Vehicular:  ${renderCapacityBar(occupancyPct)} (${hoja.pesoTotalCargaKg} kg totales)`,
        ],
        {
          title: "SEGUIMIENTO LOGÍSTICO Y DESPACHO",
          borderColor: hoja.estado === "RETRASADO" ? theme.red : theme.mint,
        },
      ),
    );

    if (hoja.manifiestoDeCarga && hoja.manifiestoDeCarga.length > 0) {
      console.log("\n" + theme.bold(`MANIFIESTO DE CARGA (${hoja.totalBultos} UNIDADES EN CAMIÓN):`));
      const manifestCols: ColumnDef[] = [
        { header: "SKU", key: "sku", width: 16 },
        { header: "PRODUCTO", key: "producto", width: 32 },
        { header: "CANTIDAD", key: "cantidad", width: 16, align: "right" },
        { header: "PESO TOTAL", key: "pesoTotal", width: 16, align: "right" },
      ];
      console.log(renderTable(manifestCols, hoja.manifiestoDeCarga));
    }

    console.log("");
    return;
  }

  console.log("\n" + drawDivider("CONTROL DE FLOTA, VEHÍCULOS & GUÍAS DE DESPACHO", 88));
  const fleet = await listCompanyFleet(companyId);

  if (isDriver) {
    const driverIdentifier = (session?.name || "").toLowerCase();
    const driverId = (session?.userId || "").toLowerCase();
    fleet.activeShipments = fleet.activeShipments.filter(
      (s) =>
        s.carrier.toLowerCase().includes(driverIdentifier) ||
        (s.notes && (s.notes.toLowerCase().includes(driverId) || s.notes.toLowerCase().includes(driverIdentifier))),
    );
  }

  console.log(
    drawCard(
      [
        `${theme.bold("RESUMEN DE OPERACIÓN LOGÍSTICA:")}`,
        `  - Unidades de Flota:     ${theme.bold(String(fleet.vehicles ? fleet.vehicles.length : 0))} vehículos registrados`,
        `  - Envíos en Tránsito:    ${theme.bold(String(fleet.totalInTransit))} activos en carretera`,
        `  - Envíos con Retraso:    ${fleet.totalDelayed > 0 ? theme.redBold(`${fleet.totalDelayed} retrasado(s)`) : theme.mintBold("0 retrasos")}`,
        `  - Conductores Activos:   ${theme.bold(String(fleet.drivers.length))} con rol 'driver'`,
      ],
      {
        title: "PANEL DE LOGÍSTICA Y TRANSPORTE",
        borderColor: fleet.totalDelayed > 0 ? theme.amber : theme.mint,
      },
    ),
  );

  // Mostrar vehículos de la flota si existen
  if (fleet.vehicles && fleet.vehicles.length > 0) {
    console.log("\n" + theme.bold("PARQUE VEHICULAR (FLOTA PROPIA):"));
    const vehCols: ColumnDef[] = [
      { header: "PLACA", key: "plateNumber", width: 14 },
      { header: "UNIDAD", key: "name", width: 22 },
      { header: "TIPO", key: "vehicleType", width: 14, format: (v: any) => theme.badge(String(v).toUpperCase(), "gray") },
      { header: "PESO MÁX", key: "maxWeightKg", width: 14, align: "right", format: (v: any) => `${v} kg` },
      {
        header: "ESTADO",
        key: "status",
        width: 16,
        align: "center",
        format: (v: any) =>
          v === "available"
            ? theme.mint("[DISPONIBLE]")
            : v === "in_transit"
              ? theme.cyan("[EN RUTA]")
              : v === "maintenance"
                ? theme.redBold("[MANTENIMIENTO]")
                : theme.amber(`[${String(v).toUpperCase()}]`),
      },
    ];
    console.log(renderTable(vehCols, fleet.vehicles));
  }

  if (fleet.activeShipments.length === 0) {
    console.log(`\n  ${theme.dim("o No hay envíos activos registrados en la base de datos.")}`);
    console.log(`  ${theme.dim("Puedes despachar una carga con:")} ${theme.mintBold("/dispatch <origen> <destino> <sku> <cantidad>")}\n`);
    return;
  }

  console.log("\n" + theme.bold("EMBARQUES Y GUÍAS ACTIVAS:"));

  const cols: ColumnDef[] = [
    { header: "GUÍA / TRACKING", key: "trackingNumber", width: 18 },
    { header: "VEHÍCULO / CONDUCTOR", key: "carrier", width: 24 },
    {
      header: "CARGA / PESO",
      key: "totalWeightKg",
      width: 16,
      align: "right",
      format: (v: any) => (v ? `${v} kg` : theme.dim("Sin manifiesto")),
    },
    { header: "DESTINO", key: "destinationLocation", width: 20, format: (v) => v || theme.dim("Almacén") },
    {
      header: "ESTADO",
      key: "status",
      width: 14,
      align: "center",
      format: (v) =>
        v === "entregado"
          ? theme.mint("[ENTREGADO]")
          : v === "retrasado"
            ? theme.redBold("[RETRASADO]")
            : v === "en_transito"
              ? theme.cyan("[EN TRÁNSITO]")
              : theme.amber(`[${String(v).toUpperCase()}]`),
    },
    {
      header: "ETA",
      key: "estimatedDelivery",
      width: 12,
      align: "center",
      format: (v) => (v ? new Date(v).toLocaleDateString() : theme.dim("N/A")),
    },
  ];

  console.log(renderTable(cols, fleet.activeShipments));

  console.log("\n" + theme.bold("SUBCOMANDOS:"));
  console.log(`  ${theme.mintBold("/fleet track <guia>")}     Rastrear progreso, manifiesto de carga y ruta`);
  console.log(`  ${theme.mintBold("/fleet drivers")}          Ver directorio de conductores y cargas asignadas`);
  console.log(`  ${theme.mintBold("/dispatch")}               Despachar camión con manifiesto y control de peso\n`);
}
