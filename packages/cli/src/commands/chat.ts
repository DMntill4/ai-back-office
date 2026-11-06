import { db, cases, runAgentLoop, isInvalidOrGibberishInput, getCompanyConfig } from "@mint/core";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { formatTerminalMarkdown } from "../ui/markdown";

export async function chatCommand(
  message: string,
  options: { json?: boolean; noExit?: boolean; role?: string; company?: string } = {},
) {
  const session = await getSession();
  const companyId = options.company || process.env.MINT_COMPANY_ID || session?.companyId || "comp_default";
  const effectiveUserRole = options.role || process.env.MINT_USER_ROLE || session?.role || "owner";
  const trimmedMsg = (message || "").trim();

  // 0. Modo Conversacional Interactivo en Terminal si no se pasan argumentos
  if (!trimmedMsg) {
    console.log("");
    console.log(theme.mintBold("  ╔══════════════════════════════════════════════════════════════════╗"));
    console.log(theme.mintBold("  ║     MINT BOT — MODO CONVERSACIONAL DIRECTO CON EL AGENTE        ║"));
    console.log(theme.mintBold("  ╚══════════════════════════════════════════════════════════════════╝"));
    console.log(theme.dim("  Escribe tus consultas sobre inventario, ROP, compras o reportes. Escribe `exit` para salir.\n"));

    const readline = await import("node:readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: theme.mintBold("  mint (bot) > "),
    });

    rl.prompt();
    for await (const line of rl) {
      const q = line.trim();
      if (!q) {
        rl.prompt();
        continue;
      }
      if (q.toLowerCase() === "exit" || q.toLowerCase() === "/exit" || q.toLowerCase() === "quit") {
        console.log(theme.dim("  Saliendo del modo chat interactivo."));
        rl.close();
        return;
      }
      await chatCommand(q, { noExit: true });
      console.log("");
      rl.prompt();
    }
    return;
  }

  // 0.1 Guardrail de entrada vacía o teclazos sin sentido antes de crear casos en base de datos
  if (isInvalidOrGibberishInput(trimmedMsg)) {
    const config = await getCompanyConfig(companyId).catch(() => null);
    const isEn = config?.botLanguage === "en";
    const msgText = isEn
      ? "[INFO] Please enter a valid question or operational instruction (e.g., inventory check, purchase orders, supplier evaluation, logistics routes, or financial reports)."
      : "[INFO] Por favor ingresa una consulta o instrucción operativa válida (ej: existencias de inventario, órdenes de compra, evaluación de proveedores, rutas logísticas o reportes financieros).";

    if (options.json) {
      console.log(JSON.stringify({ handledDeterministically: true, response: msgText }, null, 2));
      return;
    }

    console.log("");
    console.log(theme.dim("  " + "─".repeat(76)));
    for (const line of formatTerminalMarkdown(msgText)) {
      console.log(`  ${line}`);
    }
    console.log(theme.dim("  " + "─".repeat(76)));
    return;
  }

  const caseId = `chat_${randomUUID().slice(0, 8)}`;

  try {
    const { companies } = await import("@mint/core");
    await db
      .insert(companies)
      .values({
        id: companyId,
        name: session?.companyName || companyId,
        currency: session?.currency || "USD",
      })
      .onConflictDoNothing()
      .catch(() => {});

    await db.insert(cases).values({
      id: caseId,
      companyId,
      title: "Operacion Coordinador",
      description: trimmedMsg,
      status: "en_proceso",
      priority: "media",
    }).catch(() => {});

    if (options.json) {
      const res = await runAgentLoop(caseId, { userRole: effectiveUserRole });
      console.log(JSON.stringify(res, null, 2));
      return;
    }

    const executedSteps: string[] = [];
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    const live = Boolean(process.stdout.isTTY);
    let label = "Pensando";
    let frame = 0;
    const startedAt = Date.now();
    const timer = live
      ? setInterval(() => {
          const secs = ((Date.now() - startedAt) / 1000).toFixed(0);
          process.stdout.write(`\r  ${theme.mintBold(frames[frame++ % frames.length])} ${theme.muted(label)} ${theme.dim(`${secs}s`)}   `);
        }, 100)
      : null;

    let res;
    try {
      res = await runAgentLoop(caseId, {
        userRole: effectiveUserRole,
        onEvent: (ev) => {
          executedSteps.push(`${ev.action}`);
          label = `Ejecutando ${ev.action}`;
        },
      });
    } catch (llmError: any) {
      // 2. MODO DEGRADADO RESILIENTE (Graceful Degradation si falla el LLM)
      if (timer) {
        clearInterval(timer);
        process.stdout.write("\r" + " ".repeat(60) + "\r");
      }

      console.log("");
      console.log(theme.amberBold("  [MODO DEGRADADO // REGLAS OPERATIVAS LOCALES]"));
      console.log(
        theme.dim(
          `  El proveedor LLM remoto no estuvo disponible (${llmError.message}). Mint resolvió la consulta directamente:`,
        ),
      );

      const { resolveNaturalLanguageIntent } = await import("@mint/core");
      const fallbackRes = await resolveNaturalLanguageIntent(companyId, trimmedMsg);
      const textToDisplay =
        fallbackRes.response ||
        "No se pudo conectar con el motor remoto. Consulta tu inventario con /stock, propuestas con /inbox o reportes con /reports.";

      await db
        .update(cases)
        .set({
          status: "resuelto",
          resultSummary: textToDisplay,
          updatedAt: new Date(),
        })
        .where(eq(cases.id, caseId))
        .catch(() => {});

      console.log(theme.dim("  " + "─".repeat(76)));
      for (const line of formatTerminalMarkdown(textToDisplay)) {
        console.log(`  ${line}`);
      }
      console.log(theme.dim("  " + "─".repeat(76)));
      console.log(theme.dim("  operación ejecutada en modo contingencia local sin interrupción de servicio."));
      return;
    } finally {
      if (timer) {
        clearInterval(timer);
        process.stdout.write("\r" + " ".repeat(60) + "\r");
      }
    }

    console.log("");
    if (res.evidenceSummary) {
      console.log(theme.mintBold("  [EVIDENCIA DE EJECUCIÓN AUTÓNOMA]"));
      console.log(`  • Empresa / Rol Activo: ${theme.cyan(companyId)} (Rol: ${theme.cyan(effectiveUserRole)})`);
      console.log(
        `  • Herramientas seleccionadas: ${
          res.evidenceSummary.toolsUsed.length > 0
            ? theme.cyan(res.evidenceSummary.toolsUsed.join(" -> "))
            : theme.dim("Ninguna (respuesta directa / frontera de seguridad)")
        }`,
      );
      if (res.evidenceSummary.whatHappened.length > 0) {
        for (const stepText of res.evidenceSummary.whatHappened) {
          console.log(`  • Ejecución: ${theme.dim(stepText)}`);
        }
      }
      if (res.evidenceSummary.whatFailed.length > 0) {
        for (const failText of res.evidenceSummary.whatFailed) {
          console.log(`  • Fallo detectado: ${theme.amber(failText)}`);
        }
      }
      if (res.evidenceSummary.whatItTriedNext.length > 0) {
        for (const recText of res.evidenceSummary.whatItTriedNext) {
          console.log(`  • Auto-recuperación: ${theme.mint(recText)}`);
        }
      }
      if (res.evidenceSummary.boundariesEnforced.length > 0) {
        for (const bText of res.evidenceSummary.boundariesEnforced) {
          console.log(`  • Frontera RBAC/Seguridad aplicada: ${theme.redBold(bText)}`);
        }
      }
      console.log(
        `  • Escrituras verificadas en BD: ${
          res.evidenceSummary.allWritesVerified ? theme.mint("SÍ (100% verificado)") : theme.amber("PENDIENTE / RECHAZADO")
        }`,
      );
    } else if (executedSteps.length > 0) {
      console.log(`  ${theme.dim("Tools ejecutadas:")} ${theme.cyan(executedSteps.join(" -> "))}`);
    }

    const responseLines = formatTerminalMarkdown(res.summary || "Sin respuesta del modelo.");
    console.log(theme.dim("  " + "─".repeat(76)));
    for (const line of responseLines) {
      console.log(`  ${line}`);
    }
    console.log(theme.dim("  " + "─".repeat(76)));

    const costUsd = Number(res.totalCost || 0);
    const secs = (ms?: number) => (ms ? `${(ms / 1000).toFixed(1)}s` : "-");
    console.log(
      theme.dim(
        `  tokens ${res.promptTokens ?? 0} in / ${res.completionTokens ?? 0} out (${res.totalTokens})  ·  costo $${costUsd.toFixed(5)} USD  ·  modelo ${res.model || "-"}  ·  llm ${secs(res.llmMs)}  ·  total ${secs(res.totalMs)}`,
      ),
    );
    if (!options.noExit) {
      process.exit(0);
    }
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`  [ERROR] ${err.message}`));
    }
    if (!options.noExit) {
      process.exit(1);
    }
  }
}

export async function todayCommand(options: { json?: boolean; noExit?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const { generateDailyOperationalReport } = await import("@mint/core");
    const r = await generateDailyOperationalReport(companyId);

    if (options.json) {
      console.log(JSON.stringify(r, null, 2));
      return;
    }

    const { reportsCommand } = await import("./reports");
    await reportsCommand("briefing");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`  [ERROR] ${err.message}`));
    }
    if (!options.noExit) {
      process.exit(1);
    }
  }
}
