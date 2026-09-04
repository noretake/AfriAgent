import type {
  AgentMessageRecord,
  AgentResponse,
  Approval,
  AuditLog,
  Balance,
  DashboardResponse,
  HealthResponse,
  MarketData,
  Policy,
  PolicyResult,
  PolicyUpdate,
  Portfolio,
  SecurityStatus,
  Transaction,
  TransactionDetail,
} from "../../../shared/types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? "HTTP_ERROR", err?.message ?? res.statusText, data);
  }
  return data as T;
}

const post = <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) });

export interface ApprovalOutcome {
  approval: Approval;
  transaction: Transaction | null;
  policy: PolicyResult | null;
  message: string;
}

export const api = {
  health: () => request<HealthResponse>("/health"),
  dashboard: () => request<DashboardResponse>("/dashboard"),
  portfolio: () => request<Portfolio>("/portfolio"),
  balance: () => request<{ balances: Balance[] }>("/balance"),
  market: (asset: string) => request<MarketData>(`/market/${encodeURIComponent(asset)}`),
  sendMessage: (message: string, sessionId?: string) => post<AgentResponse>("/agent/message", { message, sessionId }),
  sessionMessages: (sessionId: string) => request<{ messages: AgentMessageRecord[] }>(`/agent/sessions/${sessionId}/messages`),
  transactions: () => request<{ transactions: Transaction[] }>("/transactions"),
  transaction: (id: string) => request<TransactionDetail>(`/transactions/${id}`),
  approvals: () => request<{ approvals: Approval[] }>("/approvals"),
  approve: (id: string) => post<ApprovalOutcome>(`/approvals/${id}/approve`),
  reject: (id: string, reason?: string) => post<ApprovalOutcome>(`/approvals/${id}/reject`, { reason }),
  policies: () => request<Policy>("/policies"),
  updatePolicies: (update: Partial<PolicyUpdate>) => put<Policy>("/policies", update),
  audit: () => request<{ logs: AuditLog[] }>("/audit"),
  security: () => request<SecurityStatus>("/security"),
  emergencyStop: (reason?: string) => post<SecurityStatus>("/security/emergency-stop", { reason }),
  resetEmergencyStop: () => post<SecurityStatus>("/security/emergency-stop/reset"),
};
