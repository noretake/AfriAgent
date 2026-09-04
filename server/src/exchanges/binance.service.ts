import { createHmac } from "node:crypto";
import type {
  Balance,
  MarketData,
  MarketPrice,
  OrderRequest,
  OrderResult,
  Portfolio,
  Transaction,
} from "../../../shared/types/index.js";
import { ExchangeError, type ExchangeService } from "./exchange.interface.js";

const QUOTE = "USDT";
const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

export interface BinanceConfig {
  apiKey?: string;
  apiSecret?: string;
  /** Binance Agent OS / MCP endpoint. Reserved integration point; see README. */
  mcpEndpoint?: string;
  baseUrl?: string;
}

interface TickerPrice {
  symbol: string;
  price: string;
}
interface Ticker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
}
interface AccountInfo {
  balances: { asset: string; free: string; locked: string }[];
}
interface OrderResponse {
  orderId: number;
  status: string;
  side: "BUY" | "SELL";
  executedQty: string;
  cummulativeQuoteQty: string;
  transactTime?: number;
  fills?: { price: string; qty: string }[];
}

/**
 * Real Binance Spot REST adapter (public + signed endpoints).
 * Only selected when DEMO_MODE=false and credentials are configured.
 * The Binance Agent OS / MCP transport (BINANCE_MCP_ENDPOINT) is intentionally
 * NOT implemented: its API surface could not be verified, so it stays a
 * documented integration point rather than an invented one.
 */
export class BinanceService implements ExchangeService {
  readonly name: string;
  readonly mode = "live" as const;
  private readonly baseUrl: string;

  constructor(private readonly config: BinanceConfig) {
    this.baseUrl = config.baseUrl ?? "https://api.binance.com";
    this.name = this.baseUrl.includes("testnet") ? "Binance Testnet" : "Binance";
  }

  get isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.apiSecret);
  }

  private assertConfigured() {
    if (!this.isConfigured) {
      throw new ExchangeError("Binance credentials are not configured.", "NOT_CONFIGURED");
    }
  }

  private async publicGet<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url);
    if (!res.ok) throw new ExchangeError(`Binance ${path} failed: ${res.status}`, "EXCHANGE_ERROR");
    return (await res.json()) as T;
  }

  private async signedRequest<T>(method: "GET" | "POST", path: string, params: Record<string, string>): Promise<T> {
    this.assertConfigured();
    const query = new URLSearchParams({ ...params, timestamp: String(Date.now()), recvWindow: "5000" });
    const signature = createHmac("sha256", this.config.apiSecret!).update(query.toString()).digest("hex");
    query.set("signature", signature);
    const url = new URL(path, this.baseUrl);
    const init: RequestInit = { method, headers: { "X-MBX-APIKEY": this.config.apiKey! } };
    if (method === "GET") url.search = query.toString();
    else {
      init.body = query.toString();
      init.headers = { ...init.headers, "Content-Type": "application/x-www-form-urlencoded" };
    }
    const res = await fetch(url, init);
    if (!res.ok) {
      const text = await res.text();
      throw new ExchangeError(`Binance ${path} failed: ${res.status} ${text}`, "EXCHANGE_ERROR");
    }
    return (await res.json()) as T;
  }

  async getBalance(_userId: string): Promise<Balance[]> {
    const account = await this.signedRequest<AccountInfo>("GET", "/api/v3/account", {});
    return account.balances
      .map((b) => ({ asset: b.asset, free: Number(b.free), locked: Number(b.locked), total: Number(b.free) + Number(b.locked) }))
      .filter((b) => b.total > 0);
  }

  async getPortfolio(userId: string): Promise<Portfolio> {
    const balances = await this.getBalance(userId);
    const positions = await Promise.all(
      balances.map(async (b) => {
        const price = b.asset === QUOTE ? 1 : (await this.getMarketPrice(b.asset)).price;
        return { asset: b.asset, balance: b.total, price, valueUsd: round(b.total * price, 2), allocationPct: 0 };
      }),
    );
    const totalValueUsd = round(positions.reduce((s, p) => s + p.valueUsd, 0), 2);
    for (const p of positions) p.allocationPct = totalValueUsd > 0 ? round((p.valueUsd / totalValueUsd) * 100, 2) : 0;
    return { totalValueUsd, positions, updatedAt: new Date().toISOString(), mode: "live" };
  }

  async getMarketPrice(asset: string): Promise<MarketPrice> {
    if (asset === QUOTE) return { asset, quoteAsset: QUOTE, price: 1, timestamp: new Date().toISOString() };
    const t = await this.publicGet<TickerPrice>("/api/v3/ticker/price", { symbol: `${asset}${QUOTE}` });
    return { asset, quoteAsset: QUOTE, price: Number(t.price), timestamp: new Date().toISOString() };
  }

  async getMarketData(asset: string): Promise<MarketData> {
    if (asset === QUOTE) {
      return { asset, quoteAsset: QUOTE, price: 1, change24h: 0, volume24h: 0, high24h: 1, low24h: 1, timestamp: new Date().toISOString() };
    }
    const t = await this.publicGet<Ticker24h>("/api/v3/ticker/24hr", { symbol: `${asset}${QUOTE}` });
    return {
      asset,
      quoteAsset: QUOTE,
      price: Number(t.lastPrice),
      change24h: Number(t.priceChangePercent),
      volume24h: Number(t.quoteVolume),
      high24h: Number(t.highPrice),
      low24h: Number(t.lowPrice),
      timestamp: new Date().toISOString(),
    };
  }

  async getTransactionHistory(_userId: string): Promise<Transaction[]> {
    // Application-level history is owned by TransactionService; the exchange
    // ledger is not merged in the MVP.
    return [];
  }

  async createOrder(_userId: string, order: OrderRequest): Promise<OrderResult> {
    this.assertConfigured();
    const res = await this.signedRequest<OrderResponse>("POST", "/api/v3/order", {
      symbol: `${order.asset}${order.quoteAsset}`,
      side: order.action,
      type: "MARKET",
      quoteOrderQty: order.amountUsd.toFixed(2),
      newOrderRespType: "FULL",
    });
    const executedQty = Number(res.executedQty);
    const executedUsd = Number(res.cummulativeQuoteQty);
    return {
      externalOrderId: String(res.orderId),
      status: res.status === "FILLED" ? "FILLED" : res.status === "REJECTED" ? "REJECTED" : "PENDING",
      action: res.side,
      asset: order.asset,
      quoteAsset: order.quoteAsset,
      executedAmount: executedQty,
      executedUsd,
      price: executedQty > 0 ? round(executedUsd / executedQty, 4) : 0,
      executionLabel: "LIVE_EXECUTED",
      timestamp: new Date(res.transactTime ?? Date.now()).toISOString(),
    };
  }

  async getOrderStatus(_externalOrderId: string): Promise<OrderResult> {
    throw new ExchangeError(
      "Order status lookup requires the trading symbol; not implemented in MVP.",
      "EXCHANGE_ERROR",
    );
  }
}
