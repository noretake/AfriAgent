import type { SecurityStatus } from "../../../shared/types/index.js";
import { AuditService } from "../audit/audit.service.js";
import type { DataStore, SecurityState } from "../db/store.js";

export class SecurityService {
  constructor(
    private readonly store: DataStore,
    private readonly audit: AuditService,
    private readonly opts: { demoMode: boolean; requireApproval: (userId: string) => Promise<boolean> },
  ) {}

  getState(userId: string): Promise<SecurityState> {
    return this.store.getSecurityState(userId);
  }

  async isEmergencyStopped(userId: string): Promise<boolean> {
    return (await this.getState(userId)).emergencyStop;
  }

  async activateEmergencyStop(userId: string, reason?: string): Promise<SecurityState> {
    const state = await this.store.setSecurityState({
      userId,
      emergencyStop: true,
      activatedAt: new Date().toISOString(),
      reason: reason ?? "Activated by user",
    });
    await this.audit.record(userId, "EMERGENCY_STOP_ACTIVATED", { reason: state.reason });
    return state;
  }

  async resetEmergencyStop(userId: string): Promise<SecurityState> {
    const state = await this.store.setSecurityState({ userId, emergencyStop: false, activatedAt: null, reason: null });
    await this.audit.record(userId, "EMERGENCY_STOP_DEACTIVATED", {});
    return state;
  }

  async status(userId: string): Promise<SecurityStatus> {
    const state = await this.getState(userId);
    const requireApproval = await this.opts.requireApproval(userId);
    return {
      agent: state.emergencyStop ? "STOPPED" : "ACTIVE",
      marketData: "ENABLED",
      balanceAccess: "ENABLED",
      trading: state.emergencyStop ? "DISABLED" : "ENABLED",
      withdrawals: "DISABLED",
      policyEngine: "ACTIVE",
      humanApproval: requireApproval ? "ACTIVE" : "INACTIVE",
      demoMode: this.opts.demoMode ? "ACTIVE" : "INACTIVE",
      emergencyStop: {
        active: state.emergencyStop,
        activatedAt: state.activatedAt,
        reason: state.reason,
      },
    };
  }
}
