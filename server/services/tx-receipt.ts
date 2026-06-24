import type { JsonRpcProvider, TransactionReceipt, TransactionResponse } from "ethers";

const DEFAULT_CONFIRMATIONS = 1;
const DEFAULT_TIMEOUT_MS = process.env.NETLIFY ? 25_000 : 120_000;
const POLL_INTERVAL_MS = 2_000;

/**
 * Wait for a transaction receipt with retries — Galileo RPC can lag behind broadcast.
 */
export async function waitForTransactionReceipt(
  tx: TransactionResponse,
  options?: { confirmations?: number; timeoutMs?: number },
): Promise<TransactionReceipt> {
  const confirmations = options?.confirmations ?? DEFAULT_CONFIRMATIONS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const provider = tx.provider as JsonRpcProvider | null;

  if (!provider) {
    const receipt = await tx.wait(confirmations);
    if (!receipt) throw new Error("Transaction was not mined");
    return receipt;
  }

  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const receipt = await tx.wait(confirmations);
      if (receipt) return receipt;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        message.includes("no matching receipts") ||
        message.includes("transaction indexing is in progress") ||
        message.includes("UNKNOWN_ERROR");

      if (!retryable) throw error;

      const polled = await provider.getTransactionReceipt(tx.hash);
      if (polled?.blockNumber != null) {
        return polled;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  const polled = provider ? await provider.getTransactionReceipt(tx.hash) : null;
  if (polled) return polled;

  throw lastError instanceof Error
    ? lastError
    : new Error(`Transaction receipt not found after ${timeoutMs}ms: ${tx.hash}`);
}
