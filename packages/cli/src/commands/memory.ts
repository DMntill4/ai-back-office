import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import { exec } from "node:child_process";
import { getSession } from "../keychain";
import {
  getVaultStatus,
  getOrBuildVaultIndex,
  readVaultNote,
  forgetVaultNote,
  rebuildVaultFromDatabase,
  getVaultDirectory,
  writeVaultNote,
} from "../memory";

export const memoryCommand = new Command("memory")
  .description("Gestiona la memoria persistente de MINT en vault estilo Obsidian (Personalizada por Proyecto)");

// 1. mint memory status
memoryCommand
  .command("status")
  .description("Muestra el estado de la memoria, notas por tipo, tamaño e integridad")
  .option("--json", "Salida en formato JSON estructurado")
  .action(async (opts) => {
    try {
      const session = await getSession();
      const companyId = session ? session.companyId : "DEMO_COMPANY";
      const report = await getVaultStatus(companyId);

      if (opts.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log("\n\x1b[32m╔══════════════════════════════════════════════════════════════════╗\x1b[0m");
      console.log(`\x1b[32m║\x1b[0m  \x1b[1mMINT MEMORY VAULT — Diagnóstico de Memoria Operativa (Obsidian)\x1b[0m \x1b[32m║\x1b[0m`);
      console.log("\x1b[32m╚══════════════════════════════════════════════════════════════════╝\x1b[0m\n");

      console.log(`  \x1b[36m•\x1b[0m Empresa:        \x1b[1m${companyId}\x1b[0m`);
      console.log(`  \x1b[36m•\x1b[0m Ubicación:      \x1b[4m${report.vaultPath}\x1b[0m`);
      console.log(`  \x1b[36m•\x1b[0m Total de Notas: \x1b[1m${report.totalNotes}\x1b[0m (${(report.totalSizeBytes / 1024).toFixed(1)} KB)`);
      console.log(`  \x1b[36m•\x1b[0m Config Obsidian:${report.isObsidianConfigured ? " \x1b[32mOK (Colores y Grafo sincronizados)\x1b[0m" : " \x1b[33mNo configurado\x1b[0m"}`);
      console.log(`  \x1b[36m•\x1b[0m Repositorio Git:${report.hasGitRepo ? " \x1b[32mActivo (Versionado local habilitado)\x1b[0m" : " \x1b[90mDesactivado\x1b[0m"}`);
      console.log(`  \x1b[36m•\x1b[0m Última Escritura: ${report.lastUpdated ? new Date(report.lastUpdated).toLocaleString() : "Sin actividad reciente"}\n`);

      console.log("\x1b[1mNOTAS POR TIPO:\x1b[0m");
      for (const [t, count] of Object.entries(report.notesByType)) {
        if (count > 0) {
          console.log(`  - \x1b[33m${t.padEnd(14)}\x1b[0m: ${count} nota(s)`);
        }
      }

      console.log("\n\x1b[1mESTADO DE CONFIANZA Y SALUD:\x1b[0m");
      console.log(`  - \x1b[32mVigentes:\x1b[0m      ${report.notesByStatus.vigente || 0}`);
      console.log(`  - \x1b[35mHipótesis:\x1b[0m     ${report.hypothesesPending} (Pendientes de confirmación)`);
      console.log(`  - \x1b[31mContradichas:\x1b[0m  ${report.contradictedNotes} (Prevalece la Base de Datos)`);
      console.log(`  - \x1b[90mCaducadas:\x1b[0m     ${report.expiredNotes}\n`);
    } catch (err: any) {
      console.error("\x1b[31m[ERROR]\x1b[0m Fallo al obtener estado de memoria:", err.message);
    }
  });

// 2. mint memory search <query>
memoryCommand
  .command("search <query>")
  .description("Busca notas en el vault por texto, id de entidad o etiquetas")
  .option("-t, --type <type>", "Filtrar por tipo (entidad, decision, aprendizaje, etc.)")
  .option("-m, --module <module>", "Filtrar por módulo (inventario, proveedores, etc.)")
  .option("--json", "Salida en formato JSON")
  .action(async (query, opts) => {
    try {
      const session = await getSession();
      const companyId = session ? session.companyId : "DEMO_COMPANY";
      const index = await getOrBuildVaultIndex(companyId);

      const results = index.search({
        query,
        tipo: opts.type,
        modulo: opts.module,
        limit: 25,
      });

      if (opts.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      console.log(`\n\x1b[1mRESULTADOS DE BÚSQUEDA EN MEMORIA PARA: "${query}"\x1b[0m (${results.length} notas)\n`);
      if (results.length === 0) {
        console.log("  \x1b[90mNo se encontraron notas que coincidan con la búsqueda.\x1b[0m\n");
        return;
      }

      for (const r of results) {
        const stateColor = r.estado === "vigente" ? "\x1b[32m" : r.estado === "contradicha" ? "\x1b[31m" : "\x1b[33m";
        console.log(`  • \x1b[1m${r.titulo}\x1b[0m [${stateColor}${r.estado.toUpperCase()}\x1b[0m]`);
        console.log(`    Ruta: \x1b[36m[[${r.relativePath}]]\x1b[0m | ID: \x1b[90m${r.id_origen}\x1b[0m | Fuente: \x1b[90m${r.fuente}\x1b[0m`);
        if (r.tags.length > 0) {
          console.log(`    Tags: \x1b[90m${r.tags.map((t) => "#" + t.replace(/^#/, "")).join(" ")}\x1b[0m`);
        }
        console.log("");
      }
    } catch (err: any) {
      console.error("\x1b[31m[ERROR]\x1b[0m Fallo al buscar en memoria:", err.message);
    }
  });

// 3. mint memory show <note>
memoryCommand
  .command("show <note>")
  .description("Muestra el contenido completo y frontmatter de una nota del vault")
  .action(async (noteId) => {
    try {
      const session = await getSession();
      const companyId = session ? session.companyId : "DEMO_COMPANY";
      const note = await readVaultNote(companyId, noteId);

      if (!note) {
        console.error(`\x1b[31m[ERROR]\x1b[0m No se encontró la nota '${noteId}' en el vault.`);
        return;
      }

      console.log("\n\x1b[32m──────────────────────────────────────────────────────────────────\x1b[0m");
      console.log(`\x1b[1mNOTA: [[${note.relativePath}]]\x1b[0m`);
      console.log("\x1b[32m──────────────────────────────────────────────────────────────────\x1b[0m");
      console.log("\x1b[90m--- METADATOS FRONTMATTER ---");
      console.log(JSON.stringify(note.frontmatter, null, 2));
      console.log("---\x1b[0m\n");
      console.log(note.content);
      console.log("\x1b[32m──────────────────────────────────────────────────────────────────\x1b[0m\n");
    } catch (err: any) {
      console.error("\x1b[31m[ERROR]\x1b[0m Fallo al leer la nota:", err.message);
    }
  });

// 4. mint memory open
memoryCommand
  .command("open")
  .description("Abre el vault en Obsidian si está instalado o muestra la ruta del sistema")
  .action(async () => {
    try {
      const session = await getSession();
      const companyId = session ? session.companyId : "DEMO_COMPANY";
      const vaultPath = getVaultDirectory(companyId);

      console.log(`\n\x1b[32m[MINT MEMORY]\x1b[0m Abriendo vault en: \x1b[4m${vaultPath}\x1b[0m`);

      const vaultName = path.basename(vaultPath);
      const obsidianUri = `obsidian://open?vault=${encodeURIComponent(vaultName)}`;

      const platform = process.platform;
      let cmd = "";

      if (platform === "win32") {
        cmd = `start "" "${vaultPath}"`;
      } else if (platform === "darwin") {
        cmd = `open "${vaultPath}"`;
      } else {
        cmd = `xdg-open "${vaultPath}"`;
      }

      exec(cmd, (err) => {
        if (err) {
          console.log(`\x1b[90mPara explorar en Obsidian, abre la carpeta como Vault: ${vaultPath}\x1b[0m\n`);
        } else {
          console.log(`\x1b[32m[OK]\x1b[0m Carpeta del vault abierta en el explorador.\n`);
        }
      });
    } catch (err: any) {
      console.error("\x1b[31m[ERROR]\x1b[0m Fallo al abrir el vault:", err.message);
    }
  });

// 5. mint memory review
memoryCommand
  .command("review")
  .description("Revisa hipótesis pendientes de confirmación, notas contradichas y caducadas")
  .action(async () => {
    try {
      const session = await getSession();
      const companyId = session ? session.companyId : "DEMO_COMPANY";
      const index = await getOrBuildVaultIndex(companyId);

      const all = index.getAllEntries();
      const hypotheses = all.filter((e) => e.estado === "hipotesis");
      const contradicted = all.filter((e) => e.estado === "contradicha");
      const expired = all.filter((e) => e.caduca && new Date(e.caduca).getTime() <= Date.now());

      console.log("\n\x1b[32m╔══════════════════════════════════════════════════════════════════╗\x1b[0m");
      console.log(`\x1b[32m║\x1b[0m  \x1b[1mREVISIÓN DE MEMORIA OPERATIVA — Control de Calidad Cognitiva\x1b[0m    \x1b[32m║\x1b[0m`);
      console.log("\x1b[32m╚══════════════════════════════════════════════════════════════════╝\x1b[0m\n");

      // A. Hipótesis pendientes
      console.log(`\x1b[35m[HIPÓTESIS PENDIENTES DE VALIDAR]\x1b[0m (${hypotheses.length}):`);
      if (hypotheses.length === 0) {
        console.log("  \x1b[90mCero hipótesis pendientes. Todos los patrones cuentan con evidencia sólida.\x1b[0m");
      } else {
        for (const h of hypotheses) {
          console.log(`  • \x1b[1m${h.titulo}\x1b[0m ([[${h.relativePath}]])`);
          console.log(`    Id Origen: ${h.id_origen} | Módulo: ${h.modulo}`);
        }
      }
      console.log("");

      // B. Contradicciones con la Base de Datos
      console.log(`\x1b[31m[CONTRADICCIONES DETECTADAS (PREVALECE LA BD)]\x1b[0m (${contradicted.length}):`);
      if (contradicted.length === 0) {
        console.log("  \x1b[90mCero discrepancias. La memoria está 100% alineada con PostgreSQL.\x1b[0m");
      } else {
        for (const c of contradicted) {
          console.log(`  • \x1b[31m!\x1b[0m \x1b[1m${c.titulo}\x1b[0m ([[${c.relativePath}]])`);
          console.log(`    La BD contiene valores más actualizados que esta nota.`);
        }
      }
      console.log("");

      // C. Notas Caducadas
      console.log(`\x1b[33m[NOTAS CADUCADAS]\x1b[0m (${expired.length}):`);
      if (expired.length === 0) {
        console.log("  \x1b[90mCero notas caducadas.\x1b[0m\n");
      } else {
        for (const ex of expired) {
          console.log(`  • \x1b[90m${ex.titulo}\x1b[0m (Caducó: ${ex.caduca})`);
        }
        console.log("");
      }
    } catch (err: any) {
      console.error("\x1b[31m[ERROR]\x1b[0m Fallo en revisión de memoria:", err.message);
    }
  });

// 6. mint memory forget <target>
memoryCommand
  .command("forget <target>")
  .description("Elimina de forma segura una nota o entidad de la memoria persistente")
  .option("-r, --reason <reason>", "Motivo de la eliminación para el registro de auditoría")
  .action(async (target, opts) => {
    try {
      const session = await getSession();
      const companyId = session ? session.companyId : "DEMO_COMPANY";
      const reason = opts.reason || "Eliminado manualmente por el operador";

      const deleted = await forgetVaultNote(companyId, target, reason);
      if (deleted) {
        console.log(`\n\x1b[32m[OK]\x1b[0m Nota/Entidad '${target}' eliminada del vault.`);
        console.log(`Registro de auditoría emitido: 'forget_${target}'.\n`);
      } else {
        console.error(`\x1b[31m[ERROR]\x1b[0m No se encontró la nota '${target}' para eliminar.\n`);
      }
    } catch (err: any) {
      console.error("\x1b[31m[ERROR]\x1b[0m Fallo al eliminar nota:", err.message);
    }
  });

// 7. mint memory rebuild
memoryCommand
  .command("rebuild")
  .description("Reconstruye el vault y el índice desde PostgreSQL y el registro de auditoría")
  .action(async () => {
    try {
      const session = await getSession();
      const companyId = session ? session.companyId : "DEMO_COMPANY";

      console.log(`\n\x1b[36m[MINT MEMORY]\x1b[0m Reconstruyendo vault para empresa \x1b[1m${companyId}\x1b[0m desde PostgreSQL...`);
      const result = await rebuildVaultFromDatabase(companyId);

      console.log(`\x1b[32m[OK]\x1b[0m Reconstrucción completada con éxito en ${result.elapsedMs} ms.`);
      console.log(`Notas sincronizadas desde BD y Auditoría: \x1b[1m${result.notesCreated}\x1b[0m`);
      console.log(`Ubicación: \x1b[4m${result.vaultPath}\x1b[0m\n`);
    } catch (err: any) {
      console.error("\x1b[31m[ERROR]\x1b[0m Fallo en la reconstrucción:", err.message);
    }
  });

// 8. mint memory export <outputDir>
memoryCommand
  .command("export <outputDir>")
  .description("Exporta el vault de la empresa a un directorio limpio sin secretos ni archivos temporales")
  .action(async (outputDir) => {
    try {
      const session = await getSession();
      const companyId = session ? session.companyId : "DEMO_COMPANY";
      const vaultPath = getVaultDirectory(companyId);

      if (!fs.existsSync(vaultPath)) {
        console.error(`\x1b[31m[ERROR]\x1b[0m No existe vault para la empresa '${companyId}'.`);
        return;
      }

      const dest = path.resolve(outputDir);
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

      // Copiar recursivamente omitiendo .vault.lock y temporales
      fs.cpSync(vaultPath, dest, {
        recursive: true,
        filter: (src) => !src.includes(".vault.lock") && !src.includes(".tmp"),
      });

      console.log(`\n\x1b[32m[OK]\x1b[0m Vault exportado limpiamente a: \x1b[4m${dest}\x1b[0m\n`);
    } catch (err: any) {
      console.error("\x1b[31m[ERROR]\x1b[0m Fallo al exportar vault:", err.message);
    }
  });
