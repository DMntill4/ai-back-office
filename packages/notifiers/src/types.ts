export type NotificationSeverity = "INFO" | "WARNING" | "CRITICAL";
export type ChannelType = "telegram" | "slack" | "gmail";

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
}

export interface SendResult {
  success: boolean;
  channelType: ChannelType;
  messageId: string;
  deliveredAt: string;
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
