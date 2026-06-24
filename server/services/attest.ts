import { randomUUID } from "node:crypto";
import { hashSignalPayload } from "../../shared/hash.ts";
import { buildSignalHashPayload } from "../../shared/signal-payload.ts";
import type { TradingSignal } from "../../shared/types.ts";
import { config } from "../config.ts";
import { registerSignalOnChain, getExplorerTxUrl } from "./chain.ts";
import { uploadJsonPayload } from "./storage.ts";
import { isAgenticConfigured, mintAgenticIdForSignal } from "./agentic-id.ts";

export interface AttestationResult {
  storageUri: string;
  rootHash: string;
  storageUploadTxHash: string;
  signalId: number;
  anchorTxHash: string;
  contentHash: string;
  explorerTxUrl: string;
  agenticId?: {
    tokenId: number;
    txHash: string;
    contractAddress: string;
    explorerTokenUrl: string;
    ownerAddress: string;
    mintedToUser: boolean;
  };
}

export function buildAttestationPayload(signal: TradingSignal): Record<string, unknown> {
  return {
    id: signal.id,
    thesis: signal.thesis,
    symbol: signal.symbol,
    direction: signal.direction,
    confidence: signal.confidence,
    summary: signal.summary,
    reasoning: signal.reasoning,
    market: signal.market,
    model: signal.model,
    createdAt: signal.createdAt,
    attestationVersion: 1,
  };
}

export function computeContentHashFromSignal(signal: TradingSignal): string {
  return hashSignalPayload(
    buildSignalHashPayload({
      thesis: signal.thesis,
      symbol: signal.symbol,
      direction: signal.direction,
      confidence: signal.confidence,
      summary: signal.summary,
      reasoning: signal.reasoning,
      market: signal.market,
      model: signal.model,
    }),
  );
}

export async function attestSignalOnChainAndStorage(
  signal: TradingSignal,
  options?: { ownerAddress?: string },
): Promise<AttestationResult> {
  const contentHash = computeContentHashFromSignal(signal);
  const payload = buildAttestationPayload(signal);

  const upload = await uploadJsonPayload(payload);
  const { signalId, txHash } = await registerSignalOnChain(
    contentHash,
    upload.storageUri,
    signal.symbol,
  );

  const result: AttestationResult = {
    storageUri: upload.storageUri,
    rootHash: upload.rootHash,
    storageUploadTxHash: upload.uploadTxHash,
    signalId,
    anchorTxHash: txHash,
    contentHash,
    explorerTxUrl: getExplorerTxUrl(txHash),
  };

  if (isAgenticConfigured()) {
    try {
      const agentic = await mintAgenticIdForSignal({
        contentHash,
        storageUri: upload.storageUri,
        signalId,
        ownerAddress: options?.ownerAddress,
      });
      const mintedToUser = Boolean(
        options?.ownerAddress &&
          options.ownerAddress.toLowerCase() === agentic.ownerAddress.toLowerCase(),
      );
      result.agenticId = {
        tokenId: agentic.tokenId,
        txHash: agentic.txHash,
        contractAddress: agentic.contractAddress,
        explorerTokenUrl: agentic.explorerTokenUrl,
        ownerAddress: agentic.ownerAddress,
        mintedToUser,
      };
    } catch (error) {
      console.warn(
        "Agentic ID mint failed (signal still attested):",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return result;
}

export function newSignalId(): string {
  return randomUUID();
}

export function applyAttestation(
  signal: TradingSignal,
  attestation: AttestationResult,
): TradingSignal {
  return {
    ...signal,
    verification: {
      status: "attested",
      contentHash: attestation.contentHash,
      storageUri: attestation.storageUri,
      txHash: attestation.anchorTxHash,
      chainId: config.chain.chainId,
      agenticId: attestation.agenticId,
    },
  };
}
