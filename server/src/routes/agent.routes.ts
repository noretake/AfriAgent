import { Router } from "express";
import { AgentMessageBodySchema } from "../agents/intent.schemas.js";
import { asyncHandler, body, validate } from "../middleware/validation.middleware.js";
import type { Services } from "../services.js";

export function agentRoutes(s: Services): Router {
  const r = Router();

  r.post(
    "/agent/message",
    validate({ body: AgentMessageBodySchema }),
    asyncHandler(async (req, res) => {
      const input = body(req, AgentMessageBodySchema);
      const response = await s.agent.handleMessage({ userId: req.user.id, sessionId: input.sessionId, message: input.message });
      res.json(response);
    }),
  );

  r.get(
    "/agent/sessions/:id/messages",
    asyncHandler(async (req, res) => {
      const session = await s.store.getSession(req.params.id);
      if (!session || session.userId !== req.user.id) return res.json({ messages: [] });
      res.json({ messages: await s.store.listMessages(session.id) });
    }),
  );

  return r;
}
