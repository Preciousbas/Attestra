# SignalRegistry — contract tests

Industry-standard Hardhat test suite for `contracts/SignalRegistry.sol`.

## Run

```bash
npm run test:contract           # all tests
npm run test:contract:coverage  # coverage report (target ≥95%)
```

## What is covered

- Happy path: register, read, count, events
- Reverts: empty hash, duplicate hash, missing signal id
- Edge cases: empty/long strings, multiple submitters, timestamp
- Fuzz-style: 25 unique hashes, duplicate detection
- Security: immutability, no admin/delete hooks, permissionless design, reentrancy surface

## Known design choices (not bugs)

- **Permissionless registration** — anyone can anchor a unique hash (intended for hackathon MVP).
- **No on-chain URI validation** — storage URI is a pointer; trust is off-chain + hash match.
- **Block timestamp** — miners can skew `block.timestamp` slightly; acceptable for attestation ordering.
