import { trackShipmentOrOrder, approveAlternativeRoute, proposeAlternativeRoute, hasPermission } from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { exec } from "node:child_process";

export async function trackCommand(
  targetQuery?: string,
  subaction?: string,
  options: { json?: boolean; open?: boolean } = {},
) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  if (!targetQuery) {
    if (options.json) {
      console.log(JSON.stringify({ error: "Debe especificar un identificador de guía, pedido o camión." }));
      return;
    }
    console.log(`\n  ${theme.amberBold("Uso:")} mint track <guía|pedido|camión|ruta> [--open] [--json]`);
    console.log(`  ${theme.dim("Ejemplos:")}`);
    console.log(`    mint track ship_001`);
    console.log(`    mint track TRK-IN-B394`);
    console.log(`    mint track approve inc_1234\n`);
    return;
  }

  // 1. Acción de aprobar ruta alternativa propuesta
  if (targetQuery === "approve" && subaction) {
    if (!hasPermission(session?.role, "approve")) {
      console.log(`\n  ${theme.redBold("[ACCESO DENEGADO]")} Tu rol '${session?.role}' no tiene permisos para autorizar cambios de ruta logística.\n`);
      return;
    }

    const res = await approveAlternativeRoute(subaction, session?.name || "OPERADOR_LOGISTICA");
    if (options.json) {
      console.log(JSON.stringify(res));
    } else {
      if (res.success) {
        console.log(`\n  ${theme.mintBold("[OK]")} ${res.message}\n`);
      } else {
        console.error(`\n  ${theme.redBold("[ERROR]")} ${res.message}\n`);
      }
    }
    return;
  }

  // 2. Rastreo en tiempo real
  const tracking = await trackShipmentOrOrder(targetQuery, companyId);

  if (options.json) {
    console.log(JSON.stringify(tracking, null, 2));
    return;
  }

  if (!tracking.found) {
    console.log(`\n  ${theme.amber(`No se encontró registro logístico para '${targetQuery}' en la empresa '${companyId}'.`)}\n`);
    return;
  }

  if (session?.role === "driver") {
    const driverIdentifier = (session?.name || "").toLowerCase();
    const driverId = (session?.userId || "").toLowerCase();
    const isAssigned =
      (tracking.driverName && tracking.driverName.toLowerCase().includes(driverIdentifier)) ||
      tracking.carrier.toLowerCase().includes(driverIdentifier) ||
      tracking.carrier.toLowerCase().includes(driverId);
    if (!isAssigned) {
      if (options.json) {
        console.log(JSON.stringify({ error: "[ACCESO DENEGADO] Como conductor, solo puedes consultar y actualizar tus propias entregas asignadas." }));
      } else {
        console.log(`\n  ${theme.redBold("[ACCESO DENEGADO]")} Como conductor, solo tienes acceso a tus propias entregas asignadas.\n`);
      }
      return;
    }
  }

  console.log("\n" + drawDivider(`SEGUIMIENTO LOGÍSTICO // ${tracking.trackingNumber}`, 86));

  const statusBadge =
    tracking.status === "en_transito"
      ? theme.badge("EN TRÁNSITO", "cyan")
      : tracking.status === "entregado"
        ? theme.badge("ENTREGADO", "mint")
        : tracking.status === "retrasado"
          ? theme.badge("RETRASADO", "red")
          : theme.badge(tracking.status.toUpperCase(), "gray");

  const lines = [
    `${theme.bold("ESTADO DEL EMBARQUE:")}      ${statusBadge}  [Transportista: ${theme.mintBold(tracking.carrier)}]`,
    `${theme.dim("Conductor / Unidad:")}     ${tracking.driverName || "Flota Asignada"}`,
    `${theme.dim("Origen:")}                 ${tracking.originLocation || "sin dato"}`,
    `${theme.dim("Ubicación Actual:")}       ${tracking.currentLocation === "sin ubicación disponible" ? theme.amber("sin ubicación disponible") : theme.bold(tracking.currentLocation || "sin dato")}`,
    `${theme.dim("Próxima Parada:")}         ${tracking.nextStop || "Destino Final"}`,
    `${theme.dim("Destino:")}                ${tracking.destinationLocation || "sin dato"}`,
    `${theme.dim("Distancia Restante:")}     ${tracking.distanceKm > 0 ? `${tracking.distanceKm} km` : "en sitio"}`,
    `${theme.dim("ETA Estimado:")}           ${tracking.etaStr}  ${theme.dim(`(Proveedor de Mapas: ${tracking.mapProvider.toUpperCase()})`)}`,
  ];

  if (tracking.incident) {
    lines.push("");
    lines.push(`${theme.redBold("[AVISO] INCIDENCIA DE RUTA DETECTADA:")}`);
    lines.push(`  • Motivo: ${tracking.incident.reason}`);
    lines.push(`  • Retraso estimado: +${tracking.incident.delayMinutes} minutos`);
    lines.push(`  • Ruta Alternativa propuesta: Lista para revisión`);
    lines.push(`  • Autorizar cambio: ${theme.mintBold(`mint track approve ${tracking.incident.id}`)}`);
  }

  if (tracking.browserMapUrl) {
    lines.push("");
    lines.push(`${theme.cyan("Mapa en Navegador:")} ${tracking.browserMapUrl}`);
  }

  console.log(
    drawCard(lines, {
      title: `GUÍA: ${tracking.trackingNumber}`,
      borderColor: tracking.incident ? theme.red : theme.mint,
    }),
  );

  // Si se solicitó abrir en el navegador (--open)
  if (options.open && tracking.browserMapUrl) {
    const cmd = process.platform === "win32" ? `start "" "${tracking.browserMapUrl}"` : `open "${tracking.browserMapUrl}"`;
    exec(cmd);
    console.log(`  ${theme.mint("Abriendo ruta en navegador...")}`);
  }

  console.log("");
}
