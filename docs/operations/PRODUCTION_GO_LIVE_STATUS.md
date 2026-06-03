# brisbaneservers.com — go-live status

Living tracker for [GO_LIVE_RUNBOOK.md](GO_LIVE_RUNBOOK.md). **Hosting map:** [HOSTING_MCP_WORKSPACE.md](HOSTING_MCP_WORKSPACE.md).

**Last synced:** 2026-06-03 (Render redeploy + Cloudflare Pages)

---

## Recent changes (2026-06-03)

- **Account sign-in CORS fix** (`90a048c`): Render API now sends `Access-Control-Allow-Credentials: true` for `https://brisbaneservers.com`. Session cookies use `SameSite=Lax` on `api.brisbaneservers.com`. Pages fallback API URL is `https://api.brisbaneservers.com/api`.

## MCP-linked hosting (active)

| Platform | MCP | Live resource |
|----------|-----|----------------|
| **Cloudflare** | `cloudflare-api` | Pages **`brisbaneservers`**, zone **`brisbaneservers.com`** |
| **Render** | `render` | **`brisbane-servers-api`**, **`brisbane-servers-db`** |

---

## Summary

| Layer | Status |
|-------|--------|
| **Phase 0** — local gates | **Complete** — `npm run verify:go-live` |
| **Phase 1** — API (Render) | **Live** — health OK on `*.onrender.com` |
| **Phase 2** — Pages (Cloudflare) | **Live** — `https://brisbaneservers.com` |
| **Phase 3** — `/account` on domain | **Live** — auth email from `support@mail.brisbaneservers.com`; signup UX fixes pushed |
| **Phase 4–6** | **Pending** — root Resend domain (`support@brisbaneservers.com`), Google OAuth env, deploy hook, cron, sign-off |

---

## Phase 0 — Repo readiness

| Check | Status |
|-------|--------|
| Vitest / typecheck / build 6/6 | **Pass** |
| `npm run verify:go-live` | **Ready** |

---

## Phase 1 — Render API

| Check | Status |
|-------|--------|
| `brisbane-servers-api` deployed | **Live** — https://brisbane-servers-api.onrender.com/api/health |
| `brisbane-servers-db` (Postgres 16) | **Available** |
| `DATABASE_URL` on API | **Done** — internal URL (no `sslmode=require`; fixes self-signed cert on sessions) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | **Set** — `bigpons@brisbaneservers.com` bootstrap super-admin |
| `CRON_SECRET` | **Set** — for `provision-admin` after next deploy |
| `JWT_SECRET` | **Set** |
| Custom domain `api.brisbaneservers.com` | **Verified** on Render |
| Persistent disk `voice-storage` | **Blueprint: Starter + 1GB** — [STORAGE_AND_VECTORS.md](STORAGE_AND_VECTORS.md) |
| Library growth APIs + bootstrap | **Pushed** — `prestart:api` seeds corpus if empty |
| `RESEND_API_KEY` | **Done** |
| `AUTH_EMAIL_FROM` | **Done** — `Brisbane Servers <support@mail.brisbaneservers.com>` |
| Google OAuth env vars | **Done** — client ID, secret, redirect on Render |
| `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` | **Pending** |
| Push + `npm run seed:admin` or `POST /api/cron/provision-admin` | **Re-run** — credential email should deliver after `AUTH_EMAIL_FROM` fix |

---

## Phase 2 — Cloudflare Pages

| Check | Status |
|-------|--------|
| Project `brisbaneservers` + GitHub | **Linked** |
| `brisbaneservers.com` custom domain | **Active** |
| Apex CNAME → `brisbaneservers.pages.dev` | **Done** |
| `api` CNAME → Render (DNS only) | **Done** |
| Pages `PUBLIC_API_BASE_URL` | **Done** — prefer `https://api.brisbaneservers.com/api` (same-site cookies) |

---

## Phase 3 — Account workspace

| Check | Status |
|-------|--------|
| UI on domain | **Verify** — [ACCOUNT_DOMAIN_VERIFICATION.md](ACCOUNT_DOMAIN_VERIFICATION.md) |
| API calls from browser | **Fixed** — credentialed CORS + `api.brisbaneservers.com` session cookies |

---

## Phase 4–6

| Check | Status |
|-------|--------|
| Pages deploy hook on API | **Pending** |
| Library growth cron | **Pending** |
| Production sign-off | **Pending** |

---

## Email routing — confirmed

Forwards to `brisbaneservers@gmail.com`: `connect@`, `contact@`, `bigpons@`, `support@`. Outbound SMTP on API still required.

---

## Related

- [HOSTING_MCP_WORKSPACE.md](HOSTING_MCP_WORKSPACE.md)
- [RENDER_MCP.md](RENDER_MCP.md)
- [CLOUDFLARE_PAGES.md](CLOUDFLARE_PAGES.md)
