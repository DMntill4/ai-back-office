import { describe, it, expect } from "vitest";
import {
  runAutonomousPatrolCycle,
  patrolInventory,
  patrolLogistics,
  patrolPurchasing,
  patrolDataSources,
  type SubagentPatrolEvent,
} from "@mint/daemon";

describe("Autonomous 24/7 Worker Subagent Patrols", () => {
  const companyId = "comp_test_patrol";

  it("Individual subagent patrol functions return valid patrol events without throwing", async () => {
    const invEv = await patrolInventory(companyId);
    expect(invEv).toBeDefined();
    expect(invEv.agent).toBe("INVENTARIO");
    expect(["INFO", "WARN", "CRITICAL"]).toContain(invEv.level);
    expect(typeof invEv.message).toBe("string");
    expect(invEv.message.length).toBeGreaterThan(0);

    const logEv = await patrolLogistics(companyId);
    expect(logEv).toBeDefined();
    expect(logEv.agent).toBe("LOGISTICA");
    expect(["INFO", "WARN", "CRITICAL"]).toContain(logEv.level);
    expect(typeof logEv.message).toBe("string");
    expect(logEv.message.length).toBeGreaterThan(0);

    const compEv = await patrolPurchasing(companyId);
    expect(compEv).toBeDefined();
    expect(compEv.agent).toBe("COMPRAS");
    expect(["INFO", "WARN", "CRITICAL"]).toContain(compEv.level);
    expect(typeof compEv.message).toBe("string");
    expect(compEv.message.length).toBeGreaterThan(0);

    const ingEv = await patrolDataSources(companyId);
    expect(ingEv).toBeDefined();
    expect(ingEv.agent).toBe("INGESTA");
    expect(["INFO", "WARN", "CRITICAL"]).toContain(ingEv.level);
    expect(typeof ingEv.message).toBe("string");
    expect(ingEv.message.length).toBeGreaterThan(0);
  });

  it("runAutonomousPatrolCycle executes a coordinated round returning all 4 subagent events", async () => {
    const events: SubagentPatrolEvent[] = await runAutonomousPatrolCycle(companyId);

    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBe(4);

    const agents = events.map((e) => e.agent);
    expect(agents).toContain("INVENTARIO");
    expect(agents).toContain("LOGISTICA");
    expect(agents).toContain("COMPRAS");
    expect(agents).toContain("INGESTA");

    for (const ev of events) {
      expect(ev.timestamp).toBeDefined();
      expect(typeof ev.timestamp).toBe("string");
      expect(ev.message).toBeDefined();
      expect(typeof ev.message).toBe("string");
      expect(["INFO", "WARN", "CRITICAL"]).toContain(ev.level);
    }
  });

  it("Patrol event messages contain zero emojis and maintain professional back-office format", async () => {
    const events = await runAutonomousPatrolCycle(companyId);
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;

    for (const ev of events) {
      expect(emojiRegex.test(ev.message)).toBe(false);
    }
  });
});
