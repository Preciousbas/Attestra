import "dotenv/config";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const CHAIN_ID = process.env.ZG_CHAIN_ID ?? "16602";
const EXPLORER_API =
  process.env.ZG_EXPLORER_API_URL ?? "https://chainscan-galileo.0g.ai/api";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} in .env`);
  }
  return value;
}

async function main() {
  const address = requireEnv("ZG_REGISTRY_ADDRESS");
  const apiKey = process.env.ETHERSCAN_API_KEY ?? "";

  console.log("\n🔍 Attestra — verify SignalRegistry on 0G Galileo\n");
  console.log(`Contract: ${address}`);
  console.log(`Chain ID: ${CHAIN_ID}`);
  console.log(`Explorer API: ${EXPLORER_API}\n`);

  const args = [
    "verify-contract",
    address,
    "contracts/SignalRegistry.sol:SignalRegistry",
    "--chain-id",
    CHAIN_ID,
    "--verifier",
    "blockscout",
    "--verifier-url",
    EXPLORER_API,
    "--watch",
  ];

  if (apiKey) {
    args.push("--etherscan-api-key", apiKey);
  }

  execSync(`forge ${args.map((a) => `"${a}"`).join(" ")}`, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });

  console.log("\n✅ Verification submitted — check the explorer for the green checkmark.\n");
}

main().catch((error) => {
  console.error("\n❌ Verify failed:\n", error instanceof Error ? error.message : error);
  process.exit(1);
});
