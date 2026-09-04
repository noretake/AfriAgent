import { randomUUID } from "node:crypto";
import type {
  AgentMessageRecord,
  Approval,
  ApprovalStatus,
  AuditLog,
  IntentRecord,
  IntentStatus,
  Policy,
  Transaction,
} from "../../../shared/types/index.js";
import type { AgentSession, DataStore, NewRecord, SecurityState, User } from "./store.js";

const now = () => new Date().toISOString();

export class MemoryStore implements DataStore {
  readonly kind = "memory" as const;

  private users = new Map<string, User>();
  private policies = new Map<string, Policy>();
  private sessions = new Map<string, AgentSession>();
  private messages = new Map<string, AgentMessageRecord>();
  private intents = new Map<string, IntentRecord>();
  private approvals = new Map<string, Approval>();
  private transactions = new Map<string, Transaction>();
  private auditLogs: AuditLog[] = [];
  private security = new Map<string, SecurityState>();

  async init(): Promise<void> {}

  async getUser(id: string) {
    return this.users.get(id) ?? null;
  }
  async getUserByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email) ?? null;
  }
  async createUser(user: NewRecord<User> & { id?: string }) {
    const record: User = { ...user, id: user.id ?? randomUUID(), createdAt: now() };
    this.users.set(record.id, record);
    return record;
  }

  async getPolicy(userId: string) {
    return this.policies.get(userId) ?? null;
  }
  async createPolicy(policy: Omit<Policy, "id" | "createdAt" | "updatedAt">) {
    const ts = now();
    const record: Policy = { ...policy, id: randomUUID(), createdAt: ts, updatedAt: ts };
    this.policies.set(record.userId, record);
    return record;
  }
  async updatePolicy(policy: Policy) {
    const record = { ...policy, updatedAt: now() };
    this.policies.set(record.userId, record);
    return record;
  }

  async getSession(id: string) {
    return this.sessions.get(id) ?? null;
  }
  async createSession(userId: string, id?: string) {
    const ts = now();
    const record: AgentSession = { id: id ?? randomUUID(), userId, createdAt: ts, updatedAt: ts };
    this.sessions.set(record.id, record);
    return record;
  }
  async touchSession(id: string) {
    const s = this.sessions.get(id);
    if (s) s.updatedAt = now();
  }

  async createMessage(message: NewRecord<AgentMessageRecord>) {
    const record: AgentMessageRecord = { ...message, id: randomUUID(), createdAt: now() };
    this.messages.set(record.id, record);
    return record;
  }
  async getMessage(id: string) {
    return this.messages.get(id) ?? null;
  }
  async listMessages(sessionId: string) {
    return [...this.messages.values()]
      .filter((m) => m.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createIntent(intent: NewRecord<IntentRecord>) {
    const record: IntentRecord = { ...intent, id: randomUUID(), createdAt: now() };
    this.intents.set(record.id, record);
    return record;
  }
  async getIntent(id: string) {
    return this.intents.get(id) ?? null;
  }
  async updateIntentStatus(id: string, status: IntentStatus) {
    const i = this.intents.get(id);
    if (!i) return null;
    i.status = status;
    return i;
  }

  async createApproval(approval: NewRecord<Approval>) {
    const record: Approval = { ...approval, id: randomUUID(), createdAt: now() };
    this.approvals.set(record.id, record);
    return record;
  }
  async getApproval(id: string) {
    return this.approvals.get(id) ?? null;
  }
  async getApprovalByIntent(intentId: string) {
    return [...this.approvals.values()].find((a) => a.intentId === intentId) ?? null;
  }
  async listApprovals(userId: string, status?: ApprovalStatus) {
    return [...this.approvals.values()]
      .filter((a) => a.userId === userId && (!status || a.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async updateApproval(id: string, patch: Partial<Pick<Approval, "status" | "approvedAt">>) {
    const a = this.approvals.get(id);
    if (!a) return null;
    Object.assign(a, patch);
    return a;
  }

  async createTransaction(tx: Omit<Transaction, "id" | "createdAt" | "updatedAt">) {
    const ts = now();
    const record: Transaction = { ...tx, id: randomUUID(), createdAt: ts, updatedAt: ts };
    this.transactions.set(record.id, record);
    return record;
  }
  async getTransaction(id: string) {
    return this.transactions.get(id) ?? null;
  }
  async getTransactionByIntent(intentId: string) {
    return [...this.transactions.values()].find((t) => t.intentId === intentId) ?? null;
  }
  async listTransactions(userId: string, opts?: { since?: string; limit?: number }) {
    let list = [...this.transactions.values()].filter((t) => t.userId === userId);
    if (opts?.since) list = list.filter((t) => t.createdAt >= opts.since!);
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return opts?.limit ? list.slice(0, opts.limit) : list;
  }
  async updateTransaction(id: string, patch: Partial<Transaction>) {
    const t = this.transactions.get(id);
    if (!t) return null;
    Object.assign(t, patch, { updatedAt: now() });
    return t;
  }

  async createAuditLog(log: NewRecord<AuditLog>) {
    const record: AuditLog = { ...log, id: randomUUID(), createdAt: now() };
    this.auditLogs.push(record);
    return record;
  }
  async listAuditLogs(userId: string, opts?: { limit?: number; eventTypes?: string[]; intentId?: string }) {
    let list = this.auditLogs.filter((l) => l.userId === userId);
    if (opts?.eventTypes) list = list.filter((l) => opts.eventTypes!.includes(l.eventType));
    if (opts?.intentId) list = list.filter((l) => l.metadata.intentId === opts.intentId);
    list = [...list].reverse();
    return opts?.limit ? list.slice(0, opts.limit) : list;
  }

  async getSecurityState(userId: string) {
    return this.security.get(userId) ?? { userId, emergencyStop: false, activatedAt: null, reason: null };
  }
  async setSecurityState(state: SecurityState) {
    this.security.set(state.userId, state);
    return state;
  }
}
