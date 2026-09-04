import { z } from "zod";
import { SUPPORTED_ASSETS } from "../../../shared/types/index.js";
import { finiteMoney } from "../policies/policy.schemas.js";

/** Any well-formed symbol; the Policy Engine decides whether it is *allowed*. */
const AssetSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,10}$/, "Invalid asset symbol");
const SupportedAssetSchema = z.enum(SUPPORTED_ASSETS);

export const BalanceQueryIntentSchema = z.object({
  type: z.literal("BALANCE_QUERY"),
  asset: AssetSchema.optional(),
});

export const PortfolioQueryIntentSchema = z.object({
  type: z.literal("PORTFOLIO_QUERY"),
});

export const MarketAnalysisIntentSchema = z.object({
  type: z.literal("MARKET_ANALYSIS"),
  asset: AssetSchema,
});

export const TradeIntentSchema = z.object({
  type: z.literal("TRADE"),
  action: z.enum(["BUY", "SELL"]),
  asset: AssetSchema,
  quoteAsset: z.literal("USDT"),
  amountUsd: finiteMoney,
});

/** Stricter variant used to gate execution: only supported assets can ever be traded. */
export const ExecutableTradeIntentSchema = TradeIntentSchema.extend({ asset: SupportedAssetSchema });

export const TransactionHistoryIntentSchema = z.object({
  type: z.literal("TRANSACTION_HISTORY"),
  period: z.enum(["today", "week", "all"]).optional(),
});

export const PolicyQueryIntentSchema = z.object({
  type: z.literal("POLICY_QUERY"),
});

export const PolicyViolationExplanationIntentSchema = z.object({
  type: z.literal("POLICY_VIOLATION_EXPLANATION"),
});

export const UnknownIntentSchema = z.object({
  type: z.literal("UNKNOWN"),
  clarification: z.string().min(1).max(500),
});

export const IntentSchema = z.discriminatedUnion("type", [
  BalanceQueryIntentSchema,
  PortfolioQueryIntentSchema,
  MarketAnalysisIntentSchema,
  TradeIntentSchema,
  TransactionHistoryIntentSchema,
  PolicyQueryIntentSchema,
  PolicyViolationExplanationIntentSchema,
  UnknownIntentSchema,
]);

export type ParsedIntent = z.infer<typeof IntentSchema>;
export type ParsedTradeIntent = z.infer<typeof TradeIntentSchema>;

export const AgentMessageBodySchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message is too long"),
});
