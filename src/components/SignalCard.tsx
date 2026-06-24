import type { GenerateSignalResponse } from "../../shared/types";
import { transferModeLabel } from "../lib/api";
import { shortenAddress } from "../lib/wallet-ui";
import styles from "./SignalCard.module.css";
import { Link } from "react-router-dom";
import { CopyButton } from "./CopyButton";

interface SignalCardProps {
  result: GenerateSignalResponse;
  viewerAddress?: string | null;
}

const directionLabel = {
  long: "Long",
  short: "Short",
  neutral: "Neutral",
} as const;

function explorerTxUrl(txHash: string): string {
  return `https://chainscan-galileo.0g.ai/tx/${txHash}`;
}

function isViewerOwner(viewer: string | null | undefined, owner: string): boolean {
  return Boolean(viewer && viewer.toLowerCase() === owner.toLowerCase());
}

export function SignalCard({ result, viewerAddress }: SignalCardProps) {
  const { signal, compute, inferenceMode, agenticTransferMode, pairAlignmentWarning } = result;
  const dirClass = styles[signal.direction];
  const attested = signal.verification.status === "attested";
  const txHash = signal.verification.txHash;
  const isMock = inferenceMode === "mock";
  const agentic = signal.verification.agenticId;

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <div>
          <p className={styles.label}>Attested signal</p>
          <h3>{signal.summary}</h3>
        </div>
        <span className={`${styles.badge} ${dirClass}`}>{directionLabel[signal.direction]}</span>
      </div>

      <p className={styles.reasoning}>{signal.reasoning}</p>

      {pairAlignmentWarning && (
        <p className={styles.pairWarn}>{pairAlignmentWarning}</p>
      )}

      <dl className={styles.meta}>
        <div>
          <dt>Pair</dt>
          <dd className="mono">{signal.symbol}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd className="mono">${signal.market.price.toLocaleString("en-US")}</dd>
        </div>
        <div>
          <dt>24h</dt>
          <dd className="mono">{signal.market.change24hPct.toFixed(2)}%</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd className="mono">{signal.confidence}%</dd>
        </div>
      </dl>

      <div className={styles.proof}>
        <div className={styles.statusRow}>
          <div
            className={`${styles.verified} ${attested ? styles.verifiedOn : styles.verifiedPending}`}
          >
            <span className={styles.dot} />
            {attested ? "Verified on 0G Chain" : "Pending attestation"}
          </div>
          <span className={`${styles.inferenceBadge} ${isMock ? styles.inferenceMock : styles.inferenceLive}`}>
            {isMock ? "Mock inference" : "Live 0G Compute"}
          </span>
        </div>

        <p className={styles.computeMeta}>
          {compute.model} · {compute.latencyMs}ms · data: {signal.market.source}
        </p>

        {isMock && (
          <p className={styles.mockNote}>
            Router credits unavailable — storage and on-chain anchor are still real. Top up at{" "}
            <a href="https://pc.0g.ai" target="_blank" rel="noopener noreferrer">
              pc.0g.ai
            </a>{" "}
            for live AI inference.
          </p>
        )}

        {signal.verification.contentHash && (
          <div className={styles.hash}>
            <div className={styles.hashHeader}>
              <span>Content hash</span>
              <CopyButton value={signal.verification.contentHash} />
            </div>
            <code className="mono">{signal.verification.contentHash}</code>
          </div>
        )}

        {attested && signal.verification.storageUri && (
          <div className={styles.hash}>
            <div className={styles.hashHeader}>
              <span>0G Storage</span>
              <CopyButton value={signal.verification.storageUri} />
            </div>
            <code className="mono">{signal.verification.storageUri}</code>
          </div>
        )}

        {attested && agentic && (
          <div
            className={`${styles.agenticBadge} ${
              agentic.mintedToUser ? styles.agenticUser : styles.agenticCustodial
            }`}
          >
            <span className={styles.agenticLabel}>Agentic ID (ERC-7857)</span>
            {agentic.mintedToUser && isViewerOwner(viewerAddress, agentic.ownerAddress) ? (
              <p className={styles.agenticTitle}>Minted to your wallet — token #{agentic.tokenId}</p>
            ) : agentic.mintedToUser ? (
              <p className={styles.agenticTitle}>
                Minted to <span className="mono">{shortenAddress(agentic.ownerAddress)}</span> — token #
                {agentic.tokenId}
              </p>
            ) : (
              <>
                <p className={styles.agenticTitle}>Custodial Agentic ID — token #{agentic.tokenId}</p>
                <p className={styles.agenticSub}>
                  Owned by server wallet <span className="mono">{shortenAddress(agentic.ownerAddress)}</span>
                  {" "}(connect wallet on next attestation to mint to you).
                </p>
              </>
            )}
            <p className={styles.agenticSub}>
              Transfer: {transferModeLabel(agenticTransferMode)}
            </p>
            {agentic.explorerTokenUrl && (
              <a
                href={agentic.explorerTokenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.agenticLink}
              >
                View NFT on explorer
              </a>
            )}
          </div>
        )}

        {attested && !agentic && (
          <p className={styles.agenticPending}>
            Agentic ID not minted — check server logs or ZG_AGENTIC_ID_ADDRESS configuration.
          </p>
        )}

        {attested && txHash && (
          <div className={styles.ctaRow}>
            <Link to={`/proof/${txHash}`} className={styles.ctaPrimary}>
              Open proof page
            </Link>
            <a
              href={explorerTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaSecondary}
            >
              View on explorer
            </a>
          </div>
        )}

        {!attested && (
          <p className={styles.pending}>Attestation in progress or unavailable.</p>
        )}
      </div>
    </article>
  );
}
