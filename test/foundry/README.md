# SignalRegistry — Foundry tests

Production-grade Solidity tests using [Foundry](https://book.getfoundry.sh/).

## Commands

```bash
npm run forge:build          # compile + sync ABI to contracts/artifacts/
npm run test:contract        # unit + fuzz + invariant tests
npm run test:contract:coverage
npm run forge:fmt            # format Solidity
npm run deploy:registry:forge  # broadcast deploy to 0G testnet
```

## Coverage

Target: **≥95%** on `SignalRegistry.sol`. Run:

```bash
npm run test:contract:coverage   # unit tests only — 100% on SignalRegistry.sol
npm run test:contract:coverage:full  # includes invariants (slow)
```

## Test layout

| File | Purpose |
|------|---------|
| `SignalRegistry.t.sol` | Unit, fuzz, security |
| `SignalRegistry.invariant.t.sol` | Handler-based invariants |
| `mocks/` | Test-only helpers (not deployed) |

## Deploy (Foundry)

```bash
source .env
forge script script/DeploySignalRegistry.s.sol:DeploySignalRegistry \
  --rpc-url og_testnet \
  --broadcast \
  --private-key "$ZG_PRIVATE_KEY"
```

## Verify on 0G explorer

```bash
npm run verify:registry
```

Or manually:

```bash
forge verify-contract $ZG_REGISTRY_ADDRESS \
  contracts/SignalRegistry.sol:SignalRegistry \
  --chain-id 16602 \
  --verifier blockscout \
  --verifier-url https://chainscan-galileo.0g.ai/api
```
