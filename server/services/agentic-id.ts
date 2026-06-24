import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Contract, Interface, type ContractRunner } from "ethers";
import { config, assertChainConfigured } from "../config.ts";
import { getExplorerTxUrl, getSigner } from "./chain.ts";
import { waitForTransactionReceipt } from "./tx-receipt.ts";

const ARTIFACT_PATH = resolve(process.cwd(), "contracts/artifacts/AgenticID.json");

function loadAgenticAbi(): readonly object[] {
  const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8")) as { abi: object[] };
  return artifact.abi;
}

export const AGENTIC_ID_ABI = loadAgenticAbi();

export interface AgenticMintResult {
  tokenId: number;
  txHash: string;
  contractAddress: string;
  explorerTxUrl: string;
  explorerTokenUrl: string;
  ownerAddress: string;
}

export function isAgenticConfigured(): boolean {
  return Boolean(config.chain.agenticIdAddress);
}

export function assertAgenticConfigured(): void {
  if (!config.chain.agenticIdAddress) {
    throw new Error("ZG_AGENTIC_ID_ADDRESS is not set. Run npm run deploy:agentic first.");
  }
}

export function getAgenticContract(runner?: ContractRunner): Contract {
  assertAgenticConfigured();
  return new Contract(config.chain.agenticIdAddress, AGENTIC_ID_ABI, runner ?? getSigner());
}

export function getExplorerNftUrl(contractAddress: string, tokenId: number): string {
  const base = config.chain.explorerUrl.replace(/\/$/, "");
  return `${base}/token/${contractAddress}?a=${tokenId}`;
}

export async function mintAgenticIdForSignal(input: {
  contentHash: string;
  storageUri: string;
  signalId: number;
  ownerAddress?: string;
}): Promise<AgenticMintResult> {
  assertChainConfigured();
  assertAgenticConfigured();

  const signer = getSigner();
  const contract = getAgenticContract(signer);
  const recipient = input.ownerAddress ?? signer.address;

  const datas = [
    {
      dataDescription: `Attestra signal #${input.signalId} — ${input.storageUri}`,
      dataHash: input.contentHash,
    },
  ];

  const mintTx = await contract.iMintWithRole(recipient, datas, recipient);
  const mintReceipt = await waitForTransactionReceipt(mintTx);

  let tokenId: number | null = null;
  const iface = new Interface(AGENTIC_ID_ABI);
  for (const log of mintReceipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "IntelligentDataSet") {
        tokenId = Number(parsed.args.tokenId);
        break;
      }
      if (
        parsed?.name === "Transfer" &&
        parsed.args.from === "0x0000000000000000000000000000000000000000"
      ) {
        tokenId = Number(parsed.args.tokenId);
      }
    } catch {
      // skip unrelated logs
    }
  }

  if (tokenId === null) {
    throw new Error("Agentic ID mint succeeded but tokenId was not found in logs");
  }

  const linkTx = await contract.linkSignal(tokenId, input.signalId);
  await waitForTransactionReceipt(linkTx);

  const uriTx = await contract.setTokenURI(tokenId, input.storageUri);
  await waitForTransactionReceipt(uriTx);

  const contractAddress = config.chain.agenticIdAddress;
  const txHash = mintReceipt.hash;

  return {
    tokenId,
    txHash,
    contractAddress,
    explorerTxUrl: getExplorerTxUrl(txHash),
    explorerTokenUrl: getExplorerNftUrl(contractAddress, tokenId),
    ownerAddress: recipient,
  };
}

export async function getAgenticTokenOwner(tokenId: number): Promise<string | null> {
  if (!isAgenticConfigured()) return null;
  try {
    const contract = getAgenticContract();
    return (await contract.ownerOf(tokenId)) as string;
  } catch {
    return null;
  }
}

export async function getAgenticDataForSignal(signalId: number): Promise<{
  tokenId: number;
  dataHash: string;
  dataDescription: string;
  ownerAddress: string;
} | null> {
  if (!isAgenticConfigured()) return null;

  const contract = getAgenticContract();
  const tokenIdRaw: bigint = await contract.signalToTokenId(signalId);
  let tokenId: number;

  if (tokenIdRaw === 0n) {
    const linkedSignal: bigint = await contract.linkedSignalId(0);
    if (Number(linkedSignal) !== signalId) return null;
    tokenId = 0;
  } else {
    tokenId = Number(tokenIdRaw);
  }
  const datas: Array<{ dataDescription: string; dataHash: string }> =
    await contract.getIntelligentDatas(tokenId);
  const first = datas[0];
  if (!first) return null;

  const ownerAddress = (await contract.ownerOf(tokenId)) as string;

  return {
    tokenId,
    dataHash: first.dataHash,
    dataDescription: first.dataDescription,
    ownerAddress,
  };
}

export async function transferAgenticId(input: {
  from: string;
  to: string;
  tokenId: number;
}): Promise<string> {
  const signer = getSigner();
  const contract = getAgenticContract(signer);
  const tx = await contract.iTransferFrom(input.from, input.to, input.tokenId, []);
  const receipt = await waitForTransactionReceipt(tx);
  return receipt.hash;
}
