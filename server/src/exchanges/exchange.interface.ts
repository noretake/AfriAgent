import type {
  Balance,
  MarketData,
  MarketPrice,
  OrderRequest,
  OrderResult,
  Portfolio,
  Transaction,
} from "../../../shared/types/index.js";

export interface ExchangeService {
  readonly name: string;
  readonly mode: "demo" | "live";
  getBalance(userId: string): Promise<Balance[]>;
  getPortfolio(userId: string): Promise<Portfolio>;
  getMarketPrice(asset: string): Promise<MarketPrice>;
  getMarketData(asset: string): Promise<MarketData>;
  getTransactionHistory(userId: string): Promise<Transaction[]>;
  createOrder(userId: string, order: OrderRequest): Promise<OrderResult>;
  getOrderStatus(externalOrderId: string): Promise<OrderResult>;
}

export class ExchangeError extends Error {
  constructor(
    message: string,
    readonly code: "INSUFFICIENT_FUNDS" | "UNSUPPORTED_ASSET" | "NOT_CONFIGURED" | "ORDER_NOT_FOUND" | "EXCHANGE_ERROR",
  ) {
    super(message);
    this.name = "ExchangeError";
  }
}
