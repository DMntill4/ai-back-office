import { listPendingQuestions, answerPendingQuestion, dismissPendingQuestion, db, businessConfig } from "@mint/core";
import { eq, and } from "drizzle-orm";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { renderTable, type ColumnDef } from "../ui/table";

export async function questionsCommand(
  action: string = "list",
  targetId?: string,
  answerText?: string,
  options: { json?: boolean } = {},
) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  // 1. Responder pregunta
  if (action === "answer" && targetId && answerText) {
    await answerPendingQuestion(targetId, answerText, session?.name || "OPERADOR");
    if (options.json) {
      console.log(JSON.stringify({ success: true, id: targetId, answer: answerText }));
    } else {
      console.log(`\n  ${theme.mintBold("[OK]")} Pregunta ${theme.bold(targetId)} respondida y guardada en el historial.\n`);
    }
    return;
  }

  // 2. Descartar pregunta
  if (action === "dismiss" && targetId) {
    await dismissPendingQuestion(targetId);
    if (options.json) {
      console.log(JSON.stringify({ success: true, id: targetId, dismissed: true }));
    } else {
      console.log(`\n  ${theme.amberBold("[OK]")} Pregunta ${theme.bold(targetId)} descartada.\n`);
    }
    return;
  }

  // 3. Listar preguntas pendientes
  const allQuestions = await listPendingQuestions(companyId, "pending");

  // Si opera en Solo Tienda, silenciar preguntas sobre proveedores y flota
  const [profileCfg] = await db
    .select({ value: businessConfig.value })
    .from(businessConfig)
    .where(and(eq(businessConfig.companyId, companyId), eq(businessConfig.key, "business_profile")))
    .limit(1)
    .catch(() => [{ value: "tienda" }]);

  const isStoreOnly = profileCfg?.value === "tienda";
  const questions = isStoreOnly
    ? allQuestions.filter(
        (q) =>
          q.topic !== "supplier_missing" &&
          q.topic !== "logistics_missing" &&
          !q.topic.includes("carrier") &&
          !q.topic.includes("fleet"),
      )
    : allQuestions;

  if (options.json) {
    console.log(JSON.stringify(questions, null, 2));
    return;
  }

  console.log("\n" + drawDivider(`BANCO DE PREGUNTAS PENDIENTES [${companyId}]`, 86));

  if (questions.length === 0) {
    console.log(`\n  ${theme.mint("No hay preguntas pendientes. Toda la información requerida por MINT está al día.")}\n`);
    return;
  }

  console.log(`  ${theme.dim("MINT no inventa datos. Cuando falta un proveedor, costo o almacén, se registra aquí.")}\n`);

  for (const q of questions) {
    const topicBadge =
      q.topic === "supplier_missing"
        ? theme.badge("PROVEEDOR FALTANTE", "amber")
        : q.topic === "cost_missing"
          ? theme.badge("COSTO NO REGISTRADO", "amber")
          : theme.badge(q.topic.toUpperCase(), "cyan");

    const lines = [
      `${theme.bold("TEMA:")}         ${topicBadge}`,
      `${theme.bold("PREGUNTA:")}     ${q.question}`,
      `${theme.dim("Fecha:")}        ${new Date(q.createdAt).toLocaleString()}`,
    ];

    if (Object.keys(q.context).length > 0) {
      lines.push(`${theme.dim("Contexto:")}     ${JSON.stringify(q.context)}`);
    }

    lines.push("");
    lines.push(`  ${theme.dim("Para responder:")} ${theme.mintBold(`mint questions answer ${q.id} "tu respuesta"`)}`);

    console.log(
      drawCard(lines, {
        title: `PREGUNTA: ${q.id}`,
        borderColor: theme.amber,
      }),
    );
  }

  console.log("");
}
