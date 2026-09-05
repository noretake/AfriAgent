import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getUser } }),
}));

import { MemoryStore } from "../server/src/db/memory.store.js";
import { supabaseAuth } from "../server/src/middleware/auth.middleware.js";
import { HttpError } from "../server/src/middleware/error.middleware.js";

function run(handler: ReturnType<typeof supabaseAuth>, authorization?: string) {
  const req = { header: (n: string) => (n === "authorization" ? authorization : undefined) } as unknown as Request;
  return new Promise<{ req: Request; err: unknown }>((resolve) => {
    const next: NextFunction = (err?: unknown) => resolve({ req, err });
    handler(req, {} as Response, next);
  });
}

describe("supabaseAuth middleware", () => {
  let store: MemoryStore;
  let handler: ReturnType<typeof supabaseAuth>;

  beforeEach(() => {
    getUser.mockReset();
    store = new MemoryStore();
    handler = supabaseAuth({ supabaseUrl: "https://x.supabase.co", serviceRoleKey: "service", store });
  });

  it("rejects requests without a bearer token", async () => {
    const { err } = await run(handler);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(401);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects invalid or expired tokens", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "bad jwt" } });
    const { err, req } = await run(handler, "Bearer nope");
    expect((err as HttpError).status).toBe(401);
    expect(req.user).toBeUndefined();
  });

  it("provisions a user + default policy on first verified request and reuses it afterwards", async () => {
    getUser.mockResolvedValue({
      data: { user: { email: "Ama@Example.com", user_metadata: { full_name: "Ama" } } },
      error: null,
    });
    const first = await run(handler, "Bearer good");
    expect(first.err).toBeUndefined();
    expect(first.req.user).toMatchObject({ email: "ama@example.com", name: "Ama" });
    const policy = await store.getPolicy(first.req.user!.id);
    expect(policy).toMatchObject({ requireApproval: true, maxTransactionUsd: 50 });

    const second = await run(handler, "Bearer good");
    expect(second.req.user!.id).toBe(first.req.user!.id);
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it("derives identity from the token, never from the request", async () => {
    getUser.mockResolvedValue({ data: { user: { email: "real@example.com", user_metadata: null } }, error: null });
    const req = {
      header: (n: string) => (n === "authorization" ? "Bearer good" : undefined),
      query: { userId: "someone-else" },
      body: { userId: "someone-else" },
    } as unknown as Request;
    await new Promise<void>((resolve) => handler(req, {} as Response, () => resolve()));
    expect(req.user!.email).toBe("real@example.com");
    expect(req.user!.id).not.toBe("someone-else");
  });
});
