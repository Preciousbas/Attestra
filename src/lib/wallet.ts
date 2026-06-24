import { BrowserProvider, type Eip1193Provider } from "ethers";
import { OG_GALILEO_CHAIN } from "../../shared/chain.ts";
import {
  buildAttestTypedData,
  type AttestRequestPayload,
} from "../../shared/wallet-auth.ts";
import {
  clearActiveWallet,
  ensureActiveWallet,
  getActiveWalletProvider,
  requestWalletAccounts,
  setManualDisconnect,
  WalletError,
} from "./wallet-ui.ts";

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      on?(event: string, handler: (...args: unknown[]) => void): void;
      removeListener?(event: string, handler: (...args: unknown[]) => void): void;
      providers?: Eip1193Provider[];
      isMetaMask?: boolean;
    };
  }
}

export { WalletError } from "./wallet-ui.ts";

function getBrowserProvider(): BrowserProvider {
  const injected = getActiveWalletProvider();
  if (!injected) {
    throw new WalletError("No wallet found", "NO_WALLET");
  }
  return new BrowserProvider(injected as Eip1193Provider);
}

export async function connectWallet(walletId?: string): Promise<{ address: string; chainId: number }> {
  setManualDisconnect(false);

  const injected = await ensureActiveWallet(walletId);
  if (!injected) {
    throw new WalletError("No wallet found", "NO_WALLET");
  }

  const accounts = await requestWalletAccounts(injected);
  const provider = getBrowserProvider();
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  if (chainId !== OG_GALILEO_CHAIN.chainId) {
    await switchToGalileo();
    const updated = await provider.getNetwork();
    return {
      address: accounts[0],
      chainId: Number(updated.chainId),
    };
  }

  return { address: accounts[0], chainId };
}

export async function switchToGalileo(): Promise<void> {
  const injected = getActiveWalletProvider();
  if (!injected) {
    throw new WalletError("No wallet found", "NO_WALLET");
  }

  try {
    await injected.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: OG_GALILEO_CHAIN.chainIdHex }],
    });
  } catch (error) {
    const walletError = error as { code?: number };
    if (walletError.code === 4902) {
      await injected.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: OG_GALILEO_CHAIN.chainIdHex,
            chainName: OG_GALILEO_CHAIN.name,
            rpcUrls: [OG_GALILEO_CHAIN.rpcUrl],
            blockExplorerUrls: [OG_GALILEO_CHAIN.explorerUrl],
            nativeCurrency: OG_GALILEO_CHAIN.nativeCurrency,
          },
        ],
      });
      return;
    }
    throw new WalletError(
      "Switch to 0G Galileo testnet in your wallet to receive your receipt",
      "WRONG_NETWORK",
    );
  }
}

export async function signAttestRequest(
  payload: AttestRequestPayload,
  chainId: number,
  walletId?: string,
): Promise<{ signature: string; address: string }> {
  const injected = await ensureActiveWallet(walletId);
  if (!injected) {
    throw new WalletError(
      "Choose your wallet in the connect modal, then try again.",
      "NO_WALLET",
    );
  }

  const accounts = await requestWalletAccounts(injected);
  const signerAddress = accounts[0];

  const provider = new BrowserProvider(injected as Eip1193Provider);
  const network = await provider.getNetwork();
  const networkChainId = Number(network.chainId);

  if (networkChainId !== OG_GALILEO_CHAIN.chainId) {
    throw new WalletError(
      "Switch to 0G Galileo testnet in your wallet, then try again.",
      "WRONG_NETWORK",
    );
  }

  const typed = buildAttestTypedData(chainId, {
    ...payload,
    recipient: signerAddress,
  });

  const typedMessage = {
    thesis: payload.thesis,
    symbol: payload.symbol,
    recipient: signerAddress,
    issuedAt: BigInt(payload.issuedAt),
  };

  const signer = await provider.getSigner(signerAddress);

  let primaryError: unknown;
  try {
    const signature = await signer.signTypedData(typed.domain, typed.types, typedMessage);
    return { signature, address: signerAddress };
  } catch (error) {
    primaryError = error;
  }

  try {
    const signature = await signTypedDataV4(
      injected,
      signerAddress,
      typed.domain,
      typed.types,
      payload,
    );
    return { signature, address: signerAddress };
  } catch (fallbackError) {
    throw mapSignError(primaryError, fallbackError);
  }
}

