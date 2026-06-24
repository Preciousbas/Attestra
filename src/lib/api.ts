import type { AgenticTransferMode } from "../../shared/chain.ts";
import type { GenerateSignalRequest, GenerateSignalResponse, OnChainProof } from "../../shared/types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export interface HealthResponse {
  ok: boolean;
  computeConfigured: boolean;
  chainId: number;
  agenticConfigured: boolean;
  agenticTransferMode: AgenticTransferMode;
  requireWalletForMint: boolean;
}

interface SignalJobResponse {
  status: "pending" | "complete" | "error";
  error?: string;
  result?: GenerateSignalResponse;
}

function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
): void {
  // #region agent log
  fetch("http://127.0.0.1:7673/ingest/9b6e0f60-6b41-494f-b3f7-f5fa33dde9ce", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a08580" },
    body: JSON.stringify({
      sessionId: "a08580",
      runId: "generate-fix",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

async function readApiJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();
  const trimmed = text.trimStart();

  if (
    trimmed.startsWith("<!") ||
    trimmed.startsWith("<html") ||
    trimmed.startsWith("<HTML") ||
    (!contentType.includes("json") && trimmed.startsWith("<"))
  ) {
    throw new Error(
      "API returned a web page instead of JSON. Hard-refresh this site and try again.",
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      snippet.length > 0
        ? `API returned an invalid response: ${snippet}`
        : "API returned an empty response.",
    );
  }
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

async function pollSignalJob(jobId: string): Promise<GenerateSignalResponse> {
  const deadline = Date.now() + 180_000;
  let polls = 0;

  while (Date.now() < deadline) {
    polls += 1;
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const res = await apiFetch(`/signals/jobs/${encodeURIComponent(jobId)}`);
    const job = await readApiJson<SignalJobResponse>(res);

    debugLog(
      "api.ts:pollSignalJob",
      "job poll",
      { jobId, polls, httpStatus: res.status, jobStatus: job.status, error: job.error ?? null },
      "H6",
    );

    if (!res.ok) {
      throw new Error(job.error ?? `Job lookup failed (${res.status})`);
    }

    if (job.status === "complete" && job.result) {
      return job.result;
    }

    if (job.status === "error") {
      throw new Error(job.error ?? "Signal generation failed");
    }
  }

  throw new Error(
    "Attestation is still running on 0G (storage + chain). Wait a moment and check your wallet — then try again.",
  );
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await apiFetch("/health");
  if (!res.ok) throw new Error("API unreachable");
  return readApiJson<HealthResponse>(res);
}

export interface GenerateSignalParams {
  thesis: string;
  symbol: string;
  walletAddress?: string;
  issuedAt?: number;
  signature?: string;
}

export async function generateSignal(
  params: GenerateSignalParams,
): Promise<GenerateSignalResponse> {
  const jobId = crypto.randomUUID();
  const body: GenerateSignalRequest = {
    thesis: params.thesis,
    symbol: params.symbol,
    jobId,
  };

  if (params.walletAddress && params.issuedAt !== undefined && params.signature) {
    body.walletAddress = params.walletAddress;
    body.issuedAt = params.issuedAt;
    body.signature = params.signature;
  }

  const res = await apiFetch("/signals/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  debugLog(
    "api.ts:generateSignal",
    "generate response",
    {
      jobId,
      httpStatus: res.status,
      apiBase: API_BASE,
    },
    "H6-H7",
  );

  if (res.status === 202) {
    return pollSignalJob(jobId);
  }

  const data = await readApiJson<{ error?: string } & GenerateSignalResponse>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Signal generation failed (${res.status})`);
  }
  return data;
}

export async function fetchProofByTxHash(txHash: string): Promise<OnChainProof> {
  const res = await apiFetch(`/proof/tx/${encodeURIComponent(txHash)}`);
  const data = await readApiJson<{ error?: string } & OnChainProof>(res);
  if (!res.ok) throw new Error(data.error ?? "Proof lookup failed");
  return data;
}

export async function fetchProofBySignalId(signalId: string): Promise<OnChainProof> {
  const res = await apiFetch(`/proof/signal/${encodeURIComponent(signalId)}`);
  const data = await readApiJson<{ error?: string } & OnChainProof>(res);
  if (!res.ok) throw new Error(data.error ?? "Proof lookup failed");
  return data;
}

export function transferModeLabel(mode: AgenticTransferMode): string {
  if (mode === "tee") {
    return "TEE-secured transfer (requires TeeVerifier contract — contact ops to enable)";
  }
  return "Standard ownership transfer — on-chain hash + storage URI (no encrypted re-wrap on transfer)";
}
