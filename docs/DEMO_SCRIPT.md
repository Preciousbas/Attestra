# Attestra — 90-Second Demo Script

Record screen + voice (or captions). Target length: **75–90 seconds**.

## Setup (before recording)

1. `npm run dev` — frontend at http://localhost:5173, API at :8787
2. MetaMask on **0G Galileo Testnet** (chain ID `16602`)
3. Wallet has a small amount of testnet gas (optional — server pays mint gas)
4. **Do not** set `ATTEST_SKIP_WALLET_AUTH` — show real wallet signing

## Shot list

| Time | Visual | Narration |
|------|--------|-----------|
| 0:00–0:12 | Landing page, logo + tagline | *"Attestra is a receipt for your market call — stored on 0G, hashed on-chain, and owned as an Agentic ID NFT."* |
| 0:12–0:20 | Click **Connect wallet** → MetaMask approve | *"Connect your wallet on 0G Galileo testnet."* |
| 0:20–0:35 | Enter thesis (e.g. *"BTC looks oversold after three red daily candles; watch support near recent lows."*) → **Generate** | *"Submit a thesis. We pull live market data and run inference on 0G Compute."* |
| 0:35–0:45 | MetaMask EIP-712 sign popup → confirm | *"You sign an attestation request — your wallet will own the Agentic ID."* |
| 0:45–0:60 | Signal card: direction, confidence, storage URI, anchor tx, **Agentic ID #N** | *"The signal is uploaded to 0G Storage, anchored on SignalRegistry, and minted as your Agentic ID."* |
| 0:60–0:75 | Open **Proof** page — green hash match, explorer links | *"On the proof page, the registry hash, storage payload, and NFT data hash all match."* |
| 0:75–0:90 | Click explorer link → NFT on Chainscan | *"Verifiable intelligence you can share — built on 0G storage, compute, and chain."* |

## One-liner (for submission / intro card)

> **Attestra — a receipt for your market call, stored on 0G and owned as an Agentic ID.**

## B-roll (optional)

- Terminal: `npm run e2e:attest -- --mock` completing successfully
- Chainscan: SignalRegistry tx + Agentic ID token page

## If Compute credits are unavailable

Mock inference still runs the full pipeline (storage + anchor + NFT). Say: *"Using mock inference for this demo — live 0G Compute works with Router credits at pc.0g.ai."*

## Contracts to mention (Galileo testnet)

| Contract | Address |
|----------|---------|
| SignalRegistry | `0xDDdaf4F3a28cDD8eC0BdE5615b335b325D9193c9` |
| AgenticID | `0x6710bb44a1EECc0e2F55887852A637E8ecF37DcE` |
