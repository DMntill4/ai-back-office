import { z } from "zod";
import { trackShipments } from "../services/shipmentService";

export const consultarEnviosSchema = z.object({
  numero_rastreo: z
    .string()
    .optional()
    .describe("Número de guía o tracking del envío (ej. 'TRK-FEDEX-88902' o 'TRK-IN-...')"),
  orden_id: z
    .string()
    .optional()
    .describe("ID de la orden de compra asociada (ej. 'po_001')"),
});

export type ConsultarEnviosInput = z.infer<typeof consultarEnviosSchema>;

export async function executeConsultarEnvios(
  args: ConsultarEnviosInput,
  context?: { companyId?: string },
) {
  try {
    const result = await trackShipments({
      trackingNumber: args.numero_rastreo,
      orderId: args.orden_id,
      companyId: context?.companyId,
    });

    return {
      isSuccess: true,
      message: result.message,
      total: result.total,
      data: result.shipments,
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: `Error al consultar envíos logísticos: ${(error as Error).message}`,
      canRetry: true,
    };
  }
}
