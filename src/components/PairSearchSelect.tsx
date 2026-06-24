import { useEffect, useId, useRef, useState } from "react";
import { MARKET_PAIRS } from "../../shared/market-pairs.ts";
import styles from "./PairSearchSelect.module.css";

interface PairSearchSelectProps {
  value: string;
  onChange: (symbol: string) => void;
  disabled?: boolean;
}

export function PairSearchSelect({ value, onChange, disabled }: PairSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchId = useId();

  const selected = MARKET_PAIRS.find((pair) => pair.symbol === value);
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = normalizedQuery
    ? MARKET_PAIRS.filter(
        (pair) =>
          pair.label.toLowerCase().includes(normalizedQuery) ||
          pair.symbol.toLowerCase().includes(normalizedQuery),
      )
    : MARKET_PAIRS;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{selected?.label ?? value}</span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className={styles.panel} role="listbox" aria-label="Market pairs">
          <div className={styles.searchWrap}>
            <input
              id={searchId}
              type="search"
              className={styles.search}
              placeholder="Search pairs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              autoComplete="off"
            />
          </div>
          <ul className={styles.list}>
            {filtered.length === 0 ? (
              <li className={styles.empty}>No pairs match your search</li>
            ) : (
              filtered.map((pair) => (
                <li key={pair.symbol}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={pair.symbol === value}
                    className={`${styles.option} ${pair.symbol === value ? styles.optionActive : ""}`}
                    onClick={() => {
                      onChange(pair.symbol);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className={styles.optionLabel}>{pair.label}</span>
                    <span className={styles.optionSymbol}>{pair.symbol.replace("USDT", "")}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
