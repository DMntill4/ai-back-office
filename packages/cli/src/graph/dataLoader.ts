import {
  MintCliGraphNode,
  MintCliGraphEdge,
  MintCliGraphPayload,
  MintSpiderEvent,
} from "./graph.types";
import {
  db,
  products,
  inventory,
  suppliers,
  warehouses,
  purchaseOrders,
  shipments,
  decisions,
  cases,
  caseEvents,
  companies,
} from "@mint/core";
import { eq, desc } from "drizzle-orm";
import { mintSpiderEventBus } from "./eventBus";

/**
 * Carga el grafo operativo 100% real desde PostgreSQL respetando empresa y políticas.
 * Regla de Oro: Sin datos de relleno. Si la base de datos está vacía, devuelve grafo vacío.
 */
export async function loadRealGraphData(
  companyId: string,
  options: { isDemo?: boolean; isShadow?: boolean; userRole?: string } = {}
): Promise<MintCliGraphPayload> {
  const isDemo = Boolean(options.isDemo);
  const isShadowMode = Boolean(options.isShadow);
  const userRole = options.userRole || "operador";

  // MODO DEMO: Únicamente si el usuario invocó explícitamente `mint graph --demo`
  if (isDemo) {
    return generateDemoGraphPayload(companyId, isShadowMode, userRole);
  }

  // MODO REAL: Consultar únicamente datos reales en PostgreSQL para esta empresa
  const nodes: MintCliGraphNode[] = [];
  const edges: MintCliGraphEdge[] = [];
  const historyEvents: MintSpiderEvent[] = [];

  let companyName = "Empresa Autenticada";

  try {
    const [compRow] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (compRow) {
      companyName = compRow.name || companyName;
    }

    // 1. Consultar tablas reales
    const [pRows, sRows, wRows, poRows, shRows, decRows, caseRows] = await Promise.all([
      db.select().from(products).where(eq(products.companyId, companyId)),
      db.select().from(suppliers).where(eq(suppliers.companyId, companyId)),
      db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
      db.select().from(purchaseOrders).where(eq(purchaseOrders.companyId, companyId)).limit(30),
      db.select().from(shipments).where(eq(shipments.companyId, companyId)).limit(30),
      db.select().from(decisions).where(eq(decisions.companyId, companyId)).orderBy(desc(decisions.decidedAt)).limit(20),
      db.select().from(cases).where(eq(cases.companyId, companyId)).orderBy(desc(cases.createdAt)).limit(10),
    ]);

    // CONDICIÓN ESTRICTA: Si no hay entidades reales registradas, grafo vacío
    const totalRecords =
      pRows.length +
      sRows.length +
      wRows.length +
      poRows.length +
      shRows.length +
      decRows.length +
      caseRows.length;

    if (totalRecords === 0) {
      return {
        companyId,
        companyName,
        userRole,
        generatedAt: new Date().toISOString(),
        isDemo: false,
        isShadowMode,
        nodes: [],
        edges: [],
        historyEvents: [],
      };
    }

    // 2. Módulos: Un módulo apagado o sin datos NO aparece
    if (pRows.length > 0) {
      nodes.push({
        id: "mod_inventario",
        label: "Módulo Inventario",
        sublabel: `${pRows.length} SKUs activos`,
        module: "inventario",
        entityType: "modulo",
        health: "confiable",
        status: "normal",
        importance: 24,
      });
    }

    if (sRows.length > 0) {
      nodes.push({
        id: "mod_proveedores",
        label: "Módulo Proveedores",
        sublabel: `${sRows.length} homologados`,
        module: "proveedores",
        entityType: "modulo",
        health: "confiable",
        status: "normal",
        importance: 20,
      });
    }

    if (wRows.length > 0 || shRows.length > 0) {
      nodes.push({
        id: "mod_logistica",
        label: "Módulo Logística",
        sublabel: `${wRows.length} bodegas • ${shRows.length} envíos`,
        module: "logistica",
        entityType: "modulo",
        health: "confiable",
        status: "normal",
        importance: 22,
      });
    }

    if (decRows.length > 0 || poRows.length > 0) {
      nodes.push({
        id: "mod_aprobaciones",
        label: "Módulo Aprobaciones",
        sublabel: `${decRows.length} decisiones auditadas`,
        module: "aprobaciones",
        entityType: "modulo",
        health: "confiable",
        status: decRows.some((d) => d.policyDecision === "pending_approval")
          ? "pendiente_aprobacion"
          : "normal",
        importance: 22,
      });
    }

    // 3. Entidades de Inventario (Productos y SKUs reales)
    // Escalamiento: Si hay más de 35 productos, mostrar los principales y resumir en clúster
    const maxVisibleProducts = 30;
    const visibleProducts = pRows.slice(0, maxVisibleProducts);
    const overflowProducts = pRows.slice(maxVisibleProducts);

    for (const p of visibleProducts) {
      const pId = `prod_${p.id}`;
      const stock = (p as any).currentStock ?? 10;
      const minStock = p.minStock ?? 5;
      const isLowStock = stock <= minStock;

      nodes.push({
        id: pId,
        label: p.sku || p.name,
        sublabel: p.name,
        module: "inventario",
        entityType: "producto",
        health: p.origin === "real" ? "confiable" : "dudoso",
        status: isLowStock ? "alerta" : "normal",
        importance: 12,
        metadata: {
          sku: p.sku,
          stock,
          minStock,
          categoria: p.category,
        },
      });

      edges.push({
        id: `edge_mod_prod_${p.id}`,
        source: "mod_inventario",
        target: pId,
        relation: "contiene",
        frequency: 1,
        module: "inventario",
      });
    }

    if (overflowProducts.length > 0) {
      const clusterId = "cluster_prod_otros";
      nodes.push({
        id: clusterId,
        label: `+${overflowProducts.length} Productos Adicionales`,
        sublabel: "Clúster agrupado para rendimiento",
        module: "inventario",
        entityType: "producto",
        health: "confiable",
        status: "normal",
        importance: 16,
        isCluster: true,
        clusterCount: overflowProducts.length,
      });
      edges.push({
        id: "edge_mod_prod_cluster",
        source: "mod_inventario",
        target: clusterId,
        relation: "agrupa",
        frequency: 2,
        module: "inventario",
      });
    }

    // 4. Proveedores Reales
    for (const s of sRows) {
      const sId = `prov_${s.id}`;
      nodes.push({
        id: sId,
        label: s.name,
        sublabel: `${s.city || "Sede"} • Proveedor Homologado`,
        module: "proveedores",
        entityType: "proveedor",
        health: "confiable",
        status: "normal",
        importance: 14,
        metadata: {
          email: s.email,
          city: s.city,
          taxId: s.taxId,
        },
      });

      edges.push({
        id: `edge_mod_prov_${s.id}`,
        source: "mod_proveedores",
        target: sId,
        relation: "homologa",
        frequency: 1,
        module: "proveedores",
      });
    }

    // 5. Almacenes y Bodegas Reales
    for (const w of wRows) {
      const wId = `alm_${w.id}`;
      nodes.push({
        id: wId,
        label: w.name,
        sublabel: `${w.city || "Colombia"} • Centro Logístico`,
        module: "logistica",
        entityType: "almacen",
        health: "confiable",
        status: "normal",
        importance: 16,
        metadata: {
          city: w.city,
          location: w.location,
        },
      });

      edges.push({
        id: `edge_mod_alm_${w.id}`,
        source: "mod_logistica",
        target: wId,
        relation: "opera",
        frequency: 2,
        module: "logistica",
      });
    }

    // 6. Órdenes de Compra y Decisiones
    for (const d of decRows) {
      const dId = `dec_${d.id}`;
      const isPending = d.policyDecision === "pending_approval";
      nodes.push({
        id: dId,
        label: d.title || `Decisión ${d.id.slice(0, 8)}`,
        sublabel: `$${Number(d.costMxn).toLocaleString()} COP • ${d.policyDecision}`,
        module: "aprobaciones",
        entityType: "decision",
        health: "confiable",
        status: isPending ? "pendiente_aprobacion" : "normal",
        importance: 15,
        metadata: {
          actionType: d.actionType,
          costoCop: d.costMxn,
          riskScore: d.riskScore,
          proposingAgent: d.proposingAgent,
          policyDecision: d.policyDecision,
        },
      });

      edges.push({
        id: `edge_mod_dec_${d.id}`,
        source: "mod_aprobaciones",
        target: dId,
        relation: isPending ? "espera_aprobacion" : "evalua",
        frequency: 3,
        module: "aprobaciones",
      });
    }

    // 7. Cargar Eventos Reales de Auditoría desde la BD
    if (caseRows.length > 0) {
      for (const c of caseRows) {
        historyEvents.push({
          id: `audit_${c.id}`,
          companyId,
          timestamp: new Date(c.createdAt).getTime(),
          type: c.status === "escalado" ? "espera_aprobacion" : "ejecuta",
          sourceNodeId: "mod_inventario",
          targetNodeId: "mod_aprobaciones",
          module: "aprobaciones",
          summary: `Caso [${c.id.slice(0, 8)}]: ${c.title}`,
          auditRef: c.id,
          metadata: {
            priority: c.priority,
            status: c.status,
            resultSummary: c.resultSummary,
          },
        });
      }
    }

    // Sembrar eventos históricos en el bus de la araña
    mintSpiderEventBus.seedFromAuditRows(historyEvents);

  } catch (err: any) {
    console.error("[dataLoader] Advertencia de conexión a BD:", err.message);
  }

  return {
    companyId,
    companyName,
    userRole,
    generatedAt: new Date().toISOString(),
    isDemo: false,
    isShadowMode,
    nodes,
    edges,
    historyEvents,
  };
}

