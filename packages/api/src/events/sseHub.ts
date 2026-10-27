import { FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "node:crypto";

export interface SseEvent {
  id: string;
  type: string;
  timestamp: string;
  caseId?: string;
  agent?: string;
  action?: string;
  details?: string;
  resultSummary?: string;
  payload?: any;
}

class SseHub {
  private clients: Set<FastifyReply> = new Set();
  private eventHistory: SseEvent[] = [];
  private maxHistorySize = 100;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Keepalive heartbeat every 15s to prevent timeouts
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 15000);
  }

  public registerClient(request: FastifyRequest, reply: FastifyReply) {
    const rawRes = reply.raw;

    // Headers for Server-Sent Events
    reply.hijack();
    rawRes.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    });

    this.clients.add(reply);

    // Send initial connected acknowledgement with recent event history
    const welcomeEvent: SseEvent = {
      id: `evt_${randomUUID().slice(0, 8)}`,
      type: "connected",
      timestamp: new Date().toISOString(),
      details: "Conexión en vivo establecida con la torre de control de Mint",
      payload: {
        activeClients: this.clients.size,
        historyCount: this.eventHistory.length,
      },
    };
    rawRes.write(`id: ${welcomeEvent.id}\nevent: ${welcomeEvent.type}\ndata: ${JSON.stringify(welcomeEvent)}\n\n`);

    // Stream recent events so client immediately catches up
    for (const pastEv of this.eventHistory.slice(-15)) {
      rawRes.write(`id: ${pastEv.id}\nevent: ${pastEv.type}\ndata: ${JSON.stringify(pastEv)}\n\n`);
    }

    request.raw.on("close", () => {
      this.clients.delete(reply);
    });

    request.raw.on("error", () => {
      this.clients.delete(reply);
    });
  }

  public broadcast(eventData: Omit<SseEvent, "id" | "timestamp"> & { id?: string; timestamp?: string }) {
    const event: SseEvent = {
      id: eventData.id || `evt_${randomUUID().slice(0, 8)}`,
      timestamp: eventData.timestamp || new Date().toISOString(),
      ...eventData,
    };

    // Append to in-memory ring buffer
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    const payload = `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

    for (const client of this.clients) {
      try {
        client.raw.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  public getRecentHistory(limit: number = 30): SseEvent[] {
    return this.eventHistory.slice(-limit);
  }

  public getActiveClientsCount(): number {
    return this.clients.size;
  }

  private sendHeartbeat() {
    for (const client of this.clients) {
      try {
        client.raw.write(`: keepalive\n\n`);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  public destroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clients.clear();
  }
}

export const sseHub = new SseHub();
