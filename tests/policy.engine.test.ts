import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../server/src/policies/policy.engine.js";
import { baseContext, basePolicy, trade } from "./helpers.js";

const run = (intent: ReturnType<typeof trade>, ctx: Partial<typeof baseContext> = {}, policy = basePolicy) =>
  evaluatePolicy({ userId: "user-1", intent, policy, context: { ...baseContext, ...ctx } });

const check = (result: ReturnType<typeof run>, name: string) => result.checks.find((c) => c.name === name)!;

describe("Policy Engine — transaction limit", () => {
  it("allows $40 with a $50 limit", () => {
    const r = run(trade(40));
    expect(r.allowed).toBe(true);
    expect(r.requiresApproval).toBe(true);
  });
  it("allows exactly $50 with a $50 limit", () => {
    expect(run(trade(50)).allowed).toBe(true);
  });
  it("blocks $51 with a $50 limit", () => {
    const r = run(trade(51));
    expect(r.allowed).toBe(false);
    expect(r.requiresApproval).toBe(false);
    expect(check(r, "Transaction Limit").passed).toBe(false);
  });
});

describe("Policy Engine — asset allowlist", () => {
  it("allows BTC and ETH", () => {
    expect(run(trade(10, "BTC")).allowed).toBe(true);
    expect(run(trade(10, "ETH")).allowed).toBe(true);
  });
  it("blocks DOGE", () => {
    const r = run(trade(10, "DOGE"));
    expect(r.allowed).toBe(false);
    expect(check(r, "Asset Allowed").passed).toBe(false);
    expect(r.reason).toMatch(/DOGE/);
  });
});

describe("Policy Engine — daily limit", () => {
  it("allows $60 existing + $40 request", () => {
    expect(run(trade(40), { dailyVolumeUsd: 60 }).allowed).toBe(true);
  });
  it("blocks $60 existing + $41 request", () => {
    const r = run(trade(41), { dailyVolumeUsd: 60 });
    expect(r.allowed).toBe(false);
    expect(check(r, "Daily Limit").passed).toBe(false);
  });
});

describe("Policy Engine — amounts", () => {
  it.each([0, -5, NaN, Infinity])("blocks invalid amount %s", (amount) => {
    const r = run(trade(amount));
    expect(r.allowed).toBe(false);
    expect(check(r, "Amount Valid").passed).toBe(false);
  });
});

describe("Policy Engine — exposure and emergency stop", () => {
  it("blocks when a single trade exceeds max portfolio exposure", () => {
    const r = run(trade(40), { portfolioValueUsd: 100 });
    expect(check(r, "Portfolio Exposure").passed).toBe(false);
  });
  it("does not apply exposure to sells", () => {
    expect(check(run(trade(40, "BTC", "SELL"), { portfolioValueUsd: 100 }), "Portfolio Exposure").passed).toBe(true);
  });
  it("blocks everything while emergency stop is active", () => {
    const r = run(trade(10), { emergencyStop: true });
    expect(r.allowed).toBe(false);
    expect(check(r, "Emergency Stop").passed).toBe(false);
  });
  it("does not require approval when policy disables it", () => {
    const r = run(trade(10), {}, { ...basePolicy, requireApproval: false });
    expect(r.allowed).toBe(true);
    expect(r.requiresApproval).toBe(false);
  });
});
