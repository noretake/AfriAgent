import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { DataStore, User } from "../db/store.js";
import { DEFAULT_POLICY } from "../db/client.js";
import { HttpError } from "./error.middleware.js";

declare module "express-serve-static-core" {
  interface Request {
    user: User;
  }
}

/**
 * Demo authentication: every request is bound to the seeded demo user, resolved
 * server-side. The client can never choose the user ID.
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

export interface SupabaseAuthOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  store: DataStore;
}

/**
 * Supabase authentication: verifies the `Authorization: Bearer <access_token>`
 * JWT with Supabase Auth, then binds the request to the matching application
 * user (created with a default policy on first sign-in). The user identity is
 * derived solely from the verified token, never from request parameters.
 */
export function supabaseAuth(opts: SupabaseAuthOptions): RequestHandler {
  const client: SupabaseClient = createClient(opts.supabaseUrl, opts.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const usersByEmail = new Map<string, User>();

  async function provision(email: string, name: string): Promise<User> {
    const cached = usersByEmail.get(email);
    if (cached) return cached;
    let user = await opts.store.getUserByEmail(email);
    if (!user) {
      user = await opts.store.createUser({ email, name });
      await opts.store.createPolicy({ userId: user.id, ...DEFAULT_POLICY });
    }
    usersByEmail.set(email, user);
    return user;
  }

  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) {
      next(new HttpError(401, "Sign in required.", "UNAUTHORIZED"));
      return;
    }
    client.auth
      .getUser(token)
      .then(async ({ data, error }) => {
        const email = data.user?.email;
        if (error || !email) throw new HttpError(401, "Invalid or expired session. Please sign in again.", "UNAUTHORIZED");
        const meta = data.user.user_metadata as { name?: string; full_name?: string } | null;
        const name = meta?.name ?? meta?.full_name ?? email.split("@")[0];
        req.user = await provision(email.toLowerCase(), name);
        next();
      })
      .catch(next);
  };
}
