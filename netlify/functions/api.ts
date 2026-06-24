import type { Config, Context } from "@netlify/functions";
import { config } from "../../server/config.ts";
import { assertComputeConfigured } from "../../server/config.ts";
import { parseGenerateBody, resolveMintRecipient } from "../../server/services/generate-request.ts";
import { generateSignal } from "../../server/services/signal.ts";
import { fetchMarketSnapshot } from "../../server/services/market.ts";
import { getProofByTxHash, getSignalById } from "../../server/services/chain.ts";
import {
  getAgenticDataForSignal,
  getExplorerNftUrl,
  isAgenticConfigured,
} from "../../server/services/agentic-id.ts";
import { verifyStorageAgainstHash } from "../../server/services/verify.ts";
import type { GenerateSignalRequest, OnChainProof } from "../../shared/types.ts";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function enrichProof(proof: OnChainProof) {
  const storageVerification = await verifyStorageAgainstHash(
    proof.storageUri,
    proof.contentHash,
  );

  const agenticData = await getAgenticDataForSignal(proof.signalId);
  const agenticId = agenticData
    ? {
        tokenId: agenticData.tokenId,
        dataHash: agenticData.dataHash,
        dataDescription: agenticData.dataDescription,
        contractAddress: config.chain.agenticIdAddress,
        explorerTokenUrl: getExplorerNftUrl(
          config.chain.agenticIdAddress,
          agenticData.tokenId,
        ),
        hashMatch:
          agenticData.dataHash.toLowerCase() === proof.contentHash.toLowerCase(),
        ownerAddress: agenticData.ownerAddress,
        transferMode: config.chain.agenticTransferMode,
      }
    : undefined;

  return { ...proof, storageVerification, agenticId };
}

function apiPath(url: URL): string {
  return url.pathname.replace(/^\/api/, "") || "/";
}

export default async (req: Request, _context: Context): Promise<Response> => {
  const url = new URL(req.url);
  const path = apiPath(url);

  try {
    if (path === "/health" && req.method === "GET") {
      return json({
        ok: true,
        service: "attestra-api",
        computeConfigured: Boolean(config.compute.apiKey),
        chainId: config.chain.chainId,
        agenticConfigured: isAgenticConfigured(),
        agenticTransferMode: config.chain.agenticTransferMode,
        requireWalletForMint: isAgenticConfigured() && !config.allowUnsignedMint,
      });
    }

    const marketMatch = path.match(/^\/market\/([^/]+)$/);
    if (marketMatch && req.method === "GET") {
      const snapshot = await fetchMarketSnapshot(marketMatch[1].toUpperCase());
      return json(snapshot);
    }

    if (path === "/signals/generate" && req.method === "POST") {
      const body = (await req.json()) as GenerateSignalRequest;
      const { thesis, symbol } = parseGenerateBody(body);

      if (thesis.length < 12) {
        return json({ error: "Thesis must be at least 12 characters." }, 400);
      }

      assertComputeConfigured();
      const mint = resolveMintRecipient(body, { thesis, symbol });
      const result = await generateSignal(thesis, symbol ?? config.defaultSymbol, {
        ownerAddress: mint.ownerAddress,
      });
      return json(result);
    }

    const proofTxMatch = path.match(/^\/proof\/tx\/([^/]+)$/);
    if (proofTxMatch && req.method === "GET") {
      const proof = await getProofByTxHash(proofTxMatch[1]);
      return json(await enrichProof(proof));
    }

    const proofSignalMatch = path.match(/^\/proof\/signal\/([^/]+)$/);
    if (proofSignalMatch && req.method === "GET") {
      const signalId = Number(proofSignalMatch[1]);
      if (!Number.isInteger(signalId) || signalId < 1) {
        return json({ error: "Invalid signal ID" }, 400);
      }
      const proof = await getSignalById(signalId);
      return json(await enrichProof(proof));
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    let status = 500;

    if (message.includes("not found")) status = 404;
    else if (message.includes("ZG_COMPUTE_API_KEY")) status = 503;
    else if (message.includes("wallet") || message.includes("signature")) status = 401;
    else if (
      message.includes("must be") ||
      message.includes("Invalid") ||
      message.includes("at least")
    ) {
      status = 400;
    }

    return json({ error: message }, status);
  }
};

export const config: Config = {
  path: "/api/*",
};
