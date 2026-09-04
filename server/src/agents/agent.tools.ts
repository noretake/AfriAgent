import type { TradeIntent } from "../../../shared/types/index.js";
import { ApprovalService } from "../approvals/approval.service.js";
import { AuditService } from "../audit/audit.service.js";
import { PolicyService } from "../policies/policy.service.js";
import { PortfolioService } from "../portfolio/portfolio.service.js";
import { SecurityService } from "../security/security.service.js";
import { ExecutionService } from "../transactions/execution.service.js";
import { TransactionService } from "../transactions/transaction.service.js";
import { ExecutableTradeIntentSchema } from "./intent.schemas.js";

export interface AgentToolDeps {
  portfolio: PortfolioService;
  transactions: TransactionService;
  policies: PolicyService;
  approvals: ApprovalService;
  execution: ExecutionService;
  security: SecurityService;
  audit: AuditService;
}

export class ToolAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolAuthorizationError";
  }
}

/**
 * Capabilities exposed to the agent. Every tool is bound to the authenticated
 * `userId` supplied by the server, never by the model or the client.
 */
export function createAgentTools(deps: AgentToolDeps, userId: string) {
  const readOnly = {
    getAccountBalance: (asset?: string) => (asset ? deps.portfolio.getBalance(userId, asset) : deps.portfolio.getBalances(userId)),
    getPortfolio: () => deps.portfolio.getPortfolio(userId),
    getMarketPrice: (asset: string) => deps.portfolio.getMarketPrice(asset),
    getMarketData: (asset: string) => deps.portfolio.getMarketData(asset),
    getTransactionHistory: (opts?: { since?: string; limit?: number }) => deps.transactions.list(userId, opts),
    getPolicy: () => deps.policies.get(userId),
  };

  const execution = {
    evaluatePolicy: (intent: TradeIntent, intentId?: string) => deps.policies.evaluate(userId, intent, { intentId }),

    /** Requires a policy result that allows the intent; the engine result is re-derived server-side. */
    createApproval: async (intentId: string, intent: TradeIntent) => {
      const parsed = ExecutableTradeIntentSchema.safeParse(intent);
      if (!parsed.success) throw new ToolAuthorizationError("Only supported assets can be queued for approval.");
      return deps.approvals.create(userId, intentId, parsed.data);
    },

    /**
     * Only callable for intents that (a) belong to the user and (b) do not
     * require approval per policy. Approval-gated intents must flow through
     * ApprovalService.approve, which the agent cannot call on its own behalf.
     */
    executeApprovedTransaction: async (intentId: string, intent: TradeIntent) => {
      const parsed = ExecutableTradeIntentSchema.safeParse(intent);
      if (!parsed.success) throw new ToolAuthorizationError("Only supported assets can be executed.");
      if (await deps.security.isEmergencyStopped(userId)) {
        throw new ToolAuthorizationError("Emergency stop is active. Execution is not permitted.");
      }
      const policy = await deps.policies.get(userId);
      if (policy.requireApproval) {
        throw new ToolAuthorizationError("This account requires explicit user approval before execution.");
      }
      return deps.execution.execute(userId, intentId, parsed.data);
    },

    recordAuditEvent: (eventType: Parameters<AuditService["record"]>[1], metadata: Record<string, unknown>) =>
      deps.audit.record(userId, eventType, metadata),
  };

  return { ...readOnly, ...execution };
}

export type AgentTools = ReturnType<typeof createAgentTools>;
