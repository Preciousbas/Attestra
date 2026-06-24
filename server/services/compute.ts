import OpenAI from "openai";
import type { MarketSnapshot, SignalDirection } from "../../shared/types.ts";
import { config } from "../config.ts";

export interface InferenceResult {
  direction: SignalDirection;
  confidence: number;
  summary: string;
  reasoning: string;
  model: string;
  latencyMs: number;
  raw: string;
}

function extractJsonBlock(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);

  return text.trim();
}

function parseInference(raw: string): Omit<InferenceResult, "model" | "latencyMs" | "raw"> {
  const parsed = JSON.parse(extractJsonBlock(raw)) as {
    direction?: string;
    confidence?: number;
    summary?: string;
    reasoning?: string;
  };

  const direction = parsed.direction?.toLowerCase();
  if (direction !== "long" && direction !== "short" && direction !== "neutral") {
    throw new Error(`Invalid direction in model output: ${parsed.direction}`);
  }

  const confidence = Number(parsed.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    throw new Error(`Invalid confidence in model output: ${parsed.confidence}`);
  }

  if (!parsed.summary || !parsed.reasoning) {
    throw new Error("Model output missing summary or reasoning");
  }

  return {
    direction,
    confidence,
    summary: parsed.summary,
    reasoning: parsed.reasoning,
  };
}

export function buildSignalPrompt(thesis: string, market: MarketSnapshot): string {
  return `You are Attestra, a disciplined market analyst. A trader submitted a thesis and you must evaluate it against live market data.

Respond with JSON only (no markdown fences), matching this schema:
{
  "direction": "long" | "short" | "neutral",
  "confidence": <integer 0-100>,
  "summary": "<one sentence signal headline>",
  "reasoning": "<2-4 sentences explaining the call using the data provided>"
}

Rules:
- Base your answer only on the thesis and the market snapshot below.
- If evidence is weak or mixed, use "neutral" with lower confidence.
- Do not claim certainty; this is research-grade analysis, not financial advice.

Trader thesis:
${thesis}

Market snapshot (${market.symbol}, via ${market.source}) at ${market.fetchedAt}:
- Price: $${market.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
- 24h change: ${market.change24hPct.toFixed(2)}%
- 24h high: $${market.high24h.toLocaleString("en-US", { maximumFractionDigits: 2 })}
- 24h low: $${market.low24h.toLocaleString("en-US", { maximumFractionDigits: 2 })}
- 24h volume: ${market.volume24h.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export async function runAttestedInference(
  thesis: string,
  market: MarketSnapshot,
): Promise<InferenceResult> {
  const client = new OpenAI({
    apiKey: config.compute.apiKey,
    baseURL: config.compute.baseUrl,
  });

  const started = Date.now();
  const completion = await client.chat.completions.create({
    model: config.compute.model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You output strict JSON for trading signal evaluation. Never include markdown or extra keys.",
      },
      {
        role: "user",
        content: buildSignalPrompt(thesis, market),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("0G Compute returned an empty response");

  const parsed = parseInference(raw);

  return {
    ...parsed,
    model: completion.model ?? config.compute.model,
    latencyMs: Date.now() - started,
    raw,
  };
}
