/**
 * Cliente API unificado para comunicación Frontend <-> Backend (Fastify + Drizzle ORM + Supabase)
 * Soporta proxy de Vite relativo (/api) o URL absoluta configurada vía VITE_API_URL.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorMsg = `Error HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.error || errorJson.message) {
        errorMsg = errorJson.error || errorJson.message;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Salud del servidor
  getHealth: () => request<{ status: string; service: string; timestamp: string }>('/health'),

  // Diagnóstico y gestión de Base de Datos (Drizzle & Supabase)
  getDbStatus: () =>
    request<{
      success: boolean;
      data: {
        connected: boolean;
        provider: string;
        isSupabase: boolean;
        host: string;
        database: string;
        user: string;
        version: string;
        timestamp: string;
        latencyMs: number;
        tablesCount: number;
        tables: Array<{ name: string; count: number }>;
        supabaseApi: {
          isConfigured: boolean;
          url: string | null;
          hasServiceKey: boolean;
          hasAnonKey: boolean;
          fullUrl?: string | null;
          restUrl?: string | null;
          projectRef?: string | null;
          hasClient?: boolean;
        };
        error?: string;
      };
    }>('/api/db/status'),

  getDbTables: () =>
    request<{
      success: boolean;
      tables: Array<{ name: string; columnCount: number; rowCount: number }>;
    }>('/api/db/tables'),

  getDbTableRows: (tableName: string) =>
    request<{
      success: boolean;
      tableName: string;
      totalReturned: number;
      data: any[];
    }>(`/api/db/table/${encodeURIComponent(tableName)}`),

  testDbConnection: (connectionString: string) =>
    request<{
      success: boolean;
      database?: string;
      user?: string;
      latencyMs: number;
      isSupabase?: boolean;
      error?: string;
    }>('/api/db/test-connection', {
      method: 'POST',
      body: JSON.stringify({ connectionString }),
    }),

  runDbMigrate: () =>
    request<{ success: boolean; message: string }>('/api/db/migrate', {
      method: 'POST',
    }),

  runDbSeed: () =>
    request<{ success: boolean; message: string }>('/api/db/seed', {
      method: 'POST',
    }),

  uploadSql: (companyId: string, sqlContent: string, userId?: string) =>
    request<{
      success: boolean;
      message: string;
      realProductsInserted?: number;
      realProductsCount?: number;
      error?: string;
    }>('/api/setup/upload-sql', {
      method: 'POST',
      body: JSON.stringify({ companyId, sqlContent, userId }),
    }),

  // Inventario y Catálogo de Productos (Drizzle)
  getProducts: (companyId = 'comp_default') =>
    request<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        sku: string;
        category: string;
        minStock: number;
        stock: number;
        isLowStock: boolean;
        origin: string;
      }>;
    }>(`/api/products?companyId=${encodeURIComponent(companyId)}`),

  // Actualizar stock directamente desde la UI de base de datos
  updateStock: (productId: string, stock: number, minStock?: number, companyId = 'comp_default') =>
    request<{
      success: boolean;
      message: string;
      alertTriggered?: boolean;
      alert?: any;
    }>(`/api/inventory/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      body: JSON.stringify({ stock, minStock, companyId }),
    }),

  // Casos Operativos Reales
  getCases: (companyId = 'comp_default') =>
    request<{
      success: boolean;
      data: Array<{
        id: string;
        title: string;
        agent: string;
        priority: 'Crítica' | 'Alta' | 'Media' | 'Baja';
        status: 'Revisión HITL' | 'Emitido' | 'Resuelto' | 'En Proceso';
        sla: string;
        totalCost: string;
        totalTokens: number;
        createdAt: string;
      }>;
    }>(`/api/cases?companyId=${encodeURIComponent(companyId)}`),

  // Órdenes de Compra Reales
  getOrders: (companyId = 'comp_default') =>
    request<{
      success: boolean;
      data: Array<{
        orderId: string;
        sku: string;
        productName: string;
        provider: string;
        amountMXN: string;
        humanApproved: boolean;
        status: 'Pendiente Firma' | 'Emitida' | 'En Tránsito' | 'Entregada';
        createdAt: string;
      }>;
    }>(`/api/orders?companyId=${encodeURIComponent(companyId)}`),

  // Telemetría de Dashboard
  getDashboard: (companyId = 'comp_default') =>
    request<{
      success: boolean;
      data: {
        performance: Array<{ name: string; uv: number }>;
        realProductsCount: number;
        lowStockCount?: number;
        inTransitShipments?: number;
        dailyReport: {
          totalOrders: number;
          automated: number;
          pendingReview: number;
          savings: number;
          spend: number;
          currency: string;
        };
      };
    }>(`/api/dashboard?companyId=${encodeURIComponent(companyId)}`),

  // Aprobaciones Human-in-the-Loop
  getApprovals: () =>
    request<{
      success: boolean;
      data: any[];
    }>('/api/approvals'),

  resolveApproval: (id: string, action: 'aprobado' | 'rechazado') =>
    request<{
      success: boolean;
      approval?: any;
    }>(`/api/approvals/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  // Seguimiento de Envíos
  getShipments: (companyId = 'comp_default', trackingNumber?: string, orderId?: string) => {
    const params = new URLSearchParams({ companyId });
    if (trackingNumber) params.append('trackingNumber', trackingNumber);
    if (orderId) params.append('orderId', orderId);
    return request<{
      success: boolean;
      total: number;
      shipments: any[];
      message: string;
    }>(`/api/shipments?${params.toString()}`);
  },

  // Pronóstico de Demanda
  getDemandForecast: (productId: string, horizonDays = 30, companyId = 'comp_default') =>
    request<{
      success: boolean;
      data: any;
    }>(`/api/demand/forecast/${encodeURIComponent(productId)}?horizonDays=${horizonDays}&companyId=${encodeURIComponent(companyId)}`),

  // Chat con el Agente ReAct
  sendChat: (message: string, companyId = 'comp_default', caseId?: string) =>
    request<{
      success: boolean;
      caseId: string;
      response: string;
      status: string;
      metrics?: {
        totalCostUsd: number;
        totalTokens: number;
        iterations: number;
      };
    }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, companyId, caseId }),
    }),

  getChatHistory: (companyId = 'comp_default') =>
    request<{
      success: boolean;
      history: Array<{
        id: string;
        role: 'user' | 'agent';
        text?: string;
        responseText?: string;
        status?: string;
        timestamp?: string;
        metrics?: {
          totalCostUsd?: string;
          totalTokens?: number;
        };
      }>;
    }>(`/api/chat/history?companyId=${encodeURIComponent(companyId)}`),

  // Alertas Proactivas
  getProactiveAlerts: () =>
    request<{
      success: boolean;
      total: number;
      alerts: any[];
    }>('/api/v1/alerts/proactive'),

  triggerAudit: () =>
    request<{
      success: boolean;
      alertasGeneradas: number;
      alertas: any[];
    }>('/api/v1/alerts/trigger-audit', {
      method: 'POST',
    }),

  // Usuarios Reales en PostgreSQL
  getUsers: (companyId?: string) =>
    request<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        companyId: string;
        companyName: string;
        setupCompleted: boolean;
        createdAt: string;
      }>;
    }>(`/api/users${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`),

  // Línea de Auditoría Inmutable Real
  getAuditEvents: (companyId = 'comp_default') =>
    request<{
      success: boolean;
      data: Array<{
        id: string;
        time: string;
        category: 'agent' | 'order' | 'db' | 'security';
        title: string;
        detail: string;
        createdAt: string;
      }>;
    }>(`/api/audit?companyId=${encodeURIComponent(companyId)}`),

  // ─────────────────────────────────────────────────────────────
  // MINT 2.0: DECISIONES MULTI-AGENTE & EVENT ENGINE
  // ─────────────────────────────────────────────────────────────
  getPendingDecisions: (companyId = 'comp_default') =>
    request<{
      success: boolean;
      data: Array<{
        id: string;
        caseId: string;
        title: string;
        actionType: string;
        proposingAgent: string;
        costMxn: number;
        riskScore: number;
        reversible: boolean;
        evidence: any;
        risk: any;
        policyReason: string;
        createdAt: string;
      }>;
    }>(`/api/decisions/pending?companyId=${encodeURIComponent(companyId)}`),

  resolveDecision: (id: string, action: 'approve' | 'reject', feedback?: string, approvedBy?: string) =>
    request<{
      success: boolean;
      orderId?: string;
      verified?: boolean;
      message: string;
    }>(`/api/decisions/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ action, feedback, approvedBy }),
    }),

  getLiveEvents: (companyId = 'comp_default') =>
    request<{
      success: boolean;
      data: Array<{
        id: string;
        companyId: string;
        eventType: string;
        severity: string;
        status: string;
        caseId?: string;
        title: string;
        description: string;
        payload: any;
        createdAt: string;
      }>;
    }>(`/api/events/live?companyId=${encodeURIComponent(companyId)}`),

  triggerEventScan: (companyId = 'comp_default') =>
    request<{
      success: boolean;
      stockDeficitsFound: number;
      delayedShipmentsFound: number;
      eventsTriggered: number;
      processedDecisions: string[];
    }>('/api/events/scan', {
      method: 'POST',
      body: JSON.stringify({ companyId }),
    }),

  getDailyBriefing: (companyId = 'comp_default') =>
    request<{
      success: boolean;
      data: {
        totalDecisions: number;
        autoExecutedCount: number;
        pendingReviewCount: number;
        blockedRiskCount: number;
        totalAutonomousSpendMxn: number;
        estimatedSavingsMxn: number;
        systemHealth: string;
      };
    }>(`/api/briefing/today?companyId=${encodeURIComponent(companyId)}`),
};
