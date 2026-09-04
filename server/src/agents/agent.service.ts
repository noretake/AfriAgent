import type {
  AgentResponse,
  AgentResponseKind,
  Balance,
  Intent,
  Policy,
  PolicyResult,
  Transaction,
} from "../../../shared/types/index.js";
import type { DataStore } from "../db/store.js";
import { ExchangeError } from "../exchanges/exchange.interface.js";
import { ExecutionBlockedError, ExecutionFailedError } from "../transactions/execution.service.js";
import { startOfTodayIso } from "../transactions/transaction.service.js";
import { createAgentTools, type AgentToolDeps, type AgentTools, ToolAuthorizationError } from "./agent.tools.js";
import type { IntentParser } from "./intent.parser.js";
import { IntentSchema, type ParsedIntent, type ParsedTradeIntent } from "./intent.schemas.js";

export interface AgentRequest {
  userId: string;
  sessionId?: string;
  message: string;
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qty = (n: number, asset: string) => `${n.toLocaleString("en-US", { maximumFractionDigits: asset === "USDT" ? 2 : 8 })} ${asset}`;

export class AgentService {
  constructor(
    private readonly store: DataStore,
    private readonly parser: IntentParser,
    private readonly toolDeps: AgentToolDeps,
  ) {}

  get parserName() {
    return this.parser.name;
  }

  async handleMessage(req: AgentRequest): Promise<AgentResponse> {
    const { userId } = req;

    // 1. Session + persist user message
    let session = req.sessionId ? await this.store.getSession(req.sessionId) : null;
    if (session && session.userId !== userId) session = null;
    if (!session) session = await this.store.createSession(userId, req.sessionId);
    await this.store.touchSession(session.id);

    const userMessage = await this.store.createMessage({ sessionId: session.id, role: "user", content: req.message });
    await this.toolDeps.audit.record(userId, "AGENT_MESSAGE", { sessionId: session.id, messageId: userMessage.id, content: req.message });

    // 2. Parse → 3. structured intent → 4. validate (Zod)
    const parsed = await this.parser.parse(req.message);
    const intent = IntentSchema.parse(parsed.intent);

    const intentRecord = await this.store.createIntent({
      userId,
      messageId: userMessage.id,
      type: intent.type,
      payload: intent as Intent,
      status: "CREATED",
    });
    await this.toolDeps.audit.record(userId, "INTENT_CREATED", { intentId: intentRecord.id, intent, parser: parsed.parser });

    const tools = createAgentTools(this.toolDeps, userId);
    const base = {
      sessionId: session.id,
      messageId: userMessage.id,
      intent: intent as Intent,
      intentId: intentRecord.id,
      policy: null as PolicyResult | null,
      approval: null,
      transaction: null as Transaction | null,
      data: null,
      parser: parsed.parser,
      createdAt: new Date().toISOString(),
    };

    let response: AgentResponse;
    try {
      // 5/6. Read-only tools or Policy Engine path
      response = intent.type === "TRADE"
        ? await this.handleTrade(userId, intentRecord.id, intent, tools, base)
        : await this.handleReadOnly(userId, intentRecord.id, intent, tools, base);
    } catch (err) {
      const message = err instanceof ExchangeError || err instanceof ToolAuthorizationError
        ? err.message
        : "I could not complete that request. No financial action was performed.";
      response = { ...base, kind: "ERROR", message };
    }

    // 7. Persist assistant message and return structured response
    await this.store.createMessage({ sessionId: session.id, role: "assistant", content: response.message });
    return response;
  }

