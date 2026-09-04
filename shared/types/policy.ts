export type RiskTolerance = "conservative" | "moderate" | "aggressive";

export interface Policy {
  id: string;
  userId: string;
  maxTransactionUsd: number;
  dailyLimitUsd: number;
  maxPortfolioExposure: number;
  allowedAssets: string[];
  requireApproval: boolean;
  riskTolerance: RiskTolerance;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyUpdate {
  maxTransactionUsd: number;
  dailyLimitUsd: number;
  maxPortfolioExposure: number;
  allowedAssets: string[];
  requireApproval: boolean;
  riskTolerance: RiskTolerance;
}

export interface PolicyCheck {
  name: string;
  passed: boolean;
  detail: string;
  requested?: number;
  limit?: number;
}

export interface PolicyResult {
  allowed: boolean;
  requiresApproval: boolean;
  checks: PolicyCheck[];
  reason: string;
  policyVersion: number;
  evaluatedAt: string;
}
