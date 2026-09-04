import { z } from "zod";

export const finiteMoney = z
  .number({ invalid_type_error: "Amount must be a number" })
  .finite("Amount must be finite")
  .positive("Amount must be greater than zero");

export const AssetSymbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2)
  .max(10)
  .regex(/^[A-Z0-9]+$/, "Asset symbol must be alphanumeric");

export const PolicyUpdateSchema = z
  .object({
    maxTransactionUsd: finiteMoney.max(1_000_000),
    dailyLimitUsd: finiteMoney.max(10_000_000),
    maxPortfolioExposure: z.number().finite().min(1).max(100),
    allowedAssets: z.array(AssetSymbolSchema).min(1).max(20),
    requireApproval: z.boolean(),
    riskTolerance: z.enum(["conservative", "moderate", "aggressive"]),
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "At least one policy field is required" });

export type PolicyUpdateInput = z.infer<typeof PolicyUpdateSchema>;
