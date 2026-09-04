export const SUPPORTED_ASSETS = ["BTC", "ETH", "USDT"] as const;
export type SupportedAsset = (typeof SUPPORTED_ASSETS)[number];

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

export interface MarketPrice {
  asset: string;
  quoteAsset: string;
  price: number;
  timestamp: string;
}

export interface MarketData extends MarketPrice {
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

export interface PortfolioPosition {
  asset: string;
  balance: number;
  price: number;
  valueUsd: number;
  allocationPct: number;
}

export interface Portfolio {
  totalValueUsd: number;
  positions: PortfolioPosition[];
  updatedAt: string;
  mode: "demo" | "live";
}
