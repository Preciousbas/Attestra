import "dotenv/config";
import { Wallet } from "ethers";
import { config } from "../server/config.ts";
import { assertValidAttestSignature } from "../server/services/wallet-auth.ts";

async function main() {
  const wallet = new Wallet(
    config.chain.privateKey || Wallet.createRandom().privateKey,
  );
  const thesis = "BTC test thesis for wallet auth verification flow.";
  const symbol = "BTCUSDT";
  const issuedAt = Math.floor(Date.now() / 1000);

  const typed = await wallet.signTypedData(
    { name: "Attestra", version: "1", chainId: config.chain.chainId },
    {
      AttestRequest: [
        { name: "thesis", type: "string" },
        { name: "symbol", type: "string" },
        { name: "recipient", type: "address" },
        { name: "issuedAt", type: "uint256" },
      ],
    },
    { thesis, symbol, recipient: wallet.address, issuedAt: BigInt(issuedAt) },
  );

  assertValidAttestSignature(
    { thesis, symbol, recipient: wallet.address, issuedAt },
    typed,
  );

  try {
    assertValidAttestSignature(
      { thesis: "tampered", symbol, recipient: wallet.address, issuedAt },
      typed,
    );
    console.error("❌ Should have rejected tampered thesis");
    process.exit(1);
  } catch {
    // expected
  }

  console.log("✅ Wallet auth signature verification OK\n");
}

main().catch((error) => {
  console.error("❌ Wallet auth test failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
