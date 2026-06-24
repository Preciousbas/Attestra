import "dotenv/config";
import { ContractFactory } from "ethers";
import { syncForgeArtifact } from "./sync-forge-artifact.ts";
import { loadArtifact } from "./lib/compile-contract.ts";
import { setEnvValue } from "./lib/env-file.ts";
import { getExplorerAddressUrl, getProvider, getSigner } from "../server/services/chain.ts";

async function main() {
  console.log("\n📜 Attestra — deploy SignalRegistry\n");

  try {
    loadArtifact();
    console.log("Using compiled artifact from contracts/artifacts/SignalRegistry.json");
  } catch {
    console.log("Compiling with Foundry...");
    syncForgeArtifact();
  }
  const artifact = loadArtifact();
  const signer = getSigner();
  const provider = getProvider();
  const network = await provider.getNetwork();
  console.log(`Network chainId: ${network.chainId}`);
  console.log(`Deployer: ${signer.address}`);

  const balance = await provider.getBalance(signer.address);
  console.log(`Balance: ${balance.toString()} wei\n`);

  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  console.log("Deploying SignalRegistry...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  setEnvValue("ZG_REGISTRY_ADDRESS", address);

  console.log("\n✅ SignalRegistry deployed");
  console.log(`Address: ${address}`);
  console.log(`Explorer: ${getExplorerAddressUrl(address)}`);
  console.log("\nZG_REGISTRY_ADDRESS saved to .env\n");
}

main().catch((error) => {
  console.error("\n❌ Deploy failed:\n", error instanceof Error ? error.message : error);
  process.exit(1);
});
