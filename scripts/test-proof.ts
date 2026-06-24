import "dotenv/config";
import { getProofByTxHash } from "../server/services/chain.ts";
import { getAgenticDataForSignal } from "../server/services/agentic-id.ts";
import { verifyStorageAgainstHash } from "../server/services/verify.ts";

const txHash = process.argv[2];

async function main() {
  if (!txHash) {
    console.error("Usage: npm run test:proof -- <txHash>");
    process.exit(1);
  }

  console.log(`\n🔍 Proof verification smoke test\n`);
  console.log(`Tx: ${txHash}\n`);

  const proof = await getProofByTxHash(txHash);
  const verification = await verifyStorageAgainstHash(proof.storageUri, proof.contentHash);

  console.log(`Signal ID: ${proof.signalId}`);
  console.log(`Symbol: ${proof.symbol}`);
  console.log(`Content hash: ${proof.contentHash}`);
  console.log(`Storage URI: ${proof.storageUri}`);
  console.log(`Storage verification: ${verification.status}`);

  if (verification.status !== "match") {
    console.error("\n❌ Storage hash does not match on-chain record");
    if (verification.message) console.error(verification.message);
    process.exit(1);
  }

  const agentic = await getAgenticDataForSignal(proof.signalId);
  if (agentic) {
    const hashMatch =
      agentic.dataHash.toLowerCase() === proof.contentHash.toLowerCase();
    console.log(`Agentic ID: #${agentic.tokenId}`);
    console.log(`Agentic hash match: ${hashMatch ? "yes" : "no"}`);
    if (!hashMatch) {
      console.error("\n❌ Agentic ID data hash does not match SignalRegistry");
      process.exit(1);
    }
  } else {
    console.log("Agentic ID: (none linked)");
  }

  console.log("\n✅ Proof verification OK — storage JSON matches on-chain hash\n");
}

main().catch((error) => {
  console.error("\n❌ Proof test failed:\n", error instanceof Error ? error.message : error);
  process.exit(1);
});
