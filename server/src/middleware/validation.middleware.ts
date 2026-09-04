import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodTypeAny, z } from "zod";

declare module "express-serve-static-core" {
  interface Request {
    validated: { body?: unknown; params?: unknown; query?: unknown };
  }
}

export function validate<B extends ZodTypeAny = ZodTypeAny, P extends ZodTypeAny = ZodTypeAny, Q extends ZodTypeAny = ZodTypeAny>(schemas: {
  body?: B;
  params?: P;
  query?: Q;
}): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.validated = {
        body: schemas.body ? schemas.body.parse(req.body) : undefined,
        params: schemas.params ? schemas.params.parse(req.params) : undefined,
        query: schemas.query ? schemas.query.parse(req.query) : undefined,
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function body<T extends ZodTypeAny>(req: Request, _schema: T): z.infer<T> {
  return req.validated.body as z.infer<T>;
}
export function params<T extends ZodTypeAny>(req: Request, _schema: T): z.infer<T> {
  return req.validated.params as z.infer<T>;
}

/** Wraps an async handler so rejections reach the error middleware (Express 4). */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
