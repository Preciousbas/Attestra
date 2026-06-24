import { Indexer, MemData } from "@0gfoundation/0g-ts-sdk";
import { getSigner } from "./chain.ts";
import { config, assertChainConfigured } from "../config.ts";

const STORAGE_URI_PREFIX = "0g-storage://";

export interface StorageUploadResult {
  storageUri: string;
  rootHash: string;
  uploadTxHash: string;
}

export function formatStorageUri(rootHash: string): string {
  const normalized = rootHash.startsWith("0x") ? rootHash : `0x${rootHash}`;
  return `${STORAGE_URI_PREFIX}${normalized}`;
}

export function parseStorageRootHash(storageUri: string): string | null {
  if (!storageUri.startsWith(STORAGE_URI_PREFIX)) return null;
  const hash = storageUri.slice(STORAGE_URI_PREFIX.length);
  return /^0x[0-9a-fA-F]{64}$/.test(hash) ? hash : null;
}

function getIndexer(): Indexer {
  return new Indexer(config.storage.indexer);
}

export async function uploadJsonPayload(payload: unknown): Promise<StorageUploadResult> {
  assertChainConfigured();

  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  if (bytes.length === 0) {
    throw new Error("Cannot upload empty signal payload");
  }

  const signer = getSigner();
  const indexer = getIndexer();
  const memData = new MemData(bytes);

  const [, treeErr] = await memData.merkleTree();
  if (treeErr !== null) {
    throw new Error(`0G Storage merkle tree failed: ${treeErr}`);
  }

  const [tx, uploadErr] = await indexer.upload(
    memData,
    config.chain.rpcUrl,
    signer as never,
  );

  if (uploadErr !== null) {
    throw new Error(`0G Storage upload failed: ${uploadErr}`);
  }

  if (!tx || !("rootHash" in tx)) {
    throw new Error("0G Storage upload returned unexpected fragmented response");
  }

  const rootHash = tx.rootHash;
  return {
    storageUri: formatStorageUri(rootHash),
    rootHash,
    uploadTxHash: tx.txHash,
  };
}

export async function downloadJsonPayload(storageUri: string): Promise<unknown> {
  const rootHash = parseStorageRootHash(storageUri);
  if (!rootHash) {
    throw new Error(`Invalid 0G storage URI: ${storageUri}`);
  }

  const indexer = getIndexer();
  const [blob, err] = await indexer.downloadToBlob(rootHash, { proof: true });
  if (err !== null) {
    throw new Error(`0G Storage download failed: ${err}`);
  }

  const text = await blob.text();
  return JSON.parse(text) as unknown;
}
