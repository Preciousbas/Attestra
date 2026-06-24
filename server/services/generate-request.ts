import type { GenerateSignalRequest } from "../../shared/types.ts";
import { isSupportedSymbol } from "../../shared/market-pairs.ts";
import { config } from "../config.ts";
import { isAgenticConfigured } from "../services/agentic-id.ts";
import {
  assertValidAttestSignature,
  isValidEthereumAddress,
} from "../services/wallet-auth.ts";
import type { AttestRequestPayload } from "../../shared/wallet-auth.ts";

export interface ParsedGenerateBody {
  thesis: string;
  symbol?: string;
  walletAddress?: string;
}

export function parseGenerateBody(body: unknown): ParsedGenerateBody {
  const thesis = typeof (body as GenerateSignalRequest)?.thesis === "string"
    ? (body as GenerateSignalRequest).thesis.trim()
    : "";
  const symbol =
    typeof (body as GenerateSignalRequest)?.symbol === "string"
      ? (body as GenerateSignalRequest).symbol!.trim().toUpperCase()
      : undefined;

  if (symbol && !isSupportedSymbol(symbol)) {
    throw new Error(`Unsupported market pair: ${symbol}`);
  }

  const walletAddress =
    typeof (body as GenerateSignalRequest)?.walletAddress === "string"
      ? (body as GenerateSignalRequest).walletAddress!.trim()
      : undefined;

  return { thesis, symbol, walletAddress };
}

export function resolveMintRecipient(
  body: GenerateSignalRequest,
  parsed: { thesis: string; symbol?: string },
): { ownerAddress?: string } {
  const needsWallet = isAgenticConfigured() && !config.allowUnsignedMint;

  if (!needsWallet) {
    return {};
  }

  const { walletAddress, signature, issuedAt } = body;

  if (!walletAddress || !signature || issuedAt === undefined) {
    throw new Error(
      "Connect your wallet and sign the attestation request to receive your Agentic ID NFT",
    );
  }

  if (!isValidEthereumAddress(walletAddress)) {
    throw new Error("Invalid wallet address");
  }

  const payload: AttestRequestPayload = {
    thesis: parsed.thesis,
    symbol: (parsed.symbol ?? config.defaultSymbol).trim().toUpperCase(),
    recipient: walletAddress,
    issuedAt,
  };

  assertValidAttestSignature(payload, signature);

  return { ownerAddress: walletAddress };
}
