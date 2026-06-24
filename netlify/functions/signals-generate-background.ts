import type { GenerateSignalRequest } from "../../shared/types.ts";
import { executeGenerateJob, readSignalJob, writeSignalJob } from "./_shared/signal-jobs.ts";
import { processGenerateRequest } from "./_shared/process-generate-request.ts";

/**
 * Netlify background function (15 min). Invoked via redirect from POST /api/signals/generate.
 * Client gets 202 immediately; attestation (storage + chain) runs here.
 */
export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = (await req.json()) as GenerateSignalRequest & { jobId?: string };
  const jobId =
    typeof body.jobId === "string" && body.jobId.length > 8 ? body.jobId : crypto.randomUUID();

  const existing = await readSignalJob(jobId);
  if (existing?.status === "pending") {
    return new Response(JSON.stringify({ jobId, status: "pending" }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }

  const startedAt = Date.now();
  await writeSignalJob(jobId, { status: "pending", startedAt });

  await executeGenerateJob(jobId, startedAt, () => processGenerateRequest(body));

  const finished = await readSignalJob(jobId);
  if (finished?.status === "error") {
    console.error("signals-generate-background failed:", finished.error);
  }

  return new Response(JSON.stringify({ jobId, status: finished?.status ?? "pending" }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
};
