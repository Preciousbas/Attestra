import { getStore } from "@netlify/blobs";
import type { GenerateSignalResponse } from "../../../shared/types.ts";

export type SignalJobStatus = "pending" | "complete" | "error";

export interface SignalJobRecord {
  status: SignalJobStatus;
  startedAt: number;
  finishedAt?: number;
  result?: GenerateSignalResponse;
  error?: string;
}

function jobStore() {
  return getStore({ name: "attestra-signal-jobs", consistency: "strong" });
}

export async function writeSignalJob(jobId: string, record: SignalJobRecord): Promise<void> {
  await jobStore().setJSON(jobId, record);
}

export async function readSignalJob(jobId: string): Promise<SignalJobRecord | null> {
  return jobStore().get(jobId, { type: "json" }) as Promise<SignalJobRecord | null>;
}

export async function executeGenerateJob(
  jobId: string,
  startedAt: number,
  run: () => Promise<GenerateSignalResponse>,
): Promise<void> {
  try {
    const result = await run();
    await writeSignalJob(jobId, {
      status: "complete",
      startedAt,
      finishedAt: Date.now(),
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signal generation failed";
    await writeSignalJob(jobId, {
      status: "error",
      startedAt,
      finishedAt: Date.now(),
      error: message,
    });
  }
}

export async function runGenerateJob(
  jobId: string,
  run: () => Promise<GenerateSignalResponse>,
): Promise<void> {
  const startedAt = Date.now();
  await writeSignalJob(jobId, { status: "pending", startedAt });
  await executeGenerateJob(jobId, startedAt, run);
}
