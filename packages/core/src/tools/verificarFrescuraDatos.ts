import { z } from "zod";
import { checkDataFreshness } from "../services/dataFreshnessService";

export const verificarFrescuraSchema = z.object({
  horas_limite: z
    .number()
    .optional()
    .describe("Horas máximas de antigüedad toleradas para considerar los datos vigentes (por defecto: 24)."),
});

/**
 * Tool para que el agente verifique la frescura de los datos externos antes de recomendar o ejecutar acciones.
 */
export async function executeVerificarFrescuraDatos(
  args: z.infer<typeof verificarFrescuraSchema>,
  companyId = "comp_default"
) {
  const result = await checkDataFreshness(companyId, args.horas_limite ?? 24);

  return {
    fresco: result.isFresh,
    estado_general: result.status,
    total_fuentes: result.totalSources,
    fuentes_sanas: result.healthySources,
    fuentes_desactualizadas: result.staleSources,
    fuentes_esquema_cambiado: result.driftedSources,
    horas_desde_ultima_sync: result.hoursSinceLastSync,
    ultima_sincronizacion: result.newestSyncAt ? result.newestSyncAt.toISOString() : null,
    diagnostico: result.reason,
    recomendacion: result.isFresh
      ? "Los datos están al día. Proceda con decisiones operativas normales."
      : "ADVERTENCIA: Datos desfasados o con cambio de esquema. El agente debe solicitar sincronización o escalar a un supervisor humano.",
  };
}
