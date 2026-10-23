import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export interface DaemonState {
  pid: number | null;
  isRunning: boolean;
  isPaused: boolean;
  startedAt: string | null;
  lastTickAt: string | null;
  companyId: string;
  watchedPaths: string[];
  stats: {
    ticksCount: number;
    eventsFired: number;
    casesOpened: number;
    filesProcessed: number;
  };
}

const MINT_DIR = path.join(os.homedir(), ".mint");
const STATE_FILE = path.join(MINT_DIR, "daemon.json");

function ensureMintDir() {
  if (!fs.existsSync(MINT_DIR)) {
    fs.mkdirSync(MINT_DIR, { recursive: true });
  }
}

export function getDefaultState(companyId: string = "comp_default"): DaemonState {
  return {
    pid: null,
    isRunning: false,
    isPaused: false,
    startedAt: null,
    lastTickAt: null,
    companyId,
    watchedPaths: [],
    stats: {
      ticksCount: 0,
      eventsFired: 0,
      casesOpened: 0,
      filesProcessed: 0,
    },
  };
}

export function readDaemonState(): DaemonState {
  ensureMintDir();
  if (!fs.existsSync(STATE_FILE)) {
    return getDefaultState();
  }
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return getDefaultState();
  }
}

export function writeDaemonState(state: DaemonState): void {
  ensureMintDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export function pauseDaemon(): DaemonState {
  const state = readDaemonState();
  state.isPaused = true;
  writeDaemonState(state);
  return state;
}

export function resumeDaemon(): DaemonState {
  const state = readDaemonState();
  state.isPaused = false;
  writeDaemonState(state);
  return state;
}

export function isProcessRunning(pid: number | null): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
