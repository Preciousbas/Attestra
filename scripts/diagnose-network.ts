import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatFetchError, printNetworkHints } from "./lib/errors.ts";

const targets = [
  { name: "CoinGecko markets", url: "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin" },
  { name: "0G Router models", url: "https://router-api.0g.ai/v1/models" },
  { name: "Google (baseline)", url: "https://www.google.com" },
  { name: "Binance ping (optional)", url: "https://api.binance.com/api/v3/ping", optional: true },
];

async function probe(name: string, url: string, optional = false): Promise<boolean> {
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const ms = Date.now() - started;
    console.log(`✅ ${name}: HTTP ${res.status} (${ms}ms) — ${url}`);
    return true;
  } catch (error) {
    const icon = optional ? "⚠ " : "❌";
    console.log(`${icon}${name}: ${formatFetchError(error)}`);
    console.log(`   ${url}`);
    if (optional) {
      console.log("   (Binance is geo-blocked in some regions e.g. Nigeria — CoinGecko is used instead)");
    }
    return false;
  }
}

function checkEnv() {
  const envPath = resolve(process.cwd(), ".env");
  console.log("\n--- Environment ---");
  console.log(`cwd: ${process.cwd()}`);
  console.log(`.env exists: ${existsSync(envPath)}`);

  if (!existsSync(envPath)) {
    console.log("⚠  No .env file — create one with ZG_COMPUTE_API_KEY (see README)");
    return;
  }

  const raw = readFileSync(envPath, "utf8");
  const hasKey = /^ZG_COMPUTE_API_KEY\s*=\s*\S+/m.test(raw);
  const keyLooksPlaceholder = /sk-your-router-api-key/.test(raw);
  const marketMatch = raw.match(/^MARKET_DATA_PROVIDER\s*=\s*(\S+)/m);
  const marketProvider = marketMatch?.[1] ?? "coingecko (default)";
  console.log(`ZG_COMPUTE_API_KEY set: ${hasKey ? "yes" : "no"}`);
  console.log(`MARKET_DATA_PROVIDER: ${marketProvider}`);
  if (keyLooksPlaceholder) {
    console.log("⚠  API key still looks like the placeholder — replace with your key from pc.0g.ai");
  }
}

function checkDns() {
  console.log("\n--- DNS (Node) ---");
  console.log(`NODE_OPTIONS: ${process.env.NODE_OPTIONS ?? "(not set)"}`);
  console.log("Tip: if fetch fails but curl works, try:");
  console.log('  export NODE_OPTIONS="--dns-result-order=ipv4first"');
}

async function main() {
  console.log("\n🔧 Attestra — network diagnostics\n");

  checkEnv();
  checkDns();

  console.log("\n--- HTTPS probes (Node fetch) ---");
  const outcomes = await Promise.all(
    targets.map(async (t) => ({
      optional: "optional" in t && Boolean(t.optional),
      ok: await probe(t.name, t.url, "optional" in t && Boolean(t.optional)),
    })),
  );
  const required = outcomes.filter((o) => !o.optional);
  const requiredOk = required.filter((o) => o.ok).length;
  const optionalFailed = outcomes.filter((o) => o.optional && !o.ok).length;
  const totalOk = outcomes.filter((o) => o.ok).length + optionalFailed;

  console.log(`\nResult: ${totalOk}/${outcomes.length} endpoints reachable`);
  console.log(`Required: ${requiredOk}/${required.length} (CoinGecko + 0G + baseline)\n`);

  if (requiredOk === 0) {
    printNetworkHints();
    process.exit(1);
  }

  if (requiredOk < required.length) {
    console.log("Required market/compute endpoints failed — fix network before continuing.\n");
    process.exit(1);
  }

  const binanceSkipped = outcomes.some((o) => o.optional && !o.ok);
  if (binanceSkipped) {
    console.log("Binance unreachable (expected in Nigeria) — using CoinGecko for market data.\n");
  }

  console.log("✅ Network looks healthy. Run npm run test:market and npm run test:compute\n");
}

main().catch((error) => {
  console.error(formatFetchError(error));
  printNetworkHints();
  process.exit(1);
});
