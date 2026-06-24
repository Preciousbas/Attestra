import { createHash } from "node:crypto";
import type { SignalHashPayload } from "./signal-payload.ts";

export function hashSignalPayload(payload: Record<string, unknown> | SignalHashPayload): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return `0x${createHash("sha256").update(canonical).digest("hex")}`;
}
