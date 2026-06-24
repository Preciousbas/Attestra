import { Router } from "express";
import { config } from "../config.ts";
import { getProofByTxHash, getSignalById } from "../services/chain.ts";
import { getAgenticDataForSignal, getExplorerNftUrl } from "../services/agentic-id.ts";
import { verifyStorageAgainstHash } from "../services/verify.ts";
import type { OnChainProof } from "../../shared/types.ts";

export const proofRouter = Router();

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

proofRouter.get("/proof/tx/:txHash", async (req, res) => {
  try {
    const proof = await getProofByTxHash(req.params.txHash);
    const enriched = await enrichProof(proof);
    res.json(enriched);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proof lookup failed";
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

proofRouter.get("/proof/signal/:signalId", async (req, res) => {
  try {
    const signalId = Number(req.params.signalId);
    if (!Number.isInteger(signalId) || signalId < 1) {
      res.status(400).json({ error: "Invalid signal ID" });
      return;
    }
    const proof = await getSignalById(signalId);
    const enriched = await enrichProof(proof);
    res.json(enriched);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proof lookup failed";
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
