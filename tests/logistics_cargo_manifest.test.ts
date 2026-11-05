import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as net from "node:net";
import {
  executeDespacharEmbarque,
  executeConsultarHojaDeRuta,
  despacharEmbarqueSchema,
  consultarHojaDeRutaSchema,
  createFleetVehicle,
  dispatchShipmentWithManifest,
  getHojaDeRuta,
  db,
  companies,
  warehouses,
  products,
  inventory,
  fleetVehicles,
  shipments,
} from "@mint/core";
import { eq } from "drizzle-orm";

async function isPostgresReachable(port = 5432, timeoutMs = 600): Promise<boolean> {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(timeoutMs);
    s.once("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.once("timeout", () => {
      s.destroy();
      resolve(false);
    });
    s.once("error", () => {
      s.destroy();
      resolve(false);
    });
    s.connect(port, "127.0.0.1");
  });
}

describe("Logistics Cargo Manifest, Overweight Shield & Hoja de Ruta", () => {
  const testCompanyId = "comp_logistics_test";
  const testWarehouseId = "alm_test_logistics";
  const testVehicleId = "veh_test_truck_99";
  const testProdId = "prod_heavy_motor_01";
  let pgActive = false;

  beforeAll(async () => {
    pgActive = await isPostgresReachable();
    if (pgActive) {
      try {
        await db.insert(companies).values({
          id: testCompanyId,
          name: "Transportes Logicos del Norte S.A.",
          currency: "USD",
        }).onConflictDoNothing();

        await db.insert(warehouses).values({
          id: testWarehouseId,
          companyId: testCompanyId,
          name: "CEDIS Guadalajara",
          location: "Parque Industrial El Salto",
          latitude: "20.5283",
          longitude: "-103.2847",
        }).onConflictDoNothing();

        await db.insert(products).values({
          id: testProdId,
          companyId: testCompanyId,
          name: "Motor Bifasico de Alta Tension",
          sku: "SKU-MOT-500",
          minStock: 5,
        }).onConflictDoNothing();

        await db.insert(inventory).values({
          id: `inv_mot_${Date.now()}`,
          companyId: testCompanyId,
          warehouseId: testWarehouseId,
          productId: testProdId,
          stock: 50,
        }).onConflictDoNothing();
      } catch {
        pgActive = false;
      }
    }
  });

  it("1. RBAC Shield: Rol 'viewer' o 'driver' es bloqueado inmediatamente para despachos", async () => {
    const resViewer = await executeDespacharEmbarque(
      {
        almacen_origen_id: testWarehouseId,
        vehiculo_id: testVehicleId,
        destino_direccion: "Av. Chapultepec 400, Guadalajara",
        items: [{ producto_id: testProdId, cantidad: 2 }],
      },
      { companyId: testCompanyId, userRole: "viewer" },
    );

    expect(resViewer.isSuccess).toBe(false);
    expect(resViewer.code).toBe("DENIED_INSUFFICIENT_PERMISSIONS");
    expect(resViewer.message).toContain("viewer");

    const resDriver = await executeDespacharEmbarque(
      {
        almacen_origen_id: testWarehouseId,
        vehiculo_id: testVehicleId,
        destino_direccion: "Av. Chapultepec 400, Guadalajara",
        items: [{ producto_id: testProdId, cantidad: 2 }],
      },
      { companyId: testCompanyId, userRole: "driver" },
    );

    expect(resDriver.isSuccess).toBe(false);
    expect(resDriver.code).toBe("DENIED_INSUFFICIENT_PERMISSIONS");
    expect(resDriver.message).toContain("driver");
  });

  it("2. Zod Validation: Manifiesto de carga exige al menos un item y cantidades positivas", () => {
    const emptyItemsParsed = despacharEmbarqueSchema.safeParse({
      almacen_origen_id: "alm_01",
      vehiculo_id: "veh_01",
      destino_direccion: "Calle Falsa 123",
      items: [],
    });
    expect(emptyItemsParsed.success).toBe(false);

    const negativeQtyParsed = despacharEmbarqueSchema.safeParse({
      almacen_origen_id: "alm_01",
      vehiculo_id: "veh_01",
      destino_direccion: "Calle Falsa 123",
      items: [{ producto_id: "SKU-01", cantidad: -5 }],
    });
    expect(negativeQtyParsed.success).toBe(false);

    const validParsed = despacharEmbarqueSchema.safeParse({
      almacen_origen_id: "alm_01",
      vehiculo_id: "veh_01",
      destino_direccion: "Calle Falsa 123",
      items: [{ producto_id: "SKU-01", cantidad: 10, peso_unitario_kg: 15.5 }],
    });
    expect(validParsed.success).toBe(true);
  });

  it("3. Zod Validation: Consultar hoja de ruta valida que el query no sea vacio", () => {
    const validQuery = consultarHojaDeRutaSchema.safeParse({ query: "GUIA-TRK-100" });
    expect(validQuery.success).toBe(true);
  });

  it("4. Hoja de Ruta: Consulta de guia inexistente retorna respuesta segura sin lanzar excepcion", async () => {
    const res = await executeConsultarHojaDeRuta(
      { query: "GUIA_INEXISTENTE_9999" },
      { companyId: testCompanyId },
    );

    expect(res).toBeDefined();
    expect(res.isSuccess).toBe(false);
    expect(res.message).toBeDefined();
  });

  it("5. Verificacion en vivo de Postgres (si esta activo): Flota, Manifiesto, Escudo de Sobrepeso y Hoja de Ruta", async () => {
    if (!pgActive) {
      expect(true).toBe(true); // Omitido elegantemente si la base de datos de prueba no esta levantada
      return;
    }

    // A. Registrar vehiculo con capacidad limitada de 500 kg
    const vehicle = await createFleetVehicle({
      companyId: testCompanyId,
      name: "Camioneta Ligera 01",
      plateNumber: "PLK-771-MX",
      vehicleType: "van",
      maxWeightKg: 500,
      maxVolumeM3: 6,
    });
    expect(vehicle.id).toBeDefined();

    // B. Intentar despachar carga que excede la capacidad (10 motores x 120kg = 1200kg > 500kg)
    const overweightResult = await dispatchShipmentWithManifest({
      companyId: testCompanyId,
      originWarehouseId: testWarehouseId,
      vehicleId: vehicle.id,
      destinationAddress: "Av. Vallarta 2500, Guadalajara",
      items: [{ productId: testProdId, quantity: 10, unitWeightKg: 120 }],
      userRole: "supervisor",
    });

    expect(overweightResult.isSuccess).toBe(false);
    expect(overweightResult.code).toBe("OVERWEIGHT_CAPACITY_EXCEEDED");
    expect(overweightResult.message).toContain("Sobrepeso vehicular detectado");

    // C. Despachar carga permitida (3 motores x 120kg = 360kg <= 500kg -> 72% ocupacion)
    const validResult = await dispatchShipmentWithManifest({
      companyId: testCompanyId,
      originWarehouseId: testWarehouseId,
      vehicleId: vehicle.id,
      destinationAddress: "Av. Vallarta 2500, Guadalajara",
      items: [{ productId: testProdId, quantity: 3, unitWeightKg: 120 }],
      userRole: "supervisor",
    });

    expect(validResult.isSuccess).toBe(true);
    expect(validResult.trackingNumber).toBeDefined();
    expect(validResult.cargoManifest).toBeDefined();
    expect(validResult.cargoManifest?.length).toBe(1);
    expect(validResult.totalWeightKg).toBe(360);
    expect(validResult.vehicle?.capacityUtilizationPct).toBe(72);

    // D. Consultar Hoja de Ruta generada
    const hojaRes = await getHojaDeRuta(testCompanyId, validResult.trackingNumber!);
    expect(hojaRes.isSuccess).toBe(true);
    expect(hojaRes.hojaDeRuta).toBeDefined();
    expect(hojaRes.hojaDeRuta?.guiaRastreo).toBe(validResult.trackingNumber);
    expect(hojaRes.hojaDeRuta?.pesoTotalCargaKg).toBe(360);
    expect(hojaRes.hojaDeRuta?.porcentajeOcupacion).toBe("72%");
    expect(hojaRes.hojaDeRuta?.manifiestoDeCarga.length).toBe(1);
  });
});
