import { describe, expect, it } from "vitest";
import { ExecutableTradeIntentSchema, IntentSchema, TradeIntentSchema } from "../server/src/agents/intent.schemas.js";
import { FallbackIntentParser } from "../server/src/agents/intent.parser.js";
import { PolicyUpdateSchema } from "../server/src/policies/policy.schemas.js";

describe("Intent validation", () => {
  it("accepts a valid trade intent", () => {
    expect(TradeIntentSchema.safeParse({ type: "TRADE", action: "BUY", asset: "BTC", quoteAsset: "USDT", amountUsd: 40 }).success).toBe(true);
  });
  it.each([0, -1, "abc", null, undefined])("rejects amount %s", (amountUsd) => {
    expect(TradeIntentSchema.safeParse({ type: "TRADE", action: "BUY", asset: "BTC", amountUsd }).success).toBe(false);
  });
  it("rejects invalid asset symbols", () => {
    expect(TradeIntentSchema.safeParse({ type: "TRADE", action: "BUY", asset: "b!tc", amountUsd: 10 }).success).toBe(false);
    expect(TradeIntentSchema.safeParse({ type: "TRADE", action: "BUY", asset: "", amountUsd: 10 }).success).toBe(false);
  });
  it("only allows supported assets at the execution boundary", () => {
    expect(ExecutableTradeIntentSchema.safeParse({ type: "TRADE", action: "BUY", asset: "DOGE", quoteAsset: "USDT", amountUsd: 10 }).success).toBe(false);
    expect(ExecutableTradeIntentSchema.safeParse({ type: "TRADE", action: "BUY", asset: "ETH", quoteAsset: "USDT", amountUsd: 10 }).success).toBe(true);
  });
  it("rejects unknown intent types", () => {
    expect(IntentSchema.safeParse({ type: "WITHDRAW", amountUsd: 10 }).success).toBe(false);
  });
});

describe("Policy update validation", () => {
  it("rejects negative limits and empty allowlists", () => {
    expect(PolicyUpdateSchema.safeParse({ maxTransactionUsd: -1 }).success).toBe(false);
    expect(PolicyUpdateSchema.safeParse({ allowedAssets: [] }).success).toBe(false);
    expect(PolicyUpdateSchema.safeParse({ maxPortfolioExposure: 150 }).success).toBe(false);
  });
  it("accepts a valid partial update", () => {
    expect(PolicyUpdateSchema.safeParse({ maxTransactionUsd: 75, allowedAssets: ["btc"] }).success).toBe(true);
  });
});

describe("Fallback intent parser", () => {
  const parser = new FallbackIntentParser();
  const parse = async (m: string) => (await parser.parse(m)).intent;
  it("parses a buy request", async () => {
    const intent = await parse("Buy $40 of BTC");
    expect(intent).toMatchObject({ type: "TRADE", action: "BUY", asset: "BTC", amountUsd: 40 });
  });
  it("parses a sell request with an alias", async () => {
    expect(await parse("sell 25 dollars of ethereum")).toMatchObject({ type: "TRADE", action: "SELL", asset: "ETH", amountUsd: 25 });
  });
  it("parses read-only requests", async () => {
    expect((await parse("what is my balance")).type).toBe("BALANCE_QUERY");
    expect((await parse("show portfolio")).type).toBe("PORTFOLIO_QUERY");
    expect((await parse("analyze ETH")).type).toBe("MARKET_ANALYSIS");
    expect((await parse("transaction history")).type).toBe("TRANSACTION_HISTORY");
    expect((await parse("what are my limits")).type).toBe("POLICY_QUERY");
    expect((await parse("why was it blocked")).type).toBe("POLICY_VIOLATION_EXPLANATION");
  });
  it("returns UNKNOWN for unrelated input", async () => {
    expect((await parse("tell me a joke")).type).toBe("UNKNOWN");
  });
});
