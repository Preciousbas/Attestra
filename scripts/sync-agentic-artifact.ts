import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execSync } from "node:child_process";

const ROOT = resolve(process.cwd());
const FORGE_ARTIFACT = resolve(ROOT, "out/AgenticID.sol/AgenticID.json");
const OUTPUT = resolve(ROOT, "contracts/artifacts/AgenticID.json");

export function syncAgenticArtifact(): void {
  execSync("forge build", { cwd: ROOT, stdio: "inherit" });

  const raw = JSON.parse(readFileSync(FORGE_ARTIFACT, "utf8")) as {
    abi: object[];
    bytecode: { object: string };
  };

  const artifact = {
    contractName: "AgenticID",
    abi: raw.abi,
    bytecode: raw.bytecode.object.startsWith("0x")
      ? raw.bytecode.object
      : `0x${raw.bytecode.object}`,
    compilerVersion: "0.8.24",
    source: "foundry",
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`Synced AgenticID artifact → ${OUTPUT}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncAgenticArtifact();
}
