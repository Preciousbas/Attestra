import type { Config } from "@netlify/functions";
import { config as appConfig } from "../../server/config.ts";
import { assertComputeConfigured } from "../../server/config.ts";
import { parseGenerateBody, resolveMintRecipient } from "../../server/services/generate-request.ts";
import { generateSignal } from "../../server/services/signal.ts";
import type { GenerateSignalRequest } from "../../shared/types.ts";
import { executeGenerateJob, readSignalJob, writeSignalJob } from "./_shared/signal-jobs.ts";

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

  void executeGenerateJob(jobId, startedAt, async () => {
    const { thesis, symbol } = parseGenerateBody(body);

    if (thesis.length < 12) {
      throw new Error("Thesis must be at least 12 characters.");
    }

    assertComputeConfigured();
    const mint = resolveMintRecipient(body, { thesis, symbol });
    return generateSignal(thesis, symbol ?? appConfig.defaultSymbol, {
      ownerAddress: mint.ownerAddress,
    });
  });

  return new Response(JSON.stringify({ jobId, status: "pending" }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/signals/generate",
  method: "POST",
};
