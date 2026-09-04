import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AgentMessageRecord,
  Approval,
  ApprovalStatus,
  AuditLog,
  Intent,
  IntentRecord,
  IntentStatus,
  Policy,
  RiskTolerance,
  Transaction,
} from "../../../shared/types/index.js";
import type { AgentSession, DataStore, NewRecord, SecurityState, User } from "./store.js";

type Row = Record<string, unknown>;

const str = (v: unknown) => (v == null ? null : String(v));
const num = (v: unknown) => (v == null ? null : Number(v));

function mapUser(r: Row): User {
  return { id: String(r.id), email: String(r.email), name: String(r.name), createdAt: String(r.created_at) };
}
function mapPolicy(r: Row): Policy {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    maxTransactionUsd: Number(r.max_transaction_usd),
    dailyLimitUsd: Number(r.daily_limit_usd),
    maxPortfolioExposure: Number(r.max_portfolio_exposure),
    allowedAssets: (r.allowed_assets as string[]) ?? [],
    requireApproval: Boolean(r.require_approval),
    riskTolerance: String(r.risk_tolerance) as RiskTolerance,
    version: Number(r.version),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}
function mapSession(r: Row): AgentSession {
  return { id: String(r.id), userId: String(r.user_id), createdAt: String(r.created_at), updatedAt: String(r.updated_at) };
}
function mapMessage(r: Row): AgentMessageRecord {
  return {
    id: String(r.id),
    sessionId: String(r.session_id),
    role: String(r.role) as AgentMessageRecord["role"],
    content: String(r.content),
    createdAt: String(r.created_at),
  };
}
function mapIntent(r: Row): IntentRecord {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    messageId: str(r.message_id),
    type: String(r.type) as IntentRecord["type"],
    payload: r.payload as Intent,
    status: String(r.status) as IntentStatus,
    createdAt: String(r.created_at),
  };
}
function mapApproval(r: Row): Approval {
  return {
    id: String(r.id),
    intentId: String(r.intent_id),
    userId: String(r.user_id),
    status: String(r.status) as ApprovalStatus,
    summary: r.summary as Approval["summary"],
    expiresAt: String(r.expires_at),
    approvedAt: str(r.approved_at),
    createdAt: String(r.created_at),
  };
}
function mapTransaction(r: Row): Transaction {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    intentId: String(r.intent_id),
    externalTransactionId: str(r.external_transaction_id),
    action: String(r.action) as Transaction["action"],
    asset: String(r.asset),
    quoteAsset: String(r.quote_asset),
    amount: Number(r.amount),
    amountUsd: Number(r.amount_usd),
    price: num(r.price),
    status: String(r.status) as Transaction["status"],
    executionLabel: str(r.execution_label) as Transaction["executionLabel"],
    failureReason: str(r.failure_reason),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}
function mapAudit(r: Row): AuditLog {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    eventType: String(r.event_type) as AuditLog["eventType"],
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
  };
}

function txPatchToRow(patch: Partial<Transaction>): Row {
  const row: Row = {};
  if (patch.externalTransactionId !== undefined) row.external_transaction_id = patch.externalTransactionId;
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.amountUsd !== undefined) row.amount_usd = patch.amountUsd;
  if (patch.price !== undefined) row.price = patch.price;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.executionLabel !== undefined) row.execution_label = patch.executionLabel;
  if (patch.failureReason !== undefined) row.failure_reason = patch.failureReason;
  row.updated_at = new Date().toISOString();
  return row;
}

