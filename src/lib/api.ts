import type { AgenticTransferMode } from "../../shared/chain.ts";
import type { GenerateSignalRequest, GenerateSignalResponse, OnChainProof } from "../../shared/types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export interface HealthResponse {
  ok: boolean;
  computeConfigured: boolean;
  chainId: number;
  agenticConfigured: boolean;
  agenticTransferMode: AgenticTransferMode;
  requireWalletForMint: boolean;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("API unreachable");
  return res.json();
}

export interface GenerateSignalParams {
  thesis: string;
  symbol: string;
  walletAddress?: string;
  issuedAt?: number;
  signature?: string;
}

export async function generateSignal(
  params: GenerateSignalParams,
): Promise<GenerateSignalResponse> {
  const body: GenerateSignalRequest = {
    thesis: params.thesis,
    symbol: params.symbol,
  };

  if (params.walletAddress && params.issuedAt !== undefined && params.signature) {
    body.walletAddress = params.walletAddress;
    body.issuedAt = params.issuedAt;
    body.signature = params.signature;
  }

  const res = await fetch(`${API_BASE}/signals/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Signal generation failed");
  return data;
}

export async function fetchProofByTxHash(txHash: string): Promise<OnChainProof> {
  const res = await fetch(`${API_BASE}/proof/tx/${encodeURIComponent(txHash)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Proof lookup failed");
  return data;
}

export async function fetchProofBySignalId(signalId: string): Promise<OnChainProof> {
  const res = await fetch(`${API_BASE}/proof/signal/${encodeURIComponent(signalId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Proof lookup failed");
  return data;
}

export function transferModeLabel(mode: AgenticTransferMode): string {
  if (mode === "tee") {
    return "TEE-secured transfer (requires TeeVerifier contract — contact ops to enable)";
  }
  return "Standard ownership transfer — on-chain hash + storage URI (no encrypted re-wrap on transfer)";
}
