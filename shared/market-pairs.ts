/** USDT trading pairs supported for market data (Binance + CoinGecko). */

export interface MarketPair {
  symbol: string;
  label: string;
  coingeckoId: string;
}

export const MARKET_PAIRS: readonly MarketPair[] = [
  { symbol: "BTCUSDT", label: "BTC / USDT", coingeckoId: "bitcoin" },
  { symbol: "ETHUSDT", label: "ETH / USDT", coingeckoId: "ethereum" },
  { symbol: "SOLUSDT", label: "SOL / USDT", coingeckoId: "solana" },
  { symbol: "BNBUSDT", label: "BNB / USDT", coingeckoId: "binancecoin" },
  { symbol: "XRPUSDT", label: "XRP / USDT", coingeckoId: "ripple" },
  { symbol: "ADAUSDT", label: "ADA / USDT", coingeckoId: "cardano" },
  { symbol: "DOGEUSDT", label: "DOGE / USDT", coingeckoId: "dogecoin" },
  { symbol: "AVAXUSDT", label: "AVAX / USDT", coingeckoId: "avalanche-2" },
  { symbol: "DOTUSDT", label: "DOT / USDT", coingeckoId: "polkadot" },
  { symbol: "LINKUSDT", label: "LINK / USDT", coingeckoId: "chainlink" },
  { symbol: "MATICUSDT", label: "MATIC / USDT", coingeckoId: "matic-network" },
  { symbol: "LTCUSDT", label: "LTC / USDT", coingeckoId: "litecoin" },
  { symbol: "BCHUSDT", label: "BCH / USDT", coingeckoId: "bitcoin-cash" },
  { symbol: "UNIUSDT", label: "UNI / USDT", coingeckoId: "uniswap" },
  { symbol: "ATOMUSDT", label: "ATOM / USDT", coingeckoId: "cosmos" },
  { symbol: "NEARUSDT", label: "NEAR / USDT", coingeckoId: "near" },
  { symbol: "APTUSDT", label: "APT / USDT", coingeckoId: "aptos" },
  { symbol: "ARBUSDT", label: "ARB / USDT", coingeckoId: "arbitrum" },
  { symbol: "OPUSDT", label: "OP / USDT", coingeckoId: "optimism" },
  { symbol: "SUIUSDT", label: "SUI / USDT", coingeckoId: "sui" },
  { symbol: "SEIUSDT", label: "SEI / USDT", coingeckoId: "sei-network" },
  { symbol: "TIAUSDT", label: "TIA / USDT", coingeckoId: "celestia" },
  { symbol: "INJUSDT", label: "INJ / USDT", coingeckoId: "injective-protocol" },
  { symbol: "FILUSDT", label: "FIL / USDT", coingeckoId: "filecoin" },
  { symbol: "ICPUSDT", label: "ICP / USDT", coingeckoId: "internet-computer" },
  { symbol: "HBARUSDT", label: "HBAR / USDT", coingeckoId: "hedera-hashgraph" },
  { symbol: "VETUSDT", label: "VET / USDT", coingeckoId: "vechain" },
  { symbol: "ALGOUSDT", label: "ALGO / USDT", coingeckoId: "algorand" },
  { symbol: "AAVEUSDT", label: "AAVE / USDT", coingeckoId: "aave" },
  { symbol: "MKRUSDT", label: "MKR / USDT", coingeckoId: "maker" },
  { symbol: "LDOUSDT", label: "LDO / USDT", coingeckoId: "lido-dao" },
  { symbol: "RNDRUSDT", label: "RNDR / USDT", coingeckoId: "render-token" },
  { symbol: "FETUSDT", label: "FET / USDT", coingeckoId: "fetch-ai" },
  { symbol: "PEPEUSDT", label: "PEPE / USDT", coingeckoId: "pepe" },
  { symbol: "SHIBUSDT", label: "SHIB / USDT", coingeckoId: "shiba-inu" },
  { symbol: "WIFUSDT", label: "WIF / USDT", coingeckoId: "dogwifcoin" },
  { symbol: "BONKUSDT", label: "BONK / USDT", coingeckoId: "bonk" },
  { symbol: "TRXUSDT", label: "TRX / USDT", coingeckoId: "tron" },
  { symbol: "TONUSDT", label: "TON / USDT", coingeckoId: "the-open-network" },
  { symbol: "STXUSDT", label: "STX / USDT", coingeckoId: "blockstack" },
  { symbol: "RUNEUSDT", label: "RUNE / USDT", coingeckoId: "thorchain" },
  { symbol: "GRTUSDT", label: "GRT / USDT", coingeckoId: "the-graph" },
  { symbol: "ENSUSDT", label: "ENS / USDT", coingeckoId: "ethereum-name-service" },
  { symbol: "IMXUSDT", label: "IMX / USDT", coingeckoId: "immutable-x" },
  { symbol: "JUPUSDT", label: "JUP / USDT", coingeckoId: "jupiter-exchange-solana" },
  { symbol: "WLDUSDT", label: "WLD / USDT", coingeckoId: "worldcoin-wld" },
  { symbol: "PYTHUSDT", label: "PYTH / USDT", coingeckoId: "pyth-network" },
  { symbol: "JTOUSDT", label: "JTO / USDT", coingeckoId: "jito-governance-token" },
  { symbol: "ENAUSDT", label: "ENA / USDT", coingeckoId: "ethena" },
  { symbol: "WUSDT", label: "W / USDT", coingeckoId: "wormhole" },
  { symbol: "ONDOUSDT", label: "ONDO / USDT", coingeckoId: "ondo-finance" },
  { symbol: "PENDLEUSDT", label: "PENDLE / USDT", coingeckoId: "pendle" },
  { symbol: "TAOUSDT", label: "TAO / USDT", coingeckoId: "bittensor" },
  { symbol: "FLOKIUSDT", label: "FLOKI / USDT", coingeckoId: "floki" },
  { symbol: "SANDUSDT", label: "SAND / USDT", coingeckoId: "the-sandbox" },
  { symbol: "MANAUSDT", label: "MANA / USDT", coingeckoId: "decentraland" },
  { symbol: "AXSUSDT", label: "AXS / USDT", coingeckoId: "axie-infinity" },
  { symbol: "CRVUSDT", label: "CRV / USDT", coingeckoId: "curve-dao-token" },
  { symbol: "SNXUSDT", label: "SNX / USDT", coingeckoId: "havven" },
  { symbol: "COMPUSDT", label: "COMP / USDT", coingeckoId: "compound-governance-token" },
  { symbol: "EGLDUSDT", label: "EGLD / USDT", coingeckoId: "elrond-erd-2" },
  { symbol: "XLMUSDT", label: "XLM / USDT", coingeckoId: "stellar" },
  { symbol: "ETCUSDT", label: "ETC / USDT", coingeckoId: "ethereum-classic" },
  { symbol: "THETAUSDT", label: "THETA / USDT", coingeckoId: "theta-token" },
  { symbol: "EOSUSDT", label: "EOS / USDT", coingeckoId: "eos" },
  { symbol: "XTZUSDT", label: "XTZ / USDT", coingeckoId: "tezos" },
  { symbol: "FLOWUSDT", label: "FLOW / USDT", coingeckoId: "flow" },
  { symbol: "CHZUSDT", label: "CHZ / USDT", coingeckoId: "chiliz" },
  { symbol: "APEUSDT", label: "APE / USDT", coingeckoId: "apecoin" },
  { symbol: "ARUSDT", label: "AR / USDT", coingeckoId: "arweave" },
  { symbol: "KASUSDT", label: "KAS / USDT", coingeckoId: "kaspa" },
  { symbol: "BEAMUSDT", label: "BEAM / USDT", coingeckoId: "beam-2" },
  { symbol: "STRKUSDT", label: "STRK / USDT", coingeckoId: "starknet" },
  { symbol: "ZKUSDT", label: "ZK / USDT", coingeckoId: "zksync" },
  { symbol: "NOTUSDT", label: "NOT / USDT", coingeckoId: "notcoin" },
  { symbol: "POLUSDT", label: "POL / USDT", coingeckoId: "polygon-ecosystem-token" },
] as const;

export const SYMBOL_TO_COINGECKO: Record<string, string> = Object.fromEntries(
  MARKET_PAIRS.map((pair) => [pair.symbol, pair.coingeckoId]),
);

export const SUPPORTED_SYMBOLS = new Set(MARKET_PAIRS.map((pair) => pair.symbol));

export function isSupportedSymbol(symbol: string): boolean {
  return SUPPORTED_SYMBOLS.has(symbol.toUpperCase());
}

export function formatPairLabel(symbol: string): string {
  const pair = MARKET_PAIRS.find((p) => p.symbol === symbol.toUpperCase());
  return pair?.label ?? symbol;
}
