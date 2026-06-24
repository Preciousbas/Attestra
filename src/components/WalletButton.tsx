import { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { WalletConnectModal } from "./WalletConnectModal";
import styles from "./WalletButton.module.css";

export function WalletButton() {
  const {
    address,
    isGalileo,
    hasProvider,
    wallets,
    connecting,
    disconnecting,
    error,
    connect,
    disconnect,
    switchNetwork,
    shorten,
    clearError,
  } = useWallet();

  const [modalOpen, setModalOpen] = useState(false);

  const handleConnectClick = () => {
    clearError();
    if (wallets.length === 1) {
      void connect(wallets[0].id);
      return;
    }
    setModalOpen(true);
  };

  const handleWalletSelect = (walletId: string) => {
    clearError();
    void connect(walletId).finally(() => setModalOpen(false));
  };

  if (!hasProvider) {
    return (
      <div className={styles.wrap}>
        <span className={styles.noWallet}>No wallet found</span>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.install}
        >
          Get a wallet
        </a>
      </div>
    );
  }

  if (!address) {
    return (
      <>
        <div className={styles.wrap}>
          <button
            type="button"
            className={styles.connect}
            onClick={handleConnectClick}
            disabled={connecting}
          >
            {connecting ? "Connecting…" : "Connect wallet"}
          </button>
          {error && !modalOpen && (
            <p className={styles.error} role="alert">
              {error}
              <button type="button" className={styles.dismiss} onClick={clearError}>
                ×
              </button>
            </p>
          )}
        </div>

        <WalletConnectModal
          open={modalOpen}
          wallets={wallets}
          connecting={connecting}
          error={error}
          onClose={() => !connecting && setModalOpen(false)}
          onSelect={handleWalletSelect}
          onClearError={clearError}
        />
      </>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.connectedPill}>
        <span className={`${styles.network} ${isGalileo ? styles.networkOk : styles.networkWarn}`}>
          {isGalileo ? "0G Galileo" : "Wrong network"}
        </span>
        <span className={styles.address}>{shorten(address)}</span>
        <button
          type="button"
          className={styles.disconnect}
          onClick={() => void disconnect()}
          disabled={disconnecting}
          title="Disconnect wallet"
        >
          {disconnecting ? "…" : "Disconnect"}
        </button>
      </div>
      {!isGalileo && (
        <button type="button" className={styles.switch} onClick={() => void switchNetwork()}>
          Switch network
        </button>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
          <button type="button" className={styles.dismiss} onClick={clearError}>
            ×
          </button>
        </p>
      )}
    </div>
  );
}
