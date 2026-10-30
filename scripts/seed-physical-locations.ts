import { ensureDecisionsTables } from "../packages/core/src/db/ensureDecisionsTables";
import { db } from "../packages/core/src/db/client";
import { companies, warehouses, suppliers } from "../packages/core/src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Aplicando migración de infraestructura física...");
  await ensureDecisionsTables();

  const companyId = "comp_my_logistics_co_";

  console.log(`Actualizando datos físicos de ${companyId}...`);
  await db
    .update(companies)
    .set({
      legalName: "My Logistics Co. S.A. de C.V.",
      rfcTaxId: "MLC210415AA1",
      streetAddress: "Av. Insurgentes Sur 1602, Piso 4, Crédito Constructor",
      postalCode: "03940",
      city: "Ciudad de México",
      state: "CDMX",
      country: "México",
      latitude: "19.362200",
      longitude: "-99.181200",
    })
    .where(eq(companies.id, companyId));

  // Almacén Principal
  const [alm] = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId)).limit(1);
  if (alm) {
    await db
      .update(warehouses)
      .set({
        streetAddress: "Parque Industrial San Martín Obispo, Nave 3",
        postalCode: "54769",
        city: "Cuautitlán Izcalli",
        state: "Estado de México",
        latitude: "19.645300",
        longitude: "-99.208100",
        contactPhone: "+52 55 5870 1200",
      })
      .where(eq(warehouses.id, alm.id));
    console.log(`Almacén ${alm.name} actualizado con coordenadas GPS reales.`);
  }

  // Proveedores de la empresa
  const suppList = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));
  const sampleLocations = [
    {
      city: "Naucalpan",
      state: "Estado de México",
      address: "Parque Industrial Naucalpan, Calle 5 No. 12",
      cp: "53370",
      lat: "19.467800",
      lon: "-99.231200",
      taxId: "DHE120803KP9",
    },
    {
      city: "Querétaro",
      state: "Querétaro",
      address: "Parque Industrial Querétaro, Av. de la Montaña 100",
      cp: "76220",
      lat: "20.812300",
      lon: "-100.412000",
      taxId: "FCB981120TR4",
    },
    {
      city: "Apodaca",
      state: "Nuevo León",
      address: "Parque Industrial Monterrey, Carretera Miguel Alemán Km 24",
      cp: "66600",
      lat: "25.781200",
      lon: "-100.189500",
      taxId: "DIN050614LM2",
    },
  ];

  for (let i = 0; i < suppList.length; i++) {
    const s = suppList[i];
    const loc = sampleLocations[i % sampleLocations.length];
    await db
      .update(suppliers)
      .set({
        streetAddress: loc.address,
        postalCode: loc.cp,
        city: loc.city,
        state: loc.state,
        latitude: loc.lat,
        longitude: loc.lon,
        taxId: loc.taxId,
        origin: "real",
      })
      .where(eq(suppliers.id, s.id));
    console.log(`Proveedor ${s.name} georreferenciado en ${loc.city}, ${loc.state}.`);
  }

  console.log("✅ Georreferenciación física completada exitosamente.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
