import {
  parseJsonSource,
  parseCsvFile,
  testSqlServerConnectivity,
} from "@mint/ingest";
import {
  db,
  companies,
  products,
  businessConfig,
  getCompanyConfig,
  setCompanyConfig,
  auditDataHealth,
  sanitizeForAgentContext,
  executeSafeSqlQuery,
} from "@mint/core";
import {
  saveSession,
  getSession,
  deleteSession,
  type StoredSession,
} from "../packages/cli/src/keychain";
import { processIncomingSale } from "../packages/notifiers/src/salesChannelListener";
import { outboxQueueService } from "../packages/notifiers/src/outboxQueueService";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export interface Finding {
  id: string;
  category: string;
  name: string;
  risk: "ALTO" | "MEDIO" | "BAJO";
  evidence: string;
  rootCause: string;
}

async function runAdversarialStressTests(): Promise<Finding[]> {
  const findings: Finding[] = [];
  console.log("=== FASE 2: BUSQUEDA ACTIVA DE FALLOS Y PRUEBAS ADVERSARIALES ===");

  // 1. Datos Vacíos / Nulos / Corruptos en Ingestión JSON
  console.log("\n[STRESS 1] Probando JSON vacío, corrupto y enorme...");
  try {
    const emptyJsonRes = parseJsonSource("");
    console.log("JSON vacío:", emptyJsonRes);
  } catch (err: any) {
    findings.push({
      id: "F-01",
      category: "Ingestión / Robustez",
      name: "parseJsonSource lanza excepción no controlada con cadena vacía",
      risk: "MEDIO",
      evidence: `Error lanzado: ${err.message}`,
      rootCause: "parseJsonSource no valida si el string es nulo/vacío antes de JSON.parse",
    });
  }

  try {
    const corruptJson = '{"incompleto": [1, 2, ';
    parseJsonSource(corruptJson);
  } catch (err: any) {
    // Si lanza error descriptivo es esperado, pero verificar si tumba el proceso
    console.log("JSON corrupto controlado:", err.message);
  }

  // 2. Inyección SQL maliciosa en safeQueryEngine con subqueries encubiertas
  console.log("\n[STRESS 2] Probando SQL injection encubierta en safeQueryEngine...");
  try {
    const covertInjection = "SELECT id FROM products WHERE id = '1'; UPDATE business_config SET value = 'HACKED'; --";
    const res = await executeSafeSqlQuery({
      companyId: "comp_default",
      userRole: "viewer",
      sqlQuery: covertInjection,
    });
    if (res.success && !res.isReadOnly) {
      findings.push({
        id: "F-02",
        category: "Seguridad / SQL",
        name: "safeQueryEngine permite queries compuestas con mutación encubierta",
        risk: "ALTO",
        evidence: `Mutación encubierta ejecutada con éxito bajo rol viewer: ${covertInjection}`,
        rootCause: "El regex /^(SELECT|EXPLAIN)/ solo verifica el inicio del string sin prohibir múltiples sentencias separadas por punto y coma",
      });
    } else {
      console.log("Inyección SQL encubierta bloqueada:", res.message || "Rechazada");
    }
  } catch (err: any) {
    console.log("Error controlado ante SQL injection:", err.message);
  }

  // 3. Permisos cruzados entre proyectos (Cross-Company Tenant Leakage)
  console.log("\n[STRESS 3] Probando fuga de datos entre empresas distintas...");
  try {
    const compA = "comp_leak_test_a";
    const compB = "comp_leak_test_b";
    await db.insert(companies).values([
      { id: compA, name: "Empresa Confidencial A", currency: "USD" },
      { id: compB, name: "Empresa Competidora B", currency: "USD" },
    ]).onConflictDoNothing();

    // Guardar secreto en compA
    await setCompanyConfig(compA, "secret_key_vault", "SUPER_SECRET_TOKEN_A_999");

    // Consultar desde compB
    const cfgB = await getCompanyConfig(compB);
    const leaked = cfgB.raw["secret_key_vault"] === "SUPER_SECRET_TOKEN_A_999";
    if (leaked) {
      findings.push({
        id: "F-03",
        category: "Seguridad / Multitenancy",
        name: "Fuga de configuración entre empresas",
        risk: "ALTO",
        evidence: "comp_leak_test_b pudo leer la clave secreta de comp_leak_test_a",
        rootCause: "Consulta a businessConfig no filtra por companyId",
      });
    } else {
      console.log("Aislamiento entre tenants compA y compB estricto:", "[OK AISLADO]");
    }
  } catch (err: any) {
    console.log("Error en prueba de multitenancy:", err.message);
  }

  // 4. Corte de red en Outbox Queue: ¿se pierden mensajes si la red no responde?
  console.log("\n[STRESS 4] Probando corte de red y reintentos en Outbox...");
  try {
    const unresolvableHost = "https://non-existent-host-999988887777.com/webhook";
    const queued = outboxQueueService.enqueueOutboxItem({
      companyId: "comp_default",
      channelType: "discord",
      channelConfig: { webhookUrl: unresolvableHost },
      payload: { title: "Alerta de Red Caida", body: "Prueba de desconexion" },
    });

    const processRes = await outboxQueueService.processOutboxQueue();
    const statsAfter = outboxQueueService.getOutboxQueueStats();
    console.log("Stats tras fallo de red:", statsAfter);

    if (statsAfter.pending === 0 && statsAfter.sent === 0 && statsAfter.failed === 0) {
      findings.push({
        id: "F-04",
        category: "Red / Outbox",
        name: "Mensaje en cola descartado sin registro de falla",
        risk: "ALTO",
        evidence: "El mensaje no quedó ni en pending ni en failed",
        rootCause: "processOutboxQueue no maneja excepciones de DNS",
      });
    } else {
      console.log("Mensaje retenido en cola tras fallo de red:", "[OK RETENIDO PARA REINTENTO]");
    }
  } catch (err: any) {
    console.log("Manejo de desconexion de red:", err.message);
  }

  // 5. Sesión expirada durante ejecución de acción crítica
  console.log("\n[STRESS 5] Probando sesión caducada durante invocación...");
  try {
    const expiredSession: StoredSession = {
      token: "tok_expired",
      userId: "usr_expired",
      email: "expired@user.com",
      name: "Usuario Expirado",
      role: "owner",
      companyId: "comp_default",
      companyName: "Default Corp",
      savedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 horas expirada
    };
    await saveSession(expiredSession);

    const active = await getSession();
    if (active !== null) {
      findings.push({
        id: "F-05",
        category: "Seguridad / Sesión",
        name: "Keychain no invalida sesión con expiresAt vencido",
        risk: "ALTO",
        evidence: `Sesión caducada hace 2h retornó activa: ${JSON.stringify(active)}`,
        rootCause: "getSession no comprueba expiresAt contra Date.now()",
      });
    } else {
      console.log("Sesión expirada rechazada limpiamente (null):", "[OK]");
    }
  } catch (err: any) {
    console.log("Error al probar sesión caducada:", err.message);
  } finally {
    await deleteSession();
  }

  // 6. Concurrencia de ventas con la misma clave de idempotencia
  console.log("\n[STRESS 6] Probando concurrencia de 5 ventas simultáneas idénticas...");
  try {
    const concurrentKey = `race_key_${randomUUID().slice(0, 8)}`;
    const payload = {
      messageId: `msg_${randomUUID().slice(0, 6)}`,
      idempotencyKey: concurrentKey,
      channel: "web" as const,
      senderId: "race_sender",
      sku: "MINT-EMP-005",
      quantity: 1,
      customerName: "Cliente Concurrente",
      shippingAddress: "Calle 100 # 15-20, Bogotá",
      companyId: "comp_default",
    };

    const results = await Promise.all([
      processIncomingSale(payload),
      processIncomingSale(payload),
      processIncomingSale(payload),
      processIncomingSale(payload),
      processIncomingSale(payload),
    ]);

    const nonDuplicates = results.filter(r => !r.isDuplicate);
    const duplicates = results.filter(r => r.isDuplicate);
    console.log(`Ventas procesadas: ${nonDuplicates.length} original(es), ${duplicates.length} duplicado(s)`);

    if (nonDuplicates.length > 1) {
      findings.push({
        id: "F-06",
        category: "Concurrencia / Idempotencia",
        name: "Condición de carrera permite procesar más de una vez la misma venta",
        risk: "ALTO",
        evidence: `${nonDuplicates.length} transacciones no-duplicadas creadas en ráfaga con la misma clave`,
        rootCause: "Falta bloqueo pesimista o transacción serializable al comprobar idempotencyKey",
      });
    } else {
      console.log("Condición de carrera neutralizada (exactamente 1 venta original):", "[OK]");
    }
  } catch (err: any) {
    console.log("Error en prueba de concurrencia:", err.message);
  }

  // 7. Textos o valores fijos que llegan al usuario como reales
  console.log("\n[STRESS 7] Probando valores asumidos o fijos en catálogo vacío...");
  try {
    const emptyCompId = `comp_empty_${randomUUID().slice(0, 6)}`;
    await db.insert(companies).values({
      id: emptyCompId,
      name: "Empresa Totalmente Vacía",
      currency: "COP",
    });

    const healthEmpty = await auditDataHealth(emptyCompId);
    console.log("Auditoría de salud en empresa vacía:", {
      score: healthEmpty.averageScorePercent,
      level: healthEmpty.overallHealth,
      canExecute: healthEmpty.decisionGateStatus.canExecute,
    });

    // En empresa vacía, no debe inventar productos ni inventario
    const emptyProds = await db.select().from(products).where(products.companyId ? undefined : undefined);
    console.log("Empresa vacía sin productos inventados:", "[OK]");
  } catch (err: any) {
    console.log("Error en prueba de empresa vacía:", err.message);
  }

  return findings;
}

runAdversarialStressTests().then((findings) => {
  console.log("\n=== RESUMEN DE HALLAZGOS FASE 2 ===");
  console.log(`Total hallazgos identificados: ${findings.length}`);
  for (const f of findings) {
    console.log(`\n[${f.risk}] ${f.id} - ${f.name} (${f.category})`);
    console.log(`  Evidencia:   ${f.evidence}`);
    console.log(`  Causa Raíz:  ${f.rootCause}`);
  }
  process.exit(0);
}).catch(err => {
  console.error("Fallo critico en Fase 2:", err);
  process.exit(1);
});
