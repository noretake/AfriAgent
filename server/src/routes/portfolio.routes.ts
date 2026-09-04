import { Router } from "express";
import { z } from "zod";
import { AssetSymbolSchema } from "../policies/policy.schemas.js";
import { asyncHandler, params, validate } from "../middleware/validation.middleware.js";
import type { Services } from "../services.js";
import type { DashboardResponse } from "../../../shared/types/index.js";

const AssetParams = z.object({ asset: z.string().trim().toUpperCase().pipe(AssetSymbolSchema) });

export function portfolioRoutes(s: Services): Router {
  const r = Router();

  r.get("/portfolio", asyncHandler(async (req, res) => {
    res.json(await s.portfolio.getPortfolio(req.user.id));
  }));

  r.get("/balance", asyncHandler(async (req, res) => {
    res.json({ balances: await s.portfolio.getBalances(req.user.id) });
  }));

  r.get("/market/:asset", validate({ params: AssetParams }), asyncHandler(async (req, res) => {
    const { asset } = params(req, AssetParams);
    res.json(await s.portfolio.getMarketData(asset));
  }));

  r.get("/dashboard", asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const [portfolio, today, recentActivity, securityState, pendingApprovals] = await Promise.all([
      s.portfolio.getPortfolio(userId),
      s.transactions.todaySummary(userId),
      s.audit.list(userId, { limit: 10 }),
      s.security.getState(userId),
      s.approvals.listPending(userId),
    ]);
    const payload: DashboardResponse = {
      portfolio,
      agentStatus: {
        aiAgent: "ONLINE",
        policyEngine: "ACTIVE",
        exchange: s.exchange.mode === "demo" ? "DEMO" : "LIVE",
        security: securityState.emergencyStop ? "EMERGENCY_STOP" : "PROTECTED",
        aiProvider: s.agent.parserName,
      },
      today,
      recentActivity,
      pendingApprovals,
      demoMode: s.demoMode,
    };
    res.json(payload);
  }));

  return r;
}
