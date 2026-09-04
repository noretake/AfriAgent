import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApprovalError } from "../approvals/approval.service.js";
import { ExchangeError } from "../exchanges/exchange.interface.js";
import { ExecutionBlockedError, ExecutionFailedError } from "../transactions/execution.service.js";

export class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly code = "HTTP_ERROR") {
    super(message);
    this.name = "HttpError";
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Request validation failed", issues: err.flatten() },
    });
  }
  if (err instanceof ApprovalError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err instanceof ExecutionBlockedError) {
    return res.status(422).json({
      error: { code: "TRANSACTION_BLOCKED", message: err.message },
      policy: err.policy,
      transaction: err.transaction,
    });
  }
  if (err instanceof ExecutionFailedError) {
    return res.status(502).json({
      error: { code: "TRANSACTION_FAILED", message: `Transaction failed. ${err.message} No successful execution was recorded.` },
      transaction: err.transaction,
    });
  }
  if (err instanceof ExchangeError) {
    const status = err.code === "UNSUPPORTED_ASSET" ? 400 : err.code === "NOT_CONFIGURED" ? 503 : 502;
    return res.status(status).json({ error: { code: err.code, message: err.message } });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  console.error("[error]", err);
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
}
