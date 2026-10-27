import type { WebSocket } from "ws";
import { telemetryPublisher, AgentTelemetryEvent } from "@mint/core";

/**
 * WebSocket Telemetry Hub
 * Gestiona conexiones en vivo de clientes WebSocket nativos y retransmite
 * los eventos emitidos por el motor del agente en tiempo real.
 */
class WebSocketTelemetryHub {
  private clients: Set<WebSocket> = new Set();
  private isSubscribedToCore = false;

  constructor() {
    this.initCoreSubscription();
  }

  private initCoreSubscription() {
    if (this.isSubscribedToCore) return;

    telemetryPublisher.subscribe((event: AgentTelemetryEvent) => {
      this.broadcast(event);
    });

    this.isSubscribedToCore = true;
  }

  /**
   * Registra un nuevo socket cliente conectado
   */
  public registerClient(socket: WebSocket) {
    this.clients.add(socket);

    // 1. Mensaje de bienvenida y sincronización inicial
    const recentEvents = telemetryPublisher.getRecentEvents(40);
    const welcomeMsg = JSON.stringify({
      type: "connected",
      timestamp: Date.now(),
      activeClients: this.clients.size,
      historyCount: recentEvents.length,
      history: recentEvents,
    });

    try {
      socket.send(welcomeMsg);
    } catch {
      this.clients.delete(socket);
      return;
    }

    // 2. Manejo de mensajes entrantes del cliente
    socket.on("message", (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ping") {
          socket.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        } else if (msg.type === "request_history") {
          socket.send(
            JSON.stringify({
              type: "history",
              events: telemetryPublisher.getRecentEvents(60),
            })
          );
        }
      } catch {
        // Ignorar payloads no-JSON
      }
    });

    socket.on("close", () => {
      this.clients.delete(socket);
    });

    socket.on("error", () => {
      this.clients.delete(socket);
    });
  }

  /**
   * Difunde un evento de telemetría a todos los clientes WebSocket conectados
   */
  public broadcast(event: AgentTelemetryEvent) {
    const payload = JSON.stringify({
      type: "telemetry_event",
      event,
    });

    for (const client of this.clients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(payload);
        } catch {
          this.clients.delete(client);
        }
      } else {
        this.clients.delete(client);
      }
    }
  }

  public getActiveClientsCount(): number {
    return this.clients.size;
  }
}

export const wsTelemetryHub = new WebSocketTelemetryHub();
