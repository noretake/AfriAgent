import type { Intent } from "./intent.js";
import type { PolicyResult } from "./policy.js";

export type TransactionStatus =
  | "PENDING"
  | "APPROVED"
  | "EXECUTING"
  | "EXECUTED"
  | "REJECTED"
  | "BLOCKED"
  | "FAILED"
  | "EXPIRED";

export interface Transaction {
  id: string;
  userId: string;
  intentId: string;
  externalTransactionId: string | null;
  action: "BUY" | "SELL";
  asset: string;
  quoteAsset: string;
  amount: number;
  amountUsd: number;
  price: number | null;
  status: TransactionStatus;
  executionLabel: "DEMO_EXECUTED" | "LIVE_EXECUTED" | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

export interface Approval {
  id: string;
  intentId: string;
  userId: string;
  status: ApprovalStatus;
  expiresAt: string;
  approvedAt: string | null;
  createdAt: string;
  summary: {
    action: "BUY" | "SELL";
    asset: string;
    amountUsd: number;
    estimatedAmount: number;
    price: number;
  };
}

export type AuditEventType =
  | "AGENT_MESSAGE"
  | "INTENT_CREATED"
  | "POLICY_EVALUATED"
  | "TRANSACTION_BLOCKED"
  | "APPROVAL_CREATED"
  | "APPROVAL_APPROVED"
  | "APPROVAL_REJECTED"
  | "APPROVAL_EXPIRED"
  | "TRANSACTION_EXECUTING"
  | "TRANSACTION_EXECUTED"
  | "TRANSACTION_FAILED"
  | "POLICY_UPDATED"
  | "EMERGENCY_STOP_ACTIVATED"
  | "EMERGENCY_STOP_DEACTIVATED";

export interface AuditLog {
  id: string;
  userId: string;
  eventType: AuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface TransactionDetail {
  transaction: Transaction;
  intent: {
    id: string;
    type: string;
    payload: Intent;
    status: string;
    createdAt: string;
  } | null;
  originalRequest: string | null;
  policy: PolicyResult | null;
  approval: Approval | null;
  auditTimeline: AuditLog[];
}

export interface OrderRequest {
  action: "BUY" | "SELL";
  asset: string;
  quoteAsset: string;
  amountUsd: number;
}

export interface OrderResult {
  externalOrderId: string;
  status: "FILLED" | "PENDING" | "REJECTED" | "FAILED";
  action: "BUY" | "SELL";
  asset: string;
  quoteAsset: string;
  executedAmount: number;
  executedUsd: number;
  price: number;
  executionLabel: "DEMO_EXECUTED" | "LIVE_EXECUTED";
  timestamp: string;
  message?: string;
}
