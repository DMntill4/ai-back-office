import * as path from "node:path";
import { migrate as migrateNodePg } from "drizzle-orm/node-postgres/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { db, pool, isEmbeddedDb } from "./client";

export async function runMigrations() {
  console.log("Applying database migrations...");
  const migrationsFolder = path.resolve(__dirname, "migrations");
  if (isEmbeddedDb) {
    await migratePglite(db as any, { migrationsFolder });
  } else {
    await migrateNodePg(db, { migrationsFolder });
  }
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
