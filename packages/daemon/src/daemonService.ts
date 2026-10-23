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

export interface DaemonTickSummary {
  timestamp: string;
  isPaused: boolean;
  stockDeficitsTriggered: number;
  shipmentDelaysTriggered: number;
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
    };
  }

  const [stockCount, shipmentCount] = await Promise.all([
    scanStockDeficits(companyId),
    scanDelayedShipments(companyId),
  ]);

  state.lastTickAt = timestamp;
  state.stats.ticksCount += 1;
  state.stats.eventsFired += stockCount + shipmentCount;
  writeDaemonState(state);

  return {
    timestamp,
    isPaused: false,
    stockDeficitsTriggered: stockCount,
    shipmentDelaysTriggered: shipmentCount,
  };
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
