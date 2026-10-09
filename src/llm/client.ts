import OpenAI from "openai";
import * as dotenv from "dotenv";
import { calculateCallCost } from "./pricing";
import { db } from "../db/client";
import { llmCalls } from "../db/schema";
import { randomUUID, createHash } from "node:crypto";

dotenv.config();

export interface LLMRequestOptions {
  caseId?: string; // ID del caso asociado para auditoría
  model?: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
  toolChoice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: OpenAI.Chat.Completions.ChatCompletionCreateParams["response_format"];
  timeoutMs?: number;
}

export interface LLMCallResult {
  message: OpenAI.Chat.Completions.ChatCompletionMessage;
  content: string | null;
  toolCalls:
    OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] | undefined;
  model: string;
  finishReason: string | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    cachedTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  cost: string; // Dinero en formato decimal exacto
}

// Configuración de reintentos y límites
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_CONCURRENT_CALLS = 20; // Subido para soportar pruebas de carga/resistencia

let activeCalls = 0;
const callQueue: (() => void)[] = [];

// Caché en memoria para solicitudes idénticas (Ahorra latencia y tokens)
const requestCache = new Map<string, LLMCallResult>();

function acquireSlot(): Promise<void> {
  if (activeCalls < MAX_CONCURRENT_CALLS) {
    activeCalls++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    callQueue.push(() => {
      activeCalls++;
      resolve();
    });
  });
}

function releaseSlot(): void {
  activeCalls--;
  if (callQueue.length > 0) {
    const next = callQueue.shift();
    if (next) next();
  }
}

/**
 * Cliente único y centralizado para interactuar con Grok a través del Gateway
 */
class GrokClient {
  private openai: OpenAI;
  private defaultModel: string;

  constructor() {
    const baseURL =
      process.env.GROK_BASE_URL ||
      process.env.RETO_BASE_URL ||
      "https://api.reto.pltk.mx/v1";

    const apiKey = process.env.RETO_KEY || process.env.XAI_API_KEY || "";

    this.defaultModel = process.env.GROK_MODEL || "grok-4.6";

    this.openai = new OpenAI({
      baseURL,
      apiKey,
      timeout: DEFAULT_TIMEOUT_MS,
      maxRetries: 0, // Manejamos nuestros propios reintentos controlados
    });
  }

  /**
   * Envía una solicitud de chat completion con control de tiempo, reintentos y registro de costos
   */
  async chatCompletion(options: LLMRequestOptions): Promise<LLMCallResult> {
    // Generar llave de caché basada en los mensajes y herramientas
    const cacheKey = createHash("md5")
      .update(JSON.stringify({ m: options.messages, t: options.tools }))
      .digest("hex");

    if (requestCache.has(cacheKey)) {
      const cachedResult = requestCache.get(cacheKey)!;
      return { ...cachedResult, latencyMs: 0 }; // Devolver instantáneo
    }

    await acquireSlot();
    try {
      const result = await this.executeWithRetry(options);
      requestCache.set(cacheKey, result);
      return result;
    } finally {
      releaseSlot();
    }
  }

  /**
   * Consulta los modelos disponibles en el gateway
   */
  async listModels(): Promise<OpenAI.Models.Model[]> {
    try {
      const response = await this.openai.models.list();
      return response.data;
    } catch (error) {
      throw new Error(`Error consultando modelos disponibles: ${error}`, {
        cause: error,
      });
    }
  }

  private async executeWithRetry(
    options: LLMRequestOptions,
  ): Promise<LLMCallResult> {
    let attempt = 0;
    const model = options.model || this.defaultModel;

    while (attempt <= MAX_RETRIES) {
      const startTime = Date.now();
      try {
        const timeout = options.timeoutMs || DEFAULT_TIMEOUT_MS;

        // Llamada a la API de Grok
        const response = await this.openai.chat.completions.create(
          {
            model,
            messages: options.messages,
            tools: options.tools,
            tool_choice: options.toolChoice,
            temperature: options.temperature ?? 0.1, // Temperatura baja por defecto para tareas de back office
            max_tokens: options.maxTokens,
            response_format: options.responseFormat,
          },
          { timeout },
        );

        const latencyMs = Date.now() - startTime;
        const choice = response.choices[0];

        // Extracción de tokens y tokens en caché (si el gateway los reporta)
        const usage = response.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        };

        // Soporte para tokens en caché según especificaciones OpenAI/xAI
        const cachedTokens =
          (usage as any).prompt_tokens_details?.cached_tokens || 0;

        const cost = calculateCallCost(
          model,
          usage.prompt_tokens,
          usage.completion_tokens,
          cachedTokens,
        );

        const result: LLMCallResult = {
          message: choice.message,
          content: choice.message.content,
          toolCalls: choice.message.tool_calls,
          model: response.model || model,
          finishReason: choice.finish_reason,
          usage: {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            cachedTokens,
            totalTokens: usage.total_tokens,
          },
          latencyMs,
          cost,
        };

        // Registrar auditoría en la base de datos si hay un caso asignado
        if (options.caseId) {
          await this.logCallToDatabase(options.caseId, result);
        }

        return result;
      } catch (error: any) {
        attempt++;
        const status = error?.status;

        // Solo reintentamos ante Rate Limit (429) o errores internos del servidor (5xx)
        const isTransient = status === 429 || (status >= 500 && status < 600);

        if (!isTransient || attempt > MAX_RETRIES) {
          throw error;
        }

        // Backoff exponencial con jitter: 1s, 2s, 4s (+ variación aleatoria)
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 500;
        const delay = baseDelay + jitter;

        console.warn(
          `[GrokClient] Reintento ${attempt}/${MAX_RETRIES} tras error HTTP ${status}. Esperando ${Math.round(delay)}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error(`[GrokClient] Se agotaron los ${MAX_RETRIES} reintentos.`);
  }

  private async logCallToDatabase(
    caseId: string,
    result: LLMCallResult,
  ): Promise<void> {
    try {
      await db.insert(llmCalls).values({
        id: `llm_${randomUUID()}`,
        caseId,
        model: result.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        cachedTokens: result.usage.cachedTokens,
        totalTokens: result.usage.totalTokens,
        latencyMs: result.latencyMs,
        cost: result.cost,
        finishReason: result.finishReason,
      });
    } catch (dbError) {
      // Si la base de datos falla al auditar, no interrumpimos la respuesta pero emitimos advertencia
      console.error(
        "[GrokClient] Advertencia: No se pudo registrar la llamada en llm_calls:",
        dbError,
      );
    }
  }
}

// Instancia única exportada (Singleton)
export const grokClient = new GrokClient();
