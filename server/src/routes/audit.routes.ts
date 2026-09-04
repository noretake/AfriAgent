import { Router } from "express";
import { asyncHandler } from "../middleware/validation.middleware.js";
import type { Services } from "../services.js";

export function auditRoutes(s: Services): Router {
  const r = Router();

  r.get("/audit", asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
    res.json({ logs: await s.audit.list(req.user.id, { limit }) });
  }));

  return r;
}
