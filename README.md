# AfriAgent

**AI that acts. You stay in control.**

AfriAgent is a full-stack AI financial operations copilot. Users talk to it in natural language; the backend turns each request into a validated structured intent, a deterministic Policy Engine decides what may happen, humans approve anything that moves money, and every step is audited. Trades are executed through an exchange abstraction — a fully simulated **Mock Binance** in Demo Mode, or Binance Spot when real credentials are configured.

```
User → React → Express → AI Agent → Structured Intent → Zod → Policy Engine
     → BLOCKED | APPROVAL REQUIRED → User approval → Execution → Exchange
     → Transaction → Audit Log
```

## Quick start (Demo Mode, zero configuration)

```bash
npm install
cp .env.example .env     # optional — defaults already run Demo Mode
npm run dev              # API on :3001, UI on :5173
```

Open http://localhost:5173, go to **AI Copilot** and try:

- `What is my balance?`
- `Buy $40 of BTC` → policy passes → approve → `DEMO_EXECUTED`
- `Buy $80 of BTC` → blocked (exceeds $50 per-transaction limit) — never reaches the exchange
- `Why was my last transaction blocked?`

Demo Mode uses an in-memory store seeded with the demo user (`demo@afriagent.local`), the default policy and a simulated Binance account (0.0098 BTC, 0.14 ETH, 280.52 USDT). Nothing touches a real exchange; every simulated fill is labelled `DEMO_EXECUTED`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start API + UI concurrently |
| `npm run dev:server` / `npm run dev:client` | Start one side |
| `npm run build` | Type-check and build server + client |
| `npm test` | Run the Vitest suite (policy engine, validation, approvals, end-to-end demo workflow) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, both workspaces |

## Configuration

See `.env.example`. Everything is optional in Demo Mode.

| Variable | Purpose |
| --- | --- |
| `DEMO_MODE` | `true` (default) forces the Mock Binance exchange |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Enables the PostgreSQL/Supabase store. Apply `server/src/db/schema.sql` then `server/src/db/seed.sql` first. Without these the in-memory store is used. |
| `REQUIRE_AUTH` | Supabase Auth (email/password). Defaults to `true` whenever `DEMO_MODE=false`; the API then rejects requests without a valid `Authorization: Bearer <supabase access token>` and scopes policies, approvals, transactions and audit to the signed-in user. Needs `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Frontend build-time vars that enable the login screen and attach the session token to API calls. |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` | `openai`-compatible or `anthropic` intent parsing. Without a key a deterministic rule-based parser handles the demo phrases. LLM output is always validated with Zod and falls back to the rule parser. |
| `BINANCE_API_KEY`, `BINANCE_API_SECRET` | With `DEMO_MODE=false`, routes execution to Binance Spot REST. |
| `BINANCE_MCP_ENDPOINT` | Reserved integration point for Binance Agent OS / MCP; not used until a verified spec is wired in. |
| `APPROVAL_TTL_MINUTES` | Approval expiry (default 10) |

## Project layout

```
client/   Vite + React + TypeScript + Tailwind + TanStack Query (all data comes from the API)
server/   Express + TypeScript
  src/agents/        intent schemas, LLM/fallback parser, agent orchestration, user-bound tools
  src/policies/      pure deterministic policy engine + service
  src/approvals/     approval lifecycle (ownership, expiry, revalidation)
  src/transactions/  transaction records + the single guarded execution path
  src/exchanges/     ExchangeService interface, MockBinanceService, BinanceService
  src/db/            DataStore interface, MemoryStore, SupabaseStore, schema.sql, seed.sql
  src/routes/        REST API
shared/types/        domain types shared by client and server
tests/               Vitest suites
```

## API

```
GET  /api/health
GET  /api/dashboard
GET  /api/portfolio
GET  /api/balance
GET  /api/market/:asset
POST /api/agent/message            { message, sessionId? }
GET  /api/transactions
GET  /api/transactions/:id
GET  /api/approvals
POST /api/approvals/:id/approve
POST /api/approvals/:id/reject
GET  /api/policies
PUT  /api/policies                 partial update
GET  /api/audit
GET  /api/security
POST /api/security/emergency-stop
POST /api/security/emergency-stop/reset
```

## Safety model

- The AI never executes anything directly. It produces a structured intent; only `ExecutionService` may call `exchange.createOrder`, and only after the Policy Engine allows it.
- The Policy Engine (`server/src/policies/policy.engine.ts`) is a pure function: emergency stop, asset allowlist, amount validity, per-transaction limit, daily limit, portfolio exposure. It is re-run at execution time, so an approval cannot execute against a changed policy.
- Approvals are verified server-side for ownership, pending status, expiry, intent validity and emergency stop. The frontend is never trusted for authorization; the user identity is resolved on the server.
- The AI can read policies but cannot change them (`PUT /api/policies` is a user action).
- Emergency Stop halts all new financial execution while balances, market data and history stay readable.
- Demo executions are labelled `DEMO_EXECUTED`; the app never claims a simulated trade settled on Binance.
- No secrets are ever requested by the agent, logged, or committed (`.env` is git-ignored).

## Real integrations

- **Supabase/PostgreSQL** — implemented in `SupabaseStore`; run the SQL files in `server/src/db/`.
- **Binance Spot** — implemented in `BinanceService` (public tickers, signed account and market orders).
- **Binance Agent OS / MCP** — abstracted behind `ExchangeService`; the endpoint variable is reserved but no unverified API surface is invented.
