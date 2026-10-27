import {
  tickOnce,
  readDaemonState,
  writeDaemonState,
  pauseDaemon as pauseLocalDaemon,
  resumeDaemon as resumeLocalDaemon,
  type DaemonState,
  type DaemonTickSummary,
} from "@mint/daemon";
import { db, businessConfig } from "@mint/core";
import { eq } from "drizzle-orm";
import { sseHub } from "../events/sseHub";

class ApiDaemonRunner {
  private intervalTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isPaused = false;
  private companyId = "comp_default";
  private startedAt: string | null = null;
  private lastTickSummary: DaemonTickSummary | null = null;
  private ticksCount = 0;
  private eventsFired = 0;

  public async start(companyId: string = "comp_default") {
    this.companyId = companyId;
    if (this.isRunning) {
      return this.getStatus();
    }

    this.isRunning = true;
    this.isPaused = false;
    this.startedAt = new Date().toISOString();

    // Sincronizar estado local en ~/.mint/daemon.json
    try {
      const state = readDaemonState();
      state.isRunning = true;
      state.isPaused = false;
      state.pid = process.pid;
      state.companyId = this.companyId;
      state.startedAt = this.startedAt;
      writeDaemonState(state);
    } catch {}

    // Intentar sincronizar persistencia en PostgreSQL
    await this.persistStateToPostgres("ONLINE");

    sseHub.broadcast({
      type: "daemon_status",
      agent: "Daemon Autónomo [Vigilancia Operativa]",
      action: "start",
      details: `Motor autónomo iniciado en el proceso de la API (Ciclo de 30s).`,
      payload: { companyId: this.companyId, status: "ONLINE" },
    });

    // Ejecutar un primer tick inmediato
    this.tick().catch(() => null);

    // Ciclo periódico cada 30 segundos
    this.intervalTimer = setInterval(() => {
      this.tick().catch(() => null);
    }, 30000);

    return this.getStatus();
  }

  public async stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isRunning = false;

    try {
      const state = readDaemonState();
      state.isRunning = false;
      writeDaemonState(state);
    } catch {}

    await this.persistStateToPostgres("STOPPED");

    sseHub.broadcast({
      type: "daemon_status",
      agent: "Daemon Autónomo",
      action: "stop",
      details: "Motor autónomo detenido.",
      payload: { status: "STOPPED" },
    });

    return this.getStatus();
  }

  public async pause() {
    this.isPaused = true;
    try {
      pauseLocalDaemon();
    } catch {}
    await this.persistStateToPostgres("PAUSED");

    sseHub.broadcast({
      type: "daemon_status",
      agent: "Daemon Autónomo",
      action: "pause",
      details: "Ciclos de vigilancia pausados temporalmente por el operador.",
      payload: { status: "PAUSED" },
    });

    return this.getStatus();
  }

  public async resume() {
    this.isPaused = false;
    try {
      resumeLocalDaemon();
    } catch {}
    await this.persistStateToPostgres("ONLINE");

    sseHub.broadcast({
      type: "daemon_status",
      agent: "Daemon Autónomo",
      action: "resume",
      details: "Ciclos de vigilancia reanudados.",
      payload: { status: "ONLINE" },
    });

    return this.getStatus();
  }

  public async tick(): Promise<DaemonTickSummary> {
    if (this.isPaused) {
      const summary: DaemonTickSummary = {
        timestamp: new Date().toISOString(),
        isPaused: true,
        stockDeficitsTriggered: 0,
        shipmentDelaysTriggered: 0,
      };
      this.lastTickSummary = summary;
      return summary;
    }

    try {
      const summary = await tickOnce(this.companyId);
      this.lastTickSummary = summary;
      this.ticksCount++;
      const firedThisTick = summary.stockDeficitsTriggered + summary.shipmentDelaysTriggered;
      this.eventsFired += firedThisTick;

      // Persistir último tick en Postgres
      await this.persistStateToPostgres("ONLINE", summary);

      // Emitir evento por SSE a todos los observadores
      sseHub.broadcast({
        type: "daemon_tick",
        agent: "Daemon Autónomo [Vigilancia Operativa]",
        action: "tick",
        details: `Ciclo #${this.ticksCount} completado. Déficits de stock: ${summary.stockDeficitsTriggered}, Envíos demorados: ${summary.shipmentDelaysTriggered}`,
        resultSummary: firedThisTick > 0 ? `▲ ${firedThisTick} anomalías detectadas y propagadas a /inbox` : "Todo en orden (0 anomalías)",
        payload: summary,
      });

      return summary;
    } catch (err: any) {
      const errSummary: DaemonTickSummary = {
        timestamp: new Date().toISOString(),
        isPaused: false,
        stockDeficitsTriggered: 0,
        shipmentDelaysTriggered: 0,
      };
      this.lastTickSummary = errSummary;
      return errSummary;
    }
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      companyId: this.companyId,
      startedAt: this.startedAt,
      ticksCount: this.ticksCount,
      eventsFired: this.eventsFired,
      lastTick: this.lastTickSummary,
    };
  }

  private async persistStateToPostgres(status: string, tickSummary?: DaemonTickSummary) {
    try {
      const now = new Date().toISOString();
      await db
        .insert(businessConfig)
        .values([
          {
            companyId: this.companyId,
            key: "daemon_status",
            value: status,
            description: "Estado operativo del daemon en tiempo real",
          },
          {
            companyId: this.companyId,
            key: "daemon_last_heartbeat",
            value: now,
            description: "Último latido registrado del proceso autónomo",
          },
          {
            companyId: this.companyId,
            key: "daemon_ticks_total",
            value: String(this.ticksCount),
            description: "Cantidad acumulada de ciclos de inspección ejecutados",
          },
        ])
        .onConflictDoUpdate({
          target: [businessConfig.companyId, businessConfig.key],
          set: {
            value: status,
            updatedAt: new Date(),
          },
        });
    } catch {
      // Ignorar fallas si PostgreSQL no está conectado en el host local
    }
  }
}

export const apiDaemonRunner = new ApiDaemonRunner();
