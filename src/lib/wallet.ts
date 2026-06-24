import { BrowserProvider, type Eip1193Provider } from "ethers";
import { OG_GALILEO_CHAIN } from "../../shared/chain.ts";
import {
  buildAttestTypedData,
  type AttestRequestPayload,
} from "../../shared/wallet-auth.ts";
import {
  ensureActiveWallet,
  getActiveWalletProvider,
  requestWalletAccounts,
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
): Promise<string> {
  await ensureActiveWallet();
  const provider = getBrowserProvider();
  const network = await provider.getNetwork();
  const networkChainId = Number(network.chainId);
  const signer = await provider.getSigner();
  const signerAddress = await signer.getAddress();
  const typed = buildAttestTypedData(chainId, payload);

  try {
    return await signer.signTypedData(typed.domain, typed.types, typed.message);
  } catch (error) {
    const err = error as { code?: number; message?: string; info?: { error?: { code?: number } } };
    const code = err.code ?? err.info?.error?.code;

    if (code === 4001 || String(code) === "ACTION_REJECTED") {
      throw new WalletError("You declined the signature in your wallet.", "SIGN_REJECTED");
    }
    if (networkChainId !== OG_GALILEO_CHAIN.chainId) {
      throw new WalletError(
        "Switch to 0G Galileo testnet in your wallet, then try again.",
        "WRONG_NETWORK",
      );
    }
    if (signerAddress.toLowerCase() !== payload.recipient.toLowerCase()) {
      throw new WalletError(
        "Your wallet account changed. Disconnect and connect again.",
        "ACCOUNT_MISMATCH",
      );
    }
    throw new WalletError(
      "Could not sign in your wallet. Try again or use a different wallet.",
      "SIGN_FAILED",
    );
  }
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
