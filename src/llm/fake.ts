import OpenAI from "openai";
import { LLMCallResult, LLMRequestOptions } from "./client";

export class FakeGrokClient {
  private cannedResponses: Map<string, Partial<LLMCallResult>> = new Map();
  public callsMade: LLMRequestOptions[] = [];

  setResponse(keywordOrPrefix: string, response: Partial<LLMCallResult>): void {
    this.cannedResponses.set(keywordOrPrefix, response);
  }

  async chatCompletion(options: LLMRequestOptions): Promise<LLMCallResult> {
    this.callsMade.push(options);

    const userMessage = options.messages
      .filter((m: any) => m.role === "user")
      .map((m: any) => m.content)
      .join(" ");

    // Buscar si hay una respuesta pregrabada
    for (const [key, canned] of this.cannedResponses.entries()) {
      if (typeof userMessage === "string" && userMessage.includes(key)) {
        return this.buildResult(canned, options.model || "fake-grok");
      }
    }

    // Respuesta por defecto simulada
    return this.buildResult(
      {
        content: "Respuesta simulada por el cliente falso (sin costo real).",
      },
      options.model || "fake-grok",
    );
  }

  private buildResult(
    partial: Partial<LLMCallResult>,
    model: string,
  ): LLMCallResult {
    const content = partial.content ?? "Simulated response";
    return {
      message: {
        role: "assistant",
        content,
        refusal: null,
      } as OpenAI.Chat.Completions.ChatCompletionMessage,
      content,
      toolCalls: partial.toolCalls,
      model,
      finishReason: partial.finishReason ?? "stop",
      usage: partial.usage ?? {
        promptTokens: 15,
        completionTokens: 10,
        cachedTokens: 0,
        totalTokens: 25,
      },
      latencyMs: partial.latencyMs ?? 50,
      cost: partial.cost ?? "0.000050",
    };
  }

  reset(): void {
    this.cannedResponses.clear();
    this.callsMade = [];
  }
}

export const fakeGrokClient = new FakeGrokClient();
