import { useMemo, useState } from "react";
import { checkThesisPairAlignment } from "../../shared/thesis-pair-alignment.ts";
import { PairSearchSelect } from "./PairSearchSelect";
import styles from "./ThesisForm.module.css";

interface ThesisFormProps {
  loading: boolean;
  signing: boolean;
  canSubmit: boolean;
  requireWallet: boolean;
  onSubmit: (thesis: string, symbol: string) => void;
}

const EXAMPLE =
  "BTC looks oversold after three red daily candles. Watch $95k support — a reclaim could trigger a relief bounce.";

export function ThesisForm({
  loading,
  signing,
  canSubmit,
  onSubmit,
}: ThesisFormProps) {
  const [thesis, setThesis] = useState("");
  const [symbol, setSymbol] = useState("BTCUSDT");

  const busy = loading || signing;

  const pairAlignment = useMemo(
    () => checkThesisPairAlignment(thesis, symbol),
    [thesis, symbol],
  );

  return (
    <section id="generate" className={styles.panel}>
      <div className={styles.header}>
        <h2>Submit your thesis</h2>
        <p>Share your market view and get a signed receipt you can show anyone.</p>
      </div>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(thesis.trim(), symbol);
        }}
      >
        <label className={styles.field}>
          <span>Market pair</span>
          <PairSearchSelect value={symbol} onChange={setSymbol} disabled={busy} />
        </label>

        <label className={styles.field}>
          <span>Your thesis</span>
          <textarea
            rows={4}
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            placeholder={EXAMPLE}
            disabled={busy}
            minLength={12}
            required
          />
        </label>

        {pairAlignment.status === "warn" && pairAlignment.message && (
          <p className={styles.pairWarn} role="status">
            {pairAlignment.message}
          </p>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.ghost} disabled={busy} onClick={() => setThesis(EXAMPLE)}>
            Use example
          </button>
          <button
            type="submit"
            className={styles.primary}
            disabled={busy || thesis.trim().length < 12 || !canSubmit}
          >
            {signing
              ? "Awaiting wallet signature…"
              : loading
                ? "Attesting on 0G…"
                : "Generate attested signal"}
          </button>
        </div>
      </form>
    </section>
  );
}
