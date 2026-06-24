/** Shared chain metadata for wallet + API (0G Galileo testnet defaults). */

export const OG_GALILEO_CHAIN_ID = 16602;

export const OG_GALILEO_CHAIN = {
  chainId: OG_GALILEO_CHAIN_ID,
  chainIdHex: "0x40da",
  name: "0G Galileo Testnet",
  rpcUrl: "https://evmrpc-testnet.0g.ai",
  explorerUrl: "https://chainscan-galileo.0g.ai",
  nativeCurrency: {
    name: "0G",
    symbol: "0G",
    decimals: 18,
  },
} as const;

export type AgenticTransferMode = "standard" | "tee";
