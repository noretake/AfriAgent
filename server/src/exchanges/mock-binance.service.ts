import { randomUUID } from "node:crypto";
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

export const DEMO_BALANCES: Record<string, number> = {
  BTC: 0.0098,
  ETH: 0.14,
  USDT: 280.52,
};

interface MarketSeed {
  price: number;
  change24h: number;
  volume24h: number;
}

export const DEMO_MARKET: Record<string, MarketSeed> = {
  BTC: { price: 105000, change24h: 2.4, volume24h: 32_000_000_000 },
  ETH: { price: 4100, change24h: -1.1, volume24h: 18_500_000_000 },
  USDT: { price: 1, change24h: 0.01, volume24h: 95_000_000_000 },
};

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

/**
 * Fully working in-process exchange simulator.
 * Balances are held per user and mutate on filled orders.
 * Never touches the real Binance network.
 */
export class MockBinanceService implements ExchangeService {
  readonly name = "MockBinance";
  readonly mode = "demo" as const;

  private balances = new Map<string, Map<string, number>>();
  private orders = new Map<string, OrderResult>();
  private history = new Map<string, Transaction[]>();
  private market: Record<string, MarketSeed>;

  constructor(seed: { balances?: Record<string, number>; market?: Record<string, MarketSeed> } = {}) {
    this.market = { ...DEMO_MARKET, ...(seed.market ?? {}) };
    this.seedBalances = { ...DEMO_BALANCES, ...(seed.balances ?? {}) };
  }

  private seedBalances: Record<string, number>;

  private userBalances(userId: string): Map<string, number> {
    let b = this.balances.get(userId);
    if (!b) {
      b = new Map(Object.entries(this.seedBalances));
      this.balances.set(userId, b);
    }
    return b;
  }

  private assertAsset(asset: string): MarketSeed {
    const m = this.market[asset];
    if (!m) throw new ExchangeError(`Asset ${asset} is not supported by the demo exchange.`, "UNSUPPORTED_ASSET");
    return m;
  }

  async getBalance(userId: string): Promise<Balance[]> {
    const b = this.userBalances(userId);
    return [...b.entries()].map(([asset, total]) => ({ asset, free: total, locked: 0, total }));
  }

  async getPortfolio(userId: string): Promise<Portfolio> {
    const balances = await this.getBalance(userId);
    const positions = balances.map((b) => {
      const price = this.market[b.asset]?.price ?? 0;
      return { asset: b.asset, balance: b.total, price, valueUsd: round(b.total * price, 2), allocationPct: 0 };
    });
    const totalValueUsd = round(positions.reduce((s, p) => s + p.valueUsd, 0), 2);
    for (const p of positions) p.allocationPct = totalValueUsd > 0 ? round((p.valueUsd / totalValueUsd) * 100, 2) : 0;
    return { totalValueUsd, positions, updatedAt: new Date().toISOString(), mode: "demo" };
  }

  async getMarketPrice(asset: string): Promise<MarketPrice> {
    const m = this.assertAsset(asset);
    return { asset, quoteAsset: QUOTE, price: m.price, timestamp: new Date().toISOString() };
  }

  async getMarketData(asset: string): Promise<MarketData> {
    const m = this.assertAsset(asset);
    return {
      asset,
      quoteAsset: QUOTE,
      price: m.price,
      change24h: m.change24h,
      volume24h: m.volume24h,
      high24h: round(m.price * (1 + Math.abs(m.change24h) / 100), 2),
      low24h: round(m.price * (1 - Math.abs(m.change24h) / 100), 2),
      timestamp: new Date().toISOString(),
    };
  }

  async getTransactionHistory(userId: string): Promise<Transaction[]> {
    return this.history.get(userId) ?? [];
  }

  async createOrder(userId: string, order: OrderRequest): Promise<OrderResult> {
    const m = this.assertAsset(order.asset);
    if (order.quoteAsset !== QUOTE) {
      throw new ExchangeError(`Only ${QUOTE} quote pairs are supported.`, "UNSUPPORTED_ASSET");
    }
    if (!Number.isFinite(order.amountUsd) || order.amountUsd <= 0) {
      throw new ExchangeError("Order amount must be a positive finite number.", "EXCHANGE_ERROR");
    }

    const b = this.userBalances(userId);
    const baseQty = round(order.amountUsd / m.price, 8);
    const usdt = b.get(QUOTE) ?? 0;
    const base = b.get(order.asset) ?? 0;

    if (order.action === "BUY") {
      if (usdt < order.amountUsd) {
        throw new ExchangeError(
          `Insufficient ${QUOTE}: have ${usdt.toFixed(2)}, need ${order.amountUsd.toFixed(2)}.`,
          "INSUFFICIENT_FUNDS",
        );
      }
      b.set(QUOTE, round(usdt - order.amountUsd, 8));
      b.set(order.asset, round(base + baseQty, 8));
    } else {
      if (base < baseQty) {
        throw new ExchangeError(
          `Insufficient ${order.asset}: have ${base}, need ${baseQty}.`,
          "INSUFFICIENT_FUNDS",
        );
      }
      b.set(order.asset, round(base - baseQty, 8));
      b.set(QUOTE, round(usdt + order.amountUsd, 8));
    }

    const result: OrderResult = {
      externalOrderId: `DEMO-${randomUUID().slice(0, 8).toUpperCase()}`,
      status: "FILLED",
      action: order.action,
      asset: order.asset,
      quoteAsset: QUOTE,
      executedAmount: baseQty,
      executedUsd: order.amountUsd,
      price: m.price,
      executionLabel: "DEMO_EXECUTED",
      timestamp: new Date().toISOString(),
      message: "Simulated fill on MockBinance. No real funds were moved.",
    };
    this.orders.set(result.externalOrderId, result);
    return result;
  }

  async getOrderStatus(externalOrderId: string): Promise<OrderResult> {
    const o = this.orders.get(externalOrderId);
    if (!o) throw new ExchangeError(`Order ${externalOrderId} not found.`, "ORDER_NOT_FOUND");
    return o;
  }

  /** Test helper: reset all simulated state. */
  reset(): void {
    this.balances.clear();
    this.orders.clear();
    this.history.clear();
  }
}
