import type { Intent } from "../../../shared/types/index.js";
import type { DataStore } from "./store.js";

const DAY_MS = 86_400_000;
const daysAgo = (days: number, hour: number) => {
  const d = new Date(Date.now() - days * DAY_MS);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};

type Sample = {
  daysAgo: number;
  hour: number;
  message: string;
  intent: Extract<Intent, { type: "TRADE" }>;
  price: number;
  outcome: "EXECUTED" | "REJECTED" | "BLOCKED";
  reason?: string;
};

/**
 * Illustrative history so a fresh install isn't empty. Dated in the past so it never
 * counts toward today's daily-limit budget. Skipped when the user already has history.
 */
const SAMPLES: Sample[] = [
  { daysAgo: 6, hour: 9, message: "Buy $30 of BTC", intent: { type: "TRADE", action: "BUY", asset: "BTC", quoteAsset: "USDT", amountUsd: 30 }, price: 103200, outcome: "EXECUTED" },
  { daysAgo: 5, hour: 14, message: "Buy $25 of ETH", intent: { type: "TRADE", action: "BUY", asset: "ETH", quoteAsset: "USDT", amountUsd: 25 }, price: 3980, outcome: "EXECUTED" },
  { daysAgo: 4, hour: 11, message: "Buy $120 of BTC", intent: { type: "TRADE", action: "BUY", asset: "BTC", quoteAsset: "USDT", amountUsd: 120 }, price: 104100, outcome: "BLOCKED", reason: "Amount $120.00 exceeds the $50.00 per-transaction limit." },
  { daysAgo: 3, hour: 16, message: "Buy $20 of DOGE", intent: { type: "TRADE", action: "BUY", asset: "DOGE", quoteAsset: "USDT", amountUsd: 20 }, price: 0.21, outcome: "BLOCKED", reason: "DOGE is not in the allowed asset list (BTC, ETH, USDT)." },
  { daysAgo: 2, hour: 10, message: "Sell $15 of ETH", intent: { type: "TRADE", action: "SELL", asset: "ETH", quoteAsset: "USDT", amountUsd: 15 }, price: 4050, outcome: "REJECTED", reason: "Changed my mind" },
  { daysAgo: 1, hour: 13, message: "Buy $45 of BTC", intent: { type: "TRADE", action: "BUY", asset: "BTC", quoteAsset: "USDT", amountUsd: 45 }, price: 104800, outcome: "EXECUTED" },
];

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

export async function seedSampleHistory(store: DataStore, userId: string): Promise<void> {
  const existing = await store.listTransactions(userId, { limit: 1 });
  if (existing.length > 0) return;

  for (const s of SAMPLES) {
    const at = (offsetMin: number) => new Date(new Date(daysAgo(s.daysAgo, s.hour)).getTime() + offsetMin * 60_000).toISOString();
    const amount = round(s.intent.amountUsd / s.price, 8);
    const executed = s.outcome === "EXECUTED";

    const intentStatus = s.outcome === "EXECUTED" ? "EXECUTED" : s.outcome;
    const intent = await store.createIntent({ userId, messageId: null, type: "TRADE", payload: s.intent, status: intentStatus, createdAt: at(0) });
    await store.createAuditLog({ userId, eventType: "INTENT_CREATED", metadata: { intentId: intent.id, message: s.message, intent: s.intent, seeded: true }, createdAt: at(0) });

    if (s.outcome === "BLOCKED") {
      const tx = await store.createTransaction({
        userId, intentId: intent.id, externalTransactionId: null, action: s.intent.action, asset: s.intent.asset, quoteAsset: "USDT",
        amount, amountUsd: s.intent.amountUsd, price: s.price, status: "BLOCKED", executionLabel: null, failureReason: s.reason ?? null, createdAt: at(1),
      });
      await store.createAuditLog({ userId, eventType: "TRANSACTION_BLOCKED", metadata: { intentId: intent.id, transactionId: tx.id, reason: s.reason, seeded: true }, createdAt: at(1) });
      continue;
    }

    const approval = await store.createApproval({
      intentId: intent.id, userId, status: executed ? "APPROVED" : "REJECTED", expiresAt: at(10), approvedAt: executed ? at(3) : null,
      summary: { action: s.intent.action, asset: s.intent.asset, amountUsd: s.intent.amountUsd, estimatedAmount: amount, price: s.price }, createdAt: at(1),
    });
    await store.createAuditLog({ userId, eventType: "APPROVAL_CREATED", metadata: { intentId: intent.id, approvalId: approval.id, seeded: true }, createdAt: at(1) });

    const tx = await store.createTransaction({
      userId, intentId: intent.id, externalTransactionId: executed ? `DEMO-${intent.id.slice(0, 8).toUpperCase()}` : null,
      action: s.intent.action, asset: s.intent.asset, quoteAsset: "USDT", amount, amountUsd: s.intent.amountUsd, price: s.price,
      status: executed ? "EXECUTED" : "REJECTED", executionLabel: executed ? "DEMO_EXECUTED" : null, failureReason: executed ? null : (s.reason ?? "Rejected by user"), createdAt: at(3),
    });
    await store.createAuditLog({
      userId, eventType: executed ? "APPROVAL_APPROVED" : "APPROVAL_REJECTED",
      metadata: { intentId: intent.id, approvalId: approval.id, reason: executed ? undefined : s.reason, seeded: true }, createdAt: at(3),
    });
    if (executed) {
      await store.createAuditLog({
        userId, eventType: "TRANSACTION_EXECUTED",
        metadata: { intentId: intent.id, transactionId: tx.id, externalTransactionId: tx.externalTransactionId, executionLabel: "DEMO_EXECUTED", amount, price: s.price, seeded: true }, createdAt: at(3),
      });
    }
  }
}
