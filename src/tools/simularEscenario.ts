import { z } from "zod";

export const simularEscenarioSchema = z.object({
  producto_id: z.string().describe("ID del producto a simular (ej. 'prod_st200')"),
  incremento_demanda_porcentaje: z.number().min(-100).max(500).default(50)
    .describe("Porcentaje de aumento proyectado en la demanda/ventas (ej. 50 para +50%)."),
  retraso_proveedor_dias: z.number().min(0).max(90).default(0)
    .describe("Días adicionales de retraso del proveedor en entregar producto."),
});

export type SimularEscenarioInput = z.infer<typeof simularEscenarioSchema>;

export async function executeSimularEscenario(args: SimularEscenarioInput) {
  try {
    const { getStockByProduct } = await import("../services/inventoryService");
    const stockInfo = await getStockByProduct(args.producto_id);

    if (stockInfo.isFuzzyMatch) {
      return {
        isSuccess: false,
        message: `Producto '${args.producto_id}' no encontrado.`,
        suggestions: stockInfo.suggestions,
      };
    }

    const currentStock = stockInfo.currentStock ?? 0;
    const minStock = stockInfo.minStock ?? 10;

    // Supuesto de consumo promedio diario estimado = minStock / 5
    const consumoDiarioBase = Math.max(1, Math.ceil(minStock / 5));
    const factorDemanda = 1 + args.incremento_demanda_porcentaje / 100;
    const consumoDiarioSimulado = Math.round(consumoDiarioBase * factorDemanda);

    const diasHastaAgotamiento = Math.floor(currentStock / consumoDiarioSimulado);
    const diasRiesgoConRetraso = Math.max(0, diasHastaAgotamiento - args.retraso_proveedor_dias);

    const fechaAgotamientoProyectada = new Date();
    fechaAgotamientoProyectada.setDate(fechaAgotamientoProyectada.getDate() + diasRiesgoConRetraso);

    const requiereReabastecimientoUrgente = diasRiesgoConRetraso <= 7;
    const unidadesSugeridasAComprar = Math.max(minStock * 2, (15 - diasRiesgoConRetraso) * consumoDiarioSimulado);

    return {
      isSuccess: true,
      simulacion: {
        productoId: stockInfo.productId,
        productoNombre: stockInfo.productName,
        stockActual: currentStock,
        parametrosSimulacion: {
          incrementoDemanda: `+${args.incremento_demanda_porcentaje}%`,
          retrasoProveedorDias: `${args.retraso_proveedor_dias} días`,
          consumoDiarioSimulado: `${consumoDiarioSimulado} unidades/día`,
        },
        resultadosProyectados: {
          diasUtilesRestantes: diasRiesgoConRetraso,
          fechaAgotamientoEstimada: fechaAgotamientoProyectada.toISOString().split("T")[0],
          riesgoDesabastecimiento: requiereReabastecimientoUrgente ? "ALTO" : "MODERADO",
        },
        recomendacionAgente: requiereReabastecimientoUrgente
          ? `ALERTA DE ESCENARIO: El stock se agotará en ${diasRiesgoConRetraso} días. Se recomienda generar inmediatamente una orden de compra por ${unidadesSugeridasAComprar} unidades.`
          : `Escenario controlado. El stock soportará la demanda simulada durante ${diasRiesgoConRetraso} días.`,
      },
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: `Error ejecutando la simulación de escenario: ${(error as Error).message}`,
    };
  }
}
