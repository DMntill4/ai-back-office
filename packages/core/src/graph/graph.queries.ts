import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../db/client";
import {
  cases,
  companies,
  decisions,
  inventory,
  products,
  purchaseOrders,
  policyRules,
  salesHistory,
  shipments,
  supplierProducts,
  suppliers,
  warehouses,
} from "../db/schema";
import { agentRegistry } from "../agent/registry/agentRegistry";
import { getObsidianVaultPath } from "../services/obsidianMemoryService";
import { BASE_AGENT_PERMISSIONS } from "../security/agentPermissionsMatrix";
import { toMintGraphNodeId, type MintGraphEdge, type MintGraphNode } from "./graph.types";

type IdLookup = Map<string, string>;

function findEntityId(value: unknown, keys: Set<string>, depth = 0): string | undefined {
  if (!value || typeof value !== "object" || depth > 5) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findEntityId(item, keys, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (keys.has(key) && (typeof nested === "string" || typeof nested === "number")) {
      return String(nested);
    }
  }
  for (const nested of Object.values(value)) {
    const found = findEntityId(nested, keys, depth + 1);
    if (found) return found;
  }
  return undefined;
}

function agentNodeId(roleName: string): string {
  const normalized = roleName.toLowerCase().replace(/^(?:agent[_-])|(?:[_-]?agent|specialist)$/g, "");
  const roleAliases: Record<string, string> = {
    coordinador: "orchestrator",
    orquestador: "orchestrator",
    inventory: "inventario",
    purchasing: "compras",
    procurement: "compras",
    logistics: "logistica",
    transporte: "logistica",
    audit: "auditoria",
  };
  const role = roleAliases[normalized] ?? normalized;
  return toMintGraphNodeId("agent", role);
}

async function readMarkdownFiles(root: string): Promise<Array<{ filePath: string; content: string }>> {
  const files: Array<{ filePath: string; content: string }> = [];
  const visit = async (directory: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        files.push({ filePath: fullPath, content: await readFile(fullPath, "utf8") });
      }
    }
  };
  await visit(root);
  return files;
}

/**
 * Construye el grafo únicamente con filas de la empresa y notas existentes del vault.
 * Un vault inexistente es válido; los errores de PostgreSQL o de lectura se propagan.
 */
