import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  Contract,
  Interface,
  JsonRpcProvider,
  Wallet,
  type ContractRunner,
  type TransactionReceipt,
} from "ethers";
import type { OnChainProof } from "../../shared/types.ts";
import { config, assertChainConfigured, assertRegistryConfigured } from "../config.ts";
import { waitForTransactionReceipt } from "./tx-receipt.ts";

const ARTIFACT_PATH = resolve(process.cwd(), "contracts/artifacts/SignalRegistry.json");

function loadRegistryAbi(): readonly object[] {
  const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8")) as { abi: object[] };
  return artifact.abi;
}

export const SIGNAL_REGISTRY_ABI = loadRegistryAbi();

export function getExplorerTxUrl(txHash: string): string {
  const base = config.chain.explorerUrl.replace(/\/$/, "");
  return `${base}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string): string {
  const base = config.chain.explorerUrl.replace(/\/$/, "");
  return `${base}/address/${address}`;
}

export function getProvider(): JsonRpcProvider {
  return new JsonRpcProvider(config.chain.rpcUrl, config.chain.chainId);
}

export function getSigner(): Wallet {
  assertChainConfigured();
  const key = config.chain.privateKey.trim();
  const normalized = key.startsWith("0x") ? key : `0x${key}`;
  return new Wallet(normalized, getProvider());
}

export function getRegistryContract(runner?: ContractRunner): Contract {
  assertRegistryConfigured();
  return new Contract(config.chain.registryAddress, SIGNAL_REGISTRY_ABI, runner ?? getProvider());
}

export async function getSignalById(signalId: number): Promise<OnChainProof> {
  const registry = getRegistryContract();
  const [contentHash, storageUri, symbol, submitter, timestamp] =
    await registry.getSignal(signalId);

  return {
    signalId,
    contentHash,
    storageUri,
    symbol,
    submitter,
    timestamp: Number(timestamp),
    txHash: "",
    chainId: config.chain.chainId,
    explorerTxUrl: "",
  };
}

function parseSignalRegisteredFromReceipt(receipt: TransactionReceipt): OnChainProof | null {
  const iface = new Interface(SIGNAL_REGISTRY_ABI);

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name !== "SignalRegistered") continue;

      const signalId = Number(parsed.args.signalId);
      return {
        signalId,
        contentHash: parsed.args.contentHash as string,
        storageUri: parsed.args.storageUri as string,
        symbol: parsed.args.symbol as string,
        submitter: parsed.args.submitter as string,
        timestamp: Number(parsed.args.timestamp),
        txHash: receipt.hash,
        chainId: config.chain.chainId,
        explorerTxUrl: getExplorerTxUrl(receipt.hash),
      };
    } catch {
      // not our event
    }
  }

  return null;
}

export async function getProofByTxHash(txHash: string): Promise<OnChainProof> {
  const normalized = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  const provider = getProvider();
  const receipt = await provider.getTransactionReceipt(normalized);

  if (!receipt) {
    throw new Error(`Transaction not found: ${normalized}`);
  }

  const proof = parseSignalRegisteredFromReceipt(receipt);
  if (!proof) {
    throw new Error(`No SignalRegistered event in transaction ${normalized}`);
  }

  return proof;
}

export async function registerSignalOnChain(
  contentHash: string,
  storageUri: string,
  symbol: string,
): Promise<{ signalId: number; txHash: string }> {
  const registry = getRegistryContract(getSigner());
  const tx = await registry.registerSignal(contentHash, storageUri, symbol);
  const receipt = await waitForTransactionReceipt(tx);

  if (!receipt) {
    throw new Error("Transaction was dropped or not mined");
  }

  const proof = parseSignalRegisteredFromReceipt(receipt);
  if (!proof) {
    throw new Error("registerSignal succeeded but SignalRegistered event was not found");
  }

  return { signalId: proof.signalId, txHash: receipt.hash };
}
