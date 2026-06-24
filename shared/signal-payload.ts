import type { MarketSnapshot, SignalDirection } from "./types.ts";

/** Fields included in the on-chain content hash (canonical JSON). */
export interface SignalHashPayload {
  thesis: string;
  symbol: string;
  direction: SignalDirection;
  confidence: number;
  summary: string;
  reasoning: string;
  market: MarketSnapshot;
  model: string;
}

export function buildSignalHashPayload(input: SignalHashPayload): SignalHashPayload {
  return {
    thesis: input.thesis,
    symbol: input.symbol,
    direction: input.direction,
    confidence: input.confidence,
    summary: input.summary,
    reasoning: input.reasoning,
    market: input.market,
    model: input.model,
  };
}
