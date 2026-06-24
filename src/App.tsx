import { useCallback, useEffect, useState } from "react";
import type { GenerateSignalResponse, InferenceMode } from "../shared/types";
import { fetchHealth, generateSignal } from "./lib/api";
import { WalletError } from "./lib/wallet-ui";
import { OG_GALILEO_CHAIN } from "../shared/chain.ts";
import { useWallet } from "./context/WalletContext";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { SignalCard } from "./components/SignalCard";
import { StatusBanner } from "./components/StatusBanner";
import { ThesisForm } from "./components/ThesisForm";
import "./App.css";

export default function App() {
  const wallet = useWallet();
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [computeReady, setComputeReady] = useState(false);
  const [requireWalletForMint, setRequireWalletForMint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateSignalResponse | null>(null);
  const [lastInferenceMode, setLastInferenceMode] = useState<InferenceMode | null>(null);

  useEffect(() => {
    fetchHealth()
      .then((health) => {
        setApiOk(health.ok);
        setComputeReady(health.computeConfigured);
        setRequireWalletForMint(health.requireWalletForMint);
      })
      .catch(() => setApiOk(false));
  }, []);

  const handleSubmit = useCallback(
    async (thesis: string, symbol: string) => {
      setLoading(true);
      setSigning(false);
      setError(null);
      wallet.clearError();

      try {
        if (requireWalletForMint) {
          if (!wallet.address) {
            throw new WalletError("No wallet found", "NO_WALLET");
          }
          if (!wallet.isGalileo) {
            throw new WalletError("Switch to 0G Galileo Testnet before attesting", "WRONG_NETWORK");
          }

          setSigning(true);
          const { signAttestRequest } = await import("./lib/wallet");
          const issuedAt = Math.floor(Date.now() / 1000);
          const signChainId = wallet.isGalileo
            ? OG_GALILEO_CHAIN.chainId
            : (wallet.chainId ?? OG_GALILEO_CHAIN.chainId);
          const signature = await signAttestRequest(
            {
              thesis,
              symbol,
              recipient: wallet.address,
              issuedAt,
            },
            signChainId,
          );

          const response = await generateSignal({
            thesis,
            symbol,
            walletAddress: wallet.address,
            issuedAt,
            signature,
          });
          setResult(response);
          setLastInferenceMode(response.inferenceMode);
          return;
        }

        const response = await generateSignal({ thesis, symbol });
        setResult(response);
        setLastInferenceMode(response.inferenceMode);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
        setSigning(false);
      }
    },
    [requireWalletForMint, wallet],
  );

  const canSubmit =
    apiOk === true &&
    !loading &&
    (!requireWalletForMint || (Boolean(wallet.address) && wallet.isGalileo));

  return (
    <div className="shell">
      <Header />
      <Hero />
      <StatusBanner
        apiOk={apiOk}
        computeReady={computeReady}
        requireWalletForMint={requireWalletForMint}
        walletConnected={Boolean(wallet.address)}
        walletOnGalileo={wallet.isGalileo}
        lastInferenceMode={lastInferenceMode}
        error={error}
      />

      <main className="main">
        <ThesisForm
          loading={loading}
          signing={signing}
          canSubmit={canSubmit}
          requireWallet={requireWalletForMint}
          onSubmit={handleSubmit}
        />
        {loading && !result && (
          <p className="attest-loading">
            {signing
              ? "Confirm the signature in your wallet…"
              : "Building your signal and receipt…"}
          </p>
        )}
        {result && <SignalCard result={result} viewerAddress={wallet.address} />}
      </main>

      <HowItWorks />

      <footer className="footer">
        <p>Research only. Not financial advice.</p>
      </footer>
    </div>
  );
}
