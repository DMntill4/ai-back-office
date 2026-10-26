import { db } from "../db/client";
import { mintPendingQuestions } from "../db/schema/mintEntities";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export interface PendingQuestionItem {
  id: string;
  companyId: string;
  topic: string;
  question: string;
  context: Record<string, any>;
  status: "pending" | "answered" | "dismissed";
  answer?: string | null;
  answeredBy?: string | null;
  createdAt: Date;
  answeredAt?: Date | null;
}

/**
 * Agrega una pregunta al banco de pendientes si falta un dato real en la BD.
 * Totalmente deduplicada: no genera spam ni preguntas repetidas si ya existe una abierta.
 */
export async function addPendingQuestion(
  companyId: string,
  topic: string,
  question: string,
  context: Record<string, any> = {},
): Promise<{ id: string; created: boolean }> {
  // 1. Buscar si ya existe una pregunta pendiente idéntica para el mismo tema/contexto
  const existing = await db
    .select()
    .from(mintPendingQuestions)
    .where(
      and(
        eq(mintPendingQuestions.companyId, companyId),
        eq(mintPendingQuestions.topic, topic),
        eq(mintPendingQuestions.status, "pending"),
      ),
    );

  const contextStr = JSON.stringify(context);
  const match = existing.find((q) => JSON.stringify(q.context) === contextStr);

  if (match) {
    return { id: match.id, created: false };
  }

  const id = `q_${randomUUID().slice(0, 8)}`;
  await db.insert(mintPendingQuestions).values({
    id,
    companyId,
    topic,
    question,
    context,
    status: "pending",
  });

  return { id, created: true };
}

/**
 * Lista las preguntas pendientes de la empresa
 */
export async function listPendingQuestions(
  companyId: string,
  status: "pending" | "answered" | "dismissed" | "all" = "pending",
): Promise<PendingQuestionItem[]> {
  const query = db
    .select()
    .from(mintPendingQuestions)
    .where(
      status === "all"
        ? eq(mintPendingQuestions.companyId, companyId)
        : and(
            eq(mintPendingQuestions.companyId, companyId),
            eq(mintPendingQuestions.status, status),
          ),
    )
    .orderBy(desc(mintPendingQuestions.createdAt));

  const rows = await query;
  return rows.map((r) => ({
    id: r.id,
    companyId: r.companyId,
    topic: r.topic,
    question: r.question,
    context: (r.context as Record<string, any>) || {},
    status: r.status as any,
    answer: r.answer,
    answeredBy: r.answeredBy,
    createdAt: r.createdAt,
    answeredAt: r.answeredAt,
  }));
}

/**
 * Responde una pregunta pendiente
 */
export async function answerPendingQuestion(
  id: string,
  answer: string,
  answeredBy: string = "HUMAN_OPERATOR",
): Promise<boolean> {
  const res = await db
    .update(mintPendingQuestions)
    .set({
      status: "answered",
      answer,
      answeredBy,
      answeredAt: new Date(),
    })
    .where(eq(mintPendingQuestions.id, id));

  return true;
}

/**
 * Descarta una pregunta pendiente
 */
export async function dismissPendingQuestion(id: string): Promise<boolean> {
  await db
    .update(mintPendingQuestions)
    .set({
      status: "dismissed",
      answeredAt: new Date(),
    })
    .where(eq(mintPendingQuestions.id, id));

  return true;
}
