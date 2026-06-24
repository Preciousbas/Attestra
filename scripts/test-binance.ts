import "dotenv/config";
import { fetchMarketSnapshot, fetchPrice } from "../server/services/market.ts";
import { formatFetchError, printNetworkHints } from "./lib/errors.ts";

async function main() {
  const symbol = process.argv[2] ?? "BTCUSDT";
  console.log(`\n🔍 Attestra — market data test (${symbol})\n`);

  const price = await fetchPrice(symbol);
  console.log(`Spot price: $${price.toLocaleString("en-US")}`);

  const snapshot = await fetchMarketSnapshot(symbol);
  console.log("\n24h snapshot:");
  console.log(JSON.stringify(snapshot, null, 2));
  console.log(`\n✅ Market data OK (source: ${snapshot.source}).\n`);
}

main().catch((error) => {
  console.error("\n❌ Market data test failed:\n", formatFetchError(error));
  printNetworkHints();
  process.exit(1);
});
