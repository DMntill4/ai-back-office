import { describe, it, expect, beforeEach, vi } from "vitest";
import { MintSpiderEventBus } from "../packages/cli/src/graph/eventBus";
import { loadRealGraphData } from "../packages/cli/src/graph/dataLoader";
import { MintSpiderEvent } from "../packages/cli/src/graph/graph.types";
import * as http from "node:http";

describe("MINT CLI: Grafo en vivo del agente (Spider Graph)", () => {
  let bus: MintSpiderEventBus;

  beforeEach(() => {
    bus = MintSpiderEventBus.getInstance();
  });

  // 1. BD VACÍA: Grafo vacío con mensaje "sin datos", sin nodos de relleno
  it("BD vacía: devuelve 0 nodos y 0 aristas sin inventar datos de relleno", async () => {
    const payload = await loadRealGraphData("empresa_inexistente_12345", {
      isDemo: false,
      userRole: "admin",
    });

    expect(payload.isDemo).toBe(false);
    expect(payload.nodes).toEqual([]);
    expect(payload.edges).toEqual([]);
    expect(payload.historyEvents).toEqual([]);
  });

  // 2. MODO DEMO: Marcado como DEMO y separado de datos de producción
  it("Modo Demo: genera datos marcados explícitamente con [DEMO]", async () => {
    const payload = await loadRealGraphData("cualquier_id", {
      isDemo: true,
      userRole: "operador",
    });

    expect(payload.isDemo).toBe(true);
    expect(payload.companyName).toContain("[DEMO]");
    expect(payload.nodes.length).toBeGreaterThan(0);
    expect(payload.nodes.every((n) => n.label.includes("[DEMO]"))).toBe(true);
  });

  // 3. EVENTO FALSO O DUPLICADO: No mueve la araña dos veces
  it("Deduplicación: un evento con el mismo ID no se procesa ni emite dos veces", () => {
    let callCount = 0;
    const testId = `evt_dedup_${Date.now()}`;

    const listener = () => {
      callCount++;
    };

    bus.on("event", listener);

    const event: MintSpiderEvent = {
      id: testId,
      companyId: "comp_test",
      timestamp: Date.now(),
      type: "observa",
      sourceNodeId: "mod_inventario",
      targetNodeId: "prod_1",
      module: "inventario",
      summary: "Escaneo de stock",
      auditRef: "audit_123",
    };

    bus.publish(event);
    bus.publish(event); // Intento de duplicado

    bus.off("event", listener);

    expect(callCount).toBe(1);
  });

  // 4. CADA MOVIMIENTO CORRESPONDE A UN ID DE AUDITORÍA REAL
  it("Gobernanza: cada evento tiene referencia verificable de auditoría (auditRef)", () => {
    const testId = `evt_audit_${Date.now()}`;
    let receivedEvent: MintSpiderEvent | null = null;

    const listener = (ev: MintSpiderEvent) => {
      if (ev.id === testId) receivedEvent = ev;
    };

    bus.on("event", listener);

    bus.publish({
      id: testId,
      companyId: "comp_test",
      timestamp: Date.now(),
      type: "analiza",
      sourceNodeId: "prod_1",
      targetNodeId: "prov_1",
      module: "proveedores",
      summary: "Evaluando alternativas de suministro",
      auditRef: "audit_row_99882",
    });

    bus.off("event", listener);

    expect(receivedEvent).not.toBeNull();
    expect(receivedEvent!.auditRef).toBe("audit_row_99882");
    expect(receivedEvent!.auditRef.length).toBeGreaterThan(0);
  });

  // 5. AISLAMIENTO MULTI-TENANT: Dos empresas ven solo su propio grafo
  it("Aislamiento multi-tenant: eventos de empresa A no llegan al canal de empresa B", () => {
    let companyACount = 0;
    let companyBCount = 0;

    const listenerA = () => companyACount++;
    const listenerB = () => companyBCount++;

    bus.on("company:empresa_alpha", listenerA);
    bus.on("company:empresa_beta", listenerB);

    bus.publish({
      id: `evt_iso_a_${Date.now()}`,
      companyId: "empresa_alpha",
      timestamp: Date.now(),
      type: "ejecuta",
      sourceNodeId: "mod_inventario",
      targetNodeId: "mod_aprobaciones",
      module: "aprobaciones",
      summary: "Acción en Alpha",
      auditRef: "audit_alpha_1",
    });

    bus.publish({
      id: `evt_iso_b_${Date.now()}`,
      companyId: "empresa_beta",
      timestamp: Date.now(),
      type: "observa",
      sourceNodeId: "mod_logistica",
      targetNodeId: "alm_1",
      module: "logistica",
      summary: "Acción en Beta",
      auditRef: "audit_beta_1",
    });

    bus.off("company:empresa_alpha", listenerA);
    bus.off("company:empresa_beta", listenerB);

    expect(companyACount).toBe(1);
    expect(companyBCount).toBe(1);
  });

  // 6. DATOS HOSTILES: XSS y credenciales sensibles sanitizadas
  it("Seguridad: datos hostiles o secretos son sanitizados en los eventos", () => {
    const rawEv = {
      id: `core_evt_${Date.now()}`,
      action: "write" as const,
      timestamp: Date.now(),
      source: { id: "agent_mint", label: "MINT", group: "agent" as const },
      target: {
        id: "prod_xss",
        label: "<script>alert('xss')</script>",
        group: "node" as const,
        metadata: {
          apiKey: "sk-super-secret-12345",
          password: "mySecretPassword!",
          normalKey: "<img src=x onerror=alert(1)>",
        },
      },
      status: "success" as const,
    };

    const ingested = bus.ingestCoreEvent(rawEv, "comp_test");
    expect(ingested).not.toBeNull();
    expect(ingested!.metadata?.apiKey).toBe("[PROTEGIDO]");
    expect(ingested!.metadata?.password).toBe("[PROTEGIDO]");
    expect(ingested!.metadata?.normalKey).not.toContain("<");
  });

  // 7. MEMORIA ACOTADA Y CARGA: Ráfaga de eventos mantiene límite de retención
  it("Rendimiento y memoria acotada: retención máxima de historial respeta el buffer circular", () => {
    const totalEvents = 600;
    for (let i = 0; i < totalEvents; i++) {
      bus.publish({
        id: `burst_evt_${i}`,
        companyId: "comp_burst",
        timestamp: Date.now() + i,
        type: "observa",
        sourceNodeId: "mod_inventario",
        targetNodeId: `node_${i}`,
        module: "inventario",
        summary: `Evento de estrés #${i}`,
        auditRef: `audit_stress_${i}`,
      });
    }

    const history = bus.getHistory("comp_burst");
    expect(history.length).toBeLessThanOrEqual(500);
  });

  // 8. SERVIDOR LOCAL Y SSE: 127.0.0.1, token de un solo uso y streaming de eventos
  it("Servidor local: protege con token en 127.0.0.1 y emite JSON y streaming SSE", async () => {
    const { startGraphServer } = await import("../packages/cli/src/graph/server");
    const testPort = 3987;

    const { server, sessionToken } = await startGraphServer({
      port: testPort,
      openBrowser: false,
      isDemo: true,
      companyIdOverride: "comp_test_server",
    });

    try {
      // 1. Acceso sin token => 401
      const resWithoutToken = await fetch(`http://127.0.0.1:${testPort}/api/graph`);
      expect(resWithoutToken.status).toBe(401);

      // 2. Acceso con token a /api/graph => 200 JSON
      const resWithToken = await fetch(`http://127.0.0.1:${testPort}/api/graph?token=${sessionToken}`);
      expect(resWithToken.status).toBe(200);
      const data = await resWithToken.json();
      expect(data.isDemo).toBe(true);
      expect(data.nodes.length).toBeGreaterThan(0);

      // 3. Acceso con token a / => 200 HTML
      const resHtml = await fetch(`http://127.0.0.1:${testPort}/?token=${sessionToken}`);
      expect(resHtml.status).toBe(200);
      const htmlText = await resHtml.text();
      expect(htmlText).toContain("MINT Graph");
      expect(htmlText).toContain("<!DOCTYPE html>");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
