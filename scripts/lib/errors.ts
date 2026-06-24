export function formatFetchError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const lines = [error.message];
  const cause = (error as Error & { cause?: unknown }).cause;

  if (cause instanceof Error) {
    lines.push(`  cause: ${cause.message}`);
    const code = (cause as NodeJS.ErrnoException).code;
    if (code) lines.push(`  code: ${code}`);
  } else if (cause && typeof cause === "object") {
    const c = cause as { code?: string; message?: string };
    if (c.message) lines.push(`  cause: ${c.message}`);
    if (c.code) lines.push(`  code: ${c.code}`);
  }

  return lines.join("\n");
}

export function printNetworkHints(): void {
  console.error(`
Likely causes when BOTH CoinGecko and 0G fail with "fetch failed":
  1. WSL has no outbound internet (VPN, firewall, or broken DNS)
  2. Node resolves DNS over IPv6 first — try: export NODE_OPTIONS="--dns-result-order=ipv4first"
  3. Corporate/school network blocking external APIs

Quick checks (run in WSL):
  curl -I "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin"
  curl -I https://router-api.0g.ai/v1/models
  cat /etc/resolv.conf

Run full diagnostics:
  npm run diagnose
`);
}
