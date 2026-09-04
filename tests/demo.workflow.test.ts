import { describe, expect, it, vi } from "vitest";
import { createTestContext } from "./helpers.js";

describe("Demo Mode end-to-end workflow", () => {
  it("$40 BTC: message → intent → policy → approval → execution → history → audit", async () => {
    const ctx = await createTestContext();
    const { services, userId } = ctx;

    const res = await services.agent.handleMessage({ userId, message: "Buy $40 of BTC" });
    expect(res.intent).toMatchObject({ type: "TRADE", action: "BUY", asset: "BTC", amountUsd: 40 });
    expect(res.policy?.allowed).toBe(true);
    expect(res.policy?.requiresApproval).toBe(true);
    expect(res.approval?.status).toBe("PENDING");

    const outcome = await services.approvals.approve(userId, res.approval!.id);
    expect(outcome.transaction?.status).toBe("EXECUTED");

    const history = await services.transactions.list(userId, { limit: 10 });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ status: "EXECUTED", asset: "BTC", amountUsd: 40, executionLabel: "DEMO_EXECUTED" });

    const detail = await services.transactions.detail(userId, history[0].id);
    expect(detail?.approval?.status).toBe("APPROVED");
    expect(detail?.intent?.type).toBe("TRADE");

    const events = (await services.audit.list(userId, { limit: 100 })).map((l) => l.eventType);
    for (const e of ["AGENT_MESSAGE", "INTENT_CREATED", "POLICY_EVALUATED", "APPROVAL_CREATED", "APPROVAL_APPROVED", "TRANSACTION_EXECUTING", "TRANSACTION_EXECUTED"]) {
      expect(events).toContain(e);
    }

    const today = await services.transactions.todaySummary(userId);
    expect(today.volumeUsd).toBe(40);
  });

  it("$80 BTC: blocked by policy before reaching the exchange", async () => {
    const ctx = await createTestContext();
    const createOrder = vi.spyOn(ctx.exchange, "createOrder");

    const res = await ctx.services.agent.handleMessage({ userId: ctx.userId, message: "Buy $80 of BTC" });
    expect(res.kind).toBe("TRADE_BLOCKED");
    expect(res.policy?.allowed).toBe(false);
    expect(res.approval).toBeNull();
    expect(res.transaction?.status).toBe("BLOCKED");
    expect(createOrder).not.toHaveBeenCalled();

    const events = (await ctx.services.audit.list(ctx.userId, { limit: 100 })).map((l) => l.eventType);
    expect(events).toContain("TRANSACTION_BLOCKED");
    expect(events).not.toContain("TRANSACTION_EXECUTED");

    const explanation = await ctx.services.agent.handleMessage({ userId: ctx.userId, message: "Why was that blocked?" });
    expect(explanation.message).toMatch(/\$50/);
  });

  it("daily limit accumulates across executed trades", async () => {
    const ctx = await createTestContext();
    const { services, userId } = ctx;
    for (const amount of [50, 50]) {
      const res = await services.agent.handleMessage({ userId, message: `Buy $${amount} of ETH` });
      await services.approvals.approve(userId, res.approval!.id);
    }
    const third = await services.agent.handleMessage({ userId, message: "Buy $1 of ETH" });
    expect(third.kind).toBe("TRADE_BLOCKED");
    expect(third.policy?.checks.find((c) => c.name === "Daily Limit")?.passed).toBe(false);
  });

  it("emergency stop halts execution but keeps read-only access", async () => {
    const ctx = await createTestContext();
    const { services, userId } = ctx;
    await services.security.activateEmergencyStop(userId);
    const blocked = await services.agent.handleMessage({ userId, message: "Buy $10 of BTC" });
    expect(blocked.kind).toBe("TRADE_BLOCKED");
    const balance = await services.agent.handleMessage({ userId, message: "What is my balance?" });
    expect(balance.kind).toBe("ANSWER");
    expect(balance.data.balances?.length).toBe(3);
    await services.security.resetEmergencyStop(userId);
    const ok = await services.agent.handleMessage({ userId, message: "Buy $10 of BTC" });
    expect(ok.kind).toBe("TRADE_PENDING_APPROVAL");
  });

  it("unsupported asset is blocked and reported", async () => {
    const ctx = await createTestContext();
    const res = await ctx.services.agent.handleMessage({ userId: ctx.userId, message: "Buy $10 of DOGE" });
    expect(res.kind).toBe("TRADE_BLOCKED");
    expect(res.message).toMatch(/DOGE/);
  });
});
