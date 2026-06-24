import type { TradingSignal } from "../../shared/types.ts";
import type { AgenticTransferMode } from "../../shared/chain.ts";
import { checkThesisPairAlignment } from "../../shared/thesis-pair-alignment.ts";
import { config, assertComputeConfigured } from "../config.ts";
import { fetchMarketSnapshot } from "../services/market.ts";
import { runAttestedInference } from "../services/compute.ts";
import {
  applyAttestation,
  attestSignalOnChainAndStorage,
  computeContentHashFromSignal,
  newSignalId,
} from "../services/attest.ts";
import { createMockInference, isInsufficientBalanceError } from "../services/mock-inference.ts";

export type InferenceMode = "live" | "mock";

export async function generateSignal(
  thesis: string,
  symbol: string = config.defaultSymbol,
  options?: {
    inferenceMode?: InferenceMode;
    skipAttestation?: boolean;
    ownerAddress?: string;
  },
): Promise<{
  signal: TradingSignal;
  compute: { provider: string; model: string; latencyMs: number };
  inferenceMode: InferenceMode;
  agenticTransferMode: AgenticTransferMode;
  pairAlignmentWarning?: string;
}> {
  const market = await fetchMarketSnapshot(symbol);
  let inferenceMode: InferenceMode = options?.inferenceMode ?? "live";
  let inference;

  if (inferenceMode === "mock") {
    inference = createMockInference(thesis, market);
  } else {
    try {
      assertComputeConfigured();
      inference = await runAttestedInference(thesis, market);
    } catch (error) {
      if (isInsufficientBalanceError(error)) {
        inferenceMode = "mock";
        inference = createMockInference(thesis, market);
      } else {
        throw error;
      }
    }
  }

  let signal: TradingSignal = {
    id: newSignalId(),
    thesis,
    symbol,
    direction: inference.direction,
    confidence: inference.confidence,
    summary: inference.summary,
    reasoning: inference.reasoning,
    market,
    model: inference.model,
    createdAt: new Date().toISOString(),
    verification: {
      status: "pending",
    },
  };

  signal.verification.contentHash = computeContentHashFromSignal(signal);

  if (!options?.skipAttestation) {
    const attestation = await attestSignalOnChainAndStorage(signal, {
      ownerAddress: options?.ownerAddress,
    });
    signal = applyAttestation(signal, attestation);
  }

  const pairAlignment = checkThesisPairAlignment(thesis, symbol);

  return {
    signal,
    inferenceMode,
    agenticTransferMode: config.chain.agenticTransferMode,
    compute: {
      provider: inferenceMode === "mock" ? "mock/offline" : "0G Compute Router",
      model: inference.model,
      latencyMs: inference.latencyMs,
    },
    pairAlignmentWarning:
      pairAlignment.status === "warn" ? pairAlignment.message : undefined,
  };
}