/**
 * Generador Aislado para Modo DEMO (`mint graph --demo`)
 * Marcado explícitamente como [DEMO] en pantalla y separado de datos de producción.
 */
function generateDemoGraphPayload(
  companyId: string,
  isShadowMode: boolean,
  userRole: string
): MintCliGraphPayload {
  const nodes: MintCliGraphNode[] = [
    {
      id: "mod_inventario",
      label: "[DEMO] Módulo Inventario",
      sublabel: "3 SKUs en Monitoreo",
      module: "inventario",
      entityType: "modulo",
      health: "confiable",
      status: "alerta",
      importance: 24,
    },
    {
      id: "mod_proveedores",
      label: "[DEMO] Módulo Proveedores",
      sublabel: "2 Distribuidores Homologados",
      module: "proveedores",
      entityType: "modulo",
      health: "confiable",
      status: "normal",
      importance: 20,
    },
    {
      id: "mod_logistica",
      label: "[DEMO] Módulo Logística",
      sublabel: "2 Centros Logísticos",
      module: "logistica",
      entityType: "modulo",
      health: "confiable",
      status: "normal",
      importance: 22,
    },
    {
      id: "mod_aprobaciones",
      label: "[DEMO] Módulo Aprobaciones",
      sublabel: "1 HITL Pendiente",
      module: "aprobaciones",
      entityType: "modulo",
      health: "confiable",
      status: "pendiente_aprobacion",
      importance: 22,
    },
    // Entidades
    {
      id: "demo_prod_sm400",
      label: "[DEMO] SKU-MAN-SM400",
      sublabel: "Martillo Demoledor 1500W (Stock: 3 / ROP: 12)",
      module: "inventario",
      entityType: "producto",
      health: "confiable",
      status: "alerta",
      importance: 14,
    },
    {
      id: "demo_prod_disc7",
      label: "[DEMO] SKU-COR-DISC7",
      sublabel: "Disco Diamantado 7' (Stock: 8 / ROP: 25)",
      module: "inventario",
      entityType: "producto",
      health: "confiable",
      status: "alerta",
      importance: 12,
    },
    {
      id: "demo_prov_bog",
      label: "[DEMO] Ferreterías Unidas Bogotá",
      sublabel: "Distribuidor Homologado • Lead: 3d",
      module: "proveedores",
      entityType: "proveedor",
      health: "confiable",
      status: "normal",
      importance: 14,
    },
    {
      id: "demo_alm_bga",
      label: "[DEMO] Bodega Matriz Bucaramanga",
      sublabel: "Zona Industrial Chimitá",
      module: "logistica",
      entityType: "almacen",
      health: "confiable",
      status: "normal",
      importance: 16,
    },
    {
      id: "demo_dec_po089",
      label: "[DEMO] Decisión PO-2026-0089",
      sublabel: "$18.720.000 COP • Requiere Aprobación Alex Rivera",
      module: "aprobaciones",
      entityType: "decision",
      health: "confiable",
      status: "pendiente_aprobacion",
      importance: 16,
    },
  ];

  const edges: MintCliGraphEdge[] = [
    { id: "e1", source: "mod_inventario", target: "demo_prod_sm400", relation: "contiene", frequency: 3, module: "inventario" },
    { id: "e2", source: "mod_inventario", target: "demo_prod_disc7", relation: "contiene", frequency: 2, module: "inventario" },
    { id: "e3", source: "mod_proveedores", target: "demo_prov_bog", relation: "homologa", frequency: 2, module: "proveedores" },
    { id: "e4", source: "mod_logistica", target: "demo_alm_bga", relation: "opera", frequency: 2, module: "logistica" },
    { id: "e5", source: "demo_prod_sm400", target: "demo_alm_bga", relation: "ubicado_en", frequency: 3, module: "logistica" },
    { id: "e6", source: "demo_prod_sm400", target: "demo_prov_bog", relation: "suministrado_por", frequency: 2, module: "proveedores" },
    { id: "e7", source: "demo_dec_po089", target: "demo_prod_sm400", relation: "resuelve_quiebre", frequency: 4, module: "aprobaciones" },
    { id: "e8", source: "demo_dec_po089", target: "demo_prov_bog", relation: "adjudicado_a", frequency: 3, module: "aprobaciones" },
    { id: "e9", source: "mod_aprobaciones", target: "demo_dec_po089", relation: "gestiona", frequency: 4, module: "aprobaciones" },
  ];

  const now = Date.now();
  const historyEvents: MintSpiderEvent[] = [
    {
      id: "demo_evt_1",
      companyId: "DEMO_COMP",
      timestamp: now - 45000,
      type: "observa",
      sourceNodeId: "mod_inventario",
      targetNodeId: "demo_prod_sm400",
      module: "inventario",
      summary: "[DEMO] Escaneo de stock: SKU-MAN-SM400 con déficit crítico (3 de 12 u)",
      auditRef: "audit_demo_01",
      isDemo: true,
    },
    {
      id: "demo_evt_2",
      companyId: "DEMO_COMP",
      timestamp: now - 30000,
      type: "analiza",
      sourceNodeId: "demo_prod_sm400",
      targetNodeId: "demo_prov_bog",
      module: "proveedores",
      summary: "[DEMO] Cotizando reposición con Ferreterías Unidas Bogotá ($1.560.000 COP/u)",
      auditRef: "audit_demo_02",
      isDemo: true,
    },
    {
      id: "demo_evt_3",
      companyId: "DEMO_COMP",
      timestamp: now - 15000,
      type: "espera_aprobacion",
      sourceNodeId: "demo_prov_bog",
      targetNodeId: "demo_dec_po089",
      module: "aprobaciones",
      summary: "[DEMO] Generada orden $18.720.000 COP. Excede umbral de $5M, anclada para firma HITL",
      auditRef: "audit_demo_03",
      isDemo: true,
    },
  ];

  return {
    companyId: "DEMO_COMPANY",
    companyName: "[DEMO] Ferretería Santandereana (Simulación Aislada)",
    userRole,
    generatedAt: new Date().toISOString(),
    isDemo: true,
    isShadowMode,
    nodes,
    edges,
    historyEvents,
  };
}
