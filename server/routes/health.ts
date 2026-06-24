import { Router } from "express";
import { config } from "../config.ts";
import { fetchMarketSnapshot } from "../services/market.ts";
import { isAgenticConfigured } from "../services/agentic-id.ts";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "attestra-api",
    computeConfigured: Boolean(config.compute.apiKey),
    chainId: config.chain.chainId,
    agenticConfigured: isAgenticConfigured(),
    agenticTransferMode: config.chain.agenticTransferMode,
    requireWalletForMint: isAgenticConfigured() && !config.allowUnsignedMint,
  });
});

healthRouter.get("/market/:symbol", async (req, res) => {
  try {
    const snapshot = await fetchMarketSnapshot(req.params.symbol.toUpperCase());
    res.json(snapshot);
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Market fetch failed",
    });
  }
});
