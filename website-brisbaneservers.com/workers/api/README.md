# Brisbane Servers API — Cloudflare Worker (production)

All `/api/*` traffic for `api.brisbaneservers.com` runs on this worker. **Render is retired.**

## Architecture

| Layer | Role |
|-------|------|
| **This worker** | Auth (Hyperdrive), contact, full Astro API route manifest, Workers AI binding |
| **Cloudflare Pages** | Static site + `/account` portal UI |
| **Neon Postgres** | Users, sessions, corpus (via Hyperdrive) |
| **Workers AI** | Free inference (`AI` binding — no REST token required) |

## Edge-native routes (fast path)

| Route | Notes |
|-------|--------|
| `GET /api/health` | Instant edge response |
| `GET /api/auth/wake` | Ready immediately (no cold start) |
| `POST /api/auth/login` etc. | Hyperdrive + Neon |
| `POST /api/contact/inquiry` | Resend (queue optional) |

## All other routes

Dispatched via `standalone-dispatch.ts` from `standalone-api/route-manifest.ts` (voice map, generate, admin, OAuth, passkeys, resources, etc.).

## Deploy

```bash
npm run sync:edge-worker-secrets   # once per secret rotation
npm run deploy:edge-worker
```

## Secrets

`wrangler secret put`: `RESEND_API_KEY`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_EMAIL_FROM`

Optional: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `CRON_SECRET`

## Local dev

```bash
cd workers/api
npm install
npx wrangler dev
```

Deploy: push to `main` (`.github/workflows/deploy-edge-worker.yml`). `npm run deploy:edge-worker` prints CI instructions only.
