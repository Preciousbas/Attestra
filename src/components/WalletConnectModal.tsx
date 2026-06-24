import { useEffect } from "react";
import type { DiscoveredWallet } from "../lib/wallet-ui.ts";
import styles from "./WalletConnectModal.module.css";

interface WalletConnectModalProps {
  open: boolean;
  wallets: DiscoveredWallet[];
  connecting: boolean;
  error: string | null;
  onClose: () => void;
  onSelect: (walletId: string) => void;
  onClearError: () => void;
}

function walletInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "W";
}

export function WalletConnectModal({
  open,
  wallets,
  connecting,
  error,
  onClose,
  onSelect,
  onClearError,
}: WalletConnectModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !connecting) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, connecting, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation" onClick={() => !connecting && onClose()}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id="wallet-modal-title" className={styles.title}>
              Connect a wallet
            </h2>
            <p className={styles.subtitle}>Choose how you want to connect to Attestra</p>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            disabled={connecting}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          {error && (
            <p className={styles.error} role="alert">
              {error}
              <button type="button" className={styles.errorDismiss} onClick={onClearError}>
                ×
              </button>
            </p>
          )}

          <ul className={styles.walletList}>
            {wallets.map((wallet) => (
              <li key={wallet.id}>
                <button
                  type="button"
                  className={styles.walletOption}
                  disabled={connecting}
                  onClick={() => onSelect(wallet.id)}
                >
                  <span className={styles.walletIcon}>
                    {wallet.icon ? (
                      <img src={wallet.icon} alt="" className={styles.walletIconImg} />
                    ) : (
                      <span className={styles.walletIconFallback}>{walletInitial(wallet.name)}</span>
                    )}
                  </span>
                  <span className={styles.walletMeta}>
                    <span className={styles.walletName}>{wallet.name}</span>
                    <span className={styles.walletHint}>Browser extension</span>
                  </span>
                  <span className={styles.walletArrow} aria-hidden>
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <footer className={styles.footer}>
          <p>New to wallets? Install a browser extension like MetaMask, Rabby, or Coinbase Wallet.</p>
        </footer>
      </div>
    </div>
  );
}
