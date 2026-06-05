# Cloudflare Pages deployment (primary)

> **Canonical guide:** [MASTER.md](../MASTER.md) — §5 deployment, §10 security.  
> **Domain-specific go-live:** [BRISBANESERVERS_PRODUCTION.md](BRISBANESERVERS_PRODUCTION.md) — `brisbaneservers.com`, Postgres, admin data, privacy workflow.

## Summary

- **Linked hosting (Pages + Render via MCP):** [HOSTING_MCP_WORKSPACE.md](HOSTING_MCP_WORKSPACE.md)
- **Full go-live (Pages + API + domain):** [GO_LIVE_RUNBOOK.md](GO_LIVE_RUNBOOK.md)
- Use **Cloudflare Pages** (Connect to Git), **not** Workers + `npx wrangler deploy`
- Root: `website-brisbaneservers.com` · Build: `npm run build` · Output: `dist`
- **Production domain:** `https://brisbaneservers.com` with `PUBLIC_SITE_BASE=/`

### Cloudflare Pages environment (brisbaneservers.com)

| Variable | Production value |
|----------|------------------|
| `PUBLIC_SITE_URL` | `https://brisbaneservers.com` |
| `PUBLIC_SITE_BASE` | `/` |
| `PUBLIC_API_BASE_URL` | `https://<your-api-host>/api` |
| `INTERNAL_API_BASE_URL` | Same as public |

### API host (secrets — not on Cloudflare)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres for signup, sessions, audit (required) |
| `JWT_SECRET`, `ADMIN_*`, `SMTP_*`, `GOOGLE_OAUTH_*` | Auth, email, Google sign-in |
| `ALLOWED_ORIGINS` | `https://brisbaneservers.com` |
| `ALLOW_CLOUDFLARE_PAGES` | Optional `1` for `*.pages.dev` previews |

Verify after deploy: `/account`, `/sitemap.xml`, `/robots.txt`, `/privacy-policy`.

---

## MCP in Cursor (manage Pages from the agent)

Cloudflare provides **remote MCP servers** that work with Cursor. There is no separate “Pages-only” server; **Pages is covered by the Cloudflare API MCP server** (deployments, project settings, env vars, custom domains, deploy hooks).

### Render MCP (API host)

See [RENDER_MCP.md](RENDER_MCP.md) — `render` server in `.cursor/mcp.json`. Live API: **`brisbane-servers-api`** on Render; Pages project **`brisbaneservers`** uses its `*.onrender.com/api` URL in production env.

### Project config (this repo)

`.cursor/mcp.json` registers:

| Server | URL | Use for |
|--------|-----|---------|
| `cloudflare-api` | `https://mcp.cloudflare.com/mcp` | Account changes: Pages projects, builds, env, DNS, etc. |
| `cloudflare-docs` | `https://docs.mcp.cloudflare.com/mcp` | Up-to-date Cloudflare / Pages documentation |

### Recommended: `mcp-remote` + OAuth (this repo’s default)

Direct `url: https://mcp.cloudflare.com/mcp` in Cursor often fails with **`Failed to open SSE stream: Not Found`**. Use **`mcp-remote`** in `.cursor/mcp.json` with **no** `Authorization` header (OAuth stores tokens locally).

`.cursor/mcp.json` uses `--host 127.0.0.1`, `--auth-timeout 180`, and `--debug` to reduce **localhost refused to connect** during OAuth.

1. **Developer: Reload Window** (pick up `.cursor/mcp.json` changes).
2. Run **`npm run connect:cloudflare-mcp-oauth`** — opens a helper window that keeps the callback listener alive; complete Cloudflare sign-in in the browser.
3. Or **Settings → Tools & MCP** → **`cloudflare-api`** → **Connect** (complete within 3 minutes; do not reload Cursor mid-flow).
4. Grant **Pages Edit**, **Email Routing Edit**, **DNS Edit** on the Cloudflare consent screen.
5. **Developer: Reload Window** if the server stays red after authorizing.
6. Confirm **`cloudflare-api`** is green.

**`ERR_CONNECTION_REFUSED` on `localhost:…/oauth/callback`:** the OAuth listener died before the browser returned. Clear cache (`npm run reset:cloudflare-mcp-oauth`), then use `npm run connect:cloudflare-mcp-oauth` instead of Connect-only. Debug logs: `%USERPROFILE%\.mcp-auth\*_debug.log`.

**Do not** add `--header Authorization:...` unless you are using an API token only — an empty header causes **`401 after successful authentication`**.

### Optional: API token instead of OAuth

1. Run (paste token when prompted):

   ```powershell
   .\website-brisbaneservers.com\scripts\configure-cloudflare-mcp.ps1
   ```

2. Switch `.cursor/mcp.json` `cloudflare-api` to use `--header` + `CLOUDFLARE_AUTH_HEADER` (see script output) and **reload Cursor**.

