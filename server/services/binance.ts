import type { MarketSnapshot } from "../../shared/types.ts";

const BINANCE_BASE = "https://api.binance.com/api/v3";

interface Ticker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
}

export async function fetchMarketSnapshot(symbol: string): Promise<MarketSnapshot> {
  const url = `${BINANCE_BASE}/ticker/24hr?symbol=${encodeURIComponent(symbol)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Binance API error (${response.status}): ${body}`);
  }

  const data = (await response.json()) as Ticker24h;

  return {
    symbol: data.symbol,
    price: Number(data.lastPrice),
    change24hPct: Number(data.priceChangePercent),
    high24h: Number(data.highPrice),
    low24h: Number(data.lowPrice),
    volume24h: Number(data.volume),
    fetchedAt: new Date().toISOString(),
    source: "binance",
  };
}

export async function fetchPrice(symbol: string): Promise<number> {
  const url = `${BINANCE_BASE}/ticker/price?symbol=${encodeURIComponent(symbol)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Binance price fetch failed (${response.status})`);
  }

  const data = (await response.json()) as { price: string };
  return Number(data.price);
}
