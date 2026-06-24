import type { TradingSignal } from "../../shared/types.ts";
import { hashSignalPayload } from "../../shared/hash.ts";
import { buildSignalHashPayload } from "../../shared/signal-payload.ts";
import { downloadJsonPayload } from "./storage.ts";

export interface StorageVerification {
  status: "match" | "mismatch" | "unavailable";
  computedHash?: string;
  message?: string;
}

export async function verifyStorageAgainstHash(
  storageUri: string,
  expectedContentHash: string,
): Promise<StorageVerification> {
  try {
    const raw = await downloadJsonPayload(storageUri);
    if (!raw || typeof raw !== "object") {
      return { status: "unavailable", message: "Storage payload is not a JSON object" };
    }

    const record = raw as Record<string, unknown>;
    const hashPayload = buildSignalHashPayload({
      thesis: String(record.thesis ?? ""),
      symbol: String(record.symbol ?? ""),
      direction: record.direction as "long" | "short" | "neutral",
      confidence: Number(record.confidence ?? 0),
      summary: String(record.summary ?? ""),
      reasoning: String(record.reasoning ?? ""),
      market: record.market as TradingSignal["market"],
      model: String(record.model ?? ""),
    });

    const computedHash = hashSignalPayload(hashPayload);
    if (computedHash.toLowerCase() === expectedContentHash.toLowerCase()) {
      return { status: "match", computedHash };
    }

    return {
      status: "mismatch",
      computedHash,
      message: "Recomputed hash does not match on-chain contentHash",
    };
  } catch (error) {
    return {
      status: "unavailable",
      message: error instanceof Error ? error.message : "Storage verification failed",
    };
  }
}
