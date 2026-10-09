import { db, pool } from "./src/db/client";
import { sql } from "drizzle-orm";

async function clear() {
  await db.execute(sql`TRUNCATE TABLE inventory, products, warehouses, suppliers, supplier_products, cases, case_events, llm_calls, tool_calls, idempotency_keys, approvals CASCADE`);
  console.log("Truncated successfully.");
  process.exit(0);
}
clear();
