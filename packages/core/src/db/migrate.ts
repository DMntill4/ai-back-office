import * as path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client";

export async function runMigrations() {
  console.log("Applying database migrations...");
  await migrate(db, { migrationsFolder: path.resolve(__dirname, "migrations") });
  console.log("Database migrations applied successfully.");
}

if (require.main === module) {
  runMigrations()
    .catch((err) => {
      console.error("Error executing migrations:", err);
      process.exit(1);
    })
    .finally(async () => {
      await pool.end();
    });
}

