import { checkThesisPairAlignment } from "../shared/thesis-pair-alignment.ts";
import { MARKET_PAIRS } from "../shared/market-pairs.ts";

function assert(label: string, thesis: string, symbol: string, expected: "ok" | "warn" | "unclear") {
  const result = checkThesisPairAlignment(thesis, symbol);
  const pass = result.status === expected;
  console.log(`${pass ? "✓" : "✗"} ${label} → ${result.status}${result.message ? `: ${result.message}` : ""}`);
  if (!pass) process.exitCode = 1;
}

console.log("\nThesis / pair alignment checks\n");
console.log(`Pairs in registry: ${MARKET_PAIRS.length}\n`);

assert("BTC thesis + BTC pair", "BTC looks oversold near support", "BTCUSDT", "ok");
assert("ETH thesis + ETH pair", "Ethereum reclaiming $3.2k resistance", "ETHUSDT", "ok");
assert("SOL thesis + SOL pair", "Solana holding $140 support", "SOLUSDT", "ok");
assert("PEPE thesis + PEPE pair", "PEPE meme momentum still strong", "PEPEUSDT", "ok");
assert("ARB thesis + ARB pair", "Arbitrum TVL climbing again", "ARBUSDT", "ok");
assert("BTC thesis + ETH pair", "BTC looks oversold after three red dailies", "ETHUSDT", "warn");
assert("PEPE thesis + SOL pair", "PEPE breaking out on volume", "SOLUSDT", "warn");
assert("ETH vs BTC compare", "ETH vs BTC — relative long ETH into strength", "ETHUSDT", "ok");
assert("BTC and ETH named", "BTC and ETH both look extended here", "SOLUSDT", "ok");
assert("comparison language", "SOL compared to majors looks weak", "ETHUSDT", "ok");
assert("vague macro", "Risk-off mood after CPI, watching levels", "ETHUSDT", "unclear");
assert("notcoin alias", "Notcoin momentum fading after the hype", "NOTUSDT", "ok");
assert("does not false positive NOT", "This does not look bullish yet", "BTCUSDT", "unclear");

console.log("");
