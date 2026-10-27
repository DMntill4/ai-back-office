import fs from "node:fs";
import path from "node:path";
import { type NotificationPayload, type SendResult, type ChannelType } from "./types";
import { adapters } from "./adapters";
import { randomUUID } from "node:crypto";

export interface OutboxQueueItem {
  id: string;
  companyId: string;
  channelType: ChannelType;
  channelConfig: Record<string, any>;
  payload: NotificationPayload;
  status: "pending" | "processing" | "sent" | "failed" | "dead_letter";
  retryCount: number;
  maxRetries: number;
  nextRetryAt: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

const QUEUE_FILE_PATH = path.resolve(process.cwd(), "vault", "outbox_queue.json");

function ensureQueueDir() {
  const dir = path.dirname(QUEUE_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadQueue(): OutboxQueueItem[] {
  try {
    if (!fs.existsSync(QUEUE_FILE_PATH)) return [];
    const content = fs.readFileSync(QUEUE_FILE_PATH, "utf8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function saveQueue(queue: OutboxQueueItem[]) {
  try {
    ensureQueueDir();
    fs.writeFileSync(QUEUE_FILE_PATH, JSON.stringify(queue, null, 2), "utf8");
  } catch (err: any) {
    console.warn(`[OUTBOX_QUEUE] Error al persistir cola: ${err.message}`);
  }
}

/**
 * Encola una notificación fallida para reintento con backoff exponencial
 */
export function enqueueOutboxItem(params: {
  companyId: string;
  channelType: ChannelType;
  channelConfig: Record<string, any>;
  payload: NotificationPayload;
  error?: string;
}): OutboxQueueItem {
  const queue = loadQueue();
  const id = `outbox_${randomUUID().slice(0, 8)}`;
  const now = Date.now();

  const item: OutboxQueueItem = {
    id,
    companyId: params.companyId,
    channelType: params.channelType,
    channelConfig: params.channelConfig,
    payload: params.payload,
    status: "pending",
    retryCount: 0,
    maxRetries: 5,
    nextRetryAt: now + 5000, // Primer reintento en 5 segundos
    lastError: params.error,
    createdAt: now,
    updatedAt: now,
  };

  queue.push(item);
  saveQueue(queue);
  return item;
}

/**
 * Procesa los elementos pendientes de la cola cuyo tiempo de reintento ha llegado
 */
export async function processOutboxQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const queue = loadQueue();
  const now = Date.now();
  let succeeded = 0;
  let failed = 0;
  let processed = 0;

  for (const item of queue) {
    if (item.status !== "pending" && item.status !== "failed") continue;
    if (item.nextRetryAt > now) continue;

    processed++;
    const adapter = adapters[item.channelType];
    if (!adapter) {
      item.status = "dead_letter";
      item.lastError = `Adaptador no disponible para ${item.channelType}`;
      item.updatedAt = now;
      failed++;
      continue;
    }

    try {
      const res: SendResult = await adapter.send(item.payload, item.channelConfig);
      if (res.success) {
        item.status = "sent";
        item.updatedAt = now;
        succeeded++;
      } else {
        item.retryCount++;
        item.lastError = res.error || "Fallo sin mensaje";
        item.updatedAt = now;

        if (item.retryCount >= item.maxRetries) {
          item.status = "dead_letter";
        } else {
          item.status = "failed";
          // Backoff exponencial: 10s, 30s, 90s, 270s...
          const backoffSec = Math.min(600, Math.pow(3, item.retryCount) * 10);
          item.nextRetryAt = now + backoffSec * 1000;
        }
        failed++;
      }
    } catch (err: any) {
      item.retryCount++;
      item.lastError = err.message;
      item.updatedAt = now;
      if (item.retryCount >= item.maxRetries) {
        item.status = "dead_letter";
      } else {
        item.status = "failed";
        item.nextRetryAt = now + 15000;
      }
      failed++;
    }
  }

  saveQueue(queue);
  return { processed, succeeded, failed };
}

/**
 * Obtiene métricas y conteo de la cola persistente
 */
export function getOutboxQueueStats(): {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  deadLetter: number;
} {
  const queue = loadQueue();
  return {
    total: queue.length,
    pending: queue.filter((i) => i.status === "pending").length,
    sent: queue.filter((i) => i.status === "sent").length,
    failed: queue.filter((i) => i.status === "failed").length,
    deadLetter: queue.filter((i) => i.status === "dead_letter").length,
  };
}

export const outboxQueueService = {
  enqueueOutboxItem,
  processOutboxQueue,
  getOutboxQueueStats,
};

