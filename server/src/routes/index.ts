import { Router } from "express";
import type { HealthResponse } from "../../../shared/types/index.js";
import { demoAuth } from "../middleware/auth.middleware.js";
import type { Services } from "../services.js";
import { agentRoutes } from "./agent.routes.js";
import { approvalRoutes } from "./approval.routes.js";
import { auditRoutes } from "./audit.routes.js";
import { policyRoutes } from "./policy.routes.js";
import { portfolioRoutes } from "./portfolio.routes.js";
import { securityRoutes } from "./security.routes.js";
import { transactionRoutes } from "./transaction.routes.js";

export function apiRouter(s: Services): Router {
  const api = Router();

  api.get("/health", (_req, res) => {
    const payload: HealthResponse = {
      status: "ok",
      service: "afriagent",
      mode: s.demoMode ? "demo" : "live",
      storage: s.store.kind,
      aiProvider: s.agent.parserName,
      timestamp: new Date().toISOString(),
    };
    res.json(payload);
  });

  api.use(demoAuth(s.resolveUser));
  api.use(agentRoutes(s));
  api.use(portfolioRoutes(s));
  api.use(transactionRoutes(s));
  api.use(approvalRoutes(s));
  api.use(policyRoutes(s));
  api.use(securityRoutes(s));
  api.use(auditRoutes(s));

  return api;
}
