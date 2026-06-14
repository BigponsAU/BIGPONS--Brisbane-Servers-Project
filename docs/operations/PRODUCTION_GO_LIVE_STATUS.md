# brisbaneservers.com — go-live status

Living tracker for [GO_LIVE_RUNBOOK.md](GO_LIVE_RUNBOOK.md). **Hosting map:** [HOSTING_MCP_WORKSPACE.md](HOSTING_MCP_WORKSPACE.md).

**Last synced:** 2026-06-15 (account sign-in fix + auth/dashboard chunk split)

---

## Recent changes (2026-06-15)

- **Account sign-in** (`d2e1b38`): Split `account-auth.ts` (~21 KB initial) from lazy `account-workspace-app` dashboard chunk; sign-in handlers attach immediately; **Continue with Google** rendered in SSR HTML with `https://api.brisbaneservers.com/api/auth/oauth/google/start`; removed Render API failover from production client; `AuthHiddenUsername` for reset-password form; BaseLayout `infoCard` cleanup fix. Cloudflare Pages deploy live on `brisbaneservers.com`.
- **Validated:** `npm run verify:production -- --api https://api.brisbaneservers.com` PASS; live `/account/` shows visible Google OAuth link (not `display:none`).

## Recent changes (2026-06-05, CSP)

- **Site CSP** (`public/_headers`): explicit policy for scripts, `connect-src` (API + Cloudflare RUM), Google OAuth frames. Removed duplicate CSP meta from `BaseLayout`. Account scripts use `data-cfasync="false"` to avoid Rocket Loader preload/credentials mismatch.
- **If console still shows report-only violations** with `connect-src 'none'`: that policy is **not** from the repo — disable **Cloudflare → Security → Page Shield → Client-side resource monitoring / CSP reporting** for `brisbaneservers.com`, or remove any zone CSP report-only rule in **Rules → Configuration rules**.

## Recent changes (2026-06-05, evening)

- **Auth sign-in UX** (`4289ab7`): API wake retries before login/register; **Continue with Google** shown optimistically on production; 45s login timeout + retry on 5xx; nav session probe uses `api.brisbaneservers.com`. Cloudflare Pages deploy `1e0e26b3` live on `brisbaneservers.com`.
- **Validated:** `npm run verify:production` PASS; `npm run verify:production-auth` PASS (CORS, register, login cookie, logout); live `/account/` markup + JS bundle; `GET /api/auth/oauth/google/start` → Google OAuth redirect.

## Recent changes (2026-06-05)

- **Brisbane 2032 UI shipped** (`7ca0395`): `/brisbane-2032`, Project purpose nav (Resources / Projects / About), `ProjectObjectivePanel`, inference links on Resources. Cloudflare Pages deploy `97b64977` live on `brisbaneservers.com`.
- **Auth hardening:** Logout clears HttpOnly cookie even when session invalid; sign-up/resend/forgot probe API on cold start; `npm run verify:production-auth` E2E script. Render API deploy `dep-d8hbqki8qa3s73bh5mn0` live.

## Recent changes (2026-06-04)

- **Neon-only Postgres:** Removed `brisbane-servers-db` from `render.yaml`. Scripts: `configure:neon-database`, `migrate:render-postgres-to-neon`, `decommission:render-postgres`, `verify:hosting-mcp`.
- **Health endpoint** exposes `persistence.databaseProvider` (neon vs render) for ops checks.

## Recent changes (2026-06-03)

- **Account sign-in CORS fix** (`90a048c`): Render API now sends `Access-Control-Allow-Credentials: true` for `https://brisbaneservers.com`. Session cookies use `SameSite=Lax` on `api.brisbaneservers.com`. Pages fallback API URL is `https://api.brisbaneservers.com/api`.
- **Session persistence fix** (`0c2eaf1`): Standalone API forwards `Set-Cookie` correctly; auth cookies use `Domain=.brisbaneservers.com`; login returns an in-memory Bearer token so dashboard API calls stay authenticated after sign-in.

## MCP-linked hosting (active)

| Platform | MCP | Live resource |
|----------|-----|----------------|
| **Cloudflare** | `cloudflare-api` | Pages **`brisbaneservers`**, zone **`brisbaneservers.com`** |
| **Render** | `render` | **`brisbane-servers-api`** (API host only) |
| **Neon** | — | Postgres via `DATABASE_URL` on API |

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
| Postgres (Neon) | **Migrate** — `npm run configure:neon-database` |
| ~~`brisbane-servers-db` (Render)~~ | **Retire** — `npm run decommission:render-postgres` after Neon verified |
| `DATABASE_URL` on API | **Set to Neon pooled URL** |
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
