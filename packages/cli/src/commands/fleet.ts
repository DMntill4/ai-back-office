import { listCompanyFleet } from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { renderTable, type ColumnDef } from "../ui/table";

export async function fleetCommand(action?: string, arg1?: string) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  // Si opera sin flota (Solo Tienda o Tienda con Proveedores), silenciar módulo de flota
  const { db, businessConfig } = await import("@mint/core");
  const { eq, and } = await import("drizzle-orm");
  const [profileCfg] = await db
    .select({ value: businessConfig.value })
    .from(businessConfig)
    .where(and(eq(businessConfig.companyId, companyId), eq(businessConfig.key, "business_profile")))
    .limit(1)
    .catch(() => []);

  if (profileCfg?.value === "tienda" || profileCfg?.value === "tienda_proveedores") {
    console.log(`\n  ${theme.amberBold("[MÓDULO SILENCIADO - SIN FLOTA]")}`);
    console.log(`  El módulo de Flota y Rastreo GPS está desactivado para tu modelo de negocio actual.`);
    console.log(`  MINT elimina el ruido de camiones y conductores para negocios sin transporte propio.`);
    console.log(`  ${theme.dim("Para habilitarlo, cambia tu perfil a 'Logística Completa' ejecutando:")} ${theme.mintBold("/config set business_profile logistica_completa")}\n`);
    return;
  }

  const sub = action ? action.trim().toLowerCase() : "";

  // 1. Subcomando: Conductores de la empresa (/fleet drivers)
  if (sub === "drivers" || sub === "conductores" || sub === "choferes") {
    console.log("\n" + drawDivider("PLANTILLA DE CONDUCTORES // FLOTA DE TRANSPORTE", 84));
    const fleet = await listCompanyFleet(companyId);

    if (fleet.drivers.length === 0) {
      console.log(`\n  ${theme.dim("○ No hay conductores registrados con rol 'driver' en el equipo.")}`);
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

  // 2. Subcomando: Rastrear envío (/fleet track <guia>)
  if (sub === "track" || sub === "rastrear" || (sub && sub !== "list" && sub !== "all")) {
    const trackingQuery = (sub === "track" || sub === "rastrear" ? arg1 : sub) || "";
    if (!trackingQuery) {
      console.log(`\n  ${theme.amberBold("[USO]")} /fleet track <NUMERO_GUIA_O_ID>\n`);
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
        console.log(`\n  ${theme.redBold("[ACCESO DENEGADO]")} Como conductor, solo tienes acceso a tus propias entregas asignadas.\n`);
        return;
      }
    }

    console.log("\n" + drawDivider(`RASTREO EN TIEMPO REAL // GUÍA ${ship.trackingNumber}`, 84));
    const statusFormatted =
      ship.status === "entregado"
        ? theme.mintBold("[ENTREGADO]")
        : ship.status === "retrasado"
          ? theme.redBold("[RETRASADO EN TRÁNSITO]")
          : ship.status === "en_transito"
            ? theme.cyanBold("[EN TRÁNSITO]")
            : theme.amberBold(`[${ship.status.toUpperCase()}]`);

    console.log(
      drawCard(
        [
          `${theme.bold("ESTADO DE LA CARGA:")} ${statusFormatted}`,
          "",
          `  - Número de Guía:     ${theme.mintBold(ship.trackingNumber)} [${ship.id}]`,
          `  - Transportista:      ${theme.bold(ship.carrier)}`,
          `  - Orden Asociada:     ${ship.purchaseOrderId ? theme.cyanBold(ship.purchaseOrderId) : theme.dim("Despacho Directo")}`,
          `  - Origen:             ${ship.originLocation || theme.dim("Almacén Central")}`,
          `  - Ubicación Actual:   ${ship.currentLocation || theme.dim("En ruta")}`,
          `  - Destino:            ${ship.destinationLocation || theme.dim("Cliente / Destinatario")}`,
          `  - Entrega Estimada:   ${ship.estimatedDelivery ? new Date(ship.estimatedDelivery).toLocaleDateString() : theme.dim("Pendiente")}`,
          `  - Entrega Real:       ${ship.actualDelivery ? theme.mint(new Date(ship.actualDelivery).toLocaleDateString()) : theme.dim("En camino")}`,
          `  - Bitácora / Notas:   ${ship.notes || theme.dim("Sin novedades reportadas por el transportista")}`,
        ],
        {
          title: "SEGUIMIENTO LOGÍSTICO",
          borderColor: ship.status === "retrasado" ? theme.red : theme.mint,
        },
      ),
    );
    console.log("");
    return;
  }

  console.log("\n" + drawDivider("CONTROL DE FLOTA, TRANSPORTISTAS & GUÍAS DE ENVÍO", 86));
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
        `${theme.bold("RESUMEN DE FLOTA Y TRANSPORTE:")}`,
        `  - Envíos en Tránsito:    ${theme.bold(String(fleet.totalInTransit))} activos`,
        `  - Envíos con Retraso:    ${fleet.totalDelayed > 0 ? theme.redBold(`${fleet.totalDelayed} retrasado(s)`) : theme.mintBold("0 retrasos")}`,
        `  - Conductores Activos:   ${theme.bold(String(fleet.drivers.length))} con rol 'driver'`,
      ],
      {
        title: "PANEL DE TRANSPORTE",
        borderColor: fleet.totalDelayed > 0 ? theme.amber : theme.mint,
      },
    ),
  );

  if (fleet.activeShipments.length === 0) {
    console.log(`\n  ${theme.dim("○ No hay envíos activos registrados en la base de datos.")}`);
    console.log(`  ${theme.dim("Puedes despachar una carga con:")} ${theme.mintBold("/dispatch <origen> <destino> <sku> <cantidad>")}\n`);
    return;
  }

  console.log("\n" + theme.bold("EMBARQUES Y GUÍAS ACTIVAS:"));

  const cols: ColumnDef[] = [
    { header: "GUÍA / TRACKING", key: "trackingNumber", width: 18 },
    { header: "TRANSPORTISTA", key: "carrier", width: 22 },
    { header: "DESTINO", key: "destinationLocation", width: 20, format: (v) => v || theme.dim("Almacén") },
    {
      header: "ESTADO",
      key: "status",
      width: 16,
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
      width: 14,
      align: "center",
      format: (v) => (v ? new Date(v).toLocaleDateString() : theme.dim("N/A")),
    },
  ];

  console.log(renderTable(cols, fleet.activeShipments));

  console.log("\n" + theme.bold("SUBCOMANDOS:"));
  console.log(`  ${theme.mintBold("/fleet track <guia>")}     Rastrear progreso y bitácora de un envío`);
  console.log(`  ${theme.mintBold("/fleet drivers")}          Ver directorio de conductores y cargas asignadas`);
  console.log(`  ${theme.mintBold("/dispatch")}               Crear nuevo despacho con cálculo de ruta OSRM\n`);
}
