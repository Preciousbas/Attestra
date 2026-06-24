import type { AgenticTransferMode } from "./chain.ts";

export type SignalDirection = "long" | "short" | "neutral";

export type MarketDataSource = "binance" | "coingecko";

export interface MarketSnapshot {
  symbol: string;
  price: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  fetchedAt: string;
  source: MarketDataSource;
}

export interface TradingSignal {
  id: string;
  thesis: string;
  symbol: string;
  direction: SignalDirection;
  confidence: number;
  summary: string;
  reasoning: string;
  market: MarketSnapshot;
  model: string;
  createdAt: string;
  verification: {
    status: "pending" | "attested";
    contentHash?: string;
    storageUri?: string;
    txHash?: string;
    chainId?: number;
    agenticId?: {
      tokenId: number;
      txHash: string;
      contractAddress: string;
      explorerTokenUrl?: string;
      ownerAddress: string;
      /** true when ownerAddress matches the wallet that signed the attestation request */
      mintedToUser: boolean;
    };
  };
}

export interface GenerateSignalRequest {
  thesis: string;
  symbol?: string;
  /** Wallet that will receive the Agentic ID NFT (must match signature). */
  walletAddress?: string;
  /** Unix seconds — must match signed AttestRequest.issuedAt */
  issuedAt?: number;
  /** EIP-712 signature authorizing mint to walletAddress */
  signature?: string;
}

export type InferenceMode = "live" | "mock";

export interface GenerateSignalResponse {
  signal: TradingSignal;
  inferenceMode: InferenceMode;
  agenticTransferMode: AgenticTransferMode;
  compute: {
    provider: string;
    model: string;
    latencyMs: number;
  };
  /** Soft warning when thesis text may not match the selected pair (never blocks). */
  pairAlignmentWarning?: string;
}

export interface OnChainProof {
  signalId: number;
  contentHash: string;
  storageUri: string;
  symbol: string;
  submitter: string;
  timestamp: number;
  txHash: string;
  chainId: number;
  explorerTxUrl: string;
  storageVerification?: StorageVerification;
  agenticId?: {
    tokenId: number;
    dataHash: string;
    dataDescription: string;
    contractAddress: string;
    explorerTokenUrl: string;
    hashMatch: boolean;
    ownerAddress: string;
    transferMode: AgenticTransferMode;
  };
}

export interface StorageVerification {
  status: "match" | "mismatch" | "unavailable";
  computedHash?: string;
  message?: string;
}
