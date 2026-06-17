# Features intentionally not built (yet)

**Last updated:** 2026-06-18

This document records product and platform capabilities that are **deliberately out of scope** for the current production line, with reasoning. UI copy that mentions these items (e.g. Admin Ops cards) is informational — not a bug.

**Related:** [EDGE_API_STATUS.md](EDGE_API_STATUS.md) · [HOSTING_MCP_WORKSPACE.md](HOSTING_MCP_WORKSPACE.md)

---

## Billing and AI credits

| Feature | Status | Why not built yet |
|---------|--------|-------------------|
| **Stripe subscription** past daily AI cap | Planned | Portal auth, corpus, and inference metering had to stabilise first. Stripe needs webhook handling, customer portal, and alignment with daily `usage-ledger` caps — hybrid billing is a separate product slice. |
| **PayID manual top-up** + admin grant | Planned | Australian PayID has no automated webhook like Stripe. Flow is intentionally manual: user pays with reference `BS-{userId}-TOPUP`, admin verifies payment and grants units. Automating this needs ops tooling and audit trail beyond the current meter. |
| **Automated credit purchase** | Not planned (short term) | Daily role-based caps + template fallback already prevent runaway cost on Workers AI free tier. Paid top-up is a business process, not a code gap. |

**What ships today:** `GET /api/usage/me`, daily caps in `usage-ledger.ts`, template engine fallback, Workers AI binding on the edge worker.

---

## Voice and content tooling

| Feature | Status | Why not built yet |
|---------|--------|-------------------|
| **3D voice topology canvas** | **Partial** | Isometric “Depth view” on Voice Map (toggle). Full WebGL orbit canvas deferred — 2D + depth covers admin needs without lag. |
| **Legacy voice-framework Docker dashboard** (Render port 3001) | **Retired** | Replaced by Voice Lab, Voice Map, and admin panels in `/account`. Separate cold-start host duplicated portal features. |
| **PDF OCR** for image-only PDFs | Partial | Upload extracts text from text-based PDFs. Scanned/image PDFs return an explicit placeholder — full OCR needs a vision model or external service (cost, privacy, and latency review). |
| **Single automated “article → publish” pipeline** | By design | Markdown/CMS articles and API-backed resources are both valid inputs. Auto-publishing through voice analysis without human review would bypass moderation and site-section review workflows. |

---

## Token economy (community)

| Feature | Status | Notes |
|---------|--------|-------|
| **Earn tokens** | **Live** | Approved contributions + moderation adjustments |
| **Redeem flat perks** | **Live** | Overview panel — AI boost, spotlight, office hours (no tiers) |
| **Stripe / paid top-up** | Planned | See billing section above |

**What ships today:** `GET /api/tokens/me`, `GET /api/tokens/perks`, `POST /api/tokens/redeem`, ledger in `token-ledger.ts`.

---

## Voice map 3D

| Feature | Status | Notes |
|---------|--------|-------|
| **2D SVG map** | **Live** | Default — fast, accessible |
| **Depth / isometric view** | **Live** | Opt-in toggle — no WebGL, no extra deps |
| **Full WebGL 3D canvas** | Not planned | Only if corpus scale demands it; higher lag risk on low-end devices |

---

## Public site content

| Feature | Status | Why not built yet |
|---------|--------|-------------------|
| **Full topic guides** for construction, finance, manufacturing | Expanding | Hubs are `overview-only` in `site-completeness.ts`; retail/healthcare/hospitality/professional-services are fully published. Content production, not a platform blocker. |
| **More client showcase sites** | Curated | Only verified public presences are listed (e.g. Cool Finance). Placeholder cards are avoided on purpose. |

---

## Infrastructure (not user-facing features)

| Item | Status | Notes |
|------|--------|-------|
| **Render API** (`brisbane-servers-api`) | **Retired** | Suspended 2026-06-11. Production API is the Cloudflare Worker only. |
| **Render Postgres** (`brisbane-servers-db`) | **Decommission** | Superseded by Neon via Hyperdrive. Remove to avoid confusion and free-tier expiry. |
| **Render MCP for deploys** | Legacy | Use `cloudflare-api` MCP for production. Render MCP only for decommission/history. |

---

## When to build next

Suggested order after portal and edge are stable:

1. **Pages deploy hook** on worker (`CLOUDFLARE_PAGES_DEPLOY_HOOK_URL`) — static SEO refresh after publish (ops, not user feature).
2. **PayID grant admin UI** — if manual top-ups become frequent.
3. **Stripe** — if subscription revenue is prioritised over manual PayID.
4. **PDF OCR** — if upload volume of scanned PDFs justifies model cost.

Deploying repo changes to production (Worker + Pages) is tracked in [PRODUCTION_GO_LIVE_STATUS.md](PRODUCTION_GO_LIVE_STATUS.md) — intentionally batched separately from infra cleanup.
