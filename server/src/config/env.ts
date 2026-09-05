import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../../.env") });
dotenv.config();

const boolFromEnv = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => {
    if (typeof v === "boolean") return v;
    if (v === undefined || v === "") return undefined;
    return ["1", "true", "yes", "on"].includes(v.toLowerCase());
  });

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  DEMO_MODE: boolFromEnv,
  SEED_SAMPLE_DATA: boolFromEnv,
  REQUIRE_AUTH: boolFromEnv,
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  AI_PROVIDER: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  BINANCE_API_KEY: z.string().optional(),
  BINANCE_API_SECRET: z.string().optional(),
  BINANCE_BASE_URL: z.string().url().optional(),
  BINANCE_MCP_ENDPOINT: z.string().optional(),
  APPROVAL_TTL_MINUTES: z.coerce.number().int().positive().default(10),
});

const parsed = EnvSchema.parse(process.env);

const hasBinance = Boolean(parsed.BINANCE_API_KEY && parsed.BINANCE_API_SECRET);
const hasSupabase = Boolean(parsed.SUPABASE_URL && (parsed.SUPABASE_SERVICE_ROLE_KEY || parsed.SUPABASE_ANON_KEY));
const hasAi = Boolean(parsed.AI_PROVIDER && parsed.AI_API_KEY);

// Demo mode is on unless explicitly disabled AND real exchange credentials exist.
const demoMode = parsed.DEMO_MODE === undefined ? true : parsed.DEMO_MODE || !hasBinance;

// Sample history is seeded in Demo Mode unless disabled; never by default against a live exchange.
const seedSampleData = parsed.SEED_SAMPLE_DATA ?? demoMode;

// Supabase Auth is mandatory outside Demo Mode; it can be opted into for demo deployments.
const requireAuth = parsed.REQUIRE_AUTH ?? !demoMode;
if (requireAuth && !(parsed.SUPABASE_URL && parsed.SUPABASE_SERVICE_ROLE_KEY)) {
  throw new Error("REQUIRE_AUTH (default outside DEMO_MODE) needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to verify Supabase Auth tokens.");
}

export const env = {
  ...parsed,
  demoMode,
  seedSampleData,
  requireAuth,
  hasBinance,
  hasSupabase,
  hasAi,
  isTest: parsed.NODE_ENV === "test",
};

export type Env = typeof env;
