# Render — legacy platform (decommission only)

**Last updated:** 2026-06-18

**Production does not use Render.** All live traffic uses Cloudflare Worker + Neon. This doc exists for decommissioning leftover resources and reading historical logs.

**Current stack:** [HOSTING_MCP_WORKSPACE.md](HOSTING_MCP_WORKSPACE.md)

---

## What was on Render

| Resource | ID | Former role | Current status |
|----------|-----|-------------|----------------|
| **`brisbane-servers-api`** | `srv-d8ae7qbbc2fs73fv227g` | Node standalone API (`npm run start:api`) | **Suspended** (user, 2026-06-11) — replaced by Worker `brisbane-servers-api-edge` |
| **`brisbane-servers-db`** | `dpg-d8ae84reo5us739jtpi0-a` | Free Postgres (30-day expiry) | **Delete** after Neon verified — `npm run decommission:render-postgres` |
| **`voice-framework-dashboard`** | *(never created)* | Optional Docker UI on port 3001 | **Deprecated** — portal Voice Lab / Voice Map replace it |

**Never point** `PUBLIC_API_BASE_URL`, DNS, or Google OAuth redirect URIs at `*.onrender.com`.

---

## Why Render was retired

| Issue on Render | Edge replacement |
|-----------------|------------------|
| Cold starts (free tier spin-down) | Worker `/api/auth/wake` is instant |
| Cross-origin cookies (Pages vs `onrender.com`) | `api.brisbaneservers.com` same-site family |
| Separate deploy + env surface | Single Worker + `sync:edge-worker-secrets` |
| Disk-backed corpus on Render | Neon JSONB + corpus store via Hyperdrive |

---

## Render MCP (Cursor)

Optional — **legacy logs and decommission only**.

1. [Render Dashboard → API Keys](https://dashboard.render.com/u/settings#api-keys)
2. `npm run configure:render-mcp`
3. Reload Cursor

Do **not** use Render MCP to deploy or change production env. Use **`cloudflare-api`** MCP instead.

---

## Decommission checklist

```powershell
cd website-brisbaneservers.com

# 1. Confirm edge API (Neon-backed)
npm run verify:production -- --api https://api.brisbaneservers.com

# 2. Delete legacy Postgres (if still present)
npm run decommission:render-postgres

# 3. API service already suspended; optional: delete in Render dashboard
# npm run decommission:render-api   # idempotent suspend
```

After cleanup, you may remove `RENDER_API_KEY` from user env if you no longer need Render MCP.

---

## Blueprint file

[`render.yaml`](../../render.yaml) at repo root is **archived reference** only — not deployed for production. Do not recreate services from it without an explicit decision.

---

## Related

- [FEATURES_NOT_BUILT.md](FEATURES_NOT_BUILT.md)
- [NEON_DATABASE.md](NEON_DATABASE.md)
- [PRODUCTION_GO_LIVE_STATUS.md](PRODUCTION_GO_LIVE_STATUS.md)
