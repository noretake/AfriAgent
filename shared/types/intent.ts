export type IntentType =
  | "BALANCE_QUERY"
  | "PORTFOLIO_QUERY"
  | "MARKET_ANALYSIS"
  | "TRADE"
  | "TRANSACTION_HISTORY"
  | "POLICY_QUERY"
  | "POLICY_VIOLATION_EXPLANATION"
  | "UNKNOWN";

export type TradeAction = "BUY" | "SELL";

export interface BalanceQueryIntent {
  type: "BALANCE_QUERY";
  asset?: string;
}

export interface PortfolioQueryIntent {
  type: "PORTFOLIO_QUERY";
}

export interface MarketAnalysisIntent {
  type: "MARKET_ANALYSIS";
  asset: string;
}

export interface TradeIntent {
  type: "TRADE";
  action: TradeAction;
  asset: string;
  quoteAsset: "USDT";
  amountUsd: number;
}

export interface TransactionHistoryIntent {
  type: "TRANSACTION_HISTORY";
  period?: "today" | "week" | "all";
}

export interface PolicyQueryIntent {
  type: "POLICY_QUERY";
}

export interface PolicyViolationExplanationIntent {
  type: "POLICY_VIOLATION_EXPLANATION";
}

export interface UnknownIntent {
  type: "UNKNOWN";
  clarification: string;
}

export type Intent =
  | BalanceQueryIntent
  | PortfolioQueryIntent
  | MarketAnalysisIntent
  | TradeIntent
  | TransactionHistoryIntent
  | PolicyQueryIntent
  | PolicyViolationExplanationIntent
  | UnknownIntent;

export type IntentStatus =
  | "CREATED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "BLOCKED"
  | "EXECUTED"
  | "FAILED"
  | "EXPIRED"
  | "COMPLETED";

export interface IntentRecord {
  id: string;
  userId: string;
  messageId: string | null;
  type: IntentType;
  payload: Intent;
  status: IntentStatus;
  createdAt: string;
}
