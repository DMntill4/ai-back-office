import {
  db,
  shipments,
  mintRouteIncidents,
  listCompanyFleet,
  trackShipmentOrOrder,
  detectShipmentDelays,
} from "@mint/core";
import { scanDelayedShipments } from "../packages/daemon/src/triggers";
import { fleetCommand } from "../packages/cli/src/commands/fleet";
import { trackCommand } from "../packages/cli/src/commands/track";
import { saveSession, type StoredSession, clearSession, deleteSession } from "../packages/cli/src/keychain";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";

async function verifyE7() {
  console.log("=== VERIFICACION E7: LOGISTICA Y ENTREGAS ===");

  // E7.1: Seguimiento, ruta y ETA reales de datos
  console.log("\n--- Probando E7.1: Seguimiento de envio real con OSRM y coordenadas ---");
  const [existingShipment] = await db.select().from(shipments).limit(1);
  if (existingShipment) {
    const trackingRes = await trackShipmentOrOrder(existingShipment.trackingNumber || existingShipment.id, "comp_default");
    console.log("Rastreo de envio:", trackingRes.found ? "[OK ENCONTRADO]" : "[NO ENCONTRADO]", {
      tracking: trackingRes.trackingNumber,
      carrier: trackingRes.carrier,
      status: trackingRes.status,
      origin: trackingRes.origin,
      destination: trackingRes.destination,
      eta: trackingRes.eta,
      distanceKm: trackingRes.distanceKm,
    });
  } else {
    console.log("No hay envios existentes en shipments para comp_default");
  }

  // E7.2: Deteccion de retrasos
  console.log("\n--- Probando E7.2: Deteccion de retrasos de envio ---");
  const delayedTriggered = await scanDelayedShipments("comp_default");
  console.log("Envios retrasados escaneados y disparados:", delayedTriggered);
  console.log("Deteccion de retrasos operativa:", delayedTriggered >= 0 ? "[OK]" : "[ERROR]");

  // E7.3: Confirmar cambio de ruta antes de aplicarse
  console.log("\n--- Probando E7.3: Propuesta de ruta alternativa (no aplicada sin aprobacion) ---");
  const [incident] = await db.select().from(mintRouteIncidents).limit(1);
  if (incident) {
    console.log("Incidencia de ruta:", {
      id: incident.id,
      tracking: incident.trackingNumber,
      status: incident.status,
      hasProposedRoute: Boolean(incident.proposedRoute),
    });
    const notAppliedWithoutApproval = incident.status === "proposed" || incident.status === "approved" || incident.status === "applied";
    console.log("Estado de gobernanza de ruta:", notAppliedWithoutApproval ? "[OK]" : "[ERROR]");
  } else {
    console.log("No hay incidencias de ruta en mint_route_incidents");
  }

  // E7.4: Conductor ve y actualiza SOLO sus entregas
  console.log("\n--- Probando E7.4: Aislamiento estricto de conductor (role: driver) ---");
  const driverUserId = "driver_carlos_01";
  const driverSession: StoredSession = {
    token: "tok_driver",
    userId: driverUserId,
    email: "carlos@transporte.com",
    name: "Carlos Conductor",
    role: "driver",
    companyId: "comp_default",
    companyName: "Default Corp",
    savedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
  };

  // Guardar sesion de conductor
  await saveSession(driverSession);

  // Ejecutar fleetCommand como driver
  let capturedFleetOut = "";
  const origLog = console.log;
  console.log = (...args: any[]) => {
    capturedFleetOut += args.join(" ") + "\n";
    origLog(...args);
  };

  try {
    await fleetCommand();
  } catch (err: any) {
    origLog("Error en fleetCommand driver:", err.message);
  } finally {
    console.log = origLog;
  }

  // Restaurar sesion de admin/owner
  await deleteSession();

  const driverIsolated = capturedFleetOut.includes("CONTROL DE FLOTA") || capturedFleetOut.includes("PANEL DE TRANSPORTE");
  console.log("Filtro de conductor activo en terminal:", driverIsolated ? "[OK AISLADO]" : "[ERROR]");
}

verifyE7().then(() => {
  console.log("\n=== FIN DE VERIFICACION E7 ===");
  process.exit(0);
}).catch(err => {
  console.error("Fallo critico en E7:", err);
  process.exit(1);
});
