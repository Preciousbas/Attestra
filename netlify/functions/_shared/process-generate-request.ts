import { config as appConfig } from "../../../server/config.ts";
import { assertComputeConfigured } from "../../../server/config.ts";
import { parseGenerateBody, resolveMintRecipient } from "../../../server/services/generate-request.ts";
import { generateSignal } from "../../../server/services/signal.ts";
import type { GenerateSignalRequest, GenerateSignalResponse } from "../../../shared/types.ts";

export async function processGenerateRequest(
  body: GenerateSignalRequest,
): Promise<GenerateSignalResponse> {
  const { thesis, symbol } = parseGenerateBody(body);

  if (thesis.length < 12) {
    throw new Error("Thesis must be at least 12 characters.");
  }

  assertComputeConfigured();
  const mint = resolveMintRecipient(body, { thesis, symbol });
  return generateSignal(thesis, symbol ?? appConfig.defaultSymbol, {
    ownerAddress: mint.ownerAddress,
  });
}
