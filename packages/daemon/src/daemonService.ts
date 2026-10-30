import * as path from "node:path";
import * as os from "node:os";
import {
  readDaemonState,
  writeDaemonState,
  getDefaultState,
  pauseDaemon as pauseState,
  resumeDaemon as resumeState,
  isProcessRunning,
  type DaemonState,
} from "./state";
import { scanStockDeficits, scanDelayedShipments, generateDailyPlan } from "./triggers";
import { watchDirectory, type FileChangeResult } from "./watcher";

import { mintOrchestrator } from "@mint/core";

export interface DaemonTickSummary {
  timestamp: string;
  isPaused: boolean;
  stockDeficitsTriggered: number;
  shipmentDelaysTriggered: number;
  recoveredEventsCount: number;
}

/**
 * Ejecuta un ciclo (tick) de vigilancia del daemon
 */
export async function tickOnce(companyId: string = "comp_default"): Promise<DaemonTickSummary> {
  const state = readDaemonState();
  const timestamp = new Date().toISOString();

  if (state.isPaused) {
    return {
      timestamp,
      isPaused: true,
      stockDeficitsTriggered: 0,
      shipmentDelaysTriggered: 0,
      recoveredEventsCount: 0,
    };
  }

  // 1. Escanear desabastos, retrasos viales y recuperar eventos operativos pendientes en PostgreSQL
  const [stockCount, shipmentCount, recoveredCount] = await Promise.all([
    scanStockDeficits(companyId),
    scanDelayedShipments(companyId),
    mintOrchestrator.processPendingOperationalEvents(companyId).catch(() => 0),
  ]);

  state.lastTickAt = timestamp;
  state.stats.ticksCount += 1;
  state.stats.eventsFired += stockCount + shipmentCount + recoveredCount;
  writeDaemonState(state);

  return {
    timestamp,
    isPaused: false,
    stockDeficitsTriggered: stockCount,
    shipmentDelaysTriggered: shipmentCount,
    recoveredEventsCount: recoveredCount,
  };
}

let activeTimer: NodeJS.Timeout | null = null;
let isLoopRunning = false;

/**
 * Inicia el bucle continuo del daemon (Vigilancia 24/7 sin chatbot)
 */
export async function startContinuousDaemon(options: {
  companyId?: string;
  intervalMs?: number;
  onTick?: (summary: DaemonTickSummary) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const companyId = options.companyId || "comp_default";
  const intervalMs = options.intervalMs || 15000;

  const state = readDaemonState();
  state.isRunning = true;
  state.pid = process.pid;
  state.companyId = companyId;
  state.startedAt = new Date().toISOString();
  writeDaemonState(state);

  isLoopRunning = true;

  const runTick = async () => {
    if (!isLoopRunning) return;
    try {
      const summary = await tickOnce(companyId);
      options.onTick?.(summary);
    } catch (err: any) {
      console.error(`[DAEMON] Error en ciclo continuo: ${err.message}`);
    }
  };

  // Ciclo inicial
  await runTick();

  return new Promise<void>((resolve) => {
    activeTimer = setInterval(async () => {
      if (!isLoopRunning || options.signal?.aborted) {
        stopDaemonLoop();
        resolve();
        return;
      }
      await runTick();
    }, intervalMs);

    options.signal?.addEventListener("abort", () => {
      stopDaemonLoop();
      resolve();
    });
  });
}

/**
 * Detiene el bucle continuo del daemon y limpia el estado de PID
 */
export function stopDaemonLoop(): void {
  isLoopRunning = false;
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
  const state = readDaemonState();
  state.isRunning = false;
  state.pid = null;
  writeDaemonState(state);
}

/**
 * Obtiene el estado enriquecido del daemon
 */
export function getDaemonStatus(): DaemonState & { activeProcess: boolean } {
  const state = readDaemonState();
  const active = isProcessRunning(state.pid);
  return {
    ...state,
    activeProcess: active,
  };
}

export { pauseState as pauseDaemon, resumeState as resumeDaemon };