Token permissions: see script header or [API token table](#api-token-instead-of-oauth-full-permissions) below.

### Redo OAuth with more permissions (optional; direct URL only)

If you switch `.cursor/mcp.json` back to `"url": "https://mcp.cloudflare.com/mcp"` and Email Routing or Pages writes fail with **`10000: Authentication error`**, the existing OAuth grant is too narrow. You must **disconnect and authorize again** — Cloudflare does not upgrade scopes on a live session.

1. **Cursor** → **Settings** → **Tools & MCP**.
2. On **`cloudflare-api`**, open **⋯** (or the server menu) → **Disconnect** / **Log out** / **Remove authentication** (wording varies by Cursor version).
3. **Clear stale OAuth cache** (recommended on Windows):

   ```powershell
   Remove-Item -Recurse -Force "$env:USERPROFILE\.mcp-auth" -ErrorAction SilentlyContinue
   ```

4. Optional: [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) → revoke any old **MCP** / third-party authorization for Cursor if listed.
5. Click **Connect** on **`cloudflare-api`** again and complete the browser flow.
6. On the Cloudflare consent screen, enable **Edit** (not just Read) for everything you need:

   | Grant in OAuth UI | Why (this project) |
   |-------------------|-------------------|
   | **Cloudflare Pages** — Edit | Builds, env vars, deploy hooks |
   | **Email Routing** — Edit (account + zone if split) | `connect@`, `contact@`, `bigpons@`, `support@` |
   | **DNS** — Edit | MX/DKIM when enabling Email Routing |
   | **Zone** — Read | List zone / records (often required with DNS) |
   | **Account resources** — Read | Account ID discovery (if shown) |

7. **Developer: Reload Window** (Command Palette) or restart Cursor. If the server stays red, wait 1–2 minutes and check again.
8. **Verify:** ask the agent to list Email Routing rules for `brisbaneservers.com` — must **not** return `10000`.

`cloudflare-docs` needs no account permissions (documentation only).

### First-time enable in Cursor

1. **Reload** Cursor so it picks up `.cursor/mcp.json`.
2. **Settings → Tools & MCP** → **Connect** on `cloudflare-api` and grant the table above.
3. Confirm `cloudflare-api` and `cloudflare-docs` show connected.

Without **Email Routing Edit**, MCP returns `10000` on routing APIs while zone/DNS **read** may still work. Fallback: `npm run setup:cloudflare-email` with an API token ([CLOUDFLARE_EMAIL.md](CLOUDFLARE_EMAIL.md)).

### API token instead of OAuth (full permissions)

Create a **Custom token** at [API Tokens](https://dash.cloudflare.com/profile/api-tokens) (do not use “Edit zone DNS” alone — add Email Routing + Pages):

| Permission | Resource | Include |
|------------|----------|---------|
| Cloudflare Pages — **Edit** | Account | Your account |
| Email Routing Addresses — **Edit** | Account | Your account |
| Email Routing Rules — **Edit** | Zone | `brisbaneservers.com` |
| DNS — **Edit** | Zone | `brisbaneservers.com` |
| Zone — **Read** | Zone | `brisbaneservers.com` |
| Account Resources — **Read** | Account | Your account |

Add to **user** `%USERPROFILE%\.cursor\mcp.json` only (never commit). **Disconnect** OAuth on `cloudflare-api` first, or remove any `headers` block if you use **Connect** in the UI — mixed OAuth + bearer often ignores the token.

OAuth is the recommended path for local development. Token example for **user** `~/.cursor/mcp.json`:

```json
"cloudflare-api": {
  "url": "https://mcp.cloudflare.com/mcp",
  "headers": {
    "Authorization": "Bearer ${env:CLOUDFLARE_API_TOKEN}"
  }
}
```

Set `CLOUDFLARE_API_TOKEN` in your Windows user environment variables. If OAuth and a static header conflict, prefer **Connect** in the UI and remove the `headers` block.

### What you can ask the agent

Examples aligned with this project:

- List Pages projects and recent deployments for `website-brisbaneservers.com`
- Verify production env vars (`PUBLIC_SITE_URL`, `PUBLIC_SITE_BASE`, `PUBLIC_API_BASE_URL`)
- Trigger or inspect builds after a push to `main`
- Read deploy hook / custom domain configuration (secrets stay on the API host per table above)

Official reference: [Cloudflare MCP servers](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/).

---

## Related

- [BRISBANESERVERS_PRODUCTION.md](BRISBANESERVERS_PRODUCTION.md) — secure DB, admin data, legal updates
- [CLOUDFLARE_EMAIL.md](CLOUDFLARE_EMAIL.md) — `connect@` / `contact@` / `bigpons@`, SMTP, OAuth
- [MASTER.md](../MASTER.md)
- [DEPLOYMENT_PATHWAYS.md](DEPLOYMENT_PATHWAYS.md)
- [ENV_VARIABLES.md](../development/ENV_VARIABLES.md)
