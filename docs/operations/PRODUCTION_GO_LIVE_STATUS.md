# brisbaneservers.com — go-live status

Living tracker. **Hosting map:** [HOSTING_MCP_WORKSPACE.md](HOSTING_MCP_WORKSPACE.md).

**Last synced:** 2026-07-01 — account workspace UX + action-guard deploy

### 2026-07-01 — Account workspace UX, starter corpus, double-click guards

- **Portal** — global search in sidebar (tree filter); Create content featured nav pill; inference badge fix; admin Users & vectors panel; library growth approve loading; starter-block corpus sync (~17 templates).
- **Client** — shared `runWorkspaceGuardedAction` on publish/improve/delete/bulk/starter/moderation/growth/profile actions (blocks spam during confirm + API).
- **Deploy** — push to `main` → Pages production + edge worker (`src/lib/starter-block-corpus.ts`, `_api/resources/starter-blocks.ts`, portal scripts).

### 2026-06-30 — Marketing search client bundle (Option A layouts)

- **Root cause** — Astro conditional script in `BaseLayout.astro` inverted bundles: marketing pages loaded `account-nav.ts` (~1.2 KB) instead of `main.ts` (~32 KB), so `SemanticSearch` never ran.
- **Fix** — `SiteShell.astro` → unconditional `main.ts`; `AccountSiteShell.astro` → unconditional `account-nav.ts`; shared `SiteShellBody.astro`; post-build `checkClientBundlePageMapping`.
- **Deploy** — Cloudflare Pages production `658ad0b9` from `13f49e8` (**success**, 2026-06-30). Live bundles: homepage `SiteShell.*.js` (search present); `/account/` `AccountSiteShell.*.js` (search absent).
- **Verify** — `npm run verify:production -- --api https://api.brisbaneservers.com` **PASS**; `GET /api/resources/search?q=pro` **200**.

### 2026-06-28 — Pages static resource detail pages

- **Pages production env** — confirmed via Cloudflare API: `PAGES_BUILD_EXPORT_ON_BUILD=1`, `PAGES_BUILD_USE_GIT_CORPUS=1`, `PUBLIC_RESOURCES_LIVE=1`, API base URLs set.
- **Build fix** — prerender reads `voice-framework/storage/resources.json` via repo-relative path (bundled `import.meta.url` broke CI corpus lookup).
- **wrangler.toml** — `PAGES_BUILD_EXPORT_ON_BUILD=1` added to `[vars]` (Pages injects build env from wrangler, not dashboard-only vars).
- **Prebuild** — one `GET /api/resources/public` export before Astro build; indexable resources prerender to `/resources/item/{id}/`.
- **Note** — live API currently returns **0** published resources; detail pages appear after publish + deploy hook / push rebuild.

### 2026-06-26 — document OCR pipeline + inference

- **API** — `POST /api/documents/extract` (PDF, DOCX, images → text via local parse + NVIDIA vision), `POST /api/documents/rewrite` (structure-preserving voice rewrite).
- **Upload** — `/api/resources/upload` now uses `extractDocument()`; optional `preserveStructure` for prose-only rewrite.
- **Dashboard** — Resources panel **Documents — OCR & rewrite** (drag-drop, extract, rewrite, create resource).
- **Worker vars** — `NVIDIA_VISION_MODEL=moonshotai/kimi-k2.6` in `wrangler.toml`; set on live worker via MCP after merge/deploy.
- **Deploy** — push to `main` for Pages + edge worker; requires `NVIDIA_API_KEY` on worker for scanned PDFs/images.

### 2026-06-26 — Inference pipeline (production)

- **Edge worker** `dcf403f` → `189311a` — `INFERENCE_PROVIDER=nvidia`, `NVIDIA_MODEL=stepfun-ai/step-3.7-flash`; Workers AI fallback when `NVIDIA_API_KEY` unset.
- **Pages** `189311a` — profile cards, inference badges, generate/improve/upload UX live on `https://brisbaneservers.com/account`.
- **NVIDIA secret** — not yet on worker; run `website-brisbaneservers.com/scripts/configure-inference-nvidia.ps1` then `sync-secrets-to-edge-worker.ps1` (rotate any keys pasted in chat).
- **Meta starter** — syncs on authenticated `GET /api/profiles` or `GET /api/resources/starter-blocks`.

### 2026-06-26 — Cloudflare Security Insights

- **email.brisbaneservers.com** — removed legacy GoDaddy CNAME (`emaildot.godaddy.com`); subdomain had broken TLS/HSTS and is unused (site uses Cloudflare Email Routing + Resend).
- **send.brisbaneservers.com SPF** — updated Resend MAIL FROM records to `v=spf1 mx include:amazonses.com -all` (root + `send.mail`); fixes Cloudflare SPF insight without removing required Resend MX.
- **security.txt** — added `public/.well-known/security.txt` on Pages (deploy to clear insight).
- **AI Labyrinth** — optional dashboard action under Security → AI Crawl Control (not DNS).

### 2026-06-22 — resources search + nav dropdowns

- **Resources search** — index loads before first keystroke; browse hints, industry chips, and normalized result URLs on `/resources`.
- **Desktop nav** — mega menu chevrons restored; CSS `:hover` fallback; pointer path into panels fixed (no dead-zone gap).
- **Deploy** — pushed `de160d6` → Cloudflare Pages production **success** (~1 min build). `npm run verify:production` **PASS**.

### 2026-06-19 (b) — guides, 3D map, publish hook

- **Topic guides** (22) + overviews synced to Neon API corpus — 42 indexed resources, 104 semantic chunks.
- **WebGL 3D view** on Voice Map (`3D view` toggle, orbit drag).
- **Pages deploy hook** set on edge worker (`CLOUDFLARE_PAGES_DEPLOY_HOOK_URL`) — static rebuild on publish.
- PayID and PDF OCR explicitly **on hold** per product direction.

### 2026-06-19 deploy

- Voice corpus: profiles + text-storage persist via Neon; case studies materialized as API resources (20 corpus items, 60 semantic chunks).
- Analytics panel counts starter blocks and published corpus (no longer shows 0 when only starters exist).
- Worker deploy path: **push to `main` only** — local `wrangler deploy` removed; CI paths expanded (`voice-framework/**`, `src/lib/**`, `src/utils/**`).
- `npm run bootstrap:voice-corpus` run against production Neon (4 case studies added).


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
| **Pages deploy hook** | **Live** — worker secret set; fires on resource publish |
| **Billing** | Stripe / PayID — on hold by design |

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
