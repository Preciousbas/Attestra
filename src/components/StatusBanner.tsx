import type { InferenceMode } from "../../shared/types";
import styles from "./StatusBanner.module.css";

interface StatusBannerProps {
  apiOk: boolean | null;
  computeReady: boolean;
  requireWalletForMint: boolean;
  walletConnected: boolean;
  walletOnGalileo: boolean;
  lastInferenceMode: InferenceMode | null;
  error: string | null;
}

export function StatusBanner({
  apiOk,
  computeReady,
  requireWalletForMint,
  walletConnected,
  walletOnGalileo,
  lastInferenceMode,
  error,
}: StatusBannerProps) {
  if (error) {
    return <div className={`${styles.banner} ${styles.error}`}>{error}</div>;
  }

  if (apiOk === null) return null;

  if (!apiOk) {
    return (
      <div className={`${styles.banner} ${styles.warn}`}>
        API offline — run <code className="mono">npm run dev</code> from the project root.
      </div>
    );
  }

  if (requireWalletForMint && !walletConnected) {
    return (
      <div className={`${styles.banner} ${styles.warn}`}>
        Connect your wallet on <strong>0G Galileo testnet</strong> before you generate. You will
        sign once so your receipt is minted to your address.
      </div>
    );
  }

  if (requireWalletForMint && walletConnected && !walletOnGalileo) {
    return (
      <div className={`${styles.banner} ${styles.warn}`}>
        Switch to <strong>0G Galileo testnet</strong> in your wallet to receive your receipt.
      </div>
    );
  }

  if (!computeReady) {
    return (
      <div className={`${styles.banner} ${styles.warn}`}>
        Add <code className="mono">ZG_COMPUTE_API_KEY</code> to <code className="mono">.env</code>{" "}
        (from <a href="https://pc.0g.ai" target="_blank" rel="noreferrer">pc.0g.ai</a>) to generate
        signals.
      </div>
    );
  }

  if (lastInferenceMode === "mock") {
    return (
      <div className={`${styles.banner} ${styles.warn}`}>
        Last signal used <strong>mock inference</strong> (Router credits low). Storage, on-chain
        anchor, and Agentic ID mint are still real — deposit at{" "}
        <a href="https://pc.0g.ai" target="_blank" rel="noreferrer">pc.0g.ai</a> for live 0G Compute.
      </div>
    );
  }

  return (
    <div className={`${styles.banner} ${styles.ok}`}>
      Ready. Connect your wallet, submit a thesis, and get your receipt.
    </div>
  );
}
