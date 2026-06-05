# Hosting stack — who does what

**Last updated:** 2026-06-04

| Platform | Role | MCP in Cursor | Setup script |
|----------|------|---------------|--------------|
| **Cloudflare** | Static site (Pages), DNS, inbound email routing | `cloudflare-api`, `cloudflare-docs` | `npm run configure:cloudflare-mcp` |
| **Render** | **Node API only** (`brisbane-servers-api`) | `render` | `npm run configure:render-mcp` |
| **Neon** | **Postgres** (users, sessions, corpus) | *none* — dashboard + env on Render | `npm run configure:neon-database` |
| **Resend** | Outbound auth email | *none* — `RESEND_API_KEY` on Render | `configure-render-auth.ps1` |
| **Google Cloud** | Sign-in with Google (OAuth client) | `google-cloud-bigquery` optional (analytics only) | Google Console + Render env |

**Render is not removed** — only **Render Postgres** is retired. Neon replaces the database; Render still runs the API.

---

## MCP servers (this project)

| Server | Config | Use for |
|--------|--------|---------|
| `cloudflare-api` | OAuth via `mcp-remote` → `https://mcp.cloudflare.com/mcp` | Pages env, DNS, Email Routing (chat) |
| `cloudflare-api-token` | Optional — add after `npm run configure:cloudflare-mcp` | Same API, token auth (backup) |
| `cloudflare-docs` | `https://docs.mcp.cloudflare.com/mcp` | Cloudflare documentation |
| `render` | `RENDER_AUTH_HEADER` → `https://mcp.render.com/mcp` | API service, env vars, logs, deploys |

One-shot local setup: **`npm run configure:hosting`** · Verify: **`npm run verify:hosting-mcp`**

In chat after connect:

```text
Set my Render workspace to My Workspace
```

---

## Live topology

```text
GitHub: BigponsAU/BIGPONS--Brisbane-Servers-Project (main)
    │
    ├─► Cloudflare Pages: brisbaneservers
    │       Build: website-brisbaneservers.com → npm run build → dist
    │       URL: https://brisbaneservers.com
    │       Env: PUBLIC_API_BASE_URL → https://api.brisbaneservers.com/api
    │
    └─► Render: brisbane-servers-api (web service only)
            URL: https://brisbane-servers-api.onrender.com
            Custom domain: api.brisbaneservers.com
            DATABASE_URL → Neon (pooled connection string)
            Health: /api/health (includes persistence.databaseProvider)
```

---

## Cloudflare (linked)

| Item | Value |
|------|--------|
| Zone | `brisbaneservers.com` (active) |
| Pages project | `brisbaneservers` |
| Custom domain | `brisbaneservers.com` — **active** |
| `api` DNS | CNAME → Render (**DNS only**, grey cloud) |

### Pages production env

| Variable | Value |
|----------|--------|
| `PUBLIC_SITE_URL` | `https://brisbaneservers.com` |
| `PUBLIC_SITE_BASE` | `/` |
| `PUBLIC_API_BASE_URL` | `https://api.brisbaneservers.com/api` |
| `INTERNAL_API_BASE_URL` | `https://api.brisbaneservers.com/api` |

Apply: `npm run configure:cloudflare-pages-env` (requires `CLOUDFLARE_API_TOKEN` or MCP OAuth with Pages Edit).

**Never** put `DATABASE_URL`, `JWT_SECRET`, or `RESEND_API_KEY` on Cloudflare Pages.

---

## Render (API host only)

| Item | Value |
|------|--------|
| Workspace | My Workspace (`tea-d89suggg4nts73evj2pg`) |
| API service | `brisbane-servers-api` — `srv-d8ae7qbbc2fs73fv227g` |
| ~~Postgres~~ | **Removed** — use Neon ([NEON_DATABASE.md](NEON_DATABASE.md)) |
| Repo | `https://github.com/BigponsAU/BIGPONS--Brisbane-Servers-Project` |
| Start | `npm run start:api` |

### API env (set on Render)

`NODE_ENV`, `PORT`, `DATABASE_URL` (Neon), `JWT_SECRET`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `GOOGLE_OAUTH_*`, `CRON_SECRET`, `ADMIN_*`

| Auth email | Value |
|------------|--------|
| `AUTH_EMAIL_FROM` | `Brisbane Servers <support@mail.brisbaneservers.com>` |
| `AUTH_EMAIL_REPLY_TO` | `connect@brisbaneservers.com` |

---

## Neon migration checklist

1. Create project at [console.neon.tech](https://console.neon.tech) → copy **pooled** connection string.
2. `npm run configure:neon-database` — saves `NEON_DATABASE_URL` locally, sets Render `DATABASE_URL`, redeploys API.
3. If users exist on old Render Postgres: `npm run migrate:render-postgres-to-neon`.
4. Verify: `npm run verify:production -- --api https://api.brisbaneservers.com` (expects `databaseProvider: neon`).
5. `npm run decommission:render-postgres` — deletes `brisbane-servers-db`.

---

## Verification commands

```bash
cd website-brisbaneservers.com
npm run verify:hosting-mcp
npm run verify:production -- --api https://api.brisbaneservers.com
npm run verify:cloudflare-pages-env
```

---

## Related

- [NEON_DATABASE.md](NEON_DATABASE.md)
- [PRODUCTION_GO_LIVE_STATUS.md](PRODUCTION_GO_LIVE_STATUS.md)
- [RENDER_MCP.md](RENDER_MCP.md)
- [CLOUDFLARE_PAGES.md](CLOUDFLARE_PAGES.md)
