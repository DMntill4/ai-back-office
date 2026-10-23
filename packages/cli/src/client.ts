import { getSession } from "./keychain";

const API_BASE = process.env.MINT_API_URL || "http://localhost:3001";

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const session = await getSession();
  const url = `${API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const errJson: any = await res.json();
      if (errJson.error || errJson.message) {
        errorMsg = errJson.error || errJson.message;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export async function loginApi(email: string, password?: string) {
  return apiRequest<{
    success: boolean;
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      companyId: string;
      companyName: string;
    };
  }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: password || "demo1234" }),
  });
}

export async function getProductsApi(companyId: string) {
  return apiRequest<{
    success: boolean;
    data: Array<{
      id: string;
      name: string;
      sku: string;
      category: string;
      stock: number;
      minStock: number;
      isLowStock: boolean;
      origin: string;
    }>;
  }>(`/api/products?companyId=${encodeURIComponent(companyId)}`);
}

export async function getOrdersApi(companyId: string) {
  return apiRequest<{
    success: boolean;
    data: Array<{
      orderId: string;
      sku: string;
      productName: string;
      provider: string;
      amountMXN: string;
      status: string;
      createdAt: string;
    }>;
  }>(`/api/orders?companyId=${encodeURIComponent(companyId)}`);
}

export async function getPendingDecisionsApi(companyId: string) {
  return apiRequest<{
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
  }>(`/api/decisions/pending?companyId=${encodeURIComponent(companyId)}`);
}

export async function resolveDecisionApi(id: string, action: "approve" | "reject", approvedBy: string = "CLI_USER") {
  return apiRequest<{
    success: boolean;
    orderId?: string;
    verified?: boolean;
    message: string;
  }>(`/api/decisions/${encodeURIComponent(id)}/resolve`, {
    method: "POST",
    body: JSON.stringify({ action, approvedBy }),
  });
}

export async function sendChatApi(message: string, companyId: string) {
  return apiRequest<{
    success: boolean;
    caseId: string;
    response: string;
    status: string;
    metrics: {
      totalCostUsd: string;
      totalTokens: number;
      iterations: number;
    };
  }>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, companyId }),
  });
}

export async function getBriefingApi(companyId: string) {
  return apiRequest<{
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
  }>(`/api/briefing/today?companyId=${encodeURIComponent(companyId)}`);
}

export async function triggerScanApi(companyId: string) {
  return apiRequest<{
    success: boolean;
    stockDeficitsFound: number;
    delayedShipmentsFound: number;
    eventsTriggered: number;
    processedDecisions: string[];
  }>("/api/events/scan", {
    method: "POST",
    body: JSON.stringify({ companyId }),
  });
}
