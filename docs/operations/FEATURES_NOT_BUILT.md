# Features intentionally not built (yet)

**Last updated:** 2026-06-26

This document records product and platform capabilities that are **deliberately out of scope** for the current production line, with reasoning. UI copy that mentions these items (e.g. Admin Ops cards) is informational — not a bug.

**Related:** [EDGE_API_STATUS.md](EDGE_API_STATUS.md) · [HOSTING_MCP_WORKSPACE.md](HOSTING_MCP_WORKSPACE.md)

---

## Billing and AI credits

| Feature | Status | Why not built yet |
|---------|--------|-------------------|
| **Stripe subscription** past daily AI cap | Planned | Portal auth, corpus, and inference metering had to stabilise first. Stripe needs webhook handling, customer portal, and alignment with daily `usage-ledger` caps — hybrid billing is a separate product slice. |
| **PayID manual top-up** + admin grant | On hold | Deferred until Stripe/billing slice is scoped; manual flow documented for later. |
| **Automated credit purchase** | Not planned (short term) | Daily role-based caps + template fallback already prevent runaway cost on Workers AI free tier. Paid top-up is a business process, not a code gap. |

**What ships today:** `GET /api/usage/me`, daily caps in `usage-ledger.ts`, template engine fallback, Workers AI binding on the edge worker.

---

## Voice and content tooling

| Feature | Status | Why not built yet |
|---------|--------|-------------------|
| **3D voice topology canvas** | **Live** | WebGL orbit (`3D view`) plus 2D flat and isometric depth on Voice Map. |
| **Topic guides in API corpus** | **Live** | All industry/topic guides sync to Neon on bootstrap (`topic-guide-*` resources). |
| **Legacy voice-framework Docker dashboard** (Render port 3001) | **Retired** | Replaced by Voice Lab, Voice Map, and admin panels in `/account`. Separate cold-start host duplicated portal features. |
| **PDF OCR & document rewrite** | **Live (v1)** | Dashboard **Documents — OCR & rewrite**: extract PDF/DOCX/images via local parse + NVIDIA vision (`moonshotai/kimi-k2.6`); structure-preserving voice rewrite (markdown skeleton, not binary styling). Legacy upload path also uses extract. |
| **Binary format preservation** (Word/PDF fonts, logos) | Not planned (v1) | Edge Workers cannot round-trip DOCX/PDF layout without external conversion services; v1 outputs markdown structure + voice rewrite. |
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
| **Depth / isometric view** | **Live** | Opt-in toggle — no WebGL |
| **WebGL 3D orbit canvas** | **Live** | `3D view` on Voice Map — drag to orbit corpus topology |

---

## Public site content

| Feature | Status | Why not built yet |
|---------|--------|-------------------|
| **Topic guides** for all industry hubs | **Live** | Full guides in `src/data/topic-guides/`; synced to API corpus for voice map + Brisbane profile. |
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

1. **PayID grant admin UI** — if manual top-ups become frequent.
2. **Stripe subscription** past daily AI cap — when billing product slice is ready.
3. **Stripe** — if subscription revenue is prioritised over manual PayID.
4. **Binary DOCX/PDF round-trip** — if customers need original fonts/logos preserved in-file (not markdown structure).

Deploying repo changes to production (Worker + Pages) is tracked in [PRODUCTION_GO_LIVE_STATUS.md](PRODUCTION_GO_LIVE_STATUS.md) — intentionally batched separately from infra cleanup.
