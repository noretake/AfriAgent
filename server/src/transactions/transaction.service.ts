import type {
  Approval,
  Intent,
  PolicyResult,
  TradeIntent,
  Transaction,
  TransactionDetail,
  TransactionStatus,
} from "../../../shared/types/index.js";
import type { DataStore } from "../db/store.js";

const DAILY_COUNTED: TransactionStatus[] = ["PENDING", "APPROVED", "EXECUTING", "EXECUTED"];

export function startOfTodayIso(now = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export class TransactionService {
  constructor(private readonly store: DataStore) {}

  createPending(userId: string, intentId: string, intent: TradeIntent, price: number | null, status: TransactionStatus = "PENDING") {
    return this.store.createTransaction({
      userId,
      intentId,
      externalTransactionId: null,
      action: intent.action,
      asset: intent.asset,
      quoteAsset: intent.quoteAsset,
      amount: price && price > 0 ? Math.round((intent.amountUsd / price) * 1e8) / 1e8 : 0,
      amountUsd: intent.amountUsd,
      price,
      status,
      executionLabel: null,
      failureReason: null,
    });
  }

  get(userId: string, id: string): Promise<Transaction | null> {
    return this.store.getTransaction(id).then((t) => (t && t.userId === userId ? t : null));
  }

  getByIntent(intentId: string) {
    return this.store.getTransactionByIntent(intentId);
  }

  list(userId: string, opts?: { since?: string; limit?: number }) {
    return this.store.listTransactions(userId, opts);
  }

  listToday(userId: string) {
    return this.store.listTransactions(userId, { since: startOfTodayIso() });
  }

  update(id: string, patch: Partial<Transaction>) {
    return this.store.updateTransaction(id, patch);
  }

  /** Sum of today's USD volume that counts toward the daily limit. */
  async dailyVolumeUsd(userId: string, excludeIntentId?: string): Promise<number> {
    const today = await this.listToday(userId);
    return today
      .filter((t) => DAILY_COUNTED.includes(t.status) && t.intentId !== excludeIntentId)
      .reduce((sum, t) => sum + t.amountUsd, 0);
  }

  async todaySummary(userId: string) {
    const today = await this.listToday(userId);
    const executed = today.filter((t) => t.status === "EXECUTED");
    return {
      transactions: executed.length,
      volumeUsd: Math.round(executed.reduce((s, t) => s + t.amountUsd, 0) * 100) / 100,
      blocked: today.filter((t) => t.status === "BLOCKED").length,
      pending: today.filter((t) => t.status === "PENDING" || t.status === "APPROVED" || t.status === "EXECUTING").length,
    };
  }

  async detail(userId: string, id: string): Promise<TransactionDetail | null> {
    const transaction = await this.get(userId, id);
    if (!transaction) return null;

    const intentRecord = await this.store.getIntent(transaction.intentId);
    const message = intentRecord?.messageId ? await this.store.getMessage(intentRecord.messageId) : null;
    const approval: Approval | null = await this.store.getApprovalByIntent(transaction.intentId);
    const auditTimeline = (await this.store.listAuditLogs(userId, { intentId: transaction.intentId })).reverse();

    const policyLog = [...auditTimeline].reverse().find((l) => l.eventType === "POLICY_EVALUATED");
    const policy = (policyLog?.metadata.result as PolicyResult | undefined) ?? null;

    return {
      transaction,
      intent: intentRecord
        ? {
            id: intentRecord.id,
            type: intentRecord.type,
            payload: intentRecord.payload as Intent,
            status: intentRecord.status,
            createdAt: intentRecord.createdAt,
          }
        : null,
      originalRequest: message?.content ?? null,
      policy,
      approval,
      auditTimeline,
    };
  }
}
