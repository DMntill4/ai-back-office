import { verifyRuntimeEnvironment } from "@mint/core";
import { theme } from "../ui/theme";

export async function doctorCommand(options: { json?: boolean } = {}) {
  try {
    const report = await verifyRuntimeEnvironment();

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.compatible ? 0 : 1);
    }

    console.log(`\n${theme.mintBold("🩺 DIAGNÓSTICO DE ENTORNO Y ARQUITECTURA DE DATOS")} [Mint Doctor]`);
    console.log("─".repeat(80));

    // 1. Verificación de Node.js
    console.log(`${theme.bold("1. Entorno de Ejecución JavaScript:")}`);
    const nodeStatus = report.node.meetsMinimum
      ? `${theme.badge("OK", "mint")} Node.js v${report.node.current} (>= 22.5.0)`
      : `${theme.badge("INCOMPATIBLE", "red")} Node.js v${report.node.current} (< 22.5.0)`;
    console.log(`   Versión:       ${nodeStatus}`);

    const sqliteStatus = report.node.nativeSqliteSupported
      ? `${theme.badge("ACTIVO", "mint")} Soporte nativo 'node:sqlite' habilitado (Cero dependencias C++)`
      : `${theme.badge("DESHABILITADO", "amber")} 'node:sqlite' no disponible`;
    console.log(`   Motor SQLite:  ${sqliteStatus}`);

    // 2. Base de Datos Interna (PostgreSQL)
    console.log(`\n${theme.bold("2. Estado Interno del Agente (PostgreSQL):")}`);
    if (report.postgres.connected) {
      console.log(
        `   Conexión:      ${theme.badge("CONECTADO", "mint")} ${report.postgres.provider || "PostgreSQL"}`
      );
      console.log(`   Host:          ${report.postgres.host || "localhost"}`);
      console.log(`   Base de Datos: ${report.postgres.database || "ai_back_office"}`);
      console.log(
        `   Propósito:     Almacén de estado persistente (decisiones, auditoría, productos, inventario, reglas)`
      );
    } else {
      console.log(
        `   Conexión:      ${theme.badge("DESCONECTADO", "red")} ${report.postgres.error || "No se pudo conectar"}`
      );
      if (report.postgres.recommendation) {
        console.log(`   ${theme.amber("Recomendación:")} ${report.postgres.recommendation}`);
      }
    }

    // 3. Fuentes Externas de Datos Soportadas (Solo Lectura)
    console.log(`\n${theme.bold("3. Conectores Externos Soportados (Estricto Modo Solo Lectura):")}`);
    for (const src of report.architecture.externalReadOnlySources) {
      console.log(`   ${theme.cyan("•")} ${src}`);
    }

    // 4. Diagnósticos / Advertencias
    if (report.diagnostics.length > 0) {
      console.log(`\n${theme.bold("4. Avisos y Diagnósticos:")}`);
      for (const diag of report.diagnostics) {
        if (diag.startsWith("[ERROR]")) {
          console.log(`   ${theme.red(diag)}`);
        } else {
          console.log(`   ${theme.amber(diag)}`);
        }
      }
    }

    console.log("─".repeat(80));
    if (report.compatible) {
      console.log(`${theme.mintBold("✔ Sistema 100% operativo y listo para ejecución autónoma.")}\n`);
      process.exit(0);
    } else {
      console.log(`${theme.redBold("✖ Se detectaron problemas en el entorno. Revisa los avisos anteriores.")}\n`);
      process.exit(1);
    }
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }, null, 2));
      process.exit(1);
    }
    console.error(`${theme.red("Error ejecutando diagnóstico:")} ${err.message}`);
    process.exit(1);
  }
}
