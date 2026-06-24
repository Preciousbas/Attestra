/** Wallet helpers with no ethers dependency (safe for initial bundle). */

export class WalletError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "WalletError";
    this.code = code;
  }
}

type RequestableProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  providers?: RequestableProvider[];
  isMetaMask?: boolean;
  isTrust?: boolean;
  isCoinbaseWallet?: boolean;
  isBraveWallet?: boolean;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
};

interface Eip6963ProviderDetail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: RequestableProvider;
}

export interface DiscoveredWallet {
  id: string;
  name: string;
  icon?: string;
  provider: RequestableProvider;
}

let cachedWallets: DiscoveredWallet[] | null = null;
let activeWallet: DiscoveredWallet | null = null;
let discoveryPromise: Promise<DiscoveredWallet[]> | null = null;

function labelLegacyProvider(provider: RequestableProvider): string {
  if (provider.isMetaMask) return "MetaMask";
  if (provider.isTrust) return "Trust Wallet";
  if (provider.isCoinbaseWallet) return "Coinbase Wallet";
  if (provider.isBraveWallet) return "Brave Wallet";
  return "Browser wallet";
}

function preferDefaultWallet(wallets: DiscoveredWallet[]): DiscoveredWallet | undefined {
  return (
    wallets.find((w) => w.name === "MetaMask") ??
    wallets.find((w) => w.name === "Rabby Wallet") ??
    wallets[0]
  );
}

/**
 * Discover all EIP-1193 wallets via EIP-6963 + legacy window.ethereum providers.
 * Avoids blindly using window.ethereum when multiple extensions compete (e.g. Edge).
 */
export function discoverWallets(): Promise<DiscoveredWallet[]> {
  if (cachedWallets) return Promise.resolve(cachedWallets);
  if (discoveryPromise) return discoveryPromise;

  discoveryPromise = new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve([]);
      return;
    }

    const wallets: DiscoveredWallet[] = [];
    const seen = new Set<RequestableProvider>();

    const add = (provider: RequestableProvider, name: string, id: string, icon?: string) => {
      if (seen.has(provider)) return;
      seen.add(provider);
      wallets.push({ id, name, icon, provider });
    };

    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
      add(detail.provider, detail.info.name, detail.info.uuid, detail.info.icon);
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    const finish = () => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);

      const eth = (
        window as Window & { ethereum?: RequestableProvider & { providers?: RequestableProvider[] } }
      ).ethereum;

      if (eth?.providers?.length) {
        eth.providers.forEach((provider, index) => {
          add(provider, labelLegacyProvider(provider), `legacy-${index}`);
        });
      } else if (eth) {
        add(eth, labelLegacyProvider(eth), "legacy-injected");
      }

      cachedWallets = wallets;
      discoveryPromise = null;

      if (!activeWallet && wallets.length === 1) {
        activeWallet = wallets[0];
      }

      resolve(wallets);
    };

    window.setTimeout(finish, 400);
  });

  return discoveryPromise;
}

export function getDiscoveredWallets(): DiscoveredWallet[] {
  return cachedWallets ?? [];
}

export function setActiveWalletById(walletId: string): DiscoveredWallet | undefined {
  const wallet = cachedWallets?.find((w) => w.id === walletId);
  if (wallet) activeWallet = wallet;
  return wallet;
}

export function getActiveWallet(): DiscoveredWallet | null {
  return activeWallet;
}

export function getActiveWalletProvider(): RequestableProvider | undefined {
  return activeWallet?.provider;
}

export async function ensureActiveWallet(walletId?: string): Promise<RequestableProvider | undefined> {
  const wallets = await discoverWallets();

  if (walletId) {
    const picked = setActiveWalletById(walletId);
    return picked?.provider;
  }

  if (activeWallet) return activeWallet.provider;

  if (wallets.length === 1) {
    activeWallet = wallets[0];
    return wallets[0].provider;
  }

  if (wallets.length > 1) {
    const preferred = preferDefaultWallet(wallets);
    if (preferred) {
      activeWallet = preferred;
      return preferred.provider;
    }
  }

  return undefined;
}

export function hasWalletProvider(): boolean {
  if (cachedWallets?.length) return true;
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

function parseWalletRpcError(error: unknown): { code?: number; message: string } {
  if (error && typeof error === "object") {
    const err = error as { code?: number; message?: string };
    return { code: err.code, message: err.message ?? "Wallet connection failed" };
  }
  return { message: "Wallet connection failed" };
}

/** Request accounts from the chosen EIP-1193 provider. */
export async function requestWalletAccounts(
  provider: RequestableProvider,
): Promise<string[]> {
  try {
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    if (!accounts[0]) {
      throw new WalletError("No account returned from your wallet", "NO_ACCOUNT");
    }
    return accounts;
  } catch (error) {
    const { code, message } = parseWalletRpcError(error);

    if (code === 4001) {
      throw new WalletError("Connection rejected in your wallet", "USER_REJECTED");
    }

    const lockedWallet =
      code === -32603 ||
      message.includes("No active wallet found") ||
      message.includes("PUBLIC_requestAccounts");

    if (lockedWallet) {
      try {
        await provider.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
        const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
        if (accounts[0]) return accounts;
      } catch {
        // fall through
      }
      throw new WalletError(
        "Open your wallet, unlock it, and click Connect again.",
        "WALLET_LOCKED",
      );
    }

    throw new WalletError(message, "CONNECT_FAILED");
  }
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}
