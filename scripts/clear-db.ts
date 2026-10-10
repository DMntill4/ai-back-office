import { db, pool } from "../src/db/client";
import { sql } from "drizzle-orm";

async function clear() {
  console.log("Limpiando tablas de la base de datos...");
  await db.execute(
    sql`TRUNCATE TABLE inventory, products, warehouses, suppliers, supplier_products, cases, case_events, llm_calls, tool_calls, idempotency_keys, approvals CASCADE`
  );
  console.log("Base de datos truncada exitosamente.");
  await pool.end();
  process.exit(0);
}

clear().catch((err) => {
  console.error("Error al limpiar la base de datos:", err);
  process.exit(1);
});
