import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
    addPendingQuestion,
    listPendingQuestions,
    answerPendingQuestion,
    dismissPendingQuestion,
} from "@mint/core";
import { currentSession } from "./auth";

/**
 * Rutas del Banco de Preguntas Pendientes.
 *
 * Conecta `packages/core/src/services/pendingQuestionsService.ts`:
 *  - `addPendingQuestion`      → registra una pregunta cuando falta un dato real
 *  - `listPendingQuestions`    → lista por estado (pending|answered|dismissed|all)
 *  - `answerPendingQuestion`   → responde y desbloquea al agente
 *  - `dismissPendingQuestion`  → descarta la pregunta
 *
 * Endpoints:
 *  - GET   /api/questions
 *  - POST  /api/questions
 *  - POST  /api/questions/:id/answer
 *  - POST  /api/questions/:id/dismiss
 */

const VALID_FILTERS = ["pending", "answered", "dismissed", "all"] as const;
type QuestionFilter = (typeof VALID_FILTERS)[number];

export async function questionsRoutes(fastify: FastifyInstance) {
    // 1. Listar preguntas
    fastify.get("/api/questions", async (request: FastifyRequest, reply: FastifyReply) => {
        const query = (request.query as any) || {};
        const companyId = query.companyId || currentSession.companyId;
        const status = String(query.status || "pending") as QuestionFilter;

        if (!VALID_FILTERS.includes(status)) {
            reply.code(400);
            return {
                success: false,
                message: `Filtro inválido. Opciones: ${VALID_FILTERS.join(", ")}.`,
            };
        }

        try {
            const data = await listPendingQuestions(companyId, status);
            return { success: true, count: data.length, data };
        } catch (err: any) {
            return {
                success: false,
                count: 0,
                data: [],
                message: `Error al listar preguntas pendientes: ${err.message}`,
            };
        }
    });

    // 2. Registrar una pregunta
    fastify.post("/api/questions", async (request: FastifyRequest, reply: FastifyReply) => {
        const body = (request.body as any) || {};
        const companyId = body.companyId || currentSession.companyId;

        if (!body.topic || !body.question) {
            reply.code(400);
            return { success: false, message: "Se requieren 'topic' y 'question'." };
        }

        try {
            const result = await addPendingQuestion(
                companyId,
                String(body.topic),
                String(body.question),
                body.context || {},
            );
            return { success: true, ...result };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error al registrar la pregunta: ${err.message}` };
        }
    });

    // 3. Responder una pregunta
    fastify.post("/api/questions/:id/answer", async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        const body = (request.body as any) || {};
        const answer = body.answer;
        const answeredBy = body.answeredBy || currentSession.userName || "HUMAN_OPERATOR";

        if (!answer || !String(answer).trim()) {
            reply.code(400);
            return { success: false, message: "La respuesta no puede estar vacía." };
        }

        try {
            const ok = await answerPendingQuestion(id, String(answer), answeredBy);
            if (!ok) {
                reply.code(404);
                return { success: false, message: `Pregunta ${id} no encontrada.` };
            }
            return { success: true, id, answeredBy };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error al responder la pregunta: ${err.message}` };
        }
    });

    // 4. Descartar una pregunta
    fastify.post("/api/questions/:id/dismiss", async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };

        try {
            const ok = await dismissPendingQuestion(id);
            if (!ok) {
                reply.code(404);
                return { success: false, message: `Pregunta ${id} no encontrada.` };
            }
            return { success: true, id };
        } catch (err: any) {
            reply.code(500);
            return { success: false, message: `Error al descartar la pregunta: ${err.message}` };
        }
    });
}
