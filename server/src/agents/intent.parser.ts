import { IntentSchema, type ParsedIntent } from "./intent.schemas.js";
import { SYSTEM_PROMPT } from "./system.prompt.js";

export interface IntentParseResult {
  intent: ParsedIntent;
  parser: "llm" | "fallback";
  raw?: string;
}

export interface IntentParser {
  readonly name: string;
  parse(message: string): Promise<IntentParseResult>;
}

/* -------------------------------------------------------------------------- */
/*  Deterministic development parser                                           */
/* -------------------------------------------------------------------------- */

const ASSET_ALIASES: Record<string, string> = {
  BTC: "BTC",
  BITCOIN: "BTC",
  XBT: "BTC",
  ETH: "ETH",
  ETHER: "ETH",
  ETHEREUM: "ETH",
  USDT: "USDT",
  TETHER: "USDT",
  DOGE: "DOGE",
  DOGECOIN: "DOGE",
  SOL: "SOL",
  SOLANA: "SOL",
  BNB: "BNB",
  XRP: "XRP",
  ADA: "ADA",
  CARDANO: "ADA",
};

const STOP_WORDS = new Set([
  "BUY", "SELL", "WORTH", "OF", "IN", "FOR", "USD", "DOLLARS", "DOLLAR", "BUCKS", "PRICE", "MUCH", "HOW", "WHAT",
  "IS", "THE", "CURRENT", "DO", "I", "HAVE", "MY", "ME", "SHOW", "PLEASE", "TODAY", "TODAYS", "TRANSACTIONS",
  "WITH", "AND", "A", "AN", "TO", "GET", "PURCHASE", "SOME", "ABOUT", "WHY", "WAS", "LAST", "BLOCKED", "PORTFOLIO",
  "BALANCE", "BALANCES", "POLICY", "POLICIES", "LIMIT", "LIMITS", "HISTORY", "ALL", "WEEK", "THIS", "RECENT",
  "S", "NOW", "TRADE", "TRADES", "TRANSACTION", "DID", "REJECTED", "DENIED", "FAIL", "FAILED", "VALUE", "TOTAL",
]);

function extractAsset(message: string): string | undefined {
  const tokens = message.toUpperCase().replace(/[^A-Z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (ASSET_ALIASES[t]) return ASSET_ALIASES[t];
  }
  // Unknown ticker-like token (2-6 uppercase letters in the ORIGINAL message, e.g. "DOGE", "SHIB")
  const tickerMatch = message.match(/\b([A-Z]{2,6})\b/g);
  if (tickerMatch) {
    const candidate = tickerMatch.find((t) => !STOP_WORDS.has(t));
    if (candidate) return candidate;
  }
  return undefined;
}

function extractUsdAmount(message: string): number | null | "invalid" {
  const m =
    message.match(/\$\s*(-?[\d,]*\.?\d+)/) ??
    message.match(/(-?[\d,]*\.?\d+)\s*(?:usd|usdt|dollars?|bucks)\b/i) ??
    message.match(/(?:buy|sell|purchase)\s+(-?[\d,]*\.?\d+)\b/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return "invalid";
  return n;
}

/**
 * Deterministic keyword parser used when no LLM key is configured.
 * Exists only so the full workflow can be demonstrated offline.
 */
export class FallbackIntentParser implements IntentParser {
  readonly name = "fallback";

  parseSync(message: string): ParsedIntent {
    const text = message.trim();
    const lower = text.toLowerCase();

    const isBuy = /\b(buy|purchase|acquire|get me)\b/.test(lower);
    const isSell = /\b(sell|dump|liquidate)\b/.test(lower);

    if (isBuy || isSell) {
      const asset = extractAsset(text);
      const amount = extractUsdAmount(text);
      if (!asset) {
        return { type: "UNKNOWN", clarification: "Which asset would you like to trade (e.g. BTC, ETH)?" };
      }
      if (amount === null) {
        return { type: "UNKNOWN", clarification: `How much USD worth of ${asset} would you like to ${isBuy ? "buy" : "sell"}?` };
      }
      if (amount === "invalid" || amount <= 0) {
        return { type: "UNKNOWN", clarification: "The amount must be a positive USD value. How much would you like to trade?" };
      }
      return { type: "TRADE", action: isBuy ? "BUY" : "SELL", asset, quoteAsset: "USDT", amountUsd: amount };
    }

    if (/\b(why|reason)\b.*\b(block|blocked|reject|rejected|denied|fail|failed)\b/.test(lower) || /\b(blocked|rejected)\b.*\bwhy\b/.test(lower)) {
      return { type: "POLICY_VIOLATION_EXPLANATION" };
    }

    if (/\b(polic(y|ies)|limits?|rules?|allowed assets?)\b/.test(lower)) {
      return { type: "POLICY_QUERY" };
    }

    if (/\b(transactions?|history|trades|activity|orders?)\b/.test(lower)) {
      const period = /\btoday\b/.test(lower) ? "today" : /\bweek\b/.test(lower) ? "week" : "all";
      return { type: "TRANSACTION_HISTORY", period };
    }

    if (/\b(price|market|chart|trend|analysis|analyze|worth now|trading at)\b/.test(lower)) {
      const asset = extractAsset(text);
      if (!asset) return { type: "UNKNOWN", clarification: "Which asset's market data would you like to see?" };
      return { type: "MARKET_ANALYSIS", asset };
    }

    if (/\b(portfolio|holdings|net worth|total value|allocation)\b/.test(lower)) {
      return { type: "PORTFOLIO_QUERY" };
    }

    if (/\b(balance|how much|have|own|hold)\b/.test(lower)) {
      const asset = extractAsset(text);
      return asset ? { type: "BALANCE_QUERY", asset } : { type: "BALANCE_QUERY" };
    }

    return {
      type: "UNKNOWN",
      clarification:
        "I can check balances, prices, transactions and policies, or prepare a BUY/SELL for approval. What would you like to do?",
    };
  }

  async parse(message: string): Promise<IntentParseResult> {
    const intent = IntentSchema.parse(this.parseSync(message));
    return { intent, parser: "fallback" };
  }
}

/* -------------------------------------------------------------------------- */
/*  LLM provider abstraction                                                   */
/* -------------------------------------------------------------------------- */

export interface LlmProvider {
  readonly name: string;
  complete(system: string, user: string): Promise<string>;
}

export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name: string;
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl = "https://api.openai.com/v1",
    name = "openai",
  ) {
    this.name = name;
  }
  async complete(system: string, user: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`${this.name} request failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? "";
  }
}

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  constructor(private readonly apiKey: string, private readonly model: string) {}
  async complete(system: string, user: string): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 300,
        temperature: 0,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`anthropic request failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    return data.content?.find((c) => c.type === "text")?.text ?? "";
  }
}

