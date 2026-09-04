import { Router } from "express";
import { z } from "zod";
import { asyncHandler, body, validate } from "../middleware/validation.middleware.js";
import type { Services } from "../services.js";

const StopBody = z.object({ reason: z.string().trim().max(500).optional() }).default({});

export function securityRoutes(s: Services): Router {
  const r = Router();

  r.get("/security", asyncHandler(async (req, res) => {
    res.json(await s.security.status(req.user.id));
  }));

  r.post("/security/emergency-stop", validate({ body: StopBody }), asyncHandler(async (req, res) => {
    const { reason } = body(req, StopBody);
    await s.security.activateEmergencyStop(req.user.id, reason);
    res.json(await s.security.status(req.user.id));
  }));

  r.post("/security/emergency-stop/reset", asyncHandler(async (req, res) => {
    await s.security.resetEmergencyStop(req.user.id);
    res.json(await s.security.status(req.user.id));
  }));

  return r;
}
