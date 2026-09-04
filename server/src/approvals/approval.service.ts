import type { Approval, PolicyResult, TradeIntent, Transaction } from "../../../shared/types/index.js";
import { TradeIntentSchema } from "../agents/intent.schemas.js";
import { AuditService } from "../audit/audit.service.js";
import type { DataStore } from "../db/store.js";
import { PortfolioService } from "../portfolio/portfolio.service.js";
import { SecurityService } from "../security/security.service.js";
import { ExecutionService } from "../transactions/execution.service.js";
import { TransactionService } from "../transactions/transaction.service.js";

export class ApprovalError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "NOT_PENDING"
      | "EXPIRED"
      | "EMERGENCY_STOP"
      | "INVALID_INTENT",
    readonly status = 400,
  ) {
    super(message);
    this.name = "ApprovalError";
  }
}

export interface ApprovalOutcome {
  approval: Approval;
  transaction: Transaction | null;
  policy: PolicyResult | null;
}

export class ApprovalService {
  constructor(
    private readonly store: DataStore,
    private readonly transactions: TransactionService,
    private readonly portfolio: PortfolioService,
    private readonly security: SecurityService,
    private readonly execution: ExecutionService,
    private readonly audit: AuditService,
    private readonly ttlMinutes: number,
  ) {}

  async create(userId: string, intentId: string, intent: TradeIntent): Promise<Approval> {
    const { price, quantity } = await this.portfolio.estimateQuantity(intent.asset, intent.amountUsd);
    const approval = await this.store.createApproval({
      intentId,
      userId,
      status: "PENDING",
      expiresAt: new Date(Date.now() + this.ttlMinutes * 60_000).toISOString(),
      approvedAt: null,
      summary: { action: intent.action, asset: intent.asset, amountUsd: intent.amountUsd, estimatedAmount: quantity, price },
    });
    await this.store.updateIntentStatus(intentId, "PENDING_APPROVAL");
    await this.audit.record(userId, "APPROVAL_CREATED", {
      intentId,
      approvalId: approval.id,
      expiresAt: approval.expiresAt,
      summary: approval.summary,
    });
    return approval;
  }

  async list(userId: string): Promise<Approval[]> {
    const approvals = await this.store.listApprovals(userId);
    const now = Date.now();
    const result: Approval[] = [];
    for (const a of approvals) {
      if (a.status === "PENDING" && new Date(a.expiresAt).getTime() < now) {
        result.push(await this.expire(a));
      } else {
        result.push(a);
      }
    }
    return result;
  }

  async listPending(userId: string): Promise<Approval[]> {
    return (await this.list(userId)).filter((a) => a.status === "PENDING");
  }

  private async expire(approval: Approval): Promise<Approval> {
    const updated = (await this.store.updateApproval(approval.id, { status: "EXPIRED" })) ?? { ...approval, status: "EXPIRED" as const };
    await this.store.updateIntentStatus(approval.intentId, "EXPIRED");
    const tx = await this.transactions.getByIntent(approval.intentId);
    if (tx && tx.status === "PENDING") await this.transactions.update(tx.id, { status: "EXPIRED" });
    await this.audit.record(approval.userId, "APPROVAL_EXPIRED", { intentId: approval.intentId, approvalId: approval.id });
    return updated;
  }

  /** Loads the approval and verifies every precondition. Never trusts the client. */
  private async loadForDecision(userId: string, approvalId: string): Promise<{ approval: Approval; intent: TradeIntent }> {
    const approval = await this.store.getApproval(approvalId);
    if (!approval) throw new ApprovalError("Approval not found.", "NOT_FOUND", 404);
    if (approval.userId !== userId) throw new ApprovalError("Approval does not belong to the current user.", "FORBIDDEN", 403);

    if (approval.status === "PENDING" && new Date(approval.expiresAt).getTime() < Date.now()) {
      await this.expire(approval);
      throw new ApprovalError("Approval has expired. No transaction was executed.", "EXPIRED", 409);
    }
    if (approval.status !== "PENDING") {
      throw new ApprovalError(`Approval is already ${approval.status.toLowerCase()}.`, "NOT_PENDING", 409);
    }

    const intentRecord = await this.store.getIntent(approval.intentId);
    if (!intentRecord || intentRecord.userId !== userId) throw new ApprovalError("Intent not found.", "INVALID_INTENT", 404);
    if (intentRecord.status !== "PENDING_APPROVAL") {
      throw new ApprovalError(`Intent is no longer awaiting approval (status ${intentRecord.status}).`, "INVALID_INTENT", 409);
    }
    const parsed = TradeIntentSchema.safeParse(intentRecord.payload);
    if (!parsed.success) throw new ApprovalError("Stored intent is malformed.", "INVALID_INTENT", 422);

    return { approval, intent: parsed.data };
  }

  async approve(userId: string, approvalId: string): Promise<ApprovalOutcome> {
    const { approval, intent } = await this.loadForDecision(userId, approvalId);

    if (await this.security.isEmergencyStopped(userId)) {
      throw new ApprovalError("Emergency stop is active. No transaction was executed.", "EMERGENCY_STOP", 423);
    }

    const approved = (await this.store.updateApproval(approval.id, { status: "APPROVED", approvedAt: new Date().toISOString() }))!;
    await this.store.updateIntentStatus(approval.intentId, "APPROVED");
    const pendingTx = await this.transactions.getByIntent(approval.intentId);
    if (pendingTx) await this.transactions.update(pendingTx.id, { status: "APPROVED" });
    await this.audit.record(userId, "APPROVAL_APPROVED", { intentId: approval.intentId, approvalId: approval.id });

    const { transaction, policy } = await this.execution.execute(userId, approval.intentId, intent);
    return { approval: approved, transaction, policy };
  }

  async reject(userId: string, approvalId: string, reason?: string): Promise<ApprovalOutcome> {
    const { approval } = await this.loadForDecision(userId, approvalId);
    const rejected = (await this.store.updateApproval(approval.id, { status: "REJECTED" }))!;
    await this.store.updateIntentStatus(approval.intentId, "REJECTED");
    const tx = await this.transactions.getByIntent(approval.intentId);
    const updatedTx = tx ? await this.transactions.update(tx.id, { status: "REJECTED", failureReason: reason ?? "Rejected by user" }) : null;
    await this.audit.record(userId, "APPROVAL_REJECTED", { intentId: approval.intentId, approvalId: approval.id, reason: reason ?? null });
    return { approval: rejected, transaction: updatedTx, policy: null };
  }
}
