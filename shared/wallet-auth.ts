/** EIP-712 typed data for authorizing attestation + Agentic ID mint to the signer’s wallet. */

export const ATTESTRA_EIP712_DOMAIN = {
  name: "Attestra",
  version: "1",
} as const;

export const ATTEST_REQUEST_TYPES = {
  AttestRequest: [
    { name: "thesis", type: "string" },
    { name: "symbol", type: "string" },
    { name: "recipient", type: "address" },
    { name: "issuedAt", type: "uint256" },
  ],
};

export interface AttestRequestPayload {
  thesis: string;
  symbol: string;
  recipient: string;
  issuedAt: number;
}

/** Max age of a signed attestation request (seconds). */
export const ATTEST_SIGNATURE_MAX_AGE_SEC = 600;

export function buildAttestTypedData(chainId: number, payload: AttestRequestPayload) {
  return {
    domain: {
      ...ATTESTRA_EIP712_DOMAIN,
      chainId,
    },
    types: ATTEST_REQUEST_TYPES,
    primaryType: "AttestRequest" as const,
    message: {
      thesis: payload.thesis,
      symbol: payload.symbol,
      recipient: payload.recipient,
      issuedAt: BigInt(payload.issuedAt),
    },
  };
}
