import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client";

export async function runMigrations() {
  console.log("⏳ Aplicando migraciones...");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("✅ Migraciones aplicadas con éxito.");
}

if (require.main === module) {
  runMigrations()
    .catch((err) => {
      console.error("❌ Error ejecutando migraciones:", err);
      process.exit(1);
    })
    .finally(async () => {
      await pool.end();
    });
}
