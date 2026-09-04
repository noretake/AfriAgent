import { AgentService } from "./agents/agent.service.js";
import { createIntentParser, type IntentParser } from "./agents/intent.parser.js";
import { ApprovalService } from "./approvals/approval.service.js";
import { AuditService } from "./audit/audit.service.js";
import { env } from "./config/env.js";
import { DEMO_USER, createStore, seedStore } from "./db/client.js";
import type { DataStore, User } from "./db/store.js";
import { createExchange } from "./exchanges/index.js";
import type { ExchangeService } from "./exchanges/exchange.interface.js";
import { PolicyService } from "./policies/policy.service.js";
import { PortfolioService } from "./portfolio/portfolio.service.js";
import { SecurityService } from "./security/security.service.js";
import { ExecutionService } from "./transactions/execution.service.js";
import { TransactionService } from "./transactions/transaction.service.js";

export interface Services {
  store: DataStore;
  exchange: ExchangeService;
  audit: AuditService;
  portfolio: PortfolioService;
  transactions: TransactionService;
  security: SecurityService;
  policies: PolicyService;
  execution: ExecutionService;
  approvals: ApprovalService;
  agent: AgentService;
  demoMode: boolean;
  resolveUser: () => Promise<User>;
}

export interface ServiceOptions {
  store?: DataStore;
  exchange?: ExchangeService;
  parser?: IntentParser;
  demoMode?: boolean;
  approvalTtlMinutes?: number;
}

export async function createServices(opts: ServiceOptions = {}): Promise<Services> {
  const store = opts.store ?? createStore();
  await store.init();
  await seedStore(store);

  const exchange = opts.exchange ?? createExchange();
  const demoMode = opts.demoMode ?? exchange.mode === "demo";

  const audit = new AuditService(store);
  const portfolio = new PortfolioService(exchange);
  const transactions = new TransactionService(store);
  const security = new SecurityService(store, audit, {
    demoMode,
    requireApproval: async () => (await store.getPolicy((await resolveUser()).id))?.requireApproval ?? true,
  });
  const policies = new PolicyService(store, transactions, portfolio, security, audit);
  const execution = new ExecutionService(store, exchange, transactions, policies, security, audit);
  const approvals = new ApprovalService(store, transactions, portfolio, security, execution, audit, opts.approvalTtlMinutes ?? env.APPROVAL_TTL_MINUTES);
  const parser = opts.parser ?? createIntentParser({ provider: env.AI_PROVIDER, apiKey: env.AI_API_KEY, model: env.AI_MODEL });
  const agent = new AgentService(store, parser, { portfolio, transactions, policies, approvals, execution, security, audit });

  let cachedUser: User | null = null;
  async function resolveUser(): Promise<User> {
    if (cachedUser) return cachedUser;
    const user = await store.getUserByEmail(DEMO_USER.email);
    if (!user) throw new Error("Demo user missing; seed failed");
    cachedUser = user;
    return user;
  }

  return { store, exchange, audit, portfolio, transactions, security, policies, execution, approvals, agent, demoMode, resolveUser };
}
