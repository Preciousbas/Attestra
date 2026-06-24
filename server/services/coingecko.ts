import type { MarketSnapshot } from "../../shared/types.ts";
import { SYMBOL_TO_COINGECKO } from "../../shared/market-pairs.ts";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export { SYMBOL_TO_COINGECKO };

interface CoinGeckoMarketRow {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  high_24h: number | null;
  low_24h: number | null;
  total_volume: number | null;
}

export function resolveCoinGeckoId(symbol: string): string {
  const id = SYMBOL_TO_COINGECKO[symbol.toUpperCase()];
  if (!id) {
    throw new Error(
      `Unsupported pair for CoinGecko: ${symbol}. Supported: ${Object.keys(SYMBOL_TO_COINGECKO).join(", ")}`,
    );
  }
  return id;
}

export async function fetchMarketSnapshotFromCoinGecko(symbol: string): Promise<MarketSnapshot> {
  const normalized = symbol.toUpperCase();
  const coinId = resolveCoinGeckoId(normalized);
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${coinId}&precision=full`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`CoinGecko API error (${response.status}): ${body}`);
  }

  const rows = (await response.json()) as CoinGeckoMarketRow[];
  const row = rows[0];
  if (!row) {
    throw new Error(`CoinGecko returned no data for ${normalized}`);
  }

  return {
    symbol: normalized,
    price: row.current_price,
    change24hPct: row.price_change_percentage_24h ?? 0,
    high24h: row.high_24h ?? row.current_price,
    low24h: row.low_24h ?? row.current_price,
    volume24h: row.total_volume ?? 0,
    fetchedAt: new Date().toISOString(),
    source: "coingecko",
  };
}

export async function fetchPriceFromCoinGecko(symbol: string): Promise<number> {
  const snapshot = await fetchMarketSnapshotFromCoinGecko(symbol);
  return snapshot.price;
}
