# Zero Cup Submission — Attestra

## One-liner

**Attestra — a receipt for your market call, stored on 0G and owned as an Agentic ID.**

## Problem

Traders and researchers share market calls in chats and threads with no proof of who said what, when, or whether the analysis still matches the original payload.

## Solution

Attestra turns a wallet-signed thesis into a verifiable signal: live market context → 0G Compute inference → payload on 0G Storage → hash on `SignalRegistry` → **Agentic ID** NFT (ERC-7857-style) minted to the user's wallet. Anyone can verify hash alignment on the proof page.

## Live demo

| Resource | URL |
|----------|-----|
| **App** | Deploy with `npm run deploy:netlify:prod` — see [`docs/NETLIFY_DEPLOY.md`](NETLIFY_DEPLOY.md) |
| **GitHub** | _Add repository URL when published_ |
| **Demo video** | Record using [`docs/DEMO_SCRIPT.md`](DEMO_SCRIPT.md) (90s) |

## Deployed contracts (0G Galileo testnet, chain ID 16602)

| Contract | Address | Explorer |
|----------|---------|----------|
| SignalRegistry | `0xDDdaf4F3a28cDD8eC0BdE5615b335b325D9193c9` | [View](https://chainscan-galileo.0g.ai/address/0xDDdaf4F3a28cDD8eC0BdE5615b335b325D9193c9) |
| AgenticID | `0x6710bb44a1EECc0e2F55887852A637E8ecF37DcE` | [View](https://chainscan-galileo.0g.ai/address/0x6710bb44a1EECc0e2F55887852A637E8ecF37DcE) |

## 0G stack used

- **0G Compute** — Router API inference (`zai-org/GLM-5-FP8`); mock fallback on 402
- **0G Storage** — attested signal JSON upload
- **0G Chain (Galileo)** — `SignalRegistry` anchor + Agentic ID mint
- **Agentic ID (ERC-7857)** — intelligent data hash linked to signal ID

## How to run locally

```bash
git clone <repo-url>
cd attestra
cp .env.example .env   # fill ZG_* vars (or copy from README Environment table)
npm install
npm run dev
```

Open http://localhost:5173 → connect wallet → submit thesis → sign → view proof.

## Test commands (judges)

```bash
npm run test:contract:ci      # Foundry unit + invariant
npm run test:contract:coverage
npm run e2e:attest -- --mock  # full pipeline without Compute credits
```

## Team

_Single builder / add names_

## Notes

- Wallet EIP-712 signing required in production (`ATTEST_SKIP_WALLET_AUTH` unset).
- TEE-secured Agentic ID transfer is documented but out of hackathon scope.
- Not financial advice — research-grade attestation tooling.
