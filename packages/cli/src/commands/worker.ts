import { runAutonomousPatrolCycle, type SubagentPatrolEvent } from "@mint/daemon";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";

export interface WorkerOptions {
  interval?: number;
  companyId?: string;
}

export async function workerCommand(options: WorkerOptions = {}) {
  const session = await getSession();
  const companyId = options.companyId || session?.companyId || "comp_default";
  const intervalSec = options.interval || 15;

  console.clear();
  console.log(
    drawCard(
      [
        `${theme.dim("Empresa:")}         ${theme.cyanBold(session?.companyName || companyId)}`,
        `${theme.dim("Modo:")}            Operación Autónoma 24/7 (Living Employee)`,
        `${theme.dim("Subagentes:")}      Inventario, Logística y Flota, Compras, Ingesta`,
        `${theme.dim("Frecuencia:")}      Patrulla continua cada ${intervalSec} segundos`,
        `${theme.dim("Supervisión:")}     Gobernanza RBAC / Propuestas en /inbox`,
      ],
      {
        title: "MINT TRABAJADOR AUTONOMO // CENTRO DE OPERACIONES",
        badge: "ACTIVO EN VIVO",
        badgeColor: "mint",
        borderColor: theme.mint,
      },
    ),
  );

  console.log(theme.dim("\n  Transmisión de patrullas multi-agente en tiempo real. Presiona Ctrl+C para pausar.\n"));
  console.log(theme.dim("  " + "─".repeat(84)));

  let isRunning = true;
  const abortController = new AbortController();

  const handleExit = () => {
    if (!isRunning) return;
    isRunning = false;
    console.log(theme.amberBold("\n\n  [PAUSA] Trabajador autónomo detenido de forma segura.\n"));
    abortController.abort();
    process.exit(0);
  };

  process.on("SIGINT", handleExit);
  process.on("SIGTERM", handleExit);

  const formatAgentBadge = (agent: string) => {
    switch (agent) {
      case "INVENTARIO":
        return theme.badge("INVENTARIO", "cyan");
      case "LOGISTICA":
        return theme.badge("LOGISTICA ", "violet");
      case "COMPRAS":
        return theme.badge("COMPRAS   ", "mint");
      case "INGESTA":
        return theme.badge("INGESTA   ", "gray");
      default:
        return theme.badge("AGENTE    ", "gray");
    }
  };

  const formatLevel = (level: "INFO" | "WARN" | "CRITICAL") => {
    if (level === "CRITICAL") return theme.redBold("[CRITICO]");
    if (level === "WARN") return theme.amberBold("[ALERTA] ");
    return theme.dim("[PATRULLA]");
  };

  const executePatrol = async () => {
    if (!isRunning) return;
    try {
      const events: SubagentPatrolEvent[] = await runAutonomousPatrolCycle(companyId);
      for (const ev of events) {
        const timeStr = new Date(ev.timestamp).toLocaleTimeString();
        console.log(
          `  ${theme.dim(`[${timeStr}]`)} ${formatAgentBadge(ev.agent)} ${formatLevel(ev.level)} ${ev.message}`,
        );
      }
      console.log(theme.dim("  " + "·".repeat(84)));
    } catch (err: any) {
      console.error(`  ${theme.redBold("[ERROR PATRULLA]")} ${err.message}`);
    }
  };

  // Primer ciclo inmediato
  await executePatrol();

  // Bucle continuo
  const timer = setInterval(async () => {
    if (!isRunning) {
      clearInterval(timer);
      return;
    }
    await executePatrol();
  }, intervalSec * 1000);

  // Mantener el proceso vivo
  await new Promise<void>(() => {});
}
