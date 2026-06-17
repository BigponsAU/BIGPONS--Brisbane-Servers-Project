# Hosting stack — who does what

**Last updated:** 2026-06-18

| Platform | Role | MCP in Cursor | Setup script |
|----------|------|---------------|--------------|
| **Cloudflare Pages** | Static site `brisbaneservers.com` | `cloudflare-api` | `npm run configure:cloudflare-pages-env` |
| **Cloudflare Worker** | All `/api/*` at `api.brisbaneservers.com` | `cloudflare-api` | `npm run deploy:edge-worker` |
| **Neon** | Postgres (users, sessions, corpus JSONB) | *none* — [console.neon.tech](https://console.neon.tech) | Hyperdrive on Worker |
| **Resend** | Outbound auth email | *none* | Worker secret `RESEND_API_KEY` |
| **Google Cloud** | Sign-in with Google | Google Console | Worker secrets `GOOGLE_OAUTH_*` |

**Render is not in the production path.** Legacy resources: [RENDER_MCP.md](RENDER_MCP.md) (decommission only).

**Canonical URLs** (`website-brisbaneservers.com/src/lib/canonical-hosts.ts`):

| URL | Purpose |
|-----|---------|
| `https://brisbaneservers.com` | Marketing + `/account` portal |
| `https://api.brisbaneservers.com/api` | All browser and cron API calls |

---

## Practical next steps (recommended order)

| Step | Action | When |
|------|--------|------|
| **1** | Decommission Render Postgres | **Now** — `npm run decommission:render-postgres` (Neon is live) |
| **2** | Confirm Render API stays suspended | Done — do not unsuspend |
| **3** | Docs + code cleanup (this pass) | **Now** — remove `onrender.com` from active paths |
| **4** | Deploy Worker + Pages | **When ready** — batches portal fixes + new API routes (`usage/me`, voice-map, etc.) |

Holding step 4 until 1–3 are done is reasonable: infra and docs match reality before shipping UI/route changes.

---

## MCP servers (this project)

| Server | Auth | Use for |
|--------|------|---------|
| **`cloudflare-api`** | **OAuth** | DNS, Pages, Workers, Email Routing |
| `cloudflare-docs` | none | Cloudflare documentation |
| `render` | API key | **Legacy only** — decommission, historical logs |

| Channel | What | Where |
|---------|------|--------|
| **OAuth MCP** | Cursor agent | `cloudflare-api` in Settings → MCP |
| **API token** | `deploy:edge-worker`, Pages env scripts | User env `CLOUDFLARE_API_TOKEN` |

Setup: `npm run configure:cloudflare-mcp` + `npm run connect:cloudflare-mcp-oauth` → Reload Window.

### Signup email

Outbound Resend from the edge worker. No Resend webhook required for signups.

| Item | Value |
|------|--------|
| Resend verified domains | `brisbaneservers.com`, `mail.brisbaneservers.com` |
| `AUTH_EMAIL_FROM` (worker) | `Brisbane Servers <support@brisbaneservers.com>` (target; verify root domain in Resend) |
| Inbound mail | Cloudflare Email Routing → inbox |

### Publish rebuild

`CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` on the **worker** triggers Pages build after publish. Sync: `npm run sync:edge-worker-secrets`.

---

## Live topology

```text
GitHub main → Cloudflare Pages (brisbaneservers)
                  https://brisbaneservers.com
                  PUBLIC_API_BASE_URL → https://api.brisbaneservers.com/api

api.brisbaneservers.com → Worker brisbane-servers-api-edge
                  Hyperdrive → Neon
                  Workers AI binding (AI)
                  Cron: library growth every 6h
```

---

## Cloudflare

| Item | Value |
|------|--------|
| Account | BIGPONS (`92d738484386c6b613628bbeafebe2f9`) |
| Pages | `brisbaneservers` |
| Worker | `brisbane-servers-api-edge` |
| `api` DNS | Worker custom domain |
| Hyperdrive | `brisbane-servers-neon` |

### Pages production env

| Variable | Value |
|----------|--------|
| `PUBLIC_SITE_URL` | `https://brisbaneservers.com` |
| `PUBLIC_API_BASE_URL` | `https://api.brisbaneservers.com/api` |
| `INTERNAL_API_BASE_URL` | `https://api.brisbaneservers.com/api` |

**Never** put `DATABASE_URL`, `JWT_SECRET`, or `RESEND_API_KEY` on Pages.

### Worker secrets

`RESEND_API_KEY`, `JWT_SECRET`, `ADMIN_*`, `GOOGLE_OAUTH_*`, `CRON_SECRET`, optional `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL`

Sync: `npm run sync:edge-worker-secrets` · Deploy: `npm run deploy:edge-worker`

---

## Neon

- Connection via **Hyperdrive** on the Worker (not `DATABASE_URL` on Pages).
- See [NEON_DATABASE.md](NEON_DATABASE.md).

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

- [FEATURES_NOT_BUILT.md](FEATURES_NOT_BUILT.md) — intentional gaps and reasoning
- [RENDER_MCP.md](RENDER_MCP.md) — legacy Render decommission
- [EDGE_API_STATUS.md](EDGE_API_STATUS.md)
- [PRODUCTION_GO_LIVE_STATUS.md](PRODUCTION_GO_LIVE_STATUS.md)
