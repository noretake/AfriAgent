import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../middleware/error.middleware.js";
import { asyncHandler, params, validate } from "../middleware/validation.middleware.js";
import type { Services } from "../services.js";

const IdParams = z.object({ id: z.string().uuid() });

export function transactionRoutes(s: Services): Router {
  const r = Router();

  r.get("/transactions", asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
    res.json({ transactions: await s.transactions.list(req.user.id, { limit }) });
  }));

  r.get("/transactions/:id", validate({ params: IdParams }), asyncHandler(async (req, res) => {
    const { id } = params(req, IdParams);
    const detail = await s.transactions.detail(req.user.id, id);
    if (!detail) throw new HttpError(404, "Transaction not found", "NOT_FOUND");
    res.json(detail);
  }));

  return r;
}
