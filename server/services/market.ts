import type { MarketDataSource, MarketSnapshot } from "../../shared/types.ts";
import { config } from "../config.ts";
import * as binance from "./binance.ts";
import * as coingecko from "./coingecko.ts";

function isDnsOrNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = (error as Error & { cause?: NodeJS.ErrnoException }).cause;
  const code = cause?.code ?? (error as NodeJS.ErrnoException).code;
  return code === "EAI_AGAIN" || code === "ENOTFOUND" || code === "ETIMEDOUT";
}

async function fetchFromProvider(
  source: MarketDataSource,
  symbol: string,
): Promise<MarketSnapshot> {
  if (source === "coingecko") {
    return coingecko.fetchMarketSnapshotFromCoinGecko(symbol);
  }
  return binance.fetchMarketSnapshot(symbol);
}

export async function fetchMarketSnapshot(symbol: string): Promise<MarketSnapshot> {
  const normalized = symbol.toUpperCase();
  const provider = config.market.provider;

  if (provider === "binance") {
    return fetchFromProvider("binance", normalized);
  }

  if (provider === "coingecko") {
    return fetchFromProvider("coingecko", normalized);
  }

  // auto: prefer Binance, fall back to CoinGecko (e.g. Nigeria / geo-blocked regions)
  try {
    return await fetchFromProvider("binance", normalized);
  } catch (error) {
    if (!isDnsOrNetworkError(error)) throw error;
    console.warn(
      `[market] Binance unreachable for ${normalized} (${error instanceof Error ? error.message : error}) — using CoinGecko`,
    );
    return fetchFromProvider("coingecko", normalized);
  }
}

export async function fetchPrice(symbol: string): Promise<number> {
  const snapshot = await fetchMarketSnapshot(symbol);
  return snapshot.price;
}
