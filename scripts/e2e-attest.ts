import "dotenv/config";
import { fetchMarketSnapshot } from "../server/services/market.ts";
import {
  applyAttestation,
  attestSignalOnChainAndStorage,
  computeContentHashFromSignal,
  newSignalId,
} from "../server/services/attest.ts";
import { runAttestedInference } from "../server/services/compute.ts";
import { createMockInference, defaultE2EThesis, isInsufficientBalanceError } from "../server/services/mock-inference.ts";
import { assertComputeConfigured, config } from "../server/config.ts";
import type { TradingSignal } from "../shared/types.ts";

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const forceMock = process.argv.includes("--mock");
  const symbol = args[0] ?? "BTCUSDT";
  const thesis = args[1] ?? defaultE2EThesis();

  console.log(`\n🔗 Attestra — end-to-end attestation (${symbol})\n`);
  console.log(`Thesis: ${thesis}\n`);

  const market = await fetchMarketSnapshot(symbol);
  console.log(`Market: ${symbol} @ $${market.price} (${market.change24hPct.toFixed(2)}% 24h) [${market.source}]`);

  let inferenceMode: "live" | "mock" = forceMock ? "mock" : "live";
  let inference;

  if (forceMock) {
    inference = createMockInference(thesis, market);
    console.log("\nInference: mock (--mock flag)");
  } else {
    try {
      assertComputeConfigured();
      inference = await runAttestedInference(thesis, market);
      console.log(`\nInference: live (${inference.model}, ${inference.latencyMs}ms)`);
    } catch (error) {
      if (isInsufficientBalanceError(error)) {
        inferenceMode = "mock";
        inference = createMockInference(thesis, market);
        console.log("\nInference: mock (402 Insufficient balance — top up at pc.0g.ai)");
      } else {
        throw error;
      }
    }
  }

  let signal: TradingSignal = {
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

  signal.verification.contentHash = computeContentHashFromSignal(signal);
  console.log(`\nContent hash: ${signal.verification.contentHash}`);

  console.log("\nUploading to 0G Storage...");
  const attestation = await attestSignalOnChainAndStorage(signal);
  signal = applyAttestation(signal, attestation);

  console.log("\n✅ End-to-end attestation complete");
  console.log(`Inference mode: ${inferenceMode}`);
  console.log(`Storage URI:  ${attestation.storageUri}`);
  console.log(`Storage tx:   ${attestation.storageUploadTxHash}`);
  console.log(`Signal ID:    ${attestation.signalId}`);
  console.log(`Anchor tx:    ${attestation.anchorTxHash}`);
  console.log(`Explorer:     ${attestation.explorerTxUrl}`);
  if (attestation.agenticId) {
    console.log(`Agentic ID:   #${attestation.agenticId.tokenId}`);
    console.log(`Owner:        ${attestation.agenticId.ownerAddress}`);
    console.log(`Minted user:  ${attestation.agenticId.mintedToUser ? "yes" : "custodial"}`);
    console.log(`Agentic tx:   ${attestation.agenticId.txHash}`);
    console.log(`Agentic NFT:  ${attestation.agenticId.explorerTokenUrl}`);
  } else if (config.chain.agenticIdAddress) {
    console.error("\n❌ ZG_AGENTIC_ID_ADDRESS is set but Agentic ID was not minted");
    process.exit(1);
  } else {
    console.log("Agentic ID:   (not minted — run npm run deploy:agentic)");
  }
  console.log(`Proof URL:    http://localhost:5173/proof/${attestation.anchorTxHash}\n`);
}

main().catch((error) => {
  console.error("\n❌ E2E attestation failed:\n", error instanceof Error ? error.message : error);
  process.exit(1);
});
