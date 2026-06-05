# Render MCP (Cursor)

Manage Render services, env vars, logs, and Postgres from Cursor via the hosted Render MCP server.

**Official docs:** https://render.com/docs/mcp-server

## 1. API key

1. [Render Dashboard → Account Settings → API Keys](https://dashboard.render.com/u/settings#api-keys)
2. Create a key (broad account scope — required by Render MCP).

## 2. Configure Cursor (this repo)

```powershell
.\website-brisbaneservers.com\scripts\configure-render-mcp.ps1
```

This sets `RENDER_API_KEY` and `RENDER_AUTH_HEADER` in your Windows user environment and enables `.cursor/mcp.json` → **`render`**.

**Reload Cursor** (Developer: Reload Window).

## 3. Set workspace in chat

First prompt after connect:

```text
Set my Render workspace to <your workspace name>
```

Then:

```text
List my Render services
```

## 4. Brisbane Servers — linked services (this workspace)

| Render resource | ID / URL | Status |
|-----------------|----------|--------|
| API `brisbane-servers-api` | `srv-d8ae7qbbc2fs73fv227g` · https://brisbane-servers-api.onrender.com | **Live** |
| Postgres | **Neon** via `DATABASE_URL` on API — **not** Render Postgres | See [NEON_DATABASE.md](NEON_DATABASE.md) |
| Custom domain | `api.brisbaneservers.com` | **Verified** on Render |

Legacy `brisbane-servers-db` (Render free Postgres) should be deleted after Neon migration: `npm run decommission:render-postgres`.

Cloudflare Pages **`brisbaneservers`** uses `PUBLIC_API_BASE_URL=https://api.brisbaneservers.com/api`.

**Full map:** [HOSTING_MCP_WORKSPACE.md](HOSTING_MCP_WORKSPACE.md) · [PRODUCTION_GO_LIVE_STATUS.md](PRODUCTION_GO_LIVE_STATUS.md)

**Related:** [GO_LIVE_RUNBOOK.md](GO_LIVE_RUNBOOK.md) · [render.yaml](../../render.yaml)
