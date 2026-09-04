import type { PolicyResult, TradeIntent, Transaction } from "../../../shared/types/index.js";
import { AuditService } from "../audit/audit.service.js";
import type { DataStore } from "../db/store.js";
import { ExchangeError, type ExchangeService } from "../exchanges/exchange.interface.js";
import { PolicyService } from "../policies/policy.service.js";
import { SecurityService } from "../security/security.service.js";
import { TransactionService } from "./transaction.service.js";

export class ExecutionBlockedError extends Error {
  constructor(
    message: string,
    readonly policy: PolicyResult | null,
    readonly transaction: Transaction | null,
  ) {
    super(message);
    this.name = "ExecutionBlockedError";
  }
}

export class ExecutionFailedError extends Error {
  constructor(message: string, readonly transaction: Transaction | null) {
    super(message);
    this.name = "ExecutionFailedError";
  }
}

/**
 * The only code path that may call `exchange.createOrder`.
 * Always re-checks emergency stop and the Policy Engine immediately before execution.
 */
export class ExecutionService {
  constructor(
    private readonly store: DataStore,
    private readonly exchange: ExchangeService,
    private readonly transactions: TransactionService,
    private readonly policies: PolicyService,
    private readonly security: SecurityService,
    private readonly audit: AuditService,
  ) {}

  async execute(userId: string, intentId: string, intent: TradeIntent): Promise<{ transaction: Transaction; policy: PolicyResult }> {
    const existing = await this.transactions.getByIntent(intentId);

    // Policy re-check (includes emergency stop) right before touching the exchange.
    const policy = await this.policies.evaluate(userId, intent, { excludeIntentId: intentId, intentId });
    if (!policy.allowed) {
      const blocked = existing
        ? await this.transactions.update(existing.id, { status: "BLOCKED", failureReason: policy.reason })
        : await this.transactions.createPending(userId, intentId, intent, null, "BLOCKED");
      await this.store.updateIntentStatus(intentId, "BLOCKED");
      await this.audit.record(userId, "TRANSACTION_BLOCKED", {
        intentId,
        transactionId: blocked?.id,
        reason: policy.reason,
        checks: policy.checks,
        stage: "pre-execution re-check",
      });
      throw new ExecutionBlockedError(policy.reason, policy, blocked);
    }

    let tx = existing
      ? await this.transactions.update(existing.id, { status: "EXECUTING" })
      : await this.transactions.createPending(userId, intentId, intent, null, "EXECUTING");
    if (!tx) throw new ExecutionFailedError("Transaction record could not be created.", null);

    await this.audit.record(userId, "TRANSACTION_EXECUTING", { intentId, transactionId: tx.id, exchange: this.exchange.name });

    try {
      const order = await this.exchange.createOrder(userId, {
        action: intent.action,
        asset: intent.asset,
        quoteAsset: intent.quoteAsset,
        amountUsd: intent.amountUsd,
      });

      if (order.status === "REJECTED" || order.status === "FAILED") {
        throw new ExchangeError(order.message ?? `Exchange returned ${order.status}.`, "EXCHANGE_ERROR");
      }

      tx = (await this.transactions.update(tx.id, {
        status: "EXECUTED",
        externalTransactionId: order.externalOrderId,
        amount: order.executedAmount,
        amountUsd: order.executedUsd,
        price: order.price,
        executionLabel: order.executionLabel,
      }))!;
      await this.store.updateIntentStatus(intentId, "EXECUTED");
      await this.audit.record(userId, "TRANSACTION_EXECUTED", {
        intentId,
        transactionId: tx.id,
        externalTransactionId: order.externalOrderId,
        executionLabel: order.executionLabel,
        amount: order.executedAmount,
        amountUsd: order.executedUsd,
        price: order.price,
      });
      return { transaction: tx, policy };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown exchange error";
      const failed = await this.transactions.update(tx.id, { status: "FAILED", failureReason: message });
      await this.store.updateIntentStatus(intentId, "FAILED");
      await this.audit.record(userId, "TRANSACTION_FAILED", { intentId, transactionId: tx.id, reason: message });
      throw new ExecutionFailedError(message, failed);
    }
  }
}
