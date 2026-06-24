# Attestra

**Every trade thesis, cryptographically attested.**

Attestra is a verifiable AI trading-signal agent for the [0G Zero Cup](https://0g.ai/arena/zero-cup). Users connect a wallet, submit a market thesis, and receive an attested signal plus an ownable **Agentic ID** (ERC-7857-style NFT) on **0G Galileo**.

```text
Thesis → live market snapshot → 0G Compute inference
      → payload on 0G Storage → hash on SignalRegistry (0G Chain)
      → Agentic ID NFT minted to your wallet
```

> Research-grade signals only. Not financial advice.

## What ships today

- [x] Vite + React frontend with wallet connect (MetaMask / EIP-1193)
- [x] Express API — CoinGecko market data (Binance optional)
- [x] 0G Compute Router integration (live inference, mock fallback on 402)
- [x] 0G Storage upload + content-hash attestation
- [x] `SignalRegistry` on 0G Galileo (Foundry tests, CI, coverage)
- [x] Verification UX — proof page, storage hash check, explorer links
- [x] **Agentic ID** — mint after attestation, linked to signal ID + content hash
- [x] **Wallet-signed mint** — EIP-712 attestation request; NFT goes to the user’s address
- [ ] TEE-secured transfer (`0g-agent-nft` / TeeVerifier) — out of scope for hackathon

## Quick start

```bash
cd attestra
# Create .env — see Environment table below

npm install
npm run diagnose        # network + .env diagnostics
npm run test:market     # live price fetch
npm run dev             # frontend :5173 + API :8787
```

1. Add `ZG_COMPUTE_API_KEY` from [pc.0g.ai](https://pc.0g.ai).
2. Deploy contracts (or use existing addresses in `.env`) — see [Contracts](#contracts).
3. Open http://localhost:5173 → **Connect wallet** on **0G Galileo Testnet** → submit a thesis.
4. Sign the attestation request in your wallet → signal + Agentic ID mint to your address.

### Full test suite

```bash
npm run test:all          # typecheck, build, forge, market, wallet-auth, e2e (mock)
npm run test:compute      # live 0G inference (needs Router credits)
npm run test:wallet-auth  # EIP-712 signature verification
npm run test:proof -- <anchorTxHash>
```

`test:all` runs e2e with `ATTEST_SKIP_WALLET_AUTH=1` (CI/scripts only). **Do not set that in production.**

## Wallet + Agentic ID flow

| Step | What happens |
|------|----------------|
| Connect | MetaMask on chain `16602` (0G Galileo Testnet) |
| Sign | EIP-712 `AttestRequest` binds thesis, symbol, recipient, timestamp |
| Attest | Server verifies signature → storage upload → `SignalRegistry` anchor |
| Mint | Server calls `iMintWithRole` on `AgenticID` → **your wallet** owns the NFT |
| Verify | Proof page cross-checks storage JSON, registry hash, and NFT `dataHash` |

**Production:** `ATTEST_SKIP_WALLET_AUTH` must be **unset** so users must sign to mint.

**Transfer mode:** Standard ERC-721 ownership (`ZG_AGENTIC_TRANSFER_MODE=standard`). TEE-encrypted handoff requires a future TeeVerifier upgrade.

## Environment

| Variable | Description |
|----------|-------------|
| `ZG_COMPUTE_API_KEY` | Router API key from [pc.0g.ai](https://pc.0g.ai) |
| `ZG_COMPUTE_BASE_URL` | Default `https://router-api.0g.ai/v1` |
| `ZG_COMPUTE_MODEL` | Default `zai-org/GLM-5-FP8` |
| `ZG_RPC_URL` | Default `https://evmrpc-testnet.0g.ai` |
| `ZG_CHAIN_ID` | Default `16602` (Galileo testnet) |
| `ZG_PRIVATE_KEY` | Server wallet — deploys, anchors, mints (needs testnet gas + `MINTER_ROLE`) |
| `ZG_REGISTRY_ADDRESS` | Deployed `SignalRegistry` |
| `ZG_AGENTIC_ID_ADDRESS` | Deployed `AgenticID` — run `npm run deploy:agentic` |
| `ZG_AGENTIC_TRANSFER_MODE` | `standard` (default) or `tee` (label only until TeeVerifier deployed) |
| `ZG_STORAGE_INDEXER` | Default `https://indexer-storage-testnet-turbo.0g.ai` |
| `ZG_EXPLORER_URL` | Default `https://chainscan-galileo.0g.ai` |
| `ZG_EXPLORER_API_URL` | Blockscout API for `npm run verify:registry` |
| `ETHERSCAN_API_KEY` | Optional — Blockscout verify API key |
| `MARKET_DATA_PROVIDER` | `coingecko` (default), `auto`, or `binance` |
| `ATTEST_SKIP_WALLET_AUTH` | Set to `1` for **CI/scripts only** — skips wallet signature |
| `PORT` | API port (default `8787`) |
| `VITE_API_URL` | Frontend API base (optional; dev uses `/api` proxy) |

When Compute returns `402 Insufficient balance`, inference falls back to **mock** — storage, chain anchor, and Agentic ID mint still run. Top up at [pc.0g.ai](https://pc.0g.ai) for live AI.

### Market data (CoinGecko)

**CoinGecko is the default** — free public API, no key required (~10–30 calls/min). Binance is geo-blocked in some regions; use `MARKET_DATA_PROVIDER=coingecko` or `auto`.

### `fetch failed` on everything?

Run `npm run diagnose`. If curl works but Node fails:

```bash
export NODE_OPTIONS="--dns-result-order=ipv4first"
npm run diagnose
```

See the [0G docs](https://docs.0g.ai) for testnet faucet / RPC issues. Paste `npm run diagnose` output if problems persist.

## Contracts

**Prerequisites:** [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge` ≥ 1.0).

```bash
npm run forge:build              # compile + sync ABI artifacts
npm run test:contract:ci         # unit + fuzz + invariant (23 tests)
npm run test:contract:coverage   # SignalRegistry coverage

npm run deploy:registry          # SignalRegistry → saves ZG_REGISTRY_ADDRESS
npm run deploy:agentic           # AgenticID (ERC-7857) → saves ZG_AGENTIC_ID_ADDRESS

npm run verify:registry          # verify SignalRegistry on explorer
npm run transfer:agentic -- <tokenId> <toAddress>   # iTransferFrom demo

npm run e2e:attest -- --mock     # full loop without live Compute credits
npm run anchor:signal            # anchor mock signal (+ storage upload)
```

| Contract | Role |
|----------|------|
| `SignalRegistry` | On-chain content hash + storage URI per signal |
| `AgenticID` | ERC-7857-style NFT; `IntelligentData` hash matches registry; linked to `signalId` |

After anchoring, open `/proof/<txHash>` or `/proof/signal/<signalId>` in the app.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service status, `requireWalletForMint`, chain ID |
| `GET` | `/market/:symbol` | 24h market snapshot |
| `GET` | `/proof/tx/:txHash` | Proof + storage verification + Agentic ID |
| `GET` | `/proof/signal/:signalId` | Proof by registry signal ID |
| `POST` | `/signals/generate` | Generate attested signal (see body below) |

**`POST /signals/generate`** — when Agentic ID is configured and wallet auth is required:

```json
{
  "thesis": "BTC looks oversold after three red dailies…",
  "symbol": "BTCUSDT",
  "walletAddress": "0x…",
  "issuedAt": 1718640000,
  "signature": "0x…"
}
```

`issuedAt` and `signature` must match the EIP-712 `AttestRequest` typed data signed by `walletAddress` (domain: `Attestra` v1, chainId `16602`).

## Deploy (Netlify)

Root [`netlify.toml`](netlify.toml) builds the Vite frontend and serves the API via `netlify/functions/api.ts` at `/api/*`.

```bash
npm run build
npx netlify login          # once
npx netlify init           # link site (or netlify link)
npx netlify env:import .env   # import ZG_* vars — omit ATTEST_SKIP_WALLET_AUTH
npx netlify deploy --build    # preview
npx netlify deploy --prod --build
```

**Production env (Netlify dashboard → Environment variables):**

- Set all `ZG_*` variables from the Environment table above.
- **Never** set `ATTEST_SKIP_WALLET_AUTH` in production.
- `VITE_API_URL` is set to `/api` in `netlify.toml` at build time.

Users need MetaMask on **0G Galileo Testnet** and a wallet signature to mint; server minter wallet pays anchor/mint gas.

## Stack

Vite · React · Express · ethers · OpenAI SDK → 0G Compute · 0G Storage · Foundry · 0G Chain (Galileo) · ERC-7857 Agentic ID

## License

MIT
