import type { Policy, PolicyCheck, PolicyResult, TradeIntent } from "../../../shared/types/index.js";

export interface PolicyContext {
  /** USD volume of today's executed, executing, approved and pending transactions. */
  dailyVolumeUsd: number;
  /** Current total portfolio value in USD. */
  portfolioValueUsd: number;
  /** Current USD value held in the intent's asset. */
  assetValueUsd: number;
  /** Emergency stop halts all execution regardless of other checks. */
  emergencyStop: boolean;
}

export interface PolicyEvaluationInput {
  userId: string;
  intent: TradeIntent;
  policy: Policy;
  context: PolicyContext;
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Deterministic policy engine. Pure function of (intent, policy, context).
 * No AI, no I/O, no randomness.
 */
export function evaluatePolicy(input: PolicyEvaluationInput): PolicyResult {
  const { intent, policy, context } = input;
  const checks: PolicyCheck[] = [];

  // Emergency stop
  checks.push({
    name: "Emergency Stop",
    passed: !context.emergencyStop,
    detail: context.emergencyStop
      ? "Emergency stop is active. All financial execution is halted."
      : "Emergency stop is not active.",
  });

  // Asset allowlist
  const assetAllowed = policy.allowedAssets.includes(intent.asset);
  checks.push({
    name: "Asset Allowed",
    passed: assetAllowed,
    detail: assetAllowed
      ? `${intent.asset} is allowed.`
      : `${intent.asset} is not included in the user's allowed assets (${policy.allowedAssets.join(", ")}).`,
  });

  // Amount sanity (defensive; schema validation should already have caught this)
  const amountValid = Number.isFinite(intent.amountUsd) && intent.amountUsd > 0;
  checks.push({
    name: "Amount Valid",
    passed: amountValid,
    detail: amountValid ? `Amount ${usd(intent.amountUsd)} is valid.` : "Amount must be a positive finite number.",
    requested: intent.amountUsd,
  });

  // Per-transaction limit
  const txLimitOk = amountValid && intent.amountUsd <= policy.maxTransactionUsd;
  checks.push({
    name: "Transaction Limit",
    passed: txLimitOk,
    detail: txLimitOk
      ? `Amount ${usd(intent.amountUsd)} is within the ${usd(policy.maxTransactionUsd)} per-transaction limit.`
      : `Transaction exceeds maximum transaction limit of ${usd(policy.maxTransactionUsd)}.`,
    requested: intent.amountUsd,
    limit: policy.maxTransactionUsd,
  });

  // Daily limit
  const projectedDaily = round2(context.dailyVolumeUsd + intent.amountUsd);
  const dailyOk = amountValid && projectedDaily <= policy.dailyLimitUsd;
  checks.push({
    name: "Daily Limit",
    passed: dailyOk,
    detail: dailyOk
      ? `Today's executed + pending volume would be ${usd(projectedDaily)} of the ${usd(policy.dailyLimitUsd)} daily limit.`
      : `Today's executed + pending volume ${usd(context.dailyVolumeUsd)} plus ${usd(intent.amountUsd)} would exceed the ${usd(policy.dailyLimitUsd)} daily limit.`,
    requested: projectedDaily,
    limit: policy.dailyLimitUsd,
  });

  // Portfolio exposure: a single trade may not commit more than X% of the
  // portfolio's total value to one asset.
  let exposureOk = true;
  let exposureDetail = "Selling reduces exposure; check not applicable.";
  let projectedPct = 0;
  if (intent.action === "BUY" && intent.asset !== "USDT") {
    const total = context.portfolioValueUsd;
    projectedPct = total > 0 ? round2((intent.amountUsd / total) * 100) : 100;
    exposureOk = projectedPct <= policy.maxPortfolioExposure;
    exposureDetail = exposureOk
      ? `This trade commits ${projectedPct}% of the portfolio to ${intent.asset} (max ${policy.maxPortfolioExposure}% per trade).`
      : `This trade would commit ${projectedPct}% of the portfolio to ${intent.asset}, exceeding the ${policy.maxPortfolioExposure}% per-trade maximum.`;
  } else if (intent.asset === "USDT") {
    exposureDetail = "Stablecoin position; exposure check not applicable.";
  }
  checks.push({
    name: "Portfolio Exposure",
    passed: exposureOk,
    detail: exposureDetail,
    requested: projectedPct,
    limit: policy.maxPortfolioExposure,
  });

  const failed = checks.filter((c) => !c.passed);
  const allowed = failed.length === 0;
  const requiresApproval = allowed && policy.requireApproval;

  let reason: string;
  if (!allowed) {
    reason = failed.map((c) => c.detail).join(" ");
  } else if (requiresApproval) {
    reason = "Transaction is permitted but requires user approval.";
  } else {
    reason = "Transaction is permitted by policy.";
  }

  return {
    allowed,
    requiresApproval,
    checks,
    reason,
    policyVersion: policy.version,
    evaluatedAt: new Date().toISOString(),
  };
}
