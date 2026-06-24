import "dotenv/config";
import { fetchMarketSnapshot } from "../server/services/market.ts";
import { buildAttestationPayload, computeContentHashFromSignal, newSignalId } from "../server/services/attest.ts";
import { registerSignalOnChain, getExplorerTxUrl } from "../server/services/chain.ts";
import { createMockInference, defaultE2EThesis } from "../server/services/mock-inference.ts";
import { uploadJsonPayload } from "../server/services/storage.ts";
import type { TradingSignal } from "../shared/types.ts";

async function main() {
  const symbol = process.argv[2] ?? "BTCUSDT";
  const thesis = process.argv[3] ?? defaultE2EThesis();
  const storageUriArg = process.argv[4];

  console.log(`\n⚓ Attestra — anchor signal on-chain (${symbol})\n`);

  const market = await fetchMarketSnapshot(symbol);
  const inference = createMockInference(thesis, market);

  const signal: TradingSignal = {
    id: newSignalId(),
    thesis,
    symbol,
    direction: inference.direction,
    confidence: inference.confidence,
    summary: inference.summary,
    reasoning: inference.reasoning,
    market,
    model: inference.model,
    createdAt: new Date().toISOString(),
    verification: { status: "pending" },
  };

  const contentHash = computeContentHashFromSignal(signal);
  console.log("Content hash:", contentHash);

  let storageUri = storageUriArg;
  if (!storageUri) {
    console.log("Uploading payload to 0G Storage...");
    const upload = await uploadJsonPayload(buildAttestationPayload(signal));
    storageUri = upload.storageUri;
    console.log("Storage URI:", storageUri);
    console.log("Storage tx:", upload.uploadTxHash);
  } else {
    console.log("Storage URI:", storageUri);
  }

  const { signalId, txHash } = await registerSignalOnChain(contentHash, storageUri, symbol);

  console.log("\n✅ Signal anchored on 0G Chain");
  console.log(`Signal ID: ${signalId}`);
  console.log(`Tx hash:   ${txHash}`);
  console.log(`Explorer:  ${getExplorerTxUrl(txHash)}`);
  console.log(`Proof URL: http://localhost:5173/proof/${txHash}\n`);
}

main().catch((error) => {
  console.error("\n❌ Anchor failed:\n", error instanceof Error ? error.message : error);
  process.exit(1);
});
