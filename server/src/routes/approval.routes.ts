import { Router } from "express";
import { z } from "zod";
import { asyncHandler, body, params, validate } from "../middleware/validation.middleware.js";
import type { Services } from "../services.js";

const IdParams = z.object({ id: z.string().uuid() });
const RejectBody = z.object({ reason: z.string().trim().max(500).optional() }).default({});

export function approvalRoutes(s: Services): Router {
  const r = Router();

  r.get("/approvals", asyncHandler(async (req, res) => {
    res.json({ approvals: await s.approvals.list(req.user.id) });
  }));

  r.post("/approvals/:id/approve", validate({ params: IdParams }), asyncHandler(async (req, res) => {
    const { id } = params(req, IdParams);
    const outcome = await s.approvals.approve(req.user.id, id);
    res.json({
      ...outcome,
      message: `Transaction executed successfully (${outcome.transaction?.executionLabel ?? "EXECUTED"}).`,
    });
  }));

  r.post("/approvals/:id/reject", validate({ params: IdParams, body: RejectBody }), asyncHandler(async (req, res) => {
    const { id } = params(req, IdParams);
    const { reason } = body(req, RejectBody);
    const outcome = await s.approvals.reject(req.user.id, id, reason);
    res.json({ ...outcome, message: "Transaction rejected. No transaction was executed." });
  }));

  return r;
}
