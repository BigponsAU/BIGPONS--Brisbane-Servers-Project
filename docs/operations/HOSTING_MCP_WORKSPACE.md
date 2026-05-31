# Hosting — MCP-linked workspace

Production is split across **Cloudflare Pages** (static site) and **Render** (Node API + Postgres). Both are managed from this repo via Cursor MCP (`.cursor/mcp.json`).

**Last synced:** 2026-05-29

---

## MCP servers (this project)

| Server | Config | Use for |
|--------|--------|---------|
| `cloudflare-api` | OAuth via `mcp-remote` → `https://mcp.cloudflare.com/mcp` | Pages, DNS, Email Routing |
| `cloudflare-docs` | `https://docs.mcp.cloudflare.com/mcp` | Cloudflare documentation |
| `render` | `RENDER_AUTH_HEADER` → `https://mcp.render.com/mcp` | Services, env vars, logs, Postgres |

Setup: [CLOUDFLARE_PAGES.md](CLOUDFLARE_PAGES.md) · [RENDER_MCP.md](RENDER_MCP.md)

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
    │       Env: PUBLIC_API_BASE_URL → Render API (below)
    │
    └─► Render (workspace: My Workspace)
            ├─ Web: brisbane-servers-api
            │     https://brisbane-servers-api.onrender.com
            │     Custom domain: api.brisbaneservers.com (verified on Render)
            │     Health: /api/health
            └─ Postgres: brisbane-servers-db (available)
```

---

## Cloudflare (linked)

| Item | Value |
|------|--------|
| Zone | `brisbaneservers.com` (active) |
| Pages project | `brisbaneservers` |
| Pages subdomain | `brisbaneservers.pages.dev` |
| Custom domain | `brisbaneservers.com` — **active** |
| Apex DNS | CNAME → `brisbaneservers.pages.dev` |
| `api` DNS | CNAME → `brisbane-servers-api.onrender.com` (**DNS only**, grey cloud) |

### Pages production env

| Variable | Value |
|----------|--------|
| `PUBLIC_SITE_URL` | `https://brisbaneservers.com` |
| `PUBLIC_SITE_BASE` | `/` |
| `PUBLIC_API_BASE_URL` | `https://brisbane-servers-api.onrender.com/api` |
| `INTERNAL_API_BASE_URL` | `https://brisbane-servers-api.onrender.com/api` |

Use `https://api.brisbaneservers.com/api` only after `api` DNS is stable (no Cloudflare Error 1000 on proxied orange-cloud).

---

## Render (linked)

| Item | Value |
|------|--------|
| Workspace | My Workspace (`tea-d89suggg4nts73evj2pg`) |
| API service | `brisbane-servers-api` — `srv-d8ae7qbbc2fs73fv227g` |
| Postgres | `brisbane-servers-db` — `dpg-d8ae84reo5us739jtpi0-a` |
| Repo | `https://github.com/BigponsAU/BIGPONS--Brisbane-Servers-Project` |
| Root dir | `website-brisbaneservers.com` |
| Start | `npm run start:api` |

### API env (set on Render)

`NODE_ENV`, `PORT`, `MONOREPO_ROOT`, `PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`, `ALLOW_CLOUDFLARE_PAGES`, `TRUST_PROXY`, `JWT_SECRET`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `AUTH_EMAIL_REPLY_TO`

| Auth email | Value |
|------------|--------|
| `AUTH_EMAIL_FROM` | `Brisbane Servers <support@mail.brisbaneservers.com>` |
| `AUTH_EMAIL_REPLY_TO` | `connect@brisbaneservers.com` |

Long-term target: `support@brisbaneservers.com` after Resend verifies the apex domain (add root DKIM in Cloudflare).

### Still wire in Render dashboard

| Item | Why |
|------|-----|
| ~~Link Postgres → API~~ | **Done** — `DATABASE_URL` set (internal connection) |
| **Google OAuth** | **Done** — `/api/auth/oauth/status` → `google: true` |
| **Persistent disk** | `voice-framework/storage` JSON corpus ([`render.yaml`](../../render.yaml)) |
| **`CLOUDFLARE_PAGES_DEPLOY_HOOK_URL`** | SEO rebuild on publish |

---

## Verification commands

```bash
cd website-brisbaneservers.com
npm run verify:production -- --api https://brisbane-servers-api.onrender.com
curl -sS https://brisbaneservers.com/api/health   # via Pages proxy path — use Render URL for API
curl -sS https://brisbane-servers-api.onrender.com/api/health
```

---

## Related

- [PRODUCTION_GO_LIVE_STATUS.md](PRODUCTION_GO_LIVE_STATUS.md) — phased checklist
- [GO_LIVE_RUNBOOK.md](GO_LIVE_RUNBOOK.md)
- [`render.yaml`](../../render.yaml) — blueprint (matches live service names)
