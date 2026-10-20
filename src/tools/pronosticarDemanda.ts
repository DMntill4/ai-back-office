import { z } from "zod";
import { calculateDemandForecast } from "../services/demandService";

export const pronosticarDemandaSchema = z.object({
  producto_id: z
    .string()
    .describe("ID del producto para calcular el pronóstico de demanda (ej. 'prod_st200')"),
  horizonte_dias: z
    .number()
    .int()
    .positive()
    .optional()
    .default(30)
    .describe("Horizonte de proyección en días (ej. 15, 30, 60). Por defecto 30 días"),
});

export type PronosticarDemandaInput = z.infer<typeof pronosticarDemandaSchema>;

export async function executePronosticarDemanda(
  args: PronosticarDemandaInput,
  context?: { companyId?: string },
) {
  try {
    const forecast = await calculateDemandForecast({
      productId: args.producto_id,
      horizonDays: args.horizonte_dias,
      companyId: context?.companyId,
    });

    return {
      isSuccess: true,
      message: `Pronóstico de demanda calculado para ${forecast.productName}.`,
      data: forecast,
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: `Error al calcular pronóstico de demanda: ${(error as Error).message}`,
      canRetry: true,
    };
  }
}
