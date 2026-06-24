import { Router } from "express";
import { assertComputeConfigured, config } from "../config.ts";
import { parseGenerateBody, resolveMintRecipient } from "../services/generate-request.ts";
import { generateSignal } from "../services/signal.ts";
import type { GenerateSignalRequest } from "../../shared/types.ts";

export const signalRouter = Router();

signalRouter.post("/signals/generate", async (req, res) => {
  try {
    const { thesis, symbol } = parseGenerateBody(req.body);

    if (thesis.length < 12) {
      res.status(400).json({ error: "Thesis must be at least 12 characters." });
      return;
    }

    assertComputeConfigured();
    const mint = resolveMintRecipient(req.body as GenerateSignalRequest, { thesis, symbol });
    const result = await generateSignal(thesis, symbol ?? config.defaultSymbol, {
      ownerAddress: mint.ownerAddress,
    });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signal generation failed";
    const status = message.includes("ZG_COMPUTE_API_KEY")
      ? 503
      : message.includes("wallet") || message.includes("signature")
        ? 401
        : 400;
    res.status(status).json({ error: message });
  }
});
