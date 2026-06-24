import type { InferenceResult } from "./compute.ts";
import type { MarketSnapshot } from "../../shared/types.ts";

const DEFAULT_THESIS =
  "BTC looks oversold after three red daily candles; watch support near recent lows.";

export function createMockInference(
  thesis: string,
  market: MarketSnapshot,
): InferenceResult {
  const direction =
    market.change24hPct < -2 ? "long" : market.change24hPct > 2 ? "short" : "neutral";

  return {
    direction,
    confidence: 55,
    summary: `Mock evaluation of ${market.symbol} thesis (Compute credits unavailable)`,
    reasoning: `Offline mock analysis for "${thesis.slice(0, 80)}…". Live 0G Compute inference will replace this once credits are available. Market at $${market.price.toFixed(2)} (${market.change24hPct.toFixed(2)}% 24h).`,
    model: "mock/offline",
    latencyMs: 0,
    raw: JSON.stringify({ direction, confidence: 55, mock: true }),
  };
}

export function isInsufficientBalanceError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("402") || msg.includes("insufficient balance");
}

export function defaultE2EThesis(): string {
  return DEFAULT_THESIS;
}
