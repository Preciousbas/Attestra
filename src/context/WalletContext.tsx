import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { OG_GALILEO_CHAIN } from "../../shared/chain.ts";
import {
  type DiscoveredWallet,
  WalletError,
  discoverWallets,
  ensureActiveWallet,
  getActiveWalletProvider,
  hasWalletProvider,
  setActiveWalletById,
  shortenAddress,
} from "../lib/wallet-ui.ts";

interface WalletContextValue {
  address: string | null;
  chainId: number | null;
  isGalileo: boolean;
  hasProvider: boolean;
  wallets: DiscoveredWallet[];
  selectedWalletId: string;
  connecting: boolean;
  error: string | null;
  setSelectedWalletId: (id: string) => void;
  connect: (walletId?: string) => Promise<void>;
  switchNetwork: () => Promise<void>;
  clearError: () => void;
  shorten: (address: string) => string;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function loadWallet() {
  return import("../lib/wallet.ts");
}

function attachProviderListeners(
  provider: NonNullable<ReturnType<typeof getActiveWalletProvider>>,
  onAddress: (address: string | null) => void,
  onChain: (chainId: number) => void,
): () => void {
  if (!provider.on) return () => {};

  const onAccounts = (accounts: unknown) => {
    const list = accounts as string[];
    onAddress(list[0] ?? null);
  };
  const onChainChanged = (hexChainId: unknown) => {
    onChain(Number.parseInt(String(hexChainId), 16));
  };

  provider.on("accountsChanged", onAccounts);
  provider.on("chainChanged", onChainChanged);
  return () => {
    provider.removeListener?.("accountsChanged", onAccounts);
    provider.removeListener?.("chainChanged", onChainChanged);
  };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [hasProvider, setHasProvider] = useState(() => hasWalletProvider());

  const refreshSilent = useCallback(async () => {
    const list = await discoverWallets();
    setWallets(list);
    setHasProvider(list.length > 0);

    if (list.length > 0 && !selectedWalletId) {
      const preferred =
        list.find((w) => w.name === "MetaMask") ??
        list.find((w) => w.name === "Rabby Wallet") ??
        list[0];
      if (preferred) {
        setSelectedWalletId(preferred.id);
        setActiveWalletById(preferred.id);
      }
    }

    const provider = await ensureActiveWallet(selectedWalletId || undefined);
    if (!provider) return;

    const { readConnectedAddress, readWalletChainId } = await loadWallet();
    const [addr, cid] = await Promise.all([readConnectedAddress(), readWalletChainId()]);
    setAddress(addr);
    setChainId(cid);
  }, [selectedWalletId]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    void discoverWallets().then((list) => {
      setWallets(list);
      setHasProvider(list.length > 0);

      if (list.length > 0) {
        const preferred =
          list.find((w) => w.name === "MetaMask") ??
          list.find((w) => w.name === "Rabby Wallet") ??
          list[0];
        if (preferred) {
          setSelectedWalletId((current) => current || preferred.id);
          setActiveWalletById(preferred.id);
        }
      }

      const provider = getActiveWalletProvider();
      if (provider) {
        cleanup = attachProviderListeners(provider, setAddress, setChainId);
      }
    });

    void refreshSilent();

    return () => cleanup?.();
  }, [refreshSilent]);

  useEffect(() => {
    if (!selectedWalletId) return;
    setActiveWalletById(selectedWalletId);
    const provider = getActiveWalletProvider();
    if (!provider) return;

    const cleanup = attachProviderListeners(provider, setAddress, setChainId);
    void refreshSilent();
    return cleanup;
  }, [selectedWalletId, refreshSilent]);

  const connect = useCallback(async (walletId?: string) => {
    const id = walletId ?? selectedWalletId;
    setConnecting(true);
    setError(null);
    try {
      if (!id) {
        throw new WalletError("Choose a wallet first", "NO_WALLET_SELECTED");
      }
      setSelectedWalletId(id);
      setActiveWalletById(id);
      const { connectWallet } = await loadWallet();
      const result = await connectWallet(id);
      setAddress(result.address);
      setChainId(result.chainId);
    } catch (err) {
      const message =
        err instanceof WalletError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Wallet connection failed";
      setError(message);
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [selectedWalletId]);

  const switchNetwork = useCallback(async () => {
    setError(null);
    try {
      const { switchToGalileo } = await loadWallet();
      await switchToGalileo();
      setChainId(OG_GALILEO_CHAIN.chainId);
    } catch (err) {
      const message = err instanceof WalletError ? err.message : "Network switch failed";
      setError(message);
      throw err;
    }
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      chainId,
      isGalileo: chainId === OG_GALILEO_CHAIN.chainId,
      hasProvider,
      wallets,
      selectedWalletId,
      connecting,
      error,
      setSelectedWalletId,
      connect,
      switchNetwork,
      clearError: () => setError(null),
      shorten: shortenAddress,
    }),
    [
      address,
      chainId,
      hasProvider,
      wallets,
      selectedWalletId,
      connecting,
      error,
      connect,
      switchNetwork,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return ctx;
}
