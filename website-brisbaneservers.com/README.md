# Brisbane Servers website

Static Astro site on **Cloudflare Pages** with API on **Cloudflare Worker** (`api.brisbaneservers.com`) and **Neon Postgres** via Hyperdrive.

There is no local hybrid API server. Full platform behaviour (auth, corpus, account workspace, tokens, voice) requires production infrastructure.

## Layout

- **Frontend:** `src/` — pages, components, styles (built to `dist/`)
- **API handlers:** `src/pages/_api/` — dispatched by the edge worker via `standalone-api/route-manifest.ts`
- **Edge worker:** `workers/api/`

## Scripts

```bash
npm run dev                  # Astro dev (UI only; set PUBLIC_API_BASE_URL to production API)
npm run build                # Production static build → dist/
npm run test                 # Vitest
npm run verify:production    # Smoke-check live API
npm run verify:dashboard-api # All /account workspace routes
```

Deploy API: push to `main` (GitHub Actions `deploy-edge-worker.yml`) or `npm run deploy:edge-worker` with Cloudflare token.

**Ops guide:** [docs/operations/HOSTING_MCP_WORKSPACE.md](../docs/operations/HOSTING_MCP_WORKSPACE.md)
