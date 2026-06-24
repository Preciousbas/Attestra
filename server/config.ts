import "dotenv/config";
import type { AgenticTransferMode } from "../shared/chain.ts";

export const config = {
  port: Number(process.env.PORT ?? 8787),
  compute: {
    apiKey: process.env.ZG_COMPUTE_API_KEY ?? "",
    baseUrl: process.env.ZG_COMPUTE_BASE_URL ?? "https://router-api.0g.ai/v1",
    model: process.env.ZG_COMPUTE_MODEL ?? "zai-org/GLM-5-FP8",
  },
  chain: {
    rpcUrl: process.env.ZG_RPC_URL ?? "https://evmrpc-testnet.0g.ai",
    chainId: Number(process.env.ZG_CHAIN_ID ?? 16602),
    privateKey: process.env.ZG_PRIVATE_KEY ?? "",
    registryAddress: process.env.ZG_REGISTRY_ADDRESS ?? "",
    agenticIdAddress: process.env.ZG_AGENTIC_ID_ADDRESS ?? "",
    explorerUrl: process.env.ZG_EXPLORER_URL ?? "https://chainscan-galileo.0g.ai",
    /** standard = ownership-only iTransferFrom; tee = TEE oracle (future upgrade). */
    agenticTransferMode: (process.env.ZG_AGENTIC_TRANSFER_MODE ?? "standard") as AgenticTransferMode,
  },
  storage: {
    indexer: process.env.ZG_STORAGE_INDEXER ?? "https://indexer-storage-testnet-turbo.0g.ai",
  },
  market: {
    /** coingecko = default (free, no API key; works in Nigeria). auto = Binance then fallback. */
    provider: (process.env.MARKET_DATA_PROVIDER ?? "coingecko") as "auto" | "binance" | "coingecko",
  },
  defaultSymbol: "BTCUSDT",
  /** Dev/CI only — never enable in production deploys. */
  allowUnsignedMint: process.env.ATTEST_SKIP_WALLET_AUTH === "1",
} as const;

export function assertComputeConfigured(): void {
  if (!config.compute.apiKey) {
    throw new Error(
      "ZG_COMPUTE_API_KEY is not set. Create a key at https://pc.0g.ai and add it to .env",
    );
  }
}

export function assertChainConfigured(): void {
  if (!config.chain.privateKey) {
    throw new Error(
      "ZG_PRIVATE_KEY is not set. Add your 0G testnet wallet private key to .env",
    );
  }
}

export function assertRegistryConfigured(): void {
  if (!config.chain.registryAddress) {
    throw new Error("ZG_REGISTRY_ADDRESS is not set. Run npm run deploy:registry first.");
  }
}
