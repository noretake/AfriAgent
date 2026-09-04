import { env } from "../config/env.js";
import { MemoryStore } from "./memory.store.js";
import { seedSampleHistory } from "./sample-data.js";
import type { DataStore } from "./store.js";
import { SupabaseStore } from "./supabase.store.js";

export const DEMO_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo@afriagent.local",
  name: "Demo User",
};

export const DEFAULT_POLICY = {
  maxTransactionUsd: 50,
  dailyLimitUsd: 100,
  maxPortfolioExposure: 30,
  allowedAssets: ["BTC", "ETH", "USDT"],
  requireApproval: true,
  riskTolerance: "conservative" as const,
  version: 1,
};

export function createStore(): DataStore {
  if (env.hasSupabase && env.SUPABASE_URL) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY!;
    return new SupabaseStore(env.SUPABASE_URL, key);
  }
  return new MemoryStore();
}

/** Ensures the demo user, default policy and security state exist. */
export async function seedStore(store: DataStore): Promise<void> {
  let user = await store.getUserByEmail(DEMO_USER.email);
  if (!user) {
    user = store instanceof MemoryStore
      ? await store.createUser({ ...DEMO_USER })
      : await store.createUser({ email: DEMO_USER.email, name: DEMO_USER.name });
  }
  const policy = await store.getPolicy(user.id);
  if (!policy) {
    await store.createPolicy({ userId: user.id, ...DEFAULT_POLICY });
  }
  if (env.seedSampleData && !env.isTest) {
    await seedSampleHistory(store, user.id);
  }
}
