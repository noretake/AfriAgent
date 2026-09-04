import type { Intent } from "./intent.js";
import type { PolicyResult } from "./policy.js";
import type { Approval, Transaction, AuditLog } from "./transaction.js";
import type { Portfolio, Balance, MarketData } from "./portfolio.js";
import type { Policy } from "./policy.js";

export interface AgentMessageRequest {
  sessionId?: string;
  message: string;
}

export type AgentResponseKind =
  | "ANSWER"
  | "TRADE_PENDING_APPROVAL"
  | "TRADE_BLOCKED"
  | "TRADE_EXECUTED"
  | "CLARIFICATION"
  | "ERROR";

export interface AgentResponse {
  kind: AgentResponseKind;
  sessionId: string;
  messageId: string;
  message: string;
  intent: Intent | null;
  intentId: string | null;
  policy: PolicyResult | null;
  approval: Approval | null;
  transaction: Transaction | null;
  data: {
    balances?: Balance[];
    portfolio?: Portfolio;
    market?: MarketData;
    transactions?: Transaction[];
    policyConfig?: Policy;
    lastBlocked?: {
      transaction: Transaction | null;
      policy: PolicyResult | null;
      audit: AuditLog | null;
    };
  } | null;
  parser: "llm" | "fallback";
  createdAt: string;
}

export interface AgentMessageRecord {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface AgentStatus {
  aiAgent: "ONLINE" | "OFFLINE";
  policyEngine: "ACTIVE";
  exchange: "DEMO" | "LIVE";
  security: "PROTECTED" | "EMERGENCY_STOP";
  aiProvider: string;
}

export interface DashboardToday {
  transactions: number;
  volumeUsd: number;
  blocked: number;
  pending: number;
}

export interface DashboardResponse {
  portfolio: Portfolio;
  agentStatus: AgentStatus;
  today: DashboardToday;
  recentActivity: AuditLog[];
  pendingApprovals: Approval[];
  demoMode: boolean;
}

export interface SecurityStatus {
  agent: "ACTIVE" | "STOPPED";
  marketData: "ENABLED" | "DISABLED";
  balanceAccess: "ENABLED" | "DISABLED";
  trading: "ENABLED" | "DISABLED";
  withdrawals: "DISABLED";
  policyEngine: "ACTIVE";
  humanApproval: "ACTIVE" | "INACTIVE";
  demoMode: "ACTIVE" | "INACTIVE";
  emergencyStop: {
    active: boolean;
    activatedAt: string | null;
    reason: string | null;
  };
}

export interface HealthResponse {
  status: "ok";
  service: "afriagent";
  mode: "demo" | "live";
  storage: "memory" | "supabase";
  aiProvider: string;
  timestamp: string;
}
