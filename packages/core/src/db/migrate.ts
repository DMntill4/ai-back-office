import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client";

export async function runMigrations() {
  const migrationsFolder = path.resolve(__dirname, "./migrations");
  try {
    await migrate(db, { migrationsFolder });
  } catch (err: any) {
    // Si la conexión falló o la migración arrojó error, propagar transparentemente
    throw new Error(`Error aplicando migraciones en '${migrationsFolder}': ${err.message}`);
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("Migraciones de PostgreSQL aplicadas exitosamente.");
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    })
    .finally(async () => {
      await pool.end();
    });
}