export async function fetchRawGraphEntities(companyId: string): Promise<{
  nodes: MintGraphNode[];
  edges: MintGraphEdge[];
}> {
  const [
    companyRows,
    warehouseRows,
    productRows,
    supplierRows,
    inventoryRows,
    supplierProductRows,
    purchaseOrderRows,
    decisionRows,
    caseRows,
    ruleRows,
    shipmentRows,
    salesRows,
    vaultPath,
    enabledAgentConfigs,
  ] = await Promise.all([
    db.select().from(companies).where(eq(companies.id, companyId)).limit(1),
    db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(suppliers).where(eq(suppliers.companyId, companyId)),
    db.select().from(inventory).where(eq(inventory.companyId, companyId)),
    db.select().from(supplierProducts).where(eq(supplierProducts.companyId, companyId)),
    db.select().from(purchaseOrders).where(eq(purchaseOrders.companyId, companyId)),
    db.select().from(decisions).where(eq(decisions.companyId, companyId)).orderBy(desc(decisions.createdAt)),
    db.select().from(cases).where(eq(cases.companyId, companyId)).orderBy(desc(cases.createdAt)),
    db.select().from(policyRules).where(eq(policyRules.companyId, companyId)),
    db.select().from(shipments).where(eq(shipments.companyId, companyId)),
    db.select().from(salesHistory).where(and(eq(salesHistory.companyId, companyId), gte(salesHistory.saleDate, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))),
    getObsidianVaultPath(companyId),
    agentRegistry.getEnabledAgentsForCompany(companyId),
  ]);
  const company = companyRows[0];
  const nodes: MintGraphNode[] = [];
  const edges: MintGraphEdge[] = [];
  const nodeIds = new Set<string>();
  const edgeKeys = new Set<string>();
  const warehouseIds: IdLookup = new Map();
  const warehouseNames: IdLookup = new Map();
  const productIds: IdLookup = new Map();
  const supplierIds: IdLookup = new Map();
  const purchaseOrderIds: IdLookup = new Map();
  const caseIds: IdLookup = new Map();
  const decisionIds: IdLookup = new Map();

  const addNode = (node: MintGraphNode): void => {
    if (nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push(node);
  };
  const addEdge = (source: string | undefined, target: string | undefined, relation: MintGraphEdge["relation"]): void => {
    if (!source || !target || source === target || !nodeIds.has(source) || !nodeIds.has(target)) return;
    const key = `${source}\u0000${target}\u0000${relation}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ id: `edge_${edges.length + 1}`, source, target, relation });
  };

  const resolvedCasesToday = caseRows.filter((item) =>
    item.status === "resuelto" &&
    item.updatedAt.toDateString() === new Date().toDateString(),
  ).length;
  addNode({
    id: "agent_orchestrator",
    type: "agent",
    label: "MINT Orchestrator",
    sublabel: "Coordinador de tareas y políticas",
    status: "idle",
    metadata: { role: "orchestrator" },
  });
  for (const agentConfig of enabledAgentConfigs) {
    const agent = agentConfig.agent;
    const id = toMintGraphNodeId("agent", agent.contract.role);
    addNode({
      id,
      type: "agent",
      label: agent.contract.name,
      sublabel: agent.contract.description,
      status: agentConfig.isEnabled ? "idle" : "warning",
      metadata: {
        role: agent.contract.role,
        enabled: agentConfig.isEnabled,
        toolsEnabled: agent.contract.allowedTools,
        acceptedTasks: agent.contract.acceptedTasks,
        permissions: BASE_AGENT_PERMISSIONS[agent.contract.role],
        resolvedCasesToday,
      },
    });
  }

  for (const warehouse of warehouseRows) {
    const id = toMintGraphNodeId("wh", warehouse.id);
    warehouseIds.set(warehouse.id, id);
    warehouseNames.set(warehouse.id, warehouse.name);
    addNode({
      id,
      type: "warehouse",
      label: warehouse.name,
      sublabel: [warehouse.city, warehouse.state].filter(Boolean).join(", ") || warehouse.location || undefined,
      status: "active",
      metadata: {
        company: company?.name,
        city: warehouse.city,
        address: warehouse.streetAddress,
        latitude: warehouse.latitude,
        longitude: warehouse.longitude,
      },
    });
  }

  const inventoryByProduct = new Map<string, typeof inventoryRows>();
  for (const row of inventoryRows) {
    const list = inventoryByProduct.get(row.productId) ?? [];
    list.push(row);
    inventoryByProduct.set(row.productId, list);
  }
  const salesByProduct = new Map<string, number>();
  for (const row of salesRows) {
    salesByProduct.set(row.productId, (salesByProduct.get(row.productId) ?? 0) + row.quantity);
  }
  const productIdsBySku = new Map(productRows.map((product) => [product.sku, toMintGraphNodeId("sku", product.id)]));
  const casesById = new Map(caseRows.map((item) => [item.id, item]));
  const ordersById = new Map(purchaseOrderRows.map((order) => [order.id, order]));
  const activeOrdersBySupplier = new Map<string, number>();
  const offerLeadTimeBySupplier = new Map<string, { total: number; count: number }>();
  const shipmentStatsBySupplier = new Map<string, { total: number; delivered: number }>();
  const ordersByCase = new Map<string, typeof purchaseOrderRows>();
  const shipmentsByOrder = new Map<string, typeof shipmentRows>();
  for (const order of purchaseOrderRows) {
    if (order.caseId) {
      const orders = ordersByCase.get(order.caseId) ?? [];
      orders.push(order);
      ordersByCase.set(order.caseId, orders);
    }
    if (order.status === "abierta") {
      activeOrdersBySupplier.set(order.supplierId, (activeOrdersBySupplier.get(order.supplierId) ?? 0) + 1);
    }
  }
  for (const offer of supplierProductRows) {
    const stats = offerLeadTimeBySupplier.get(offer.supplierId) ?? { total: 0, count: 0 };
    stats.total += offer.leadTimeDays;
    stats.count += 1;
    offerLeadTimeBySupplier.set(offer.supplierId, stats);
  }
  for (const shipment of shipmentRows) {
    const order = shipment.purchaseOrderId ? ordersById.get(shipment.purchaseOrderId) : undefined;
    if (!order) continue;
    const linkedShipments = shipmentsByOrder.get(order.id) ?? [];
    linkedShipments.push(shipment);
    shipmentsByOrder.set(order.id, linkedShipments);
    const stats = shipmentStatsBySupplier.get(order.supplierId) ?? { total: 0, delivered: 0 };
    stats.total += 1;
    if (shipment.status === "entregado") stats.delivered += 1;
    shipmentStatsBySupplier.set(order.supplierId, stats);
  }

  for (const product of productRows) {
    const id = toMintGraphNodeId("sku", product.id);
    productIds.set(product.id, id);
    const stocks = inventoryByProduct.get(product.id) ?? [];
    const currentStock = stocks.reduce((total, row) => total + row.stock, 0);
    const minStock = product.minStock;
    const stockByWarehouse = stocks.map((row) => ({
      warehouseName: warehouseNames.get(row.warehouseId) ?? row.warehouseId,
      stock: row.stock,
    }));
    addNode({
      id,
      type: "sku",
      label: product.sku,
      sublabel: product.name,
      status: currentStock <= minStock ? "warning" : "active",
      metadata: {
        productId: product.id,
        sku: product.sku,
        currentStock,
        minStock,
        price: product.price,
        costPrice: product.costPrice,
        category: product.category,
        origin: product.origin,
        stockByWarehouse,
        averageDailyConsumption: Number(((salesByProduct.get(product.id) ?? 0) / 30).toFixed(2)),
      },
    });
  }

  for (const supplier of supplierRows) {
    const id = toMintGraphNodeId("supp", supplier.id);
    supplierIds.set(supplier.id, id);
    const shipmentStats = shipmentStatsBySupplier.get(supplier.id);
    const leadTimeStats = offerLeadTimeBySupplier.get(supplier.id);
    addNode({
      id,
      type: "supplier",
      label: supplier.name,
      sublabel: [supplier.city, supplier.state].filter(Boolean).join(", ") || undefined,
      status: "active",
      metadata: {
        supplierId: supplier.id,
        email: supplier.email,
        phone: supplier.phone,
        city: supplier.city,
        origin: supplier.origin,
        activeOrders: activeOrdersBySupplier.get(supplier.id) ?? 0,
        reliabilityPct: shipmentStats
          ? Number(((shipmentStats.delivered / shipmentStats.total) * 100).toFixed(1))
          : undefined,
        averageLeadTimeDays: leadTimeStats
          ? Number((leadTimeStats.total / leadTimeStats.count).toFixed(1))
          : undefined,
      },
    });
  }

  for (const order of purchaseOrderRows) {
    const id = toMintGraphNodeId("po", order.id);
    purchaseOrderIds.set(order.id, id);
    addNode({
      id,
      type: "purchase_order",
      label: `Orden ${order.id}`,
      sublabel: order.status,
      status: order.status === "abierta" ? "warning" : "active",
      metadata: { quantity: order.quantity, unitPrice: order.unitPrice, totalAmount: order.totalAmount, status: order.status },
    });
  }

  for (const item of caseRows) {
    const id = toMintGraphNodeId("case", item.id);
    caseIds.set(item.id, id);
    addNode({
      id,
      type: "case",
      label: item.title,
      sublabel: item.resultSummary ?? item.status,
      status: item.status === "en_proceso" ? "running" : item.status === "escalado" ? "warning" : "idle",
      metadata: { caseId: item.id, status: item.status, priority: item.priority, createdAt: item.createdAt.toISOString() },
    });
  }

  for (const decision of decisionRows) {
    const id = toMintGraphNodeId("dec", decision.id);
    decisionIds.set(decision.id, id);
    const relatedCase = casesById.get(decision.caseId);
    addNode({
      id,
      type: "decision",
      label: decision.title,
      sublabel: decision.policyDecision,
      status: decision.policyDecision === "pending_approval" ? "warning" : decision.policyDecision === "rejected" || decision.policyDecision === "blocked" ? "warning" : "active",
      metadata: {
        decisionId: decision.id,
        caseId: decision.caseId,
        costCop: decision.costMxn,
        riskScore: decision.riskScore,
        policyDecision: decision.policyDecision,
        policyReason: decision.policyReason,
        proposingAgent: decision.proposingAgent,
        ...(relatedCase
          ? {
              caseCost: relatedCase.totalCost,
              caseTotalTokens: relatedCase.totalTokens,
              casePromptTokens: relatedCase.promptTokens,
              caseCompletionTokens: relatedCase.completionTokens,
            }
          : {}),
      },
    });
  }

  for (const shipment of shipmentRows) {
    const id = toMintGraphNodeId("ship", shipment.id);
    addNode({
      id,
      type: "shipment",
      label: shipment.trackingNumber,
      sublabel: `${shipment.carrier} · ${shipment.status}`,
      status: shipment.status === "retrasado" ? "warning" : shipment.status === "entregado" || shipment.status === "cancelado" ? "idle" : "active",
      metadata: {
        shipmentId: shipment.id,
        carrier: shipment.carrier,
        status: shipment.status,
        currentLocation: shipment.currentLocation,
        destination: shipment.destinationLocation,
      },
    });
  }

  for (const rule of ruleRows) {
    addNode({
      id: toMintGraphNodeId("rule", rule.id),
      type: "document",
      label: rule.ruleType,
      sublabel: rule.action,
      status: rule.isActive ? "active" : "idle",
      metadata: {
        ruleId: rule.id,
        conditions: rule.conditions,
        active: rule.isActive,
        createdAt: rule.createdAt.toISOString(),
      },
    });
  }

  for (const row of inventoryRows) {
    addEdge(warehouseIds.get(row.warehouseId), productIds.get(row.productId), "belongs_to");
  }
  for (const offer of supplierProductRows) {
    addEdge(supplierIds.get(offer.supplierId), productIds.get(offer.productId), "supplies");
  }
  for (const order of purchaseOrderRows) {
    const orderId = purchaseOrderIds.get(order.id);
    addEdge(orderId, supplierIds.get(order.supplierId), "depends_on");
    addEdge(orderId, productIds.get(order.productId), "modifies");
    addEdge(orderId, caseIds.get(order.caseId ?? ""), "belongs_to");
  }
  for (const shipment of shipmentRows) {
    const shipmentId = toMintGraphNodeId("ship", shipment.id);
    addEdge(purchaseOrderIds.get(shipment.purchaseOrderId ?? ""), shipmentId, "depends_on");
  }
  for (const decision of decisionRows) {
    const decisionId = decisionIds.get(decision.id);
    addEdge(decisionId, caseIds.get(decision.caseId), "belongs_to");
    const proposedBy = agentNodeId(decision.proposingAgent);
    addEdge(proposedBy, decisionId, "generates");
    const productId = findEntityId(
      [decision.evidencePayload, decision.riskPayload, casesById.get(decision.caseId)?.inputData],
      new Set(["productId", "targetProductId", "product_id", "producto_id", "sku"]),
    );
    if (productId) addEdge(decisionId, productIds.get(productId) ?? productIdsBySku.get(productId), "modifies");
    const supplierId = findEntityId(
      [decision.evidencePayload, decision.riskPayload],
      new Set(["supplierId", "supplier_id", "proveedor_id"]),
    );
    if (supplierId) addEdge(decisionId, supplierIds.get(supplierId), "depends_on");
    for (const order of ordersByCase.get(decision.caseId) ?? []) {
      addEdge(decisionId, purchaseOrderIds.get(order.id), "modifies");
      for (const shipment of shipmentsByOrder.get(order.id) ?? []) {
        addEdge(decisionId, toMintGraphNodeId("ship", shipment.id), "modifies");
      }
    }
  }
  for (const item of caseRows) {
    const productId = findEntityId(item.inputData, new Set(["productId", "targetProductId", "product_id", "producto_id", "sku"]));
    const agent = findEntityId(item.inputData, new Set(["agentId", "agentRole", "proposingAgent"]));
    const caseId = caseIds.get(item.id);
    if (agent) addEdge(agentNodeId(agent), caseId, "queries");
    if (productId) {
      addEdge(
        caseId,
        productIds.get(productId) ?? productIdsBySku.get(productId),
        "modifies",
      );
    }
  }

  for (const agentConfig of enabledAgentConfigs) {
    const agent = agentConfig.agent;
    const agentId = toMintGraphNodeId("agent", agent.contract.role);
    if (agent.contract.role === "inventario") {
      for (const row of inventoryRows) {
        addEdge(agentId, warehouseIds.get(row.warehouseId), "queries");
        addEdge(agentId, productIds.get(row.productId), "queries");
      }
    } else if (agent.contract.role === "compras") {
      for (const offer of supplierProductRows) {
        addEdge(agentId, supplierIds.get(offer.supplierId), "queries");
        addEdge(agentId, productIds.get(offer.productId), "queries");
      }
    } else if (agent.contract.role === "logistica") {
      for (const shipment of shipmentRows) addEdge(agentId, toMintGraphNodeId("ship", shipment.id), "queries");
      for (const order of purchaseOrderRows) {
        if (shipmentsByOrder.has(order.id)) {
          addEdge(agentId, productIds.get(order.productId), "queries");
        }
      }
    }
  }
  for (const decision of decisionRows) {
    const productId = findEntityId(
      [decision.evidencePayload, decision.riskPayload, casesById.get(decision.caseId)?.inputData],
      new Set(["productId", "targetProductId", "product_id", "producto_id", "sku"]),
    );
    if (productId) addEdge(agentNodeId(decision.proposingAgent), productIds.get(productId) ?? productIdsBySku.get(productId), "queries");
  }

  const documents = await readMarkdownFiles(vaultPath);
  const labels = new Map<string, string>();
  for (const node of nodes) {
    labels.set(node.label.toLowerCase(), node.id);
    if (node.sublabel) labels.set(node.sublabel.toLowerCase(), node.id);
    labels.set(node.id.toLowerCase(), node.id);
  }
  const documentsByName = new Map<string, string>();
  for (const rule of ruleRows) {
    documentsByName.set(rule.ruleType.toLowerCase(), toMintGraphNodeId("rule", rule.id));
    labels.set(rule.id.toLowerCase(), toMintGraphNodeId("rule", rule.id));
    labels.set(rule.ruleType.toLowerCase(), toMintGraphNodeId("rule", rule.id));
  }
  for (const document of documents) {
    const relativePath = path.relative(vaultPath, document.filePath);
    const title = path.basename(document.filePath, path.extname(document.filePath));
    const id = toMintGraphNodeId("doc", relativePath);
    documentsByName.set(title.toLowerCase(), id);
    addNode({
      id,
      type: "document",
      label: title,
      sublabel: path.dirname(relativePath) === "." ? "Memoria operativa" : path.dirname(relativePath),
      status: "idle",
      metadata: { relativePath, sizeBytes: Buffer.byteLength(document.content, "utf8") },
    });
  }
  for (const document of documents) {
    const sourceId = documentsByName.get(path.basename(document.filePath, path.extname(document.filePath)).toLowerCase());
    if (!sourceId) continue;
    const links = document.content.matchAll(/\[\[(.*?)\]\]/g);
    for (const match of links) {
      const target = match[1].split("|")[0].trim().toLowerCase();
      const targetId = documentsByName.get(target) ?? labels.get(target);
      if (targetId) addEdge(sourceId, targetId, "documents");
    }
    const linkedCaseId = caseRows.find((item) => document.content.includes(item.id));
    if (linkedCaseId) addEdge(sourceId, caseIds.get(linkedCaseId.id), "documents");
    const linkedRule = ruleRows.find((rule) => document.content.includes(rule.id));
    if (linkedRule) addEdge(sourceId, toMintGraphNodeId("rule", linkedRule.id), "documents");
  }

  return { nodes, edges };
}
