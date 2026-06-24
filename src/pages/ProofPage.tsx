import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { OnChainProof } from "../../shared/types";
import { fetchProofBySignalId, fetchProofByTxHash, transferModeLabel } from "../lib/api";
import { shortenAddress } from "../lib/wallet-ui";
import { useWallet } from "../context/WalletContext";
import { CopyButton } from "../components/CopyButton";
import { Header } from "../components/Header";
import styles from "./ProofPage.module.css";

function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

function verificationLabel(status: OnChainProof["storageVerification"]): string {
  if (!status) return "Checking storage…";
  if (status.status === "match") return "Storage JSON matches on-chain hash";
  if (status.status === "mismatch") return "Storage hash mismatch — investigate";
  return status.message ?? "Storage verification unavailable";
}

export function ProofPage() {
  const { address: viewerAddress } = useWallet();
  const { txHash, signalId: signalIdParam } = useParams<{
    txHash?: string;
    signalId?: string;
  }>();
  const [proof, setProof] = useState<OnChainProof | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setProof(null);

    const load = signalIdParam
      ? fetchProofBySignalId(signalIdParam)
      : txHash
        ? fetchProofByTxHash(txHash)
        : Promise.reject(new Error("Missing transaction hash or signal ID"));

    load
      .then(setProof)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load proof"))
      .finally(() => setLoading(false));
  }, [txHash, signalIdParam]);

  const verifyStatus = proof?.storageVerification?.status;

  return (
    <div className="shell">
      <Header />
      <header className={styles.header}>
        <Link to="/" className={styles.back}>
          ← Attestra
        </Link>
        <h1>On-chain proof</h1>
        <p>Independently verify this signal on 0G Galileo testnet</p>
      </header>

      <section className={styles.howTo}>
        <h2>How to verify</h2>
        <ol>
          <li>Open the transaction on the 0G explorer and confirm the anchored content hash.</li>
          <li>Fetch the signal JSON from 0G Storage using the storage URI below.</li>
          <li>
            Recompute keccak256 of the canonical payload — it must match the on-chain hash (we do
            this automatically below).
          </li>
          <li>
            If an Agentic ID was minted, confirm its intelligent data hash matches the signal
            registry hash and note the on-chain owner address.
          </li>
        </ol>
      </section>

      {loading && <p className={styles.status}>Loading proof…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {proof && (
        <article className={styles.card}>
          <div className={styles.verified}>
            <span className={styles.dot} />
            Verified on 0G Chain
          </div>

          {proof.storageVerification && (
            <div
              className={`${styles.verifyBanner} ${
                verifyStatus === "match"
                  ? styles.verifyMatch
                  : verifyStatus === "mismatch"
                    ? styles.verifyMismatch
                    : styles.verifyUnavailable
              }`}
            >
              <strong>
                {verifyStatus === "match"
                  ? "Hash match"
                  : verifyStatus === "mismatch"
                    ? "Hash mismatch"
                    : "Verification unavailable"}
              </strong>
              <p>{verificationLabel(proof.storageVerification)}</p>
              {proof.storageVerification.computedHash && verifyStatus === "mismatch" && (
                <code className="mono">{proof.storageVerification.computedHash}</code>
              )}
            </div>
          )}

          {proof.agenticId && (
            <div
              className={`${styles.verifyBanner} ${
                proof.agenticId.hashMatch ? styles.verifyMatch : styles.verifyMismatch
              }`}
            >
              <strong>Agentic ID #{proof.agenticId.tokenId}</strong>
              <p>
                {proof.agenticId.hashMatch
                  ? "NFT intelligent data hash matches SignalRegistry content hash"
                  : "NFT hash does not match registry hash"}
              </p>
              <p>
                Owner:{" "}
                <span className="mono">
                  {viewerAddress &&
                  viewerAddress.toLowerCase() === proof.agenticId.ownerAddress.toLowerCase()
                    ? `your wallet (${shortenAddress(proof.agenticId.ownerAddress)})`
                    : shortenAddress(proof.agenticId.ownerAddress)}
                </span>
              </p>
              <p className={styles.agenticMeta}>
                {transferModeLabel(proof.agenticId.transferMode)}
              </p>
              <p className="mono">{proof.agenticId.dataDescription}</p>
              <a
                href={proof.agenticId.explorerTokenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.inlineLink}
              >
                View Agentic ID on explorer
              </a>
            </div>
          )}

          <dl className={styles.meta}>
            <div>
              <dt>Signal ID</dt>
              <dd className="mono">
                <Link to={`/proof/signal/${proof.signalId}`} className={styles.inlineLink}>
                  #{proof.signalId}
                </Link>
              </dd>
            </div>
            <div>
              <dt>Symbol</dt>
              <dd className="mono">{proof.symbol}</dd>
            </div>
            <div>
              <dt>Timestamp</dt>
              <dd className="mono">{formatTimestamp(proof.timestamp)}</dd>
            </div>
            <div>
              <dt>Submitter</dt>
              <dd className="mono">{proof.submitter}</dd>
            </div>
          </dl>

          <div className={styles.field}>
            <div className={styles.fieldHeader}>
              <span>Content hash</span>
              <CopyButton value={proof.contentHash} />
            </div>
            <code className="mono">{proof.contentHash}</code>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldHeader}>
              <span>Storage URI</span>
              <CopyButton value={proof.storageUri} />
            </div>
            <code className="mono">{proof.storageUri}</code>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldHeader}>
              <span>Transaction</span>
              <CopyButton value={proof.txHash} />
            </div>
            <code className="mono">{proof.txHash}</code>
          </div>

          <div className={styles.actions}>
            <a
              href={proof.explorerTxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              View on 0G explorer
            </a>
            <Link to={`/proof/${proof.txHash}`} className={styles.linkSecondary}>
              Permalink by tx
            </Link>
          </div>
        </article>
      )}
    </div>
  );
}
