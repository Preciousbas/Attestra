import { verifyTypedData } from "ethers";
import {
  ATTEST_REQUEST_TYPES,
  ATTEST_SIGNATURE_MAX_AGE_SEC,
  ATTESTRA_EIP712_DOMAIN,
  type AttestRequestPayload,
} from "../../shared/wallet-auth.ts";
import { config } from "../config.ts";

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

export function assertValidAttestSignature(
  payload: AttestRequestPayload,
  signature: string,
): void {
  const now = Math.floor(Date.now() / 1000);
  if (payload.issuedAt > now + 60) {
    throw new Error("Attestation signature timestamp is in the future");
  }
  if (now - payload.issuedAt > ATTEST_SIGNATURE_MAX_AGE_SEC) {
    throw new Error("Attestation signature expired — sign again and resubmit");
  }

  const recovered = verifyTypedData(
    {
      ...ATTESTRA_EIP712_DOMAIN,
      chainId: config.chain.chainId,
    },
    ATTEST_REQUEST_TYPES,
    {
      thesis: payload.thesis,
      symbol: payload.symbol,
      recipient: payload.recipient,
      issuedAt: BigInt(payload.issuedAt),
    },
    signature,
  );

  if (normalizeAddress(recovered) !== normalizeAddress(payload.recipient)) {
    throw new Error("Wallet signature does not match the recipient address");
  }
}

export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
