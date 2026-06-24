import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  isManualDisconnect,
  setActiveWalletById,
  setManualDisconnect,
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
  disconnecting: boolean;
  error: string | null;
  setSelectedWalletId: (id: string) => void;
  connect: (walletId?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  clearError: () => void;
  syncAddress: (address: string) => void;
  shorten: (address: string) => string;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function loadWallet() {
  return import("../lib/wallet.ts");
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [hasProvider, setHasProvider] = useState(() => hasWalletProvider());
  const sessionAllowedRef = useRef(true);

  const allowSession = useCallback(() => {
    return sessionAllowedRef.current && !isManualDisconnect();
  }, []);

  const attachProviderListeners = useCallback(
    (
      provider: NonNullable<ReturnType<typeof getActiveWalletProvider>>,
      onAddress: (address: string | null) => void,
      onChain: (chainId: number) => void,
    ): (() => void) => {
      if (!provider.on) return () => {};

      const onAccounts = (accounts: unknown) => {
        if (!allowSession()) return;
        const list = accounts as string[];
        onAddress(list[0] ?? null);
      };
      const onChainChanged = (hexChainId: unknown) => {
        if (!allowSession()) return;
        onChain(Number.parseInt(String(hexChainId), 16));
      };

      provider.on("accountsChanged", onAccounts);
      provider.on("chainChanged", onChainChanged);
      return () => {
        provider.removeListener?.("accountsChanged", onAccounts);
        provider.removeListener?.("chainChanged", onChainChanged);
      };
    },
    [allowSession],
  );

  const refreshWalletList = useCallback(async () => {
    const list = await discoverWallets();
    setWallets(list);
    setHasProvider(list.length > 0);

    if (list.length === 1 && !selectedWalletId) {
      setSelectedWalletId(list[0].id);
      setActiveWalletById(list[0].id);
    }
  }, [selectedWalletId]);

  const refreshSession = useCallback(async () => {
    if (!allowSession()) {
      setAddress(null);
      setChainId(null);
      return;
    }

    await refreshWalletList();

    const provider = await ensureActiveWallet(selectedWalletId || undefined);
    if (!provider) return;

    const { readConnectedAddress, readWalletChainId } = await loadWallet();
    const [addr, cid] = await Promise.all([readConnectedAddress(), readWalletChainId()]);
    setAddress(addr);
    setChainId(cid);
  }, [allowSession, refreshWalletList, selectedWalletId]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    void refreshWalletList().then(() => {
      if (!allowSession()) return;

      const provider = getActiveWalletProvider();
      if (provider) {
        cleanup = attachProviderListeners(provider, setAddress, setChainId);
      }
    });

    void refreshSession();

    return () => cleanup?.();
  }, [attachProviderListeners, allowSession, refreshSession, refreshWalletList]);

  useEffect(() => {
    if (!selectedWalletId) return;
    setActiveWalletById(selectedWalletId);

    const provider = getActiveWalletProvider();
    if (!provider) return;

    const cleanup = attachProviderListeners(provider, setAddress, setChainId);
    void refreshSession();
    return cleanup;
  }, [attachProviderListeners, refreshSession, selectedWalletId]);

  const connect = useCallback(async (walletId?: string) => {
    const id = walletId ?? selectedWalletId;
    setConnecting(true);
    setError(null);
    sessionAllowedRef.current = true;
    setManualDisconnect(false);

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

  const disconnect = useCallback(async () => {
    setDisconnecting(true);
    setError(null);
    sessionAllowedRef.current = false;

    try {
      const { disconnectWallet } = await loadWallet();
      await disconnectWallet();
    } catch {
      setManualDisconnect(true);
    } finally {
      setAddress(null);
      setChainId(null);
      setDisconnecting(false);
    }
  }, []);

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

  const syncAddress = useCallback((next: string) => {
    setAddress(next);
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
      disconnecting,
      error,
      setSelectedWalletId,
      connect,
      disconnect,
      switchNetwork,
      clearError: () => setError(null),
      syncAddress,
      shorten: shortenAddress,
    }),
    [
      address,
      chainId,
      hasProvider,
      wallets,
      selectedWalletId,
      connecting,
      disconnecting,
      error,
      connect,
      disconnect,
      switchNetwork,
      syncAddress,
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
