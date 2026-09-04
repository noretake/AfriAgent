import { env } from "../config/env.js";
import { BinanceService } from "./binance.service.js";
import type { ExchangeService } from "./exchange.interface.js";
import { MockBinanceService } from "./mock-binance.service.js";

export function createExchange(): ExchangeService {
  if (!env.demoMode && env.hasBinance) {
    return new BinanceService({
      apiKey: env.BINANCE_API_KEY,
      apiSecret: env.BINANCE_API_SECRET,
      mcpEndpoint: env.BINANCE_MCP_ENDPOINT,
    });
  }
  return new MockBinanceService();
}

export { BinanceService, MockBinanceService };
export type { ExchangeService };
