import OpenAI from "openai";
import { env, getLlmApiKey } from "../config/env";
import { db } from "../db/client";
import { llmCalls } from "../db/schema";
import { randomUUID } from "node:crypto";

export interface LLMCallOptions {
  caseId?: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
  toolChoice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: any;
  model?: string;
}

export type LLMRequestOptions = LLMCallOptions;

export interface LLMCallResult {
  content: string | null;
  toolCalls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
  message: OpenAI.Chat.Completions.ChatCompletionMessage;
  usage: {
    promptTokens: number;
    completionTokens: number;
    cachedTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  cost: string;
  model: string;
  finishReason: string;
}

const PRICE_PER_1M_PROMPT = 2.0;
const PRICE_PER_1M_COMPLETION = 10.0;
const MAX_RETRIES = 3;

export class GrokClient {
  private client: OpenAI | null = null;
  private currentApiKey: string | null = null;
  private defaultModel: string;

  constructor() {
    this.defaultModel = env.GROK_MODEL || "grok-4.6";
  }

  private ensureClient(): OpenAI {
    const key = getLlmApiKey();
    if (!key) {
      throw new Error(
        "LLM no configurado: falta la API key (revisa .env). MINT no responde sin modelo real para no inventar.",
      );
    }
    if (!this.client || this.currentApiKey !== key) {
      this.currentApiKey = key;
      this.client = new OpenAI({
        apiKey: key,
        baseURL: env.GROK_BASE_URL,
      });
    }
    return this.client;
  }

  async listModels(): Promise<any[]> {
    const client = this.ensureClient();
    const list = await client.models.list();
    return list.data;
  }

  async chatCompletion(options: LLMCallOptions): Promise<LLMCallResult> {
    const client = this.ensureClient();
    const startTime = Date.now();

    const response = await this.executeWithRetry(() =>
      client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: options.messages,
        tools: options.tools,
        tool_choice: options.toolChoice,
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens,
        response_format: options.responseFormat,
      }),
    );

    const latencyMs = Date.now() - startTime;
    const choice = response.choices[0];
    const usage = response.usage;

    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    const cachedTokens =
      (usage as any)?.prompt_tokens_details?.cached_tokens ?? 0;
    const totalTokens = usage?.total_tokens ?? 0;

    const uncachedPromptTokens = Math.max(0, promptTokens - cachedTokens);
    // Tokens en caché tienen costo con descuento del 50%
    const promptCost = ((uncachedPromptTokens + cachedTokens * 0.5) / 1_000_000) * PRICE_PER_1M_PROMPT;
    const completionCost =
      (completionTokens / 1_000_000) * PRICE_PER_1M_COMPLETION;
    const totalCostUsd = (promptCost + completionCost).toFixed(6);

    const result: LLMCallResult = {
      content: choice.message.content,
      toolCalls: choice.message.tool_calls,
      message: choice.message,
      usage: {
        promptTokens,
        completionTokens,
        cachedTokens,
        totalTokens,
      },
      latencyMs,
      cost: totalCostUsd,
      model: response.model,
      finishReason: choice.finish_reason ?? "stop",
    };

    if (options.caseId) {
      this.logCallToDatabase(options.caseId, result).catch(() => {});
    }

    return result;
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
      try {
        attempt++;
        return await fn();
      } catch (error: any) {
        const status = error?.status;
        const isTransient = status === 429 || (status >= 500 && status < 600);

        if (!isTransient || attempt > MAX_RETRIES) {
          throw error;
        }

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
    } catch (dbError: any) {
      if (dbError?.code === "ECONNREFUSED" || dbError?.cause?.code === "ECONNREFUSED") {
        return;
      }
    }
  }
}

export const grokClient = new GrokClient();
