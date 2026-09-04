import type { Policy, PolicyResult, TradeIntent } from "../../../shared/types/index.js";
import { AuditService } from "../audit/audit.service.js";
import { DEFAULT_POLICY } from "../db/client.js";
import type { DataStore } from "../db/store.js";
import { PortfolioService } from "../portfolio/portfolio.service.js";
import { SecurityService } from "../security/security.service.js";
import { TransactionService } from "../transactions/transaction.service.js";
import { evaluatePolicy } from "./policy.engine.js";
import type { PolicyUpdateInput } from "./policy.schemas.js";

export class PolicyService {
  constructor(
    private readonly store: DataStore,
    private readonly transactions: TransactionService,
    private readonly portfolio: PortfolioService,
    private readonly security: SecurityService,
    private readonly audit: AuditService,
  ) {}

  async get(userId: string): Promise<Policy> {
    const existing = await this.store.getPolicy(userId);
    if (existing) return existing;
    return this.store.createPolicy({ userId, ...DEFAULT_POLICY });
  }

  async update(userId: string, input: PolicyUpdateInput): Promise<Policy> {
    const current = await this.get(userId);
    const updated = await this.store.updatePolicy({
      ...current,
      ...input,
      allowedAssets: [...new Set((input.allowedAssets ?? current.allowedAssets).map((a) => a.toUpperCase()))],
      version: current.version + 1,
    });
    await this.audit.record(userId, "POLICY_UPDATED", {
      previousVersion: current.version,
      version: updated.version,
      changes: input,
    });
    return updated;
  }

  /**
   * Gathers live context (daily volume, portfolio, emergency stop) and runs the
   * deterministic engine. `excludeIntentId` lets a re-check before execution
   * ignore the pending transaction created for the same intent.
   */
  async evaluate(userId: string, intent: TradeIntent, opts: { excludeIntentId?: string; record?: boolean; intentId?: string } = {}): Promise<PolicyResult> {
    const policy = await this.get(userId);
    const [dailyVolumeUsd, portfolioSnapshot, securityState] = await Promise.all([
      this.transactions.dailyVolumeUsd(userId, opts.excludeIntentId),
      this.portfolio.getPortfolio(userId),
      this.security.getState(userId),
    ]);
    const assetValueUsd = portfolioSnapshot.positions.find((p) => p.asset === intent.asset)?.valueUsd ?? 0;

    const result = evaluatePolicy({
      userId,
      intent,
      policy,
      context: {
        dailyVolumeUsd,
        portfolioValueUsd: portfolioSnapshot.totalValueUsd,
        assetValueUsd,
        emergencyStop: securityState.emergencyStop,
      },
    });

    if (opts.record !== false) {
      await this.audit.record(userId, "POLICY_EVALUATED", {
        intentId: opts.intentId ?? null,
        intent,
        result,
        policyVersion: policy.version,
      });
    }
    return result;
  }
}
