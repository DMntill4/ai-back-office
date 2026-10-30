import {
  getVaultStats,
  syncVaultFromDatabase,
  searchObsidianMemory,
  getObsidianVaultPath,
} from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawFrame } from "../ui/frame";
import { drawCard, drawDivider } from "../ui/box";

export async function memoryCommand(
  action?: string,
  target?: string,
  options: { json?: boolean } = {},
) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  const act = (action || "status").toLowerCase();

  if (act === "sync") {
    console.log(theme.dim("\nSincronizando base de datos relacional con el Obsidian Vault..."));
    const syncRes = await syncVaultFromDatabase(companyId);

    if (options.json) {
      console.log(JSON.stringify(syncRes, null, 2));
      return;
    }

    console.log("");
    console.log(
      drawCard(
        [
          `${theme.dim("Empresa:")}                ${theme.bold(companyId)}`,
          `${theme.dim("Decisiones sincronizadas:")} ${theme.mint(String(syncRes.syncedDecisions))}`,
          `${theme.dim("Cuarentena sincronizada:")}  ${theme.mint(String(syncRes.syncedQuarantine))}`,
          `${theme.dim("Preguntas sincronizadas:")}   ${theme.mint(String(syncRes.syncedQuestions))}`,
          theme.dim("─".repeat(50)),
          theme.mint("[OK] Todas las notas Markdown y WikiLinks estan actualizadas en el Vault."),
        ],
        {
          title: "SINCRONIZACION OBSIDIAN COMPLETADA",
          borderColor: theme.mint,
        },
      ),
    );
    return;
  }

  if (act === "search") {
    if (!target) {
      console.log(theme.red("\nError: Debes especificar el termino de busqueda. Ej: mint memory search stock"));
      return;
    }

    const results = await searchObsidianMemory(target, companyId);
    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    console.log(theme.mintBold(`\n[RESULTADOS EN OBSIDIAN VAULT PARA: "${target}"]`));
    drawDivider();

    if (results.length === 0) {
      console.log(theme.dim("No se encontraron notas que coincidan con la busqueda.\n"));
      return;
    }

    for (const r of results) {
      console.log(`  ${theme.bold(r.file)} - ${theme.mint(r.title)}`);
      if (r.snippet) {
        console.log(`    ${theme.dim(r.snippet)}`);
      }
    }
    console.log("");
    return;
  }

  // Por defecto: status
  const stats = await getVaultStats(companyId);

  if (options.json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  console.log("");
  console.log(
    drawFrame({
      title: `MEMORIA OBSIDIAN VAULT (MARKDOWN & WIKILINKS): ${companyId}`,
      rows: [
        { key: "Ruta del Vault", value: stats.vaultPath },
        { key: "Decisiones Autonomas", value: `${stats.totalDecisiones} notas (.md)`, color: theme.mint },
        { key: "Registros en Cuarentena", value: `${stats.totalCuarentena} notas (.md)`, color: stats.totalCuarentena > 0 ? theme.amber : theme.mint },
        { key: "Preguntas al Operador", value: `${stats.totalPreguntas} notas (.md)`, color: stats.totalPreguntas > 0 ? theme.amber : theme.mint },
        { key: "Diarios de Auditoria", value: `${stats.totalAuditorias} logs diarios`, color: theme.mint },
        { key: "Total Notas en Memoria", value: `${stats.totalNotas} archivos Markdown`, color: theme.mintBold },
      ],
      footerLeft: theme.dim("ejecuta 'mint memory sync' para actualizar notas"),
      footerRight: theme.dim("Markdown compatible con Obsidian"),
    }),
  );
  console.log("");
}
