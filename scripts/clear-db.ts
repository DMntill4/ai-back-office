import { db, pool } from "../src/db/client";
import { sql } from "drizzle-orm";

async function clear() {
  console.log("Limpiando todas las tablas de la base de datos a 0...");
  await db.execute(
    sql`TRUNCATE TABLE inventory, products, warehouses, suppliers, supplier_products, sales_history, shipments, cases, case_events, llm_calls, tool_calls, idempotency_keys, approvals, users, companies, business_config CASCADE`
  );

  console.log("Creando empresa default y usuario administrador limpio...");
  // 1. Empresa base
  await db.execute(
    sql`INSERT INTO companies (id, name, slug) VALUES ('comp_default', 'Acme Industrial Corp', 'acme-corp') ON CONFLICT (id) DO NOTHING`
  );

  // 2. Usuario administrador principal
  await db.execute(
    sql`INSERT INTO users (id, company_id, email, name, role, setup_completed) 
        VALUES ('usr_admin', 'comp_default', 'admin@mint.io', 'Administrador Mint', 'owner', false) 
        ON CONFLICT (id) DO NOTHING`
  );

  // 3. Almacén base para que los productos importados tengan bodega
  await db.execute(
    sql`INSERT INTO warehouses (id, company_id, name, location) 
        VALUES ('alm_central', 'comp_default', 'Almacén Central', 'Bahía Principal') 
        ON CONFLICT (id) DO NOTHING`
  );

  // 4. Configuración inicial del bot
  await db.execute(
    sql`INSERT INTO business_config (company_id, key, value, description) 
        VALUES 
          ('comp_default', 'approval_limit_amount', '10000.00', 'Límite de compra autónomo'),
          ('comp_default', 'bot_name', 'MINT', 'Nombre del asistente'),
          ('comp_default', 'bot_tone', 'profesional y ejecutivo', 'Tono del asistente')
        ON CONFLICT (company_id, key) DO NOTHING`
  );

  console.log("[DB] Base de datos reiniciada a 0: Solo el admin, la empresa y el bot limpios.");
  await pool.end();
  process.exit(0);
}

clear().catch((err) => {
  console.error("Error al limpiar la base de datos:", err);
  process.exit(1);
});
