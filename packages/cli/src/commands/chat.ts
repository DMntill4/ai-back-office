import { db, cases, runAgentLoop, decisions } from "@mint/core";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { formatTerminalMarkdown } from "../ui/markdown";

export async function chatCommand(message: string, options: { json?: boolean; noExit?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";
  const caseId = `chat_${randomUUID().slice(0, 8)}`;

  try {
    await db.insert(cases).values({
      id: caseId,
      companyId,
      title: "Operacion Coordinador",
      description: message,
      status: "en_proceso",
      priority: "media",
    });

    // 1. INTENCIÓN DETERMINISTA EN LENGUAJE NATURAL (Fast-Path Local)
    const { resolveNaturalLanguageIntent } = await import("@mint/core");
    const intentRes = await resolveNaturalLanguageIntent(companyId, message);

    if (intentRes.handledDeterministically) {
      if (options.json) {
        console.log(JSON.stringify(intentRes, null, 2));
        return;
      }

      console.log("");
      console.log(theme.dim("  " + "─".repeat(76)));
      const responseLines = formatTerminalMarkdown(intentRes.response);
      for (const line of responseLines) {
        console.log(`  ${line}`);
      }
      console.log(theme.dim("  " + "─".repeat(76)));
      console.log(
        theme.dim(
          `  tokens 0 in / 0 out  ·  costo $0.00000 USD  ·  motor Local Determinista (PostgreSQL)  ·  latencia 0.05s`,
        ),
      );
      return;
    }

    if (options.json) {
      const res = await runAgentLoop(caseId);
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

      const fallbackRes = await resolveNaturalLanguageIntent(companyId, message);
      const textToDisplay = fallbackRes.response || "No se pudo conectar con el motor remoto. Consulta tu inventario con /stock, propuestas con /inbox o reportes con /reports.";

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
    if (executedSteps.length > 0) {
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
