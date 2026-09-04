import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { User } from "../db/store.js";

declare module "express-serve-static-core" {
  interface Request {
    user: User;
  }
}

/**
 * Demo authentication: every request is bound to the seeded demo user, resolved
 * server-side. The client can never choose the user ID. Swap this middleware
 * for Supabase Auth (verify JWT → load user) without touching the services.
 */
export function demoAuth(resolveUser: () => Promise<User>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    resolveUser()
      .then((user) => {
        req.user = user;
        next();
      })
      .catch(next);
  };
}