async function signTypedDataV4(
  provider: Eip1193Provider,
  address: string,
  domain: ReturnType<typeof buildAttestTypedData>["domain"],
  types: ReturnType<typeof buildAttestTypedData>["types"],
  message: AttestRequestPayload,
): Promise<string> {
  const data = {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
      ],
      ...types,
    },
    primaryType: "AttestRequest",
    domain: {
      name: domain.name,
      version: domain.version,
      chainId: domain.chainId,
    },
    message: {
      thesis: message.thesis,
      symbol: message.symbol,
      recipient: message.recipient,
      issuedAt: String(message.issuedAt),
    },
  };

  return (await provider.request({
    method: "eth_signTypedData_v4",
    params: [address, JSON.stringify(data)],
  })) as string;
}

function mapSignError(...errors: unknown[]): WalletError {
  for (const error of errors) {
    const mapped = mapSingleSignError(error);
    if (mapped) return mapped;
  }

  return new WalletError(
    "Could not sign in your wallet. Reconnect, pick the same wallet you used at connect, and confirm on 0G Galileo.",
    "SIGN_FAILED",
  );
}

function mapSingleSignError(error: unknown): WalletError | null {
  if (!error) return null;

  const err = error as { code?: number; message?: string; info?: { error?: { code?: number } } };
  const code = err.code ?? err.info?.error?.code;
  const rawMessage = err.message?.trim() ?? "";

  if (code === 4001 || String(code) === "ACTION_REJECTED") {
    return new WalletError("You declined the signature in your wallet.", "SIGN_REJECTED");
  }

  if (
    code === 4100 ||
    rawMessage.includes("not been authorized") ||
    rawMessage.includes("not authorized")
  ) {
    return new WalletError(
      "Your wallet blocked the signature. Disconnect, connect again, and pick the same wallet from the list.",
      "SIGN_UNAUTHORIZED",
    );
  }

  if (
    rawMessage.includes("User denied") ||
    rawMessage.includes("user rejected") ||
    rawMessage.includes("rejected")
  ) {
    return new WalletError("You declined the signature in your wallet.", "SIGN_REJECTED");
  }

  if (rawMessage.includes("not supported") || rawMessage.includes("Unsupported")) {
    return new WalletError(
      "This wallet does not support typed signatures. Try MetaMask or Rabby.",
      "SIGN_UNSUPPORTED",
    );
  }

  if (rawMessage.length > 0 && rawMessage.length < 200) {
    return new WalletError(rawMessage, "SIGN_FAILED");
  }

  return null;
}

export async function disconnectWallet(): Promise<void> {
  const injected = getActiveWalletProvider();

  if (injected) {
    try {
      await injected.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // Revoke is optional — manualDisconnect prevents silent re-connect.
    }
  }

  setManualDisconnect(true);
  clearActiveWallet();
}

export async function readWalletChainId(): Promise<number | null> {
  if (!getActiveWalletProvider()) return null;
  try {
    const provider = getBrowserProvider();
    const network = await provider.getNetwork();
    return Number(network.chainId);
  } catch {
    return null;
  }
}

export async function readConnectedAddress(): Promise<string | null> {
  const injected = getActiveWalletProvider();
  if (!injected) return null;
  try {
    const accounts = (await injected.request({ method: "eth_accounts" })) as string[];
    if (!accounts[0]) return null;
    return accounts[0];
  } catch {
    return null;
  }
}
