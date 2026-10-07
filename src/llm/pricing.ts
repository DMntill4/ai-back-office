// Tarifas de referencia por 1,000,000 de tokens (actualizables según el gateway)
export interface ModelPricing {
  promptCostPerMillion: number;
  completionCostPerMillion: number;
  cachedCostPerMillion: number;
}

export const DEFAULT_PRICING: Record<string, ModelPricing> = {
  "grok-4.6": {
    promptCostPerMillion: 2.0, // $2 USD por 1M tokens de entrada
    completionCostPerMillion: 10.0, // $10 USD por 1M tokens de salida
    cachedCostPerMillion: 0.5, // $0.5 USD por 1M tokens en caché
  },
  default: {
    promptCostPerMillion: 2.0,
    completionCostPerMillion: 10.0,
    cachedCostPerMillion: 0.5,
  },
};

/**
 * Calcula el costo estimado de una llamada en formato decimal de alta precisión (string)
 */
export function calculateCallCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
  cachedTokens = 0,
): string {
  const rates = DEFAULT_PRICING[model] || DEFAULT_PRICING.default;

  // Los tokens no cacheados son los tokens de prompt menos los cacheados
  const uncachedPromptTokens = Math.max(0, promptTokens - cachedTokens);

  const promptCost =
    (uncachedPromptTokens / 1_000_000) * rates.promptCostPerMillion;
  const cachedCost = (cachedTokens / 1_000_000) * rates.cachedCostPerMillion;
  const completionCost =
    (completionTokens / 1_000_000) * rates.completionCostPerMillion;

  const totalCost = promptCost + cachedCost + completionCost;

  // Representación exacta con 6 decimales para evitar problemas de coma flotante
  return totalCost.toFixed(6);
}
