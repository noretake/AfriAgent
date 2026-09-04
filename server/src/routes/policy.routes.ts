import { Router } from "express";
import { PolicyUpdateSchema } from "../policies/policy.schemas.js";
import { asyncHandler, body, validate } from "../middleware/validation.middleware.js";
import type { Services } from "../services.js";

export function policyRoutes(s: Services): Router {
  const r = Router();

  r.get("/policies", asyncHandler(async (req, res) => {
    res.json(await s.policies.get(req.user.id));
  }));

  r.put("/policies", validate({ body: PolicyUpdateSchema }), asyncHandler(async (req, res) => {
    const input = body(req, PolicyUpdateSchema);
    res.json(await s.policies.update(req.user.id, input));
  }));

  return r;
}