export function createLlmProvider(cfg: { provider?: string; apiKey?: string; model?: string }): LlmProvider | null {
  if (!cfg.provider || !cfg.apiKey) return null;
  const provider = cfg.provider.toLowerCase();
  switch (provider) {
    case "openai":
      return new OpenAiCompatibleProvider(cfg.apiKey, cfg.model ?? "gpt-4o-mini");
    case "anthropic":
      return new AnthropicProvider(cfg.apiKey, cfg.model ?? "claude-3-5-haiku-latest");
    case "groq":
      return new OpenAiCompatibleProvider(cfg.apiKey, cfg.model ?? "llama-3.1-8b-instant", "https://api.groq.com/openai/v1", "groq");
    case "openrouter":
      return new OpenAiCompatibleProvider(cfg.apiKey, cfg.model ?? "openai/gpt-4o-mini", "https://openrouter.ai/api/v1", "openrouter");
    default:
      throw new Error(`Unsupported AI_PROVIDER "${cfg.provider}". Use openai | anthropic | groq | openrouter.`);
  }
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("LLM response did not contain a JSON object");
  return JSON.parse(trimmed.slice(start, end + 1));
}

/**
 * LLM-backed parser. Raw model output is NEVER trusted: it is parsed and
 * validated with Zod, and any failure falls back to the deterministic parser.
 */
export class LlmIntentParser implements IntentParser {
  readonly name: string;
  private readonly fallback = new FallbackIntentParser();
  constructor(private readonly provider: LlmProvider) {
    this.name = provider.name;
  }

  async parse(message: string): Promise<IntentParseResult> {
    try {
      const raw = await this.provider.complete(SYSTEM_PROMPT, message);
      const parsed = IntentSchema.safeParse(extractJson(raw));
      if (parsed.success) return { intent: parsed.data, parser: "llm", raw };
      console.warn("[agent] LLM produced invalid intent, using fallback parser:", parsed.error.flatten());
    } catch (err) {
      console.warn("[agent] LLM provider error, using fallback parser:", err instanceof Error ? err.message : err);
    }
    return this.fallback.parse(message);
  }
}

export function createIntentParser(cfg: { provider?: string; apiKey?: string; model?: string }): IntentParser {
  const llm = createLlmProvider(cfg);
  return llm ? new LlmIntentParser(llm) : new FallbackIntentParser();
}
