import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalError } from "../server/src/approvals/approval.service.js";
import { createTestContext, trade, type TestContext } from "./helpers.js";

async function proposeTrade(ctx: TestContext, amountUsd: number, asset = "BTC") {
  return ctx.services.agent.handleMessage({ userId: ctx.userId, message: `Buy $${amountUsd} of ${asset}` });
}

describe("Approval workflow", () => {
  let ctx: TestContext;
  beforeEach(async () => {
    ctx = await createTestContext();
  });

  it("creates a pending approval and executes on approve", async () => {
    const res = await proposeTrade(ctx, 40);
    expect(res.kind).toBe("TRADE_PENDING_APPROVAL");
    expect(res.approval?.status).toBe("PENDING");
    expect(res.transaction?.status).toBe("PENDING");

    const createOrder = vi.spyOn(ctx.exchange, "createOrder");
    const outcome = await ctx.services.approvals.approve(ctx.userId, res.approval!.id);
    expect(createOrder).toHaveBeenCalledTimes(1);
    expect(outcome.approval.status).toBe("APPROVED");
    expect(outcome.transaction?.status).toBe("EXECUTED");
    expect(outcome.transaction?.executionLabel).toBe("DEMO_EXECUTED");
    expect(outcome.transaction?.externalTransactionId).toMatch(/^DEMO-/);

    const balances = await ctx.exchange.getBalance(ctx.userId);
    expect(balances.find((b) => b.asset === "USDT")!.total).toBeCloseTo(240.52, 2);

    const events = (await ctx.services.audit.list(ctx.userId, { limit: 100 })).map((l) => l.eventType);
    expect(events).toEqual(expect.arrayContaining(["APPROVAL_CREATED", "APPROVAL_APPROVED", "TRANSACTION_EXECUTED"]));
  });

  it("rejects an approval and never calls the exchange", async () => {
    const res = await proposeTrade(ctx, 40);
    const createOrder = vi.spyOn(ctx.exchange, "createOrder");
    const outcome = await ctx.services.approvals.reject(ctx.userId, res.approval!.id, "changed my mind");
    expect(outcome.approval.status).toBe("REJECTED");
    expect(outcome.transaction?.status).toBe("REJECTED");
    expect(createOrder).not.toHaveBeenCalled();
    await expect(ctx.services.approvals.approve(ctx.userId, res.approval!.id)).rejects.toMatchObject({ code: "NOT_PENDING" });
  });

  it("refuses to approve twice", async () => {
    const res = await proposeTrade(ctx, 40);
    await ctx.services.approvals.approve(ctx.userId, res.approval!.id);
    await expect(ctx.services.approvals.approve(ctx.userId, res.approval!.id)).rejects.toBeInstanceOf(ApprovalError);
  });

  it("expires stale approvals", async () => {
    const expiring = await createTestContext({ approvalTtlMinutes: 0 });
    const res = await proposeTrade(expiring, 40);
    await new Promise((r) => setTimeout(r, 5));
    const createOrder = vi.spyOn(expiring.exchange, "createOrder");
    await expect(expiring.services.approvals.approve(expiring.userId, res.approval!.id)).rejects.toMatchObject({ code: "EXPIRED" });
    expect(createOrder).not.toHaveBeenCalled();
    const approval = await expiring.services.store.getApproval(res.approval!.id);
    expect(approval?.status).toBe("EXPIRED");
  });

  it("rejects approvals owned by another user", async () => {
    const res = await proposeTrade(ctx, 40);
    await expect(ctx.services.approvals.approve("00000000-0000-4000-8000-000000000999", res.approval!.id)).rejects.toMatchObject({
      code: expect.stringMatching(/NOT_FOUND|FORBIDDEN/),
    });
  });

  it("blocks approval execution while emergency stop is active", async () => {
    const res = await proposeTrade(ctx, 40);
    await ctx.services.security.activateEmergencyStop(ctx.userId, "test");
    const createOrder = vi.spyOn(ctx.exchange, "createOrder");
    await expect(ctx.services.approvals.approve(ctx.userId, res.approval!.id)).rejects.toMatchObject({ code: "EMERGENCY_STOP" });
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("re-evaluates policy at execution time", async () => {
    const res = await proposeTrade(ctx, 40);
    await ctx.services.policies.update(ctx.userId, { maxTransactionUsd: 20 });
    const createOrder = vi.spyOn(ctx.exchange, "createOrder");
    await expect(ctx.services.approvals.approve(ctx.userId, res.approval!.id)).rejects.toMatchObject({ name: "ExecutionBlockedError" });
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("executes without approval when policy does not require it", async () => {
    await ctx.services.policies.update(ctx.userId, { requireApproval: false });
    const res = await proposeTrade(ctx, 20, "ETH");
    expect(res.kind).toBe("TRADE_EXECUTED");
    expect(res.transaction?.status).toBe("EXECUTED");
  });

  it("policy evaluation input is a validated trade intent", () => {
    expect(trade(40).type).toBe("TRADE");
  });
});
