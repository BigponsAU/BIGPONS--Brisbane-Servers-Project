# brisbaneservers.com — go-live status

Living tracker. **Hosting map:** [HOSTING_MCP_WORKSPACE.md](HOSTING_MCP_WORKSPACE.md).

**Last synced:** 2026-06-18 (commit `85b5fb1` — dashboard routes + `verify:dashboard-api` 26/26 on production)

### 2026-06-18 deploy

- Pushed `85b5fb1` → GitHub Actions **Deploy edge worker** succeeded.
- `npm run verify:production` and `npm run verify:dashboard-api` both **PASS** against `https://api.brisbaneservers.com`.
- Fixed Worker module-load 500s (`fileURLToPath` at import time) on passkey, profiles, vectors-summary routes.

---

## Current production state

| Layer | Status |
|-------|--------|
| **Site** | **Live** — `https://brisbaneservers.com` (Cloudflare Pages) |
| **API** | **Live** — `https://api.brisbaneservers.com/api` (Worker `brisbane-servers-api-edge`) |
| **Database** | **Live** — Neon via Hyperdrive |
| **Render** | **Retired** — API suspended; Postgres decommissioned |
| **Account portal** | **Live** — sign-in, Google OAuth, workspace panels |
| **Intentional gaps** | [FEATURES_NOT_BUILT.md](FEATURES_NOT_BUILT.md) |

### MCP-linked hosting (active)

| Platform | MCP | Role |
|----------|-----|------|
| **Cloudflare** | `cloudflare-api` | Pages, Worker, DNS, Email Routing |
| **Neon** | — | Postgres (console.neon.tech) |
| **Resend** | — | Outbound auth email (worker secret) |
| **Google Cloud** | — | OAuth credentials |
| ~~Render~~ | legacy | Decommission only — [RENDER_MCP.md](RENDER_MCP.md) |

### Pending (non-blocking)

| Item | Notes |
|------|-------|
| **Pages deploy hook** | `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` on worker |
| **Billing** | Stripe / PayID — not built by design yet |

### Verification

```bash
cd website-brisbaneservers.com
npm run verify:production -- --api https://api.brisbaneservers.com
npm run verify:production-auth:edge
```

---

## Recent changes (2026-06-18)

- **Hosting truth pass:** `FEATURES_NOT_BUILT.md` documents intentional gaps with reasoning.
- **Render Postgres** decommissioned (`brisbane-servers-db`); API service remains suspended.
- **Docs/code cleanup:** `RENDER_MCP.md`, `HOSTING_MCP_WORKSPACE.md`, `EDGE_API_STATUS.md` updated; removed active `onrender.com` references from CSP/client API; dead Render proxy code removed from worker handlers.
- **Deploy held:** Worker/Pages deploy batched for when operator is ready (step 4 in hosting doc).

---

## Historical changelog

<details>
<summary>2026-06-15 — account auth boot, OAuth Hyperdrive</summary>

- Inline auth boot for Rocket Loader; Google OAuth Hyperdrive fix; cookie-backed `oauth_state` on edge.
- Render API failover removed from production client (`d2e1b38`).

</details>

<details>
<summary>2026-06-05 — CSP, sign-in UX, Brisbane 2032 UI</summary>

- Site CSP in `public/_headers`; auth wake retries; Google OAuth on production.

</details>

<details>
<summary>2026-06-03–04 — Neon migration, CORS, session cookies</summary>

- Neon-only Postgres; `api.brisbaneservers.com` session cookies; Render API CORS fix (historical — Render later retired).

</details>

---

## Related

- [FEATURES_NOT_BUILT.md](FEATURES_NOT_BUILT.md)
- [HOSTING_MCP_WORKSPACE.md](HOSTING_MCP_WORKSPACE.md)
- [RENDER_MCP.md](RENDER_MCP.md)
- [GO_LIVE_RUNBOOK.md](GO_LIVE_RUNBOOK.md)
