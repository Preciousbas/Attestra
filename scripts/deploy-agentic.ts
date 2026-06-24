import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ContractFactory } from "ethers";
import { syncAgenticArtifact } from "./sync-agentic-artifact.ts";
import { setEnvValue } from "./lib/env-file.ts";
import { getExplorerAddressUrl, getProvider, getSigner } from "../server/services/chain.ts";

const ARTIFACT_PATH = resolve(process.cwd(), "contracts/artifacts/AgenticID.json");

function loadArtifact() {
  return JSON.parse(readFileSync(ARTIFACT_PATH, "utf8")) as {
    abi: object[];
    bytecode: string;
  };
}

async function main() {
  console.log("\n🪪 Attestra — deploy AgenticID (ERC-7857)\n");

  try {
    loadArtifact();
  } catch {
    console.log("Compiling with Foundry...");
    syncAgenticArtifact();
  }

  const artifact = loadArtifact();
  const signer = getSigner();
  const provider = getProvider();
  const network = await provider.getNetwork();
  console.log(`Network chainId: ${network.chainId}`);
  console.log(`Deployer: ${signer.address}`);

  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  console.log("Deploying AgenticID...");
  const contract = await factory.deploy("Attestra Signal Agent", "ATSIG", 0);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  setEnvValue("ZG_AGENTIC_ID_ADDRESS", address);

  console.log("\n✅ AgenticID deployed");
  console.log(`Address: ${address}`);
  console.log(`Explorer: ${getExplorerAddressUrl(address)}`);
  console.log("\nZG_AGENTIC_ID_ADDRESS saved to .env\n");
}

main().catch((error) => {
  console.error("\n❌ Deploy failed:\n", error instanceof Error ? error.message : error);
  process.exit(1);
});
