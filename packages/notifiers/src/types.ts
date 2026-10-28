export type NotificationSeverity = "INFO" | "WARNING" | "CRITICAL";
export type ChannelType = "telegram" | "slack" | "gmail" | "discord";
export type NotificationKind = "DECISION_APPROVAL" | "PAYMENT_DISPERSION" | "GENERAL_ALERT";

export interface NotificationPayload {
  companyId: string;
  decisionId: string;
  title: string;
  description: string;
  costMxn: number;
  proposingAgent: string;
  severity: NotificationSeverity;
  evidenceSummary: string;
  approveToken?: string;
  rejectToken?: string;
  currency?: string;
  kind?: NotificationKind;
  paymentDetails?: {
    orderId: string;
    trackingNumber?: string;
    supplierId: string;
    supplierName: string;
    supplierEmail?: string;
    supplierPhone?: string;
    supplierTaxId?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankClabe?: string;
    productName: string;
    sku?: string;
    quantity: number;
    unitPrice: number | string;
    approvedBy: string;
    financeAssignees?: Array<{ name: string; email: string; role: string }>;
  };
}

export interface SendResult {
  success: boolean;
  channelType: ChannelType;
  messageId?: string;
  deliveredAt?: string;
  error?: string;
  details?: Record<string, any>;
}

export interface NotifierAdapter {
  type: ChannelType;
  send(payload: NotificationPayload, config: Record<string, any>): Promise<SendResult>;
}

export interface SignedTokenPayload {
  decisionId: string;
  action: "approve" | "reject";
  companyId: string;
  expiresAt: number;
  nonce: string;
}

export interface RemoteApprovalResult {
  success: boolean;
  decisionId: string;
  action: "approved" | "rejected";
  executedOrder?: {
    orderId: string;
    totalAmount: string;
    supplierId: string;
    status: string;
  };
  approver: string;
  channel: string;
  auditMessage: string;
}
