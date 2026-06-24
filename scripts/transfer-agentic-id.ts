import "dotenv/config";
import { getSigner } from "../server/services/chain.ts";
import { getAgenticContract, transferAgenticId } from "../server/services/agentic-id.ts";

async function main() {
  const tokenId = Number(process.argv[2]);
  const to = process.argv[3];

  if (!Number.isInteger(tokenId) || tokenId < 0 || !to) {
    console.error("Usage: npm run transfer:agentic -- <tokenId> <toAddress>");
    process.exit(1);
  }

  const from = getSigner().address;
  console.log(`\n🔄 Transfer Agentic ID #${tokenId}`);
  console.log(`From: ${from}`);
  console.log(`To:   ${to}\n`);

  const contract = getAgenticContract(getSigner());
  const owner = await contract.ownerOf(tokenId);
  if (owner.toLowerCase() !== from.toLowerCase()) {
    throw new Error(`Wallet ${from} does not own token #${tokenId} (owner: ${owner})`);
  }

  const txHash = await transferAgenticId({ from, to, tokenId });
  console.log(`✅ Transfer complete: ${txHash}\n`);
}

main().catch((error) => {
  console.error("\n❌ Transfer failed:\n", error instanceof Error ? error.message : error);
  process.exit(1);
});
