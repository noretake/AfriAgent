import { MemoryStore } from "../server/src/db/memory.store.js";
import { MockBinanceService } from "../server/src/exchanges/mock-binance.service.js";
import { createServices, type Services } from "../server/src/services.js";
import { FallbackIntentParser } from "../server/src/agents/intent.parser.js";
import type { Policy, TradeIntent } from "../shared/types/index.js";

export interface TestContext {
  services: Services;
  exchange: MockBinanceService;
  userId: string;
}

export async function createTestContext(opts: { approvalTtlMinutes?: number } = {}): Promise<TestContext> {
  const exchange = new MockBinanceService();
  const services = await createServices({
    store: new MemoryStore(),
    exchange,
    parser: new FallbackIntentParser(),
    demoMode: true,
    requireAuth: false,
    approvalTtlMinutes: opts.approvalTtlMinutes ?? 10,
  });
  const user = await services.resolveUser();
  return { services, exchange, userId: user.id };
}

export const basePolicy: Policy = {
  id: "policy-1",
  userId: "user-1",
  maxTransactionUsd: 50,
  dailyLimitUsd: 100,
  maxPortfolioExposure: 30,
  allowedAssets: ["BTC", "ETH", "USDT"],
  requireApproval: true,
  riskTolerance: "conservative",
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function trade(amountUsd: number, asset = "BTC", action: "BUY" | "SELL" = "BUY"): TradeIntent {
  return { type: "TRADE", action, asset, quoteAsset: "USDT", amountUsd };
}

export const baseContext = {
  dailyVolumeUsd: 0,
  portfolioValueUsd: 1883.52,
  assetValueUsd: 1029,
  emergencyStop: false,
};
