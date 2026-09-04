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

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AgentSession {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityState {
  userId: string;
  emergencyStop: boolean;
  activatedAt: string | null;
  reason: string | null;
}

export type NewRecord<T> = Omit<T, "id" | "createdAt">;

export interface DataStore {
  readonly kind: "memory" | "supabase";
  init(): Promise<void>;

  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: NewRecord<User>): Promise<User>;

  getPolicy(userId: string): Promise<Policy | null>;
  createPolicy(policy: Omit<Policy, "id" | "createdAt" | "updatedAt">): Promise<Policy>;
  updatePolicy(policy: Policy): Promise<Policy>;

  getSession(id: string): Promise<AgentSession | null>;
  createSession(userId: string, id?: string): Promise<AgentSession>;
  touchSession(id: string): Promise<void>;

  createMessage(message: NewRecord<AgentMessageRecord>): Promise<AgentMessageRecord>;
  getMessage(id: string): Promise<AgentMessageRecord | null>;
  listMessages(sessionId: string): Promise<AgentMessageRecord[]>;

  createIntent(intent: NewRecord<IntentRecord>): Promise<IntentRecord>;
  getIntent(id: string): Promise<IntentRecord | null>;
  updateIntentStatus(id: string, status: IntentStatus): Promise<IntentRecord | null>;

  createApproval(approval: NewRecord<Approval>): Promise<Approval>;
  getApproval(id: string): Promise<Approval | null>;
  getApprovalByIntent(intentId: string): Promise<Approval | null>;
  listApprovals(userId: string, status?: ApprovalStatus): Promise<Approval[]>;
  updateApproval(id: string, patch: Partial<Pick<Approval, "status" | "approvedAt">>): Promise<Approval | null>;

  createTransaction(tx: Omit<Transaction, "id" | "createdAt" | "updatedAt">): Promise<Transaction>;
  getTransaction(id: string): Promise<Transaction | null>;
  getTransactionByIntent(intentId: string): Promise<Transaction | null>;
  listTransactions(userId: string, opts?: { since?: string; limit?: number }): Promise<Transaction[]>;
  updateTransaction(id: string, patch: Partial<Transaction>): Promise<Transaction | null>;

  createAuditLog(log: NewRecord<AuditLog>): Promise<AuditLog>;
  listAuditLogs(userId: string, opts?: { limit?: number; eventTypes?: string[]; intentId?: string }): Promise<AuditLog[]>;

  getSecurityState(userId: string): Promise<SecurityState>;
  setSecurityState(state: SecurityState): Promise<SecurityState>;
}
