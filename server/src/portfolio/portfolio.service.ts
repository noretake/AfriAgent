import type { Balance, MarketData, MarketPrice, Portfolio } from "../../../shared/types/index.js";
import type { ExchangeService } from "../exchanges/exchange.interface.js";

export class PortfolioService {
  constructor(private readonly exchange: ExchangeService) {}

  getBalances(userId: string): Promise<Balance[]> {
    return this.exchange.getBalance(userId);
  }

  async getBalance(userId: string, asset: string): Promise<Balance> {
    const balances = await this.exchange.getBalance(userId);
    return balances.find((b) => b.asset === asset) ?? { asset, free: 0, locked: 0, total: 0 };
  }

  getPortfolio(userId: string): Promise<Portfolio> {
    return this.exchange.getPortfolio(userId);
  }

  getMarketPrice(asset: string): Promise<MarketPrice> {
    return this.exchange.getMarketPrice(asset);
  }

  getMarketData(asset: string): Promise<MarketData> {
    return this.exchange.getMarketData(asset);
  }

  /** Estimated base-asset quantity for a USD notional at current price. */
  async estimateQuantity(asset: string, amountUsd: number): Promise<{ price: number; quantity: number }> {
    const { price } = await this.exchange.getMarketPrice(asset);
    return { price, quantity: price > 0 ? Math.round((amountUsd / price) * 1e8) / 1e8 : 0 };
  }
}
