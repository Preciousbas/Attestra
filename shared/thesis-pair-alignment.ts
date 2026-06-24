import { formatPairLabel, MARKET_PAIRS } from "./market-pairs.ts";

export type ThesisPairAlignmentStatus = "ok" | "warn" | "unclear";

export interface ThesisPairAlignment {
  status: ThesisPairAlignmentStatus;
  message?: string;
  selectedBase: string;
  mentionedBases: string[];
}

/** Tickers where a loose word match would collide with normal English. */
const ENGLISH_COLLISION_TICKERS = new Set([
  "NOT",
  "FLOW",
  "SAND",
  "BEAM",
  "ONE",
  "FOR",
  "W",
  "OP",
  "AR",
  "GAS",
]);

const COMPARISON_PATTERN =
  /\b(?:vs\.?|versus|against|relative to|compared to|comparison|outperform(?:ing)?|underperform(?:ing)?|correlation|pairs? with)\b/i;

const ALIASES: Record<string, readonly string[]> = {
  BTC: ["bitcoin"],
  ETH: ["ethereum", "ether"],
  BNB: ["binance coin"],
  XRP: ["ripple"],
  DOGE: ["dogecoin", "doge"],
  AVAX: ["avalanche"],
  MATIC: ["polygon"],
  POL: ["polygon"],
  LTC: ["litecoin"],
  BCH: ["bitcoin cash"],
  UNI: ["uniswap"],
  ATOM: ["cosmos"],
  NEAR: ["near protocol"],
  APT: ["aptos"],
  ARB: ["arbitrum"],
  OP: ["optimism"],
  SUI: ["sui"],
  SEI: ["sei"],
  TIA: ["celestia"],
  INJ: ["injective"],
  FIL: ["filecoin"],
  ICP: ["internet computer"],
  HBAR: ["hedera"],
  VET: ["vechain"],
  ALGO: ["algorand"],
  AAVE: ["aave"],
  MKR: ["maker"],
  LDO: ["lido"],
  RNDR: ["render"],
  FET: ["fetch"],
  PEPE: ["pepe"],
  SHIB: ["shiba", "shiba inu"],
  WIF: ["dogwifhat", "wif"],
  BONK: ["bonk"],
  TRX: ["tron"],
  TON: ["toncoin", "ton coin"],
  STX: ["stacks"],
  RUNE: ["thorchain"],
  GRT: ["the graph"],
  ENS: ["ethereum name service"],
  IMX: ["immutable"],
  JUP: ["jupiter"],
  WLD: ["worldcoin"],
  PYTH: ["pyth"],
  JTO: ["jito"],
  ENA: ["ethena"],
  W: ["wormhole"],
  ONDO: ["ondo"],
  PENDLE: ["pendle"],
  TAO: ["bittensor"],
  FLOKI: ["floki"],
  SAND: ["the sandbox"],
  MANA: ["decentraland"],
  AXS: ["axie"],
  CRV: ["curve"],
  SNX: ["synthetix"],
  COMP: ["compound"],
  EGLD: ["multiversx", "elrond"],
  XLM: ["stellar"],
  ETC: ["ethereum classic"],
  THETA: ["theta"],
  EOS: ["eos"],
  XTZ: ["tezos"],
  CHZ: ["chiliz"],
  APE: ["apecoin"],
  AR: ["arweave"],
  KAS: ["kaspa"],
  BEAM: ["beam"],
  STRK: ["starknet"],
  ZK: ["zksync"],
  NOT: ["notcoin"],
  DOT: ["polkadot"],
  LINK: ["chainlink"],
  SOL: ["solana"],
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function baseTickerFromSymbol(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  if (upper.endsWith("USDT")) return upper.slice(0, -4);
  return upper;
}

function aliasesFor(base: string): readonly string[] {
  return ALIASES[base] ?? [];
}

function hasStrongTickerMention(text: string, base: string): boolean {
  const patterns = [
    new RegExp(`\\$${escapeRegex(base)}\\b`, "i"),
    new RegExp(`\\b${escapeRegex(base)}USDT\\b`, "i"),
    new RegExp(`\\b${escapeRegex(base)}/`, "i"),
    new RegExp(`\\b${escapeRegex(base)}-`, "i"),
  ];
  return patterns.some((pattern) => pattern.test(text));
}

function hasLooseTickerMention(text: string, base: string): boolean {
  if (ENGLISH_COLLISION_TICKERS.has(base)) {
    return new RegExp(`\\b${escapeRegex(base)}\\b`).test(text);
  }
  if (base.length <= 2) {
    return hasStrongTickerMention(text, base);
  }
  return new RegExp(`(?<![A-Za-z0-9])${escapeRegex(base)}(?![A-Za-z0-9])`, "i").test(text);
}

function hasAliasMention(text: string, base: string): boolean {
  for (const alias of aliasesFor(base)) {
    if (new RegExp(`\\b${escapeRegex(alias)}\\b`, "i").test(text)) {
      return true;
    }
  }
  return false;
}

function mentionsBase(text: string, base: string): boolean {
  return (
    hasStrongTickerMention(text, base) ||
    hasLooseTickerMention(text, base) ||
    hasAliasMention(text, base)
  );
}

function collectMentionedBases(thesis: string): string[] {
  const mentioned: string[] = [];
  for (const pair of MARKET_PAIRS) {
    const base = baseTickerFromSymbol(pair.symbol);
    if (mentionsBase(thesis, base)) {
      mentioned.push(base);
    }
  }
  return mentioned;
}

function hasComparisonLanguage(thesis: string): boolean {
  return COMPARISON_PATTERN.test(thesis);
}

/**
 * Warn only when the thesis looks focused on a single other asset.
 * No warning for comparisons, multi-asset notes, or unclear mentions.
 */
export function checkThesisPairAlignment(thesis: string, symbol: string): ThesisPairAlignment {
  const trimmed = thesis.trim();
  const selectedBase = baseTickerFromSymbol(symbol);
  const pairLabel = formatPairLabel(symbol);

  if (trimmed.length < 12) {
    return { status: "unclear", selectedBase, mentionedBases: [] };
  }

  const mentionedBases = collectMentionedBases(trimmed);

  if (mentionedBases.length === 0) {
    return { status: "unclear", selectedBase, mentionedBases };
  }

  if (mentionedBases.includes(selectedBase)) {
    return { status: "ok", selectedBase, mentionedBases };
  }

  if (mentionedBases.length >= 2) {
    return { status: "ok", selectedBase, mentionedBases };
  }

  if (hasComparisonLanguage(trimmed) && mentionedBases.length >= 1) {
    return { status: "ok", selectedBase, mentionedBases };
  }

  const other = mentionedBases[0];
  return {
    status: "warn",
    selectedBase,
    mentionedBases,
    message: `This reads like a ${other} call, but you picked ${pairLabel}.`,
  };
}
