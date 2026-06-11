# Hosting stack — who does what

**Last updated:** 2026-06-11

| Platform | Role | MCP in Cursor | Setup script |
|----------|------|---------------|--------------|
| **Cloudflare Pages** | Static site `brisbaneservers.com` | `cloudflare-api` | `npm run configure:cloudflare-pages-env` |
| **Cloudflare Worker** | All `/api/*` at `api.brisbaneservers.com` | `cloudflare-api` | `npm run deploy:edge-worker` |
| **Neon** | Postgres (users, sessions, corpus JSONB) | *none* — [console.neon.tech](https://console.neon.tech) | Hyperdrive origin (see below) |
| **Resend** | Outbound auth email | *none* | Worker secret `RESEND_API_KEY` |
| **Google Cloud** | Sign-in with Google | Google Console | Worker secrets `GOOGLE_OAUTH_*` |

**Render API is retired** (suspended). Do not point Pages or DNS at `*.onrender.com`.

**Canonical URLs** (code: `website-brisbaneservers.com/src/lib/canonical-hosts.ts`):

| URL | Purpose |
|-----|---------|
| `https://brisbaneservers.com` | Marketing + `/account` portal |
| `https://api.brisbaneservers.com/api` | All browser and cron API calls |

---

## MCP servers (this project)

| Server | Use for |
|--------|---------|
| `cloudflare-api` | Pages env, DNS, Worker domains, Email Routing |
| `cloudflare-docs` | Cloudflare documentation |
| `render` | **Legacy only** — old service logs; API no longer used |

One-shot: **`npm run configure:cloudflare-mcp`** (API token) · OAuth: **`npm run connect:cloudflare-mcp-oauth`**

---

## Live topology

```text
GitHub main → Cloudflare Pages (brisbaneservers)
                  https://brisbaneservers.com
                  PUBLIC_API_BASE_URL → https://api.brisbaneservers.com/api

api.brisbaneservers.com → Worker brisbane-servers-api-edge
                  Hyperdrive → Neon (brisbane-servers-neon)
                  Workers AI binding
                  Cron: library growth every 6h
```

---

## Cloudflare (linked via MCP)

| Item | Value |
|------|--------|
| Account | BIGPONS (`92d738484386c6b613628bbeafebe2f9`) |
| Pages | `brisbaneservers` |
| Worker | `brisbane-servers-api-edge` |
| `api` DNS | **Worker custom domain** (not Render) |
| Hyperdrive | `brisbane-servers-neon` |

### Pages production env

| Variable | Value |
|----------|--------|
| `PUBLIC_SITE_URL` | `https://brisbaneservers.com` |
| `PUBLIC_SITE_BASE` | `/` |
| `PUBLIC_API_BASE_URL` | `https://api.brisbaneservers.com/api` |
| `INTERNAL_API_BASE_URL` | `https://api.brisbaneservers.com/api` |

Apply: `npm run configure:cloudflare-pages-env` or Cloudflare MCP.

**Never** put `DATABASE_URL`, `JWT_SECRET`, or `RESEND_API_KEY` on Cloudflare Pages.

### Worker secrets (wrangler)

`RESEND_API_KEY`, `JWT_SECRET`, `ADMIN_*`, `GOOGLE_OAUTH_*`, `CRON_SECRET`, optional `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL`

Sync: `npm run sync:edge-worker-secrets` · Deploy: `npm run deploy:edge-worker`

---

## Neon (database)

- **Free tier:** 0.5 GB storage, 100 CU-hours/month, scale-to-zero after 5 min idle.
- **Connection:** Hyperdrive on the Worker (pooled) — not `DATABASE_URL` on Pages.
- **Console:** [console.neon.tech](https://console.neon.tech) → project → **Usage** tab.

See [NEON_DATABASE.md](NEON_DATABASE.md).

---

## Verification

```bash
cd website-brisbaneservers.com
npm run verify:production -- --api https://api.brisbaneservers.com
npm run verify:production-auth:edge
npm run verify:cloudflare-pages-env
```

---

## Related

- [EDGE_API_STATUS.md](EDGE_API_STATUS.md)
- [PRODUCTION_GO_LIVE_STATUS.md](PRODUCTION_GO_LIVE_STATUS.md)
- [NEON_DATABASE.md](NEON_DATABASE.md)
- [CLOUDFLARE_PAGES.md](CLOUDFLARE_PAGES.md)
