# Cloudflare Workers edge API (Phase 1)

Instant edge routes for **contact** (queued email) and **health**, with pass-through to Render for all other `/api/*` routes until Phase 1b (auth on edge).

## Routes

| Path | Behaviour |
|------|-----------|
| `GET /api/health` | Instant edge response (`origin: edge`) |
| `GET /api/health/render` | Ping Render stack (cold start may take minutes) |
| `GET /api/auth/wake` | Instant + background Render warm |
| `POST /api/contact/inquiry` | Queue → Resend (or direct Resend if queue unbound) |
| `*` | Proxy to `RENDER_API_ORIGIN` (Render API) |

## Setup

```bash
cd website-brisbaneservers.com
npm run configure:edge-worker
```

Or manually from `workers/api`: install, `wrangler secret put RESEND_API_KEY`, `wrangler secret put RENDER_API_ORIGIN`, `npm run deploy`, then route `api.brisbaneservers.com/*`.

## Phase 1b (edge auth)

When `HYPERDRIVE` is bound, these routes run on the worker (Neon via Hyperdrive):

| Path | Method |
|------|--------|
| `/api/auth/login` | POST |
| `/api/auth/register` | POST |
| `/api/auth/me` | GET |
| `/api/auth/logout` | POST |

Setup:

```bash
cd website-brisbaneservers.com
npm run configure:hyperdrive   # Neon DATABASE_URL -> Hyperdrive id in wrangler.toml
npm run configure:edge-worker  # secrets + deploy + route api.brisbaneservers.com
```

OAuth, passkey, and voice APIs still proxy to Render until migrated.

See `docs/operations/EDGE_AUTH_PHASE_1B.md`.