  private async handleReadOnly(
    userId: string,
    intentId: string,
    intent: Exclude<ParsedIntent, ParsedTradeIntent>,
    tools: AgentTools,
    base: Omit<AgentResponse, "kind" | "message">,
  ): Promise<AgentResponse> {
    const done = async (kind: AgentResponseKind, message: string, data: AgentResponse["data"] = null): Promise<AgentResponse> => {
      await this.store.updateIntentStatus(intentId, "COMPLETED");
      return { ...base, kind, message, data };
    };

    switch (intent.type) {
      case "BALANCE_QUERY": {
        if (intent.asset) {
          const balance = (await tools.getAccountBalance(intent.asset)) as Balance;
          return done("ANSWER", `You currently hold ${qty(balance.total, balance.asset)}.`, { balances: [balance] });
        }
        const balances = (await tools.getAccountBalance()) as Balance[];
        const lines = balances.map((b) => qty(b.total, b.asset)).join(", ");
        return done("ANSWER", `Your balances: ${lines}.`, { balances });
      }
      case "PORTFOLIO_QUERY": {
        const portfolio = await tools.getPortfolio();
        const breakdown = portfolio.positions.map((p) => `${p.asset} ${usd(p.valueUsd)} (${p.allocationPct}%)`).join(", ");
        return done("ANSWER", `Your portfolio is worth ${usd(portfolio.totalValueUsd)}: ${breakdown}.`, { portfolio });
      }
      case "MARKET_ANALYSIS": {
        const market = await tools.getMarketData(intent.asset);
        const dir = market.change24h >= 0 ? "up" : "down";
        return done(
          "ANSWER",
          `${market.asset} is trading at ${usd(market.price)}, ${dir} ${Math.abs(market.change24h)}% over 24h with ${usd(market.volume24h)} volume.`,
          { market },
        );
      }
      case "TRANSACTION_HISTORY": {
        const since = intent.period === "today" ? startOfTodayIso() : intent.period === "week" ? new Date(Date.now() - 7 * 86_400_000).toISOString() : undefined;
        const transactions = await tools.getTransactionHistory({ since, limit: 20 });
        const label = intent.period === "today" ? "today" : intent.period === "week" ? "this week" : "on record";
        const message = transactions.length === 0
          ? `You have no transactions ${label}.`
          : `You have ${transactions.length} transaction${transactions.length === 1 ? "" : "s"} ${label}: ` +
            transactions.slice(0, 5).map((t) => `${t.action} ${usd(t.amountUsd)} ${t.asset} — ${t.status}`).join("; ") + ".";
        return done("ANSWER", message, { transactions });
      }
      case "POLICY_QUERY": {
        const policyConfig: Policy = await tools.getPolicy();
        return done(
          "ANSWER",
          `Your policy (v${policyConfig.version}): max ${usd(policyConfig.maxTransactionUsd)} per transaction, ${usd(policyConfig.dailyLimitUsd)} daily limit, ` +
            `${policyConfig.maxPortfolioExposure}% max exposure per asset, allowed assets ${policyConfig.allowedAssets.join(", ")}, ` +
            `approval ${policyConfig.requireApproval ? "required" : "not required"}, ${policyConfig.riskTolerance} risk tolerance.`,
          { policyConfig },
        );
      }
      case "POLICY_VIOLATION_EXPLANATION": {
        const audit = await this.toolDeps.audit.lastBlocked(userId);
        if (!audit) return done("ANSWER", "None of your transactions have been blocked by policy.", { lastBlocked: { transaction: null, policy: null, audit: null } });
        const txId = typeof audit.metadata.transactionId === "string" ? audit.metadata.transactionId : null;
        const transaction = txId ? await this.toolDeps.transactions.get(userId, txId) : null;
        const policyLogs = await this.toolDeps.audit.list(userId, { eventTypes: ["POLICY_EVALUATED"], intentId: String(audit.metadata.intentId ?? "") });
        const policy = (policyLogs[0]?.metadata.result as PolicyResult | undefined) ?? null;
        const reason = typeof audit.metadata.reason === "string" ? audit.metadata.reason : "Policy violation.";
        const what = transaction ? `${transaction.action} ${usd(transaction.amountUsd)} ${transaction.asset}` : "Your last transaction";
        return done("ANSWER", `${what} was blocked. ${reason} No transaction was executed.`, { lastBlocked: { transaction, policy, audit } });
      }
      case "UNKNOWN":
        return done("CLARIFICATION", intent.clarification);
    }
  }

  private async handleTrade(
    userId: string,
    intentId: string,
    intent: ParsedTradeIntent,
    tools: AgentTools,
    base: Omit<AgentResponse, "kind" | "message">,
  ): Promise<AgentResponse> {
    const policy = await tools.evaluatePolicy(intent, intentId);

    if (!policy.allowed) {
      const price = await this.safePrice(intent.asset);
      const transaction = await this.toolDeps.transactions.createPending(userId, intentId, intent, price, "BLOCKED");
      await this.toolDeps.transactions.update(transaction.id, { failureReason: policy.reason });
      await this.store.updateIntentStatus(intentId, "BLOCKED");
      await this.toolDeps.audit.record(userId, "TRANSACTION_BLOCKED", {
        intentId,
        transactionId: transaction.id,
        reason: policy.reason,
        checks: policy.checks,
        requestedUsd: intent.amountUsd,
      });
      return {
        ...base,
        kind: "TRADE_BLOCKED",
        message: `Transaction blocked by your policy. ${policy.reason} No transaction was executed.`,
        policy,
        transaction: { ...transaction, status: "BLOCKED", failureReason: policy.reason },
      };
    }

    if (policy.requiresApproval) {
      const { price } = await this.toolDeps.portfolio.estimateQuantity(intent.asset, intent.amountUsd);
      const transaction = await this.toolDeps.transactions.createPending(userId, intentId, intent, price, "PENDING");
      const approval = await tools.createApproval(intentId, intent);
      return {
        ...base,
        kind: "TRADE_PENDING_APPROVAL",
        message: `I have prepared a ${intent.action} of ${usd(intent.amountUsd)} in ${intent.asset} (≈ ${qty(approval.summary.estimatedAmount, intent.asset)} at ${usd(approval.summary.price)}). ` +
          `All policy checks passed. Please approve to execute — nothing has been executed yet.`,
        policy,
        approval,
        transaction,
      };
    }

    // Policy allows without approval: execute now through the guarded execution tool.
    try {
      const { transaction, policy: rechecked } = await tools.executeApprovedTransaction(intentId, intent);
      return {
        ...base,
        kind: "TRADE_EXECUTED",
        message: `Transaction executed successfully: ${transaction.action} ${qty(transaction.amount, transaction.asset)} for ${usd(transaction.amountUsd)} ` +
          `(${transaction.executionLabel}, ref ${transaction.externalTransactionId}).`,
        policy: rechecked,
        transaction,
      };
    } catch (err) {
      if (err instanceof ExecutionBlockedError) {
        return { ...base, kind: "TRADE_BLOCKED", message: `Transaction blocked by your policy. ${err.message} No transaction was executed.`, policy: err.policy, transaction: err.transaction };
      }
      if (err instanceof ExecutionFailedError) {
        return { ...base, kind: "ERROR", message: `Transaction failed. ${err.message} No successful execution was recorded.`, policy, transaction: err.transaction };
      }
      throw err;
    }
  }

  private async safePrice(asset: string): Promise<number | null> {
    try {
      return (await this.toolDeps.portfolio.getMarketPrice(asset)).price;
    } catch {
      return null;
    }
  }
}
