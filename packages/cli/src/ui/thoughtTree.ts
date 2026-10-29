import { theme } from "./theme";

export interface ThoughtStep {
  agent: string;
  action: string;
  details?: string;
  resultSummary?: string;
}

export function formatToolArguments(rawArgs?: string): string {
  if (!rawArgs) return "";
  try {
    const parsed = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
    if (typeof parsed !== "object" || parsed === null) return String(rawArgs);
    const entries = Object.entries(parsed)
      .filter(([k]) => k !== "companyId" && k !== "caseId")
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
    return entries.join(", ");
  } catch {
    return String(rawArgs).slice(0, 60);
  }
}

export function formatResultSummary(toolName: string, rawResult: any): string {
  if (!rawResult) return "Completado";
  if (typeof rawResult === "string") return rawResult.slice(0, 80);

  const res = rawResult.result ?? rawResult;

  if (toolName === "consultar_stock") {
    if (res.stock !== undefined) {
      return `Stock: ${res.stock} unids | ROP: ${res.reorderPoint ?? "N/A"} | Estado: ${res.status || "OK"}`;
    }
    if (Array.isArray(res.items)) {
      return `${res.items.length} productos consultados en PostgreSQL`;
    }
  }

  if (toolName === "evaluar_proveedores") {
    if (Array.isArray(res.cotizaciones) && res.cotizaciones.length > 0) {
      const best = res.cotizaciones[0];
      return `Mejor opción: ${best.supplierName || best.supplierId} ($${Number(best.unitCostMxn || best.unitPrice || 0).toLocaleString()} COP, ${best.leadTimeDays || best.deliveryDays || 2}d)`;
    }
    if (res.proveedorSeleccionado) {
      return `Proveedor: ${res.proveedorSeleccionado} | Costo: $${res.costoTotal} COP`;
    }
  }

  if (toolName === "calcular_ruta_logistica") {
    if (res.distanciaKm !== undefined) {
      return `OSRM: ${res.distanciaKm} km | ${res.duracionHoras}h | Flete: $${Number(res.costoEstimadoMxn || res.costoFlete || 0).toLocaleString()} COP`;
    }
  }

  if (toolName === "crear_orden_compra") {
    return `Propuesta encolada en /inbox (PO #${res.orderId || res.poId || "PO-PENDING"})`;
  }

  if (toolName === "auditar_anomalias") {
    return `${res.anomaliasDetectadas?.length ?? 0} anomalías detectadas en inventario`;
  }

  if (res.message) return String(res.message);
  if (res.summary) return String(res.summary);
  if (res.details) return typeof res.details === "string" ? res.details.slice(0, 80) : "OK";

  return "Operación ejecutada en base de datos";
}

/**
 * Render a sequence of deliberation steps into an ultra-clean Linux tree structure
 */
export function renderThoughtTree(steps: ThoughtStep[], coordinatorGoal?: string): string {
  if (steps.length === 0) return "";

  const lines: string[] = [];
  lines.push(`  ${theme.mintBold("[COORDINADOR]")} ${theme.smokeBold(coordinatorGoal || "Evaluando requerimiento y orquestando especialistas...")}`);

  steps.forEach((step, idx) => {
    const isLast = idx === steps.length - 1;
    const branchChar = isLast ? "└─" : "├─";
    const pipeChar = isLast ? "  " : "│ ";

    const agentTag = step.agent.includes("[") ? step.agent : `[${step.agent.toUpperCase()}]`;
    const cleanArgs = formatToolArguments(step.details);
    const argsStr = cleanArgs ? theme.dim(` (${cleanArgs})`) : "";

    lines.push(
      `  ${theme.charcoal(branchChar)} ${theme.cyanBold(agentTag)} ${theme.smoke(step.action)}${argsStr}`
    );

    if (step.resultSummary) {
      lines.push(
        `  ${theme.charcoal(pipeChar)}  ${theme.charcoal("└─")} ${theme.dim("SQL/API:")} ${theme.mint(step.resultSummary)}`
      );
    }
  });

  return lines.join("\n");
}
