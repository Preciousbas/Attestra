import "dotenv/config";
import { assertComputeConfigured } from "../server/config.ts";
import { fetchMarketSnapshot } from "../server/services/market.ts";
import { runAttestedInference } from "../server/services/compute.ts";
import { formatFetchError, printNetworkHints } from "./lib/errors.ts";

async function main() {
  console.log("\n🧠 Attestra — 0G Compute inference test\n");

  assertComputeConfigured();

  const thesis =
    process.argv[2] ??
    "BTC looks oversold after three red daily candles; watch support near recent lows.";

  const market = await fetchMarketSnapshot("BTCUSDT");
  console.log(`Market: ${market.symbol} @ $${market.price} (${market.change24hPct}% 24h)\n`);
  console.log(`Thesis: ${thesis}\n`);
  console.log("Calling 0G Compute Router...\n");

  const result = await runAttestedInference(thesis, market);

  console.log("Signal:");
  console.log(JSON.stringify(result, null, 2));
  console.log("\n✅ 0G Compute inference succeeded.\n");
}

main().catch((error) => {
  console.error("\n❌ Compute test failed:\n", formatFetchError(error));
  if (error instanceof Error && error.message.includes("fetch failed")) {
    printNetworkHints();
  }
  process.exit(1);
});
