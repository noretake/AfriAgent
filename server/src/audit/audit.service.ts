import type { AuditEventType, AuditLog } from "../../../shared/types/index.js";
import type { DataStore } from "../db/store.js";

export class AuditService {
  constructor(private readonly store: DataStore) {}

  record(userId: string, eventType: AuditEventType, metadata: Record<string, unknown> = {}): Promise<AuditLog> {
    return this.store.createAuditLog({ userId, eventType, metadata });
  }

  list(userId: string, opts?: { limit?: number; eventTypes?: AuditEventType[]; intentId?: string }): Promise<AuditLog[]> {
    return this.store.listAuditLogs(userId, opts);
  }

  async lastBlocked(userId: string): Promise<AuditLog | null> {
    const [log] = await this.store.listAuditLogs(userId, { limit: 1, eventTypes: ["TRANSACTION_BLOCKED"] });
    return log ?? null;
  }
}
