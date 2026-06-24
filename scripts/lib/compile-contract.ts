import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ARTIFACT_PATH = resolve(process.cwd(), "contracts/artifacts/SignalRegistry.json");

export interface ContractArtifact {
  contractName: string;
  abi: readonly object[];
  bytecode: string;
  compilerVersion: string;
  source?: string;
}

export function loadArtifact(): ContractArtifact {
  const raw = readFileSync(ARTIFACT_PATH, "utf8");
  return JSON.parse(raw) as ContractArtifact;
}

export function getArtifactPath(): string {
  return ARTIFACT_PATH;
}
