# Netlify deploy checklist

Infrastructure is in place (`netlify.toml`, `netlify/functions/api.ts`). Run these steps from your machine (Netlify CLI requires interactive login).

## 1. Prerequisites

```bash
cd attestra
npm install
npm run build   # must pass
```

## 2. Link site

```bash
npx netlify login
npx netlify init    # create new site or link existing
```

## 3. Environment variables

Import from your local `.env` (production values only):

```bash
npx netlify env:import .env
```

**Required:** `ZG_COMPUTE_API_KEY`, `ZG_PRIVATE_KEY`, `ZG_REGISTRY_ADDRESS`, `ZG_AGENTIC_ID_ADDRESS`

**Do not set on Netlify:** `PORT`, `VITE_API_URL` (use `netlify.toml` — already `/api`), `ATTEST_SKIP_WALLET_AUTH`

## 4. Deploy

```bash
npm run deploy:netlify        # preview URL
npm run deploy:netlify:prod   # production
```

## 5. Smoke test

```bash
curl https://YOUR-SITE.netlify.app/api/health
```

Expected: `"ok":true`, `"requireWalletForMint":true`, `"agenticConfigured":true`

Open the site → connect wallet → generate signal → verify proof page hash match.

## Function notes

- API timeout: 26s (signal generation can include storage upload + 3 chain txs)
- External modules: `@0gfoundation/0g-ts-sdk`, `ethers` (bundled separately by esbuild)
