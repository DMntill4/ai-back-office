import { z } from "zod";
import { getHojaDeRuta } from "../services/freightDispatchService";

export const consultarHojaDeRutaSchema = z.object({
  query: z
    .string()
    .describe("Numero de guia de rastreo (ej. 'TRK-PL892-001'), placa del camion o nombre del vehiculo a consultar"),
});

export type ConsultarHojaDeRutaInput = z.infer<typeof consultarHojaDeRutaSchema>;

export async function executeConsultarHojaDeRuta(
  args: ConsultarHojaDeRutaInput,
  context?: { companyId?: string },
) {
  const companyId = context?.companyId || "comp_default";
  try {
    return await getHojaDeRuta(companyId, args.query);
  } catch (error: any) {
    return {
      isSuccess: false,
      message: `Error al consultar hoja de ruta: ${error.message}`,
    };
  }
}