export class SupabaseStore implements DataStore {
  readonly kind = "supabase" as const;
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key, { auth: { persistSession: false } });
  }

  async init(): Promise<void> {
    const { error } = await this.client.from("users").select("id").limit(1);
    if (error) throw new Error(`Supabase connection failed: ${error.message}. Did you apply server/src/db/schema.sql?`);
  }

  private async one<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>, map: (r: Row) => T): Promise<T | null> {
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ? map(data as Row) : null;
  }
  private async many<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>, map: (r: Row) => T): Promise<T[]> {
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data as Row[]) ?? []).map(map);
  }
  private async insert<T>(table: string, row: Row, map: (r: Row) => T, createdAt?: string): Promise<T> {
    if (createdAt) row = { ...row, created_at: createdAt, ...(table === "transactions" ? { updated_at: createdAt } : {}) };
    const result = await this.one(this.client.from(table).insert(row).select().single(), map);
    if (!result) throw new Error(`Insert into ${table} returned no row`);
    return result;
  }

  getUser(id: string) {
    return this.one(this.client.from("users").select("*").eq("id", id).maybeSingle(), mapUser);
  }
  getUserByEmail(email: string) {
    return this.one(this.client.from("users").select("*").eq("email", email).maybeSingle(), mapUser);
  }
  createUser(user: NewRecord<User>) {
    return this.insert("users", { email: user.email, name: user.name }, mapUser);
  }

  getPolicy(userId: string) {
    return this.one(this.client.from("policies").select("*").eq("user_id", userId).maybeSingle(), mapPolicy);
  }
  createPolicy(policy: Omit<Policy, "id" | "createdAt" | "updatedAt">) {
    return this.insert(
      "policies",
      {
        user_id: policy.userId,
        max_transaction_usd: policy.maxTransactionUsd,
        daily_limit_usd: policy.dailyLimitUsd,
        max_portfolio_exposure: policy.maxPortfolioExposure,
        allowed_assets: policy.allowedAssets,
        require_approval: policy.requireApproval,
        risk_tolerance: policy.riskTolerance,
        version: policy.version,
      },
      mapPolicy,
    );
  }
  async updatePolicy(policy: Policy) {
    const result = await this.one(
      this.client
        .from("policies")
        .update({
          max_transaction_usd: policy.maxTransactionUsd,
          daily_limit_usd: policy.dailyLimitUsd,
          max_portfolio_exposure: policy.maxPortfolioExposure,
          allowed_assets: policy.allowedAssets,
          require_approval: policy.requireApproval,
          risk_tolerance: policy.riskTolerance,
          version: policy.version,
          updated_at: new Date().toISOString(),
        })
        .eq("id", policy.id)
        .select()
        .single(),
      mapPolicy,
    );
    if (!result) throw new Error("Policy update returned no row");
    return result;
  }

  getSession(id: string) {
    return this.one(this.client.from("agent_sessions").select("*").eq("id", id).maybeSingle(), mapSession);
  }
  createSession(userId: string, id?: string) {
    return this.insert("agent_sessions", id ? { id, user_id: userId } : { user_id: userId }, mapSession);
  }
  async touchSession(id: string) {
    await this.client.from("agent_sessions").update({ updated_at: new Date().toISOString() }).eq("id", id);
  }

  createMessage(message: NewRecord<AgentMessageRecord>) {
    return this.insert(
      "agent_messages",
      { session_id: message.sessionId, role: message.role, content: message.content },
      mapMessage,
    );
  }
  getMessage(id: string) {
    return this.one(this.client.from("agent_messages").select("*").eq("id", id).maybeSingle(), mapMessage);
  }
  listMessages(sessionId: string) {
    return this.many(
      this.client.from("agent_messages").select("*").eq("session_id", sessionId).order("created_at"),
      mapMessage,
    );
  }

  createIntent(intent: NewRecord<IntentRecord>) {
    return this.insert(
      "intents",
      {
        user_id: intent.userId,
        message_id: intent.messageId,
        type: intent.type,
        payload: intent.payload,
        status: intent.status,
      },
      mapIntent,
      intent.createdAt,
    );
  }
  getIntent(id: string) {
    return this.one(this.client.from("intents").select("*").eq("id", id).maybeSingle(), mapIntent);
  }
  updateIntentStatus(id: string, status: IntentStatus) {
    return this.one(this.client.from("intents").update({ status }).eq("id", id).select().maybeSingle(), mapIntent);
  }

  createApproval(approval: NewRecord<Approval>) {
    return this.insert(
      "approvals",
      {
        intent_id: approval.intentId,
        user_id: approval.userId,
        status: approval.status,
        summary: approval.summary,
        expires_at: approval.expiresAt,
        approved_at: approval.approvedAt,
      },
      mapApproval,
      approval.createdAt,
    );
  }
  getApproval(id: string) {
    return this.one(this.client.from("approvals").select("*").eq("id", id).maybeSingle(), mapApproval);
  }
  getApprovalByIntent(intentId: string) {
    return this.one(
      this.client.from("approvals").select("*").eq("intent_id", intentId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      mapApproval,
    );
  }
  listApprovals(userId: string, status?: ApprovalStatus) {
    let q = this.client.from("approvals").select("*").eq("user_id", userId);
    if (status) q = q.eq("status", status);
    return this.many(q.order("created_at", { ascending: false }), mapApproval);
  }
  updateApproval(id: string, patch: Partial<Pick<Approval, "status" | "approvedAt">>) {
    const row: Row = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.approvedAt !== undefined) row.approved_at = patch.approvedAt;
    return this.one(this.client.from("approvals").update(row).eq("id", id).select().maybeSingle(), mapApproval);
  }

  createTransaction(tx: Omit<Transaction, "id" | "createdAt" | "updatedAt"> & { createdAt?: string }) {
    return this.insert(
      "transactions",
      {
        user_id: tx.userId,
        intent_id: tx.intentId,
        external_transaction_id: tx.externalTransactionId,
        action: tx.action,
        asset: tx.asset,
        quote_asset: tx.quoteAsset,
        amount: tx.amount,
        amount_usd: tx.amountUsd,
        price: tx.price,
        status: tx.status,
        execution_label: tx.executionLabel,
        failure_reason: tx.failureReason,
      },
      mapTransaction,
      tx.createdAt,
    );
  }
  getTransaction(id: string) {
    return this.one(this.client.from("transactions").select("*").eq("id", id).maybeSingle(), mapTransaction);
  }
  getTransactionByIntent(intentId: string) {
    return this.one(
      this.client.from("transactions").select("*").eq("intent_id", intentId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      mapTransaction,
    );
  }
  listTransactions(userId: string, opts?: { since?: string; limit?: number }) {
    let q = this.client.from("transactions").select("*").eq("user_id", userId);
    if (opts?.since) q = q.gte("created_at", opts.since);
    q = q.order("created_at", { ascending: false });
    if (opts?.limit) q = q.limit(opts.limit);
    return this.many(q, mapTransaction);
  }
  updateTransaction(id: string, patch: Partial<Transaction>) {
    return this.one(
      this.client.from("transactions").update(txPatchToRow(patch)).eq("id", id).select().maybeSingle(),
      mapTransaction,
    );
  }

  createAuditLog(log: NewRecord<AuditLog>) {
    return this.insert(
      "audit_logs",
      { user_id: log.userId, event_type: log.eventType, metadata: log.metadata },
      mapAudit,
      log.createdAt,
    );
  }
  listAuditLogs(userId: string, opts?: { limit?: number; eventTypes?: string[]; intentId?: string }) {
    let q = this.client.from("audit_logs").select("*").eq("user_id", userId);
    if (opts?.eventTypes) q = q.in("event_type", opts.eventTypes);
    if (opts?.intentId) q = q.eq("metadata->>intentId", opts.intentId);
    q = q.order("created_at", { ascending: false });
    if (opts?.limit) q = q.limit(opts.limit);
    return this.many(q, mapAudit);
  }

  async getSecurityState(userId: string): Promise<SecurityState> {
    const { data, error } = await this.client.from("security_state").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { userId, emergencyStop: false, activatedAt: null, reason: null };
    const r = data as Row;
    return { userId, emergencyStop: Boolean(r.emergency_stop), activatedAt: str(r.activated_at), reason: str(r.reason) };
  }
  async setSecurityState(state: SecurityState) {
    const { error } = await this.client.from("security_state").upsert({
      user_id: state.userId,
      emergency_stop: state.emergencyStop,
      activated_at: state.activatedAt,
      reason: state.reason,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return state;
  }
}
